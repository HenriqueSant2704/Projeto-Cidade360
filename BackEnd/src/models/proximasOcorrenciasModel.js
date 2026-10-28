const db =
    require("../config/db");


let cacheColunasOcorrencias =
    null;

let cacheTemHistorico =
    null;


// Ocorrência resolvida fica no mapa por esse tempo depois da resolução.
// O painel (painel.js) usa o mesmo valor: DIAS_RESOLVIDA_NO_MAPA.
const DIAS_RESOLVIDA_NO_MAPA =
    7;


/*========================================================================================================

COLUNAS DISPONÍVEIS

Mantém compatibilidade com versões diferentes do banco de dados.

=========================================================================================================*/

async function carregarColunasOcorrencias() {
    if (cacheColunasOcorrencias) {
        return cacheColunasOcorrencias;
    }

    const [linhas] =
        await db.execute(
            `
            SELECT
                COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE
                TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'ocorrencias'
            `
        );

    cacheColunasOcorrencias =
        new Set(
            linhas.map((linha) =>
                linha.COLUMN_NAME
            )
        );

    return cacheColunasOcorrencias;
}


/*========================================================================================================

HISTÓRICO DE STATUS

É dele que vem a data em que a ocorrência virou "Resolvido".

=========================================================================================================*/

async function temTabelaHistorico() {
    if (cacheTemHistorico !== null) {
        return cacheTemHistorico;
    }

    const [linhas] =
        await db.execute(
            "SHOW TABLES LIKE 'historico_ocorrencia'"
        );

    cacheTemHistorico =
        linhas.length > 0;

    return cacheTemHistorico;
}


/*========================================================================================================

CAMPO DE DATA

=========================================================================================================*/

function campoDataOcorrencia(colunas) {
    if (
        colunas.has(
            "data_criacao"
        )
    ) {
        return "o.data_criacao";
    }

    if (
        colunas.has(
            "data_ocorrencia"
        )
    ) {
        return "o.data_ocorrencia";
    }

    return "NULL";
}


/*========================================================================================================

CAMPO OPCIONAL

=========================================================================================================*/

function campoOpcional(colunas, nome) {
    if (
        colunas.has(nome)
    ) {
        return `o.${nome}`;
    }

    return "NULL";
}


/*========================================================================================================

MODEL

A consulta retorna apenas dados adequados para o mapa público autenticado.

Não retorna:
- Nome do cidadão
- E-mail
- Telefone
- ID do cidadão

=========================================================================================================*/

const ProximasOcorrenciasModel = {

    async listarProximas({
        usuarioId,
        latitude,
        longitude,
        raioKm,
        limite
    }) {
        const colunas =
            await carregarColunasOcorrencias();

        const campoData =
            campoDataOcorrencia(
                colunas
            );

        const campoBairro =
            campoOpcional(
                colunas,
                "bairro"
            );

        const campoCidade =
            campoOpcional(
                colunas,
                "cidade"
            );

        // Data da resolução: a última vez que virou "Resolvido" no histórico.
        // Sem histórico, usa a última atualização da ocorrência (a resolução costuma ser a última mudança).
        const temHistorico =
            await temTabelaHistorico();

        const campoAtualizacao =
            colunas.has(
                "data_atualizacao"
            )
                ? "o.data_atualizacao"
                : campoData;

        const juncaoResolucao =
            temHistorico
                ? `
                LEFT JOIN (
                    SELECT
                        h.ocorrencia_id,
                        MAX(h.data_alteracao) AS data_resolucao
                    FROM historico_ocorrencia h
                    INNER JOIN status_ocorrencia sh
                        ON sh.id = h.status_novo
                    WHERE
                        sh.nome = 'Resolvido'
                    GROUP BY
                        h.ocorrencia_id
                ) r
                    ON r.ocorrencia_id = o.id
                `
                : "";

        const campoResolucao =
            temHistorico
                ? `COALESCE(r.data_resolucao, ${campoAtualizacao})`
                : campoAtualizacao;

        const limiteSeguro =
            Math.min(
                Math.max(
                    Number(limite) || 100,
                    1
                ),
                100
            );

        const [linhas] =
            await db.execute(
                `
                SELECT
                    o.id,
                    o.titulo,
                    o.latitude,
                    o.longitude,
                    ${campoData} AS data_ocorrencia,
                    ${campoBairro} AS bairro,
                    ${campoCidade} AS cidade,
                    c.nome AS categoria,
                    s.nome AS status,
                    CASE
                        WHEN s.nome = 'Resolvido' THEN ${campoResolucao}
                        ELSE NULL
                    END AS data_resolucao,
                    CASE
                        WHEN o.usuario_id = ? THEN 1
                        ELSE 0
                    END AS minha_ocorrencia,
                    (
                        6371 * ACOS(
                            LEAST(
                                1,
                                GREATEST(
                                    -1,
                                    COS(RADIANS(?)) *
                                    COS(RADIANS(o.latitude)) *
                                    COS(
                                        RADIANS(o.longitude) -
                                        RADIANS(?)
                                    ) +
                                    SIN(RADIANS(?)) *
                                    SIN(RADIANS(o.latitude))
                                )
                            )
                        )
                    ) AS distancia_km
                FROM ocorrencias o
                INNER JOIN categorias_ocorrencia c
                    ON c.id = o.categoria_id
                INNER JOIN status_ocorrencia s
                    ON s.id = o.status_id
                ${juncaoResolucao}
                WHERE
                    o.latitude IS NOT NULL
                    AND o.longitude IS NOT NULL
                    AND LOWER(s.nome) <> 'cancelado'
                    AND (
                        s.nome <> 'Resolvido'
                        OR ${campoResolucao} IS NULL
                        OR ${campoResolucao} >= NOW() - INTERVAL ${DIAS_RESOLVIDA_NO_MAPA} DAY
                    )
                HAVING
                    distancia_km <= ?
                ORDER BY
                    distancia_km ASC,
                    o.id DESC
                LIMIT ${limiteSeguro}
                `,
                [
                    usuarioId,
                    latitude,
                    longitude,
                    latitude,
                    raioKm
                ]
            );

        return linhas.map((linha) => ({
            ...linha,
            minha_ocorrencia:
                Boolean(
                    Number(
                        linha.minha_ocorrencia
                    )
                ),
            distancia_km:
                Number(
                    linha.distancia_km
                )
        }));
    }
};


module.exports =
    ProximasOcorrenciasModel;
