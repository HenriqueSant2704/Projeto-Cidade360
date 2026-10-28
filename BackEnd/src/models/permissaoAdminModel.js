const db = require("../config/db");
const { normalizarLinha, legado } = require("../utils/permissoesAdmin");

async function buscar(usuarioId, conexao = db) {
    try {
        const [linhas] = await conexao.execute(
            "SELECT principal, ocorrencias, avisos, equipe FROM permissoes_admin WHERE usuario_id = ? LIMIT 1",
            [usuarioId]
        );
        const permissoes = normalizarLinha(linhas[0]);
        permissoes.configurado = await configurado();
        return permissoes;
    } catch (error) {
        if (error.code === "ER_NO_SUCH_TABLE") return legado();
        throw error;
    }
}

async function configurado() {
    try {
        await Promise.all([
            db.query("SELECT principal, ocorrencias, avisos, equipe FROM permissoes_admin LIMIT 0"),
            db.query("SELECT perm_ocorrencias, perm_avisos, perm_equipe FROM convites_admin LIMIT 0"),
            db.query("SELECT detalhe FROM historico_administradores LIMIT 0")
        ]);
        return true;
    } catch (error) {
        if (["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(error.code)) return false;
        throw error;
    }
}

async function buscarVarios(ids, conexao = db) {
    if (!ids.length) return new Map();
    const [linhas] = await conexao.query(
        `SELECT usuario_id, principal, ocorrencias, avisos, equipe
         FROM permissoes_admin WHERE usuario_id IN (${ids.map(() => "?").join(",")})`,
        ids
    );
    return new Map(linhas.map((linha) => [Number(linha.usuario_id), normalizarLinha(linha)]));
}

module.exports = { buscar, buscarVarios, configurado };
