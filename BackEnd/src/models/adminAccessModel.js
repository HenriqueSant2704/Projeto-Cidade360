const db = require("../config/db");
const AdministradorModel = require("./administradorModel");
const { normalizarLinha, podeDar, podeGerenciar, temPermissao, lista } = require("../utils/permissoesAdmin");

function falha(status, codigo, mensagem) {
    const error = new Error(mensagem);
    error.status = status;
    error.codigoAplicacao = codigo;
    return error;
}

async function transacao(acao) {
    const conexao = await db.getConnection();
    try {
        await conexao.beginTransaction();
        const resultado = await acao(conexao);
        await conexao.commit();
        return resultado;
    } catch (error) {
        await conexao.rollback();
        throw error;
    } finally {
        conexao.release();
    }
}

async function contexto(conexao, atorId, alvoId) {
    const ids = [...new Set([Number(atorId), Number(alvoId)])].sort((a, b) => a - b);
    const [usuarios] = await conexao.query(
        `SELECT id, nome, email, tipo_usuario, ativo FROM usuarios
         WHERE id IN (${ids.map(() => "?").join(",")}) ORDER BY id FOR UPDATE`,
        ids
    );
    const [linhas] = await conexao.query(
        `SELECT usuario_id, principal, ocorrencias, avisos, equipe FROM permissoes_admin
         WHERE usuario_id IN (${ids.map(() => "?").join(",")}) ORDER BY usuario_id FOR UPDATE`,
        ids
    );
    const permissoes = new Map(linhas.map((linha) => [Number(linha.usuario_id), normalizarLinha(linha)]));
    const obter = (id) => {
        const usuario = usuarios.find((linha) => Number(linha.id) === Number(id));
        return usuario && { ...usuario, permissoes: permissoes.get(Number(id)) || normalizarLinha(null) };
    };
    const ator = obter(atorId);
    if (!ator?.ativo || !temPermissao(ator, "equipe")) {
        throw falha(403, "SEM_PERMISSAO", "Seu acesso à equipe mudou. Atualize a página.");
    }
    return { ator, alvo: obter(alvoId) };
}

async function historico(conexao, acao, alvo, ator, detalhe = null) {
    await AdministradorModel.registrarHistorico({
        acao,
        usuarioId: alvo.id,
        nomeUsuario: alvo.nome,
        emailUsuario: alvo.email,
        feitoPor: ator.id,
        nomeFeitoPor: ator.nome,
        detalhe
    }, conexao);
}

function exigirGerenciamento(ator, alvo) {
    if (Number(ator.id) === Number(alvo?.id)) {
        throw falha(400, "ACAO_PROPRIA", "Você não pode mudar o próprio acesso.");
    }
    if (!podeGerenciar(ator, alvo)) {
        throw falha(403, "SEM_PERMISSAO_SOBRE_ALVO", "Você não pode alterar o acesso deste administrador.");
    }
}

function exigirPodeDar(ator, selecao) {
    if (!podeDar(ator, selecao)) {
        throw falha(403, "PERMISSAO_NAO_PERMITIDA", "Você só pode conceder permissões que possui. Equipe é concedida pelo principal.");
    }
}

async function promover({ atorId, alvoId, selecao }) {
    return transacao(async (conexao) => {
        const { ator, alvo } = await contexto(conexao, atorId, alvoId);
        if (!alvo?.ativo) throw falha(404, "USUARIO_NAO_ENCONTRADO", "Essa conta não foi encontrada.");
        if (alvo.tipo_usuario !== "CIDADAO") throw falha(409, "JA_ADMIN", "Essa conta já é administradora.");
        exigirPodeDar(ator, selecao);
        await conexao.execute("UPDATE usuarios SET tipo_usuario = 'ADMIN' WHERE id = ?", [alvoId]);
        await conexao.execute(
            "INSERT INTO permissoes_admin (usuario_id, ocorrencias, avisos, equipe) VALUES (?, ?, ?, ?)",
            [alvoId, Number(selecao.ocorrencias), Number(selecao.avisos), Number(selecao.equipe)]
        );
        await historico(conexao, "PROMOVIDO", alvo, ator, `Permissões: ${lista(selecao).join(", ")}`);
        return alvo;
    });
}

async function remover({ atorId, alvoId }) {
    return transacao(async (conexao) => {
        const { ator, alvo } = await contexto(conexao, atorId, alvoId);
        if (!alvo?.ativo || alvo.tipo_usuario !== "ADMIN") {
            throw falha(404, "ADMIN_NAO_ENCONTRADO", "Esse administrador não foi encontrado.");
        }
        exigirGerenciamento(ator, alvo);
        await conexao.execute("DELETE FROM permissoes_admin WHERE usuario_id = ?", [alvoId]);
        await conexao.execute("UPDATE usuarios SET tipo_usuario = 'CIDADAO' WHERE id = ?", [alvoId]);
        await historico(conexao, "REMOVIDO", alvo, ator);
        return alvo;
    });
}

async function alterarPermissoes({ atorId, alvoId, selecao }) {
    return transacao(async (conexao) => {
        const { ator, alvo } = await contexto(conexao, atorId, alvoId);
        if (!alvo?.ativo || alvo.tipo_usuario !== "ADMIN") {
            throw falha(404, "ADMIN_NAO_ENCONTRADO", "Esse administrador não foi encontrado.");
        }
        exigirGerenciamento(ator, alvo);
        exigirPodeDar(ator, selecao);
        const antes = lista(alvo.permissoes);
        const depois = lista(selecao);
        await conexao.execute(
            `INSERT INTO permissoes_admin (usuario_id, ocorrencias, avisos, equipe)
             VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE ocorrencias=VALUES(ocorrencias),
             avisos=VALUES(avisos), equipe=VALUES(equipe)`,
            [alvoId, Number(selecao.ocorrencias), Number(selecao.avisos), Number(selecao.equipe)]
        );
        await historico(conexao, "PERMISSOES_ALTERADAS", alvo, ator,
            `De: ${antes.join(", ") || "nenhuma"}; para: ${depois.join(", ") || "nenhuma"}`);
        return { ...alvo, permissoes: { ...alvo.permissoes, ...selecao } };
    });
}

async function transferirPrincipal({ atorId, alvoId }) {
    return transacao(async (conexao) => {
        const { ator, alvo } = await contexto(conexao, atorId, alvoId);
        if (!ator.permissoes.principal) throw falha(403, "SO_PRINCIPAL", "Só o administrador principal pode passar o cargo.");
        if (!alvo?.ativo || alvo.tipo_usuario !== "ADMIN") {
            throw falha(404, "ADMIN_NAO_ENCONTRADO", "Esse administrador não foi encontrado.");
        }
        if (Number(ator.id) === Number(alvo.id)) throw falha(400, "ACAO_PROPRIA", "Você já é o administrador principal.");
        await conexao.execute("UPDATE permissoes_admin SET principal = 0 WHERE usuario_id = ? AND principal = 1", [atorId]);
        await conexao.execute(
            `INSERT INTO permissoes_admin (usuario_id, principal, ocorrencias, avisos, equipe)
             VALUES (?, 1, 1, 1, 1)
             ON DUPLICATE KEY UPDATE principal=1, ocorrencias=1, avisos=1, equipe=1`,
            [alvoId]
        );
        await historico(conexao, "PRINCIPAL_TRANSFERIDO", alvo, ator, `Cargo transferido de ${ator.nome}`);
        return alvo;
    });
}

module.exports = { promover, remover, alterarPermissoes, transferirPrincipal, falha };
