const { temPermissao } = require("../utils/permissoesAdmin");

function permissaoMiddleware(chave) {
    return (req, res, next) => {
        if (!temPermissao(req.usuario, chave)) {
            return res.status(403).json({
                sucesso: false,
                codigo: "SEM_PERMISSAO",
                mensagem: "Você não tem permissão para esta ação."
            });
        }
        next();
    };
}

module.exports = permissaoMiddleware;
