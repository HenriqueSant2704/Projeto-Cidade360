const db = require("../config/db");

async function invalidarCodigosAnteriores(usuarioId) {
    const sql = `
        UPDATE recuperacao_senha
        SET usado = 1
        WHERE usuario_id = ? AND usado = 0
    `;

    await db.execute(sql, [usuarioId]);
}

async function criarCodigoRecuperacao(usuarioId, codigoHash) {
    const sql = `
        INSERT INTO recuperacao_senha
        (usuario_id, codigo_hash, usado, expira_em)
        VALUES (?, ?, 0, DATE_ADD(NOW(), INTERVAL 15 MINUTE))
    `;

    await db.execute(sql, [usuarioId, codigoHash]);
}

async function buscarCodigoValido(usuarioId) {
    const sql = `
        SELECT id, codigo_hash
        FROM recuperacao_senha
        WHERE usuario_id = ?
          AND usado = 0
          AND expira_em > NOW()
        ORDER BY id DESC
        LIMIT 1
    `;

    const [resultado] = await db.execute(sql, [usuarioId]);
    return resultado[0];
}

async function marcarCodigoComoUsado(id) {
    const sql = `
        UPDATE recuperacao_senha
        SET usado = 1
        WHERE id = ?
    `;

    await db.execute(sql, [id]);
}

module.exports = {
    invalidarCodigosAnteriores,
    criarCodigoRecuperacao,
    buscarCodigoValido,
    marcarCodigoComoUsado
};