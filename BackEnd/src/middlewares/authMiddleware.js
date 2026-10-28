const jwt = require("jsonwebtoken");
const UsuarioModel = require("../models/usuarioModel");
const PermissaoAdminModel = require("../models/permissaoAdminModel");

async function authMiddleware(req, res, next) {
    const partes = String(req.headers.authorization || "").split(" ");
    if (partes.length !== 2 || partes[0] !== "Bearer" || !partes[1]) {
        return res.status(401).json({ sucesso: false, mensagem: "Token não informado ou mal formatado." });
    }

    let decoded;
    try {
        decoded = jwt.verify(partes[1], process.env.JWT_SECRET);
    } catch (error) {
        return res.status(401).json({ sucesso: false, mensagem: "Token inválido ou expirado." });
    }

    try {
        const usuario = await UsuarioModel.buscarPorId(decoded.id);
        if (!usuario) {
            return res.status(404).json({ sucesso: false, mensagem: "Usuário não encontrado." });
        }
        if (!usuario.ativo) {
            return res.status(403).json({ sucesso: false, mensagem: "Usuário inativo." });
        }
        if (usuario.tipo_usuario === "ADMIN") {
            usuario.permissoes = await PermissaoAdminModel.buscar(usuario.id);
        }
        req.usuario = usuario;
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = authMiddleware;
