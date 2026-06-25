// Importa a biblioteca JWT
const jwt = require("jsonwebtoken");

// Função responsável por gerar o token do usuário logado
function gerarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      tipo_usuario: usuario.tipo_usuario
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "2h"
    }
  );
}

// Exporta a função para ser usada no controller
module.exports = gerarToken;