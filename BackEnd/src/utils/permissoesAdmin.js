const CHAVES = Object.freeze(["ocorrencias", "avisos", "equipe"]);

function vazias(configurado = true) {
    return { principal: false, ocorrencias: false, avisos: false, equipe: false, configurado };
}

function normalizarLinha(linha) {
    if (!linha) return vazias();
    return {
        principal: Boolean(linha.principal),
        ocorrencias: Boolean(linha.ocorrencias),
        avisos: Boolean(linha.avisos),
        equipe: Boolean(linha.equipe),
        configurado: true
    };
}

function legado() {
    return { principal: false, ocorrencias: true, avisos: true, equipe: true, configurado: false };
}

function temPermissao(usuario, chave) {
    if (usuario?.tipo_usuario !== "ADMIN" || !CHAVES.includes(chave)) return false;
    return Boolean(usuario.permissoes?.principal || usuario.permissoes?.[chave]);
}

function interpretarSelecao(valor, { permitirVazio = false } = {}) {
    if (!Array.isArray(valor) || (!permitirVazio && valor.length === 0) ||
        valor.some((chave) => typeof chave !== "string" || !CHAVES.includes(chave)) ||
        new Set(valor).size !== valor.length) {
        return null;
    }
    return Object.fromEntries(CHAVES.map((chave) => [chave, valor.includes(chave)]));
}

function podeDar(ator, selecao) {
    if (!selecao) return false;
    if (ator?.permissoes?.principal) return true;
    return !selecao.equipe && CHAVES.every((chave) => !selecao[chave] || temPermissao(ator, chave));
}

function podeGerenciar(ator, alvo) {
    if (!temPermissao(ator, "equipe") || Number(ator.id) === Number(alvo?.id)) return false;
    if (alvo?.permissoes?.principal) return false;
    return Boolean(ator.permissoes?.principal || !alvo?.permissoes?.equipe);
}

function lista(permissoes) {
    return CHAVES.filter((chave) => permissoes?.[chave]);
}

module.exports = { CHAVES, vazias, normalizarLinha, legado, temPermissao, interpretarSelecao, podeDar, podeGerenciar, lista };
