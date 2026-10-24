const db = require("../config/db");


/*========================================================================================================

CAMPOS DO AVISO

data_evento volta como texto sem fuso ("2026-10-31T09:00:00"), para o navegador mostrar
exatamente o horário que o administrador digitou, mesmo com o servidor em outro fuso.

=========================================================================================================*/

const CAMPOS_AVISO = `
    a.id,
    a.categoria,
    a.titulo,
    a.texto,
    DATE_FORMAT(a.data_evento, '%Y-%m-%dT%H:%i:%s') AS data_evento,
    a.local_evento,
    a.foto_url,
    a.foto_public_id,
    a.fixado,
    a.data_criacao,
    a.data_atualizacao
`;


/*========================================================================================================

MONTA AS CONTAGENS DE REAÇÕES

Devolve só quantidades por emoji e a reação do próprio usuário.
Nunca devolve quem reagiu.

=========================================================================================================*/

async function anexarReacoes(
    avisos,
    usuarioId
) {
    if (avisos.length === 0) {
        return avisos;
    }

    const ids =
        avisos.map(
            (aviso) => aviso.id
        );

    const marcadores =
        ids.map(() => "?").join(", ");

    const [contagens] =
        await db.query(
            `SELECT aviso_id, reacao, COUNT(*) AS total
             FROM reacoes_aviso
             WHERE aviso_id IN (${marcadores})
             GROUP BY aviso_id, reacao`,
            ids
        );

    const [minhas] =
        await db.query(
            `SELECT aviso_id, reacao
             FROM reacoes_aviso
             WHERE usuario_id = ?
               AND aviso_id IN (${marcadores})`,
            [
                usuarioId,
                ...ids
            ]
        );

    const reacoesPorAviso = new Map();

    for (const linha of contagens) {
        const reacoes =
            reacoesPorAviso.get(linha.aviso_id) || {};

        reacoes[linha.reacao] =
            Number(linha.total);

        reacoesPorAviso.set(
            linha.aviso_id,
            reacoes
        );
    }

    const minhaPorAviso =
        new Map(
            minhas.map(
                (linha) => [linha.aviso_id, linha.reacao]
            )
        );

    return avisos.map((aviso) => ({
        ...formatarAviso(aviso),

        reacoes:
            reacoesPorAviso.get(aviso.id) || {},

        minha_reacao:
            minhaPorAviso.get(aviso.id) || null
    }));
}


function formatarAviso(aviso) {
    return {
        id:
            Number(aviso.id),

        categoria:
            aviso.categoria,

        titulo:
            aviso.titulo,

        texto:
            aviso.texto,

        data_evento:
            aviso.data_evento || null,

        local_evento:
            aviso.local_evento || null,

        foto_url:
            aviso.foto_url || null,

        fixado:
            Boolean(aviso.fixado),

        data_criacao:
            aviso.data_criacao,

        data_atualizacao:
            aviso.data_atualizacao
    };
}


/*========================================================================================================

MODEL

=========================================================================================================*/

