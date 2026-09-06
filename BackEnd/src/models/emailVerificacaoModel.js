const db = require("../config/db");

async function invalidarCodigosEmail(email) {
    const sql = `
        UPDATE email_verificacao_cadastro
        SET 
            codigo_usado = 1,
            token_expira_em = NOW()
        WHERE email = ?
          AND codigo_usado = 0
    `;

    await db.execute(sql, [email]);
}

async function criarCodigoEmail(email, codigoHash) {
    const sql = `
        INSERT INTO email_verificacao_cadastro
        (email, codigo_hash, codigo_usado, verificado, expira_em)
        VALUES (?, ?, 0, 0, DATE_ADD(NOW(), INTERVAL 15 MINUTE))
    `;

    await db.execute(sql, [email, codigoHash]);
}

async function buscarCodigoValidoEmail(email) {
    const sql = `
        SELECT id, codigo_hash
        FROM email_verificacao_cadastro
        WHERE email = ?
          AND codigo_usado = 0
          AND verificado = 0
          AND expira_em > NOW()
        ORDER BY id DESC
        LIMIT 1
    `;

    const [resultado] = await db.execute(sql, [email]);

    return resultado[0];
}

async function confirmarCodigoEmail(id, tokenHash) {
    const sql = `
        UPDATE email_verificacao_cadastro
        SET 
            codigo_usado = 1,
            verificado = 1,
            token_hash = ?,
            token_expira_em = DATE_ADD(NOW(), INTERVAL 30 MINUTE)
        WHERE id = ?
    `;

    await db.execute(sql, [tokenHash, id]);
}

async function buscarTokenValidoEmail(email, tokenHash) {
    const sql = `
        SELECT id, email
        FROM email_verificacao_cadastro
        WHERE email = ?
          AND token_hash = ?
          AND verificado = 1
          AND token_expira_em > NOW()
        ORDER BY id DESC
        LIMIT 1
    `;

    const [resultado] = await db.execute(sql, [email, tokenHash]);

    return resultado[0];
}

async function consumirTokenEmail(id) {
    const sql = `
        UPDATE email_verificacao_cadastro
        SET token_expira_em = NOW()
        WHERE id = ?
    `;

    await db.execute(sql, [id]);
}

module.exports = {
    invalidarCodigosEmail,
    criarCodigoEmail,
    buscarCodigoValidoEmail,
    confirmarCodigoEmail,
    buscarTokenValidoEmail,
    consumirTokenEmail
};