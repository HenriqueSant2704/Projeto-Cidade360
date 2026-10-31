const db =
    require("../config/db");


/*========================================================================================================

MODEL DE ESTATÍSTICAS DO PAINEL

Responsável por consultas agregadas do Cidade360.

Nenhuma consulta deste arquivo retorna dados pessoais dos cidadãos.

=========================================================================================================*/

let cacheColunasOcorrencias =
    null;


/*========================================================================================================

COLUNAS DA TABELA DE OCORRÊNCIAS

Mantém compatibilidade com versões diferentes do banco de dados
(o mesmo cuidado de proximasOcorrenciasModel.js).

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


function campoDataCriacao(colunas) {
    if (colunas.has("data_criacao")) {
        return "o.data_criacao";
    }

    if (colunas.has("data_ocorrencia")) {
        return "o.data_ocorrencia";
    }

    return "NULL";
}


const EstatisticasPainelModel = {

    /*====================================================================================================

    RESUMO DA CIDADE

    Conta as ocorrências de todos os cidadãos.
    Ocorrências canceladas (trote, duplicada) não entram em nenhum número,
    do mesmo jeito que não aparecem no mapa.

    =====================================================================================================*/

    async resumoCidade() {
        const [linhas] =
            await db.execute(
                `
                SELECT
                    COUNT(*) AS total,
                    SUM(
                        CASE
                            WHEN s.nome IN
                            (
                                'Recebido',
                                'Em análise'
                            )
                            THEN 1
                            ELSE 0
                        END
                    ) AS pendentes,
                    SUM(
                        CASE
                            WHEN s.nome IN
                            (
                                'Em atendimento',
                                'Em andamento'
                            )
                            THEN 1
                            ELSE 0
                        END
                    ) AS em_andamento,
                    SUM(
                        CASE
                            WHEN s.nome = 'Resolvido'
                            THEN 1
                            ELSE 0
                        END
                    ) AS resolvidas
                FROM ocorrencias o
                INNER JOIN status_ocorrencia s
                    ON s.id = o.status_id
                WHERE
                    LOWER(s.nome) <> 'cancelado'
                `
            );

        const resumo =
            linhas[0] || {};

        return {
            total:
                Number(
                    resumo.total || 0
                ),

            pendentes:
                Number(
                    resumo.pendentes || 0
                ),

            em_andamento:
                Number(
                    resumo.em_andamento || 0
                ),

            resolvidas:
                Number(
                    resumo.resolvidas || 0
                )
        };
    },


    /*====================================================================================================

    OCORRÊNCIAS RECENTES DA CIDADE

    As últimas ocorrências registradas por qualquer cidadão, mais novas primeiro.
    Canceladas ficam de fora.

    Retorna só o que o mapa público já mostra:
    título, categoria, status, bairro e data.

    Não retorna:
    - Nome, e-mail, telefone ou ID de quem registrou
    - Descrição, fotos ou endereço completo

    "minha_ocorrencia" diz apenas se foi o próprio usuário logado que registrou,
    para o painel abrir o acompanhamento dela.

    =====================================================================================================*/

    async listarRecentesCidade({
        usuarioId,
        limite
    }) {
        const colunas =
            await carregarColunasOcorrencias();

        const campoData =
            campoDataCriacao(
                colunas
            );

        const campoBairro =
            colunas.has("bairro")
                ? "o.bairro"
                : "NULL";

        const limiteSeguro =
            Math.min(
                Math.max(
                    Number(limite) || 7,
                    1
                ),
                20
            );

        const [linhas] =
            await db.execute(
                `
                SELECT
                    o.id,
                    o.titulo,
                    ${campoData} AS data_criacao,
                    ${campoBairro} AS bairro,
                    c.nome AS categoria,
                    s.nome AS status,
                    CASE
                        WHEN o.usuario_id = ? THEN 1
                        ELSE 0
                    END AS minha_ocorrencia
                FROM ocorrencias o
                INNER JOIN categorias_ocorrencia c
                    ON c.id = o.categoria_id
                INNER JOIN status_ocorrencia s
                    ON s.id = o.status_id
                WHERE
                    LOWER(s.nome) <> 'cancelado'
                ORDER BY
                    ${campoData === "NULL" ? "" : `${campoData} DESC,`}
                    o.id DESC
                LIMIT ${limiteSeguro}
                `,
                [usuarioId]
            );

        return linhas.map((linha) => ({
            id:
                Number(
                    linha.id
                ),

            titulo:
                linha.titulo,

            data_criacao:
                linha.data_criacao,

            bairro:
                linha.bairro,

            categoria:
                linha.categoria,

            status:
                linha.status,

            minha_ocorrencia:
                Boolean(
                    Number(
                        linha.minha_ocorrencia
                    )
                )
        }));
    },


    /*====================================================================================================

    CATEGORIAS MAIS REGISTRADAS

    Conta todas as ocorrências registradas no sistema,
    independentemente do cidadão responsável pelo registro.

    =====================================================================================================*/

    async listarCategoriasMaisRegistradas(
        limite
    ) {
        const limiteSeguro =
            Math.min(
                Math.max(
                    Number(limite) || 5,
                    1
                ),
                50
            );


        const [totalLinhas] =
            await db.execute(
                `
                SELECT
                    COUNT(*) AS total
                FROM ocorrencias
                `
            );


        const totalOcorrencias =
            Number(
                totalLinhas[0]?.total || 0
            );


        const [linhas] =
            await db.execute(
                `
                SELECT
                    c.id,
                    c.nome,
                    COUNT(o.id) AS total
                FROM categorias_ocorrencia c
                INNER JOIN ocorrencias o
                    ON o.categoria_id = c.id
                GROUP BY
                    c.id,
                    c.nome
                ORDER BY
                    total DESC,
                    c.nome ASC
                LIMIT ${limiteSeguro}
                `
            );


        return linhas.map((linha, indice) => {
            const total =
                Number(
                    linha.total || 0
                );


            const percentual =
                totalOcorrencias > 0
                    ? Number(
                        (
                            (
                                total /
                                totalOcorrencias
                            ) * 100
                        ).toFixed(1)
                    )
                    : 0;


            return {
                id:
                    Number(
                        linha.id
                    ),

                nome:
                    linha.nome,

                total,

                percentual,

                posicao:
                    indice + 1
            };
        });
    }
};


module.exports =
    EstatisticasPainelModel;