const AvisoModel = {

    async listar({
        usuarioId,
        limite = 50
    }) {
        const [avisos] =
            await db.query(
                `SELECT ${CAMPOS_AVISO}
                 FROM avisos a
                 WHERE a.ativo = 1
                 ORDER BY a.fixado DESC, a.data_criacao DESC, a.id DESC
                 LIMIT ?`,
                [
                    limite
                ]
            );

        return anexarReacoes(
            avisos,
            usuarioId
        );
    },


    // Busca também avisos excluídos, para o administrador poder restaurar.
    async buscarPorId(
        id,
        {
            incluirRemovidos = false
        } = {}
    ) {
        const [linhas] =
            await db.query(
                `SELECT ${CAMPOS_AVISO}, a.ativo
                 FROM avisos a
                 WHERE a.id = ?
                 ${incluirRemovidos ? "" : "AND a.ativo = 1"}
                 LIMIT 1`,
                [
                    id
                ]
            );

        return linhas[0] || null;
    },


    async buscarCompletoPorId(
        id,
        usuarioId
    ) {
        const aviso =
            await this.buscarPorId(id);

        if (!aviso) {
            return null;
        }

        const [completo] =
            await anexarReacoes(
                [aviso],
                usuarioId
            );

        return completo;
    },


    async criar({
        categoria,
        titulo,
        texto,
        dataEvento,
        localEvento,
        fotoUrl,
        fotoPublicId,
        fixado,
        usuarioId
    }) {
        const [resultado] =
            await db.execute(
                `INSERT INTO avisos (
                    categoria,
                    titulo,
                    texto,
                    data_evento,
                    local_evento,
                    foto_url,
                    foto_public_id,
                    fixado,
                    criado_por
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    categoria,
                    titulo,
                    texto,
                    dataEvento,
                    localEvento,
                    fotoUrl,
                    fotoPublicId,
                    fixado ? 1 : 0,
                    usuarioId
                ]
            );

        return resultado.insertId;
    },


    async atualizar(
        id,
        {
            categoria,
            titulo,
            texto,
            dataEvento,
            localEvento,
            fotoUrl,
            fotoPublicId,
            fixado,
            usuarioId
        }
    ) {
        const [resultado] =
            await db.execute(
                `UPDATE avisos
                 SET categoria = ?,
                     titulo = ?,
                     texto = ?,
                     data_evento = ?,
                     local_evento = ?,
                     foto_url = ?,
                     foto_public_id = ?,
                     fixado = ?,
                     atualizado_por = ?
                 WHERE id = ?
                   AND ativo = 1`,
                [
                    categoria,
                    titulo,
                    texto,
                    dataEvento,
                    localEvento,
                    fotoUrl,
                    fotoPublicId,
                    fixado ? 1 : 0,
                    usuarioId,
                    id
                ]
            );

        return resultado.affectedRows > 0;
    },


    async definirFixado(
        id,
        fixado,
        usuarioId
    ) {
        const [resultado] =
            await db.execute(
                `UPDATE avisos
                 SET fixado = ?,
                     atualizado_por = ?
                 WHERE id = ?
                   AND ativo = 1`,
                [
                    fixado ? 1 : 0,
                    usuarioId,
                    id
                ]
            );

        return resultado.affectedRows > 0;
    },


    // Exclusão lógica: o aviso some para todos, mas pode ser restaurado.
    async remover(
        id,
        usuarioId
    ) {
        const [resultado] =
            await db.execute(
                `UPDATE avisos
                 SET ativo = 0,
                     removido_por = ?,
                     data_remocao = NOW()
                 WHERE id = ?
                   AND ativo = 1`,
                [
                    usuarioId,
                    id
                ]
            );

        return resultado.affectedRows > 0;
    },


    async restaurar(
        id,
        usuarioId
    ) {
        const [resultado] =
            await db.execute(
                `UPDATE avisos
                 SET ativo = 1,
                     removido_por = NULL,
                     data_remocao = NULL,
                     atualizado_por = ?
                 WHERE id = ?
                   AND ativo = 0`,
                [
                    usuarioId,
                    id
                ]
            );

        return resultado.affectedRows > 0;
    },


    // Uma reação por pessoa: se já existir, troca o emoji.
    async definirReacao(
        avisoId,
        usuarioId,
        reacao
    ) {
        await db.execute(
            `INSERT INTO reacoes_aviso (
                aviso_id,
                usuario_id,
                reacao
            )
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                reacao = VALUES(reacao)`,
            [
                avisoId,
                usuarioId,
                reacao
            ]
        );
    },


    async removerReacao(
        avisoId,
        usuarioId
    ) {
        await db.execute(
            `DELETE FROM reacoes_aviso
             WHERE aviso_id = ?
               AND usuario_id = ?`,
            [
                avisoId,
                usuarioId
            ]
        );
    }
};


module.exports =
    AvisoModel;
