const db = require("../config/db");


/*========================================================================================================

PONTOS DO CIDADÃO

Regras (combinadas com o Miguel em 24/10/2026):
- Registrar uma ocorrência: +1
- A ocorrência chegar em "Em análise": +2, "Em andamento": +3, "Resolvido": +5
- Cada etapa paga uma vez só por ocorrência, mesmo que o status volte e avance de novo.
- Cancelada pela prefeitura: os pontos daquela ocorrência saem do saldo.
  Se ela for reaberta, os pontos voltam.

Para mudar os valores, mexa só em PONTOS_POR_ETAPA e CANCELAMENTO_REMOVE_PONTOS.

usuarios.pontos guarda o saldo. pontos_historico guarda cada movimento, então o saldo
sempre pode ser conferido com SUM(pontos).

=========================================================================================================*/

const PONTOS_POR_ETAPA = {
    registro: 1,
    em_analise: 2,
    em_andamento: 3,
    resolvido: 5
};

const CANCELAMENTO_REMOVE_PONTOS = true;


async function somarPontosDaOcorrencia(conexao, ocorrenciaId) {
    const [[linha]] =
        await conexao.query(
            `SELECT
                COALESCE(SUM(pontos), 0) AS saldo,
                COALESCE(SUM(CASE WHEN chave_unica IS NOT NULL THEN pontos ELSE 0 END), 0) AS ganhos
             FROM pontos_historico
             WHERE ocorrencia_id = ?`,
            [ocorrenciaId]
        );

    return {
        saldo: Number(linha.saldo),
        ganhos: Number(linha.ganhos)
    };
}


async function registrarMovimento(conexao, {
    usuarioId,
    ocorrenciaId,
    motivo,
    pontos,
    chaveUnica = null
}) {
    await conexao.query(
        `INSERT INTO pontos_historico
            (usuario_id, ocorrencia_id, motivo, pontos, chave_unica)
         VALUES (?, ?, ?, ?, ?)`,
        [
            usuarioId,
            ocorrenciaId,
            motivo,
            pontos,
            chaveUnica
        ]
    );

    // usuarios.pontos é UNSIGNED: o saldo nunca fica negativo.
    await conexao.query(
        `UPDATE usuarios
         SET pontos = GREATEST(CAST(pontos AS SIGNED) + ?, 0)
         WHERE id = ?`,
        [
            pontos,
            usuarioId
        ]
    );
}


const PontosModel = {

    PONTOS_POR_ETAPA,


    /*
      Chamado depois de registrar a ocorrência ou de mudar o status.
      Devolve quantos pontos o cidadão ganhou (positivo) ou perdeu (negativo) agora.
    */
    async aplicarEtapa({
        usuarioId,
        ocorrenciaId,
        etapa
    }) {
        const conexao =
            await db.getConnection();

        try {
            await conexao.beginTransaction();

            // Trava a ocorrência para dois admins não pagarem a mesma etapa ao mesmo tempo.
            await conexao.query(
                "SELECT id FROM ocorrencias WHERE id = ? FOR UPDATE",
                [ocorrenciaId]
            );

            let variacao = 0;

            if (PONTOS_POR_ETAPA[etapa]) {
                const [jaPagou] =
                    await conexao.query(
                        "SELECT id FROM pontos_historico WHERE chave_unica = ? LIMIT 1",
                        [`${ocorrenciaId}:${etapa}`]
                    );

                if (jaPagou.length === 0) {
                    await registrarMovimento(conexao, {
                        usuarioId,
                        ocorrenciaId,
                        motivo: etapa,
                        pontos: PONTOS_POR_ETAPA[etapa],
                        chaveUnica: `${ocorrenciaId}:${etapa}`
                    });

                    variacao += PONTOS_POR_ETAPA[etapa];
                }
            }

            // Acerta o saldo da ocorrência: cancelada vale 0, ativa vale tudo o que ganhou.
            if (CANCELAMENTO_REMOVE_PONTOS) {
                const { saldo, ganhos } =
                    await somarPontosDaOcorrencia(conexao, ocorrenciaId);

                const alvo =
                    etapa === "cancelado"
                        ? 0
                        : ganhos;

                const ajuste =
                    alvo - saldo;

                if (ajuste !== 0) {
                    await registrarMovimento(conexao, {
                        usuarioId,
                        ocorrenciaId,
                        motivo: ajuste < 0 ? "cancelamento" : "reabertura",
                        pontos: ajuste
                    });

                    variacao += ajuste;
                }
            }

            await conexao.commit();

            return variacao;

        } catch (error) {
            await conexao.rollback();
            throw error;

        } finally {
            conexao.release();
        }
    },


    async saldoDoUsuario(usuarioId) {
        const [[usuario]] =
            await db.query(
                "SELECT pontos FROM usuarios WHERE id = ?",
                [usuarioId]
            );

        return Number(usuario?.pontos || 0);
    },


    /*
      Tela "Meus pontos": todas as ocorrências do cidadão, cada uma com os
      movimentos de pontos dela (ganhos por etapa, cancelamento, reabertura).
      Ocorrências sem nenhum movimento também vêm, com total 0.
    */
    async historicoDoUsuario(usuarioId) {
        const [ocorrencias] =
            await db.query(
                `SELECT
                    o.id,
                    o.titulo,
                    o.bairro,
                    o.data_criacao,
                    s.nome AS status,
                    c.nome AS categoria
                 FROM ocorrencias o
                 INNER JOIN status_ocorrencia s ON s.id = o.status_id
                 INNER JOIN categorias_ocorrencia c ON c.id = o.categoria_id
                 WHERE o.usuario_id = ?
                 ORDER BY o.data_criacao DESC, o.id DESC`,
                [usuarioId]
            );

        const [movimentos] =
            await db.query(
                `SELECT
                    ocorrencia_id,
                    motivo,
                    pontos,
                    data_criacao
                 FROM pontos_historico
                 WHERE usuario_id = ?
                 ORDER BY data_criacao ASC, id ASC`,
                [usuarioId]
            );

        const movimentosPorOcorrencia =
            new Map();

        for (const movimento of movimentos) {
            const id =
                Number(movimento.ocorrencia_id);

            if (!movimentosPorOcorrencia.has(id)) {
                movimentosPorOcorrencia.set(id, []);
            }

            movimentosPorOcorrencia.get(id).push({
                motivo: movimento.motivo,
                pontos: Number(movimento.pontos),
                data: movimento.data_criacao
            });
        }

        return ocorrencias.map((ocorrencia) => {
            const lista =
                movimentosPorOcorrencia.get(Number(ocorrencia.id)) || [];

            return {
                id: Number(ocorrencia.id),
                titulo: ocorrencia.titulo,
                bairro: ocorrencia.bairro,
                categoria: ocorrencia.categoria,
                status: ocorrencia.status,
                data_criacao: ocorrencia.data_criacao,

                // Soma de tudo: cancelada fica 0.
                total: lista.reduce((soma, item) => soma + item.pontos, 0),

                // Só o que as etapas pagaram (mostra o que a cancelada perdeu).
                ganhos: lista
                    .filter((item) => item.pontos > 0 && item.motivo !== "reabertura")
                    .reduce((soma, item) => soma + item.pontos, 0),

                movimentos: lista
            };
        });
    }
};

module.exports =
    PontosModel;
