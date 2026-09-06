// Importa a biblioteca JWT para validar o token
const jwt = require("jsonwebtoken");

// Importa o model de usuário para buscar os dados atualizados no banco
const UsuarioModel = require("../models/usuarioModel");

// Middleware que verifica se o usuário está logado
async function authMiddleware(req, res, next) {
  try {
    // Pega o cabeçalho Authorization
    const authHeader = req.headers.authorization;

    // Se não veio Authorization, o usuário não está logado
    if (!authHeader) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Token não informado."
      });
    }

    // O formato correto é: Bearer TOKEN
    const partes = authHeader.split(" ");

    if (partes.length !== 2) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Token mal formatado."
      });
    }

    const [tipo, token] = partes;

    // Verifica se o tipo é Bearer
    if (tipo !== "Bearer") {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Tipo de token inválido."
      });
    }

    // Valida o token usando a chave secreta do .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Busca o usuário no banco pelo id salvo no token
    const usuario = await UsuarioModel.buscarPorId(decoded.id);

    // Se o usuário não existir mais, bloqueia
    if (!usuario) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Usuário não encontrado."
      });
    }

    // Se o usuário estiver inativo, bloqueia
    if (usuario.ativo === 0 || usuario.ativo === false) {
      return res.status(403).json({
        sucesso: false,
        mensagem: "Usuário inativo."
      });
    }

    // Salva o usuário na requisição para as próximas rotas usarem
    req.usuario = usuario;

    // Continua para a próxima função
    next();

  } catch (error) {
    return res.status(401).json({
      sucesso: false,
      mensagem: "Token inválido ou expirado."
    });
  }
}

// Exporta o middleware
module.exports = authMiddleware;