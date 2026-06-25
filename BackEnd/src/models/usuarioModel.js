// Importa a conexão com o banco de dados
const db = require("../config/db");

// Model responsável por conversar diretamente com a tabela usuarios
const UsuarioModel = {
  // Busca um usuário pelo email
  async buscarPorEmail(email) {
    const [usuarios] = await db.execute(
      `
      SELECT
        id,
        nome,
        email,
        telefone,
        cpf,
        senha_hash,
        tipo_usuario,
        pontos,
        ativo,
        data_cadastro
      FROM usuarios
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    return usuarios[0];
  },

  // Busca um usuário pelo CPF
  async buscarPorCpf(cpf) {
    const [usuarios] = await db.execute(
      `
      SELECT
        id,
        nome,
        email,
        telefone,
        cpf,
        tipo_usuario,
        pontos,
        ativo,
        data_cadastro
      FROM usuarios
      WHERE cpf = ?
      LIMIT 1
      `,
      [cpf]
    );

    return usuarios[0];
  },

  // Busca um usuário pelo id
  async buscarPorId(id) {
    const [usuarios] = await db.execute(
      `
      SELECT
        id,
        nome,
        email,
        telefone,
        cpf,
        tipo_usuario,
        pontos,
        ativo,
        data_cadastro
      FROM usuarios
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    return usuarios[0];
  },

  // Cadastra um novo usuário com senha já criptografada
  async cadastrar({ nome, email, telefone, cpf, senhaHash, tipoUsuario }) {
    const [resultado] = await db.execute(
      `
      INSERT INTO usuarios
      (
        nome,
        email,
        telefone,
        cpf,
        senha_hash,
        tipo_usuario
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        nome,
        email,
        telefone,
        cpf,
        senhaHash,
        tipoUsuario || "CIDADAO"
      ]
    );

    return resultado.insertId;
  }
};

module.exports = UsuarioModel;