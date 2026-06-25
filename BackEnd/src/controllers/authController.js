// Importa o bcrypt para criptografar e comparar senhas
const bcrypt = require("bcryptjs");

// Importa o model de usuários
const UsuarioModel = require("../models/usuarioModel");

// Importa a função que gera token JWT
const gerarToken = require("../utils/gerarToken");

// Controller responsável por autenticação
const AuthController = {
  // Login do usuário
  async login(req, res) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({
          sucesso: false,
          mensagem: "Preencha email e senha."
        });
      }

      const usuario = await UsuarioModel.buscarPorEmail(email);

      if (!usuario) {
        return res.status(401).json({
          sucesso: false,
          mensagem: "Email ou senha inválidos."
        });
      }

      if (usuario.ativo === 0 || usuario.ativo === false) {
        return res.status(403).json({
          sucesso: false,
          mensagem: "Usuário inativo. Entre em contato com o administrador."
        });
      }

      const senhaBanco = usuario.senha_hash;

      if (!senhaBanco) {
        return res.status(500).json({
          sucesso: false,
          mensagem: "Usuário sem senha cadastrada."
        });
      }

      const senhaEhHash =
        senhaBanco.startsWith("$2a$") ||
        senhaBanco.startsWith("$2b$") ||
        senhaBanco.startsWith("$2y$");

      let senhaCorreta = false;

      if (senhaEhHash) {
        senhaCorreta = await bcrypt.compare(senha, senhaBanco);
      } else {
        senhaCorreta = senha === senhaBanco;
      }

      if (!senhaCorreta) {
        return res.status(401).json({
          sucesso: false,
          mensagem: "Email ou senha inválidos."
        });
      }

      const token = gerarToken(usuario);

      return res.status(200).json({
        sucesso: true,
        mensagem: "Login realizado com sucesso.",
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          telefone: usuario.telefone,
          cpf: usuario.cpf,
          tipo_usuario: usuario.tipo_usuario,
          pontos: usuario.pontos,
          ativo: Boolean(usuario.ativo),
          data_cadastro: usuario.data_cadastro
        }
      });

    } catch (error) {
      console.error("Erro no login:", error);

      return res.status(500).json({
        sucesso: false,
        mensagem: "Erro interno no servidor.",
        erro: error.message
      });
    }
  },

  // Cadastro de usuário
  async cadastrar(req, res) {
    try {
      const { nome, email, telefone, cpf, senha, tipo_usuario } = req.body;

      if (!nome || !email || !telefone || !cpf || !senha) {
        return res.status(400).json({
          sucesso: false,
          mensagem: "Preencha nome, email, telefone, CPF e senha."
        });
      }

      const usuarioExiste = await UsuarioModel.buscarPorEmail(email);

      if (usuarioExiste) {
        return res.status(409).json({
          sucesso: false,
          mensagem: "Esse email já está cadastrado."
        });
      }

      const cpfExiste = await UsuarioModel.buscarPorCpf(cpf);

      if (cpfExiste) {
        return res.status(409).json({
          sucesso: false,
          mensagem: "Esse CPF já está cadastrado."
        });
      }

      const senhaHash = await bcrypt.hash(senha, 10);

      const idCriado = await UsuarioModel.cadastrar({
        nome,
        email,
        telefone,
        cpf,
        senhaHash,
        tipoUsuario: tipo_usuario || "CIDADAO"
      });

      return res.status(201).json({
        sucesso: true,
        mensagem: "Usuário cadastrado com sucesso.",
        id: idCriado
      });

    } catch (error) {
      console.error("Erro ao cadastrar:", error);

      return res.status(500).json({
        sucesso: false,
        mensagem: "Erro interno no servidor.",
        erro: error.message
      });
    }
  },

  // Retorna dados do usuário logado
  async me(req, res) {
    try {
      return res.status(200).json({
        sucesso: true,
        usuario: req.usuario
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: "Erro interno no servidor."
      });
    }
  }
};

module.exports = AuthController;