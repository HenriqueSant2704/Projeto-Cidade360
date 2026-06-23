const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, ".env")
});

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./src/config/db");

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "cidade360_chave_padrao";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "2h";

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/FrontEnd", express.static(path.join(__dirname, "../FrontEnd")));
app.use("/assets", express.static(path.join(__dirname, "../assets")));
app.use(express.static(path.join(__dirname, "../FrontEnd")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../FrontEnd/login.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../FrontEnd/login.html"));
});

app.get("/api/teste", async (req, res) => {
  try {
    const [resultado] = await db.execute("SELECT 1 AS conectado");

    return res.status(200).json({
      sucesso: true,
      mensagem: "API e banco conectados com sucesso.",
      resultado
    });
  } catch (error) {
    console.error("Erro ao testar conexão com o banco:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao conectar com o banco.",
      erro: error.message
    });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    console.log("Tentativa de login:", email);

    if (!email || !senha) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Preencha email e senha."
      });
    }

    const [usuarios] = await db.execute(
      `
      SELECT 
        id,
        nome,
        email,
        telefone,
        senha_hash,
        tipo_usuario,
        pontos,
        ativo
      FROM usuarios
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Email ou senha inválidos."
      });
    }

    const usuario = usuarios[0];

    if (usuario.ativo === 0 || usuario.ativo === false) {
      return res.status(403).json({
        sucesso: false,
        mensagem: "Usuário inativo."
      });
    }

    const senhaBanco = usuario.senha_hash;

    if (!senhaBanco) {
      return res.status(500).json({
        sucesso: false,
        mensagem: "Senha do usuário não encontrada no banco."
      });
    }

    let senhaCorreta = false;

    const pareceHashBcrypt =
      senhaBanco.startsWith("$2a$") ||
      senhaBanco.startsWith("$2b$") ||
      senhaBanco.startsWith("$2y$");

    if (pareceHashBcrypt) {
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

    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN
      }
    );

    return res.status(200).json({
      sucesso: true,
      mensagem: "Login realizado com sucesso.",
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
        tipo_usuario: usuario.tipo_usuario,
        pontos: usuario.pontos,
        ativo: Boolean(usuario.ativo)
      }
    });

  } catch (error) {
    console.error("Erro completo no login:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno no servidor.",
      erro: error.message
    });
  }
});

app.post("/api/cadastrar", async (req, res) => {
  try {
    const { nome, email, telefone, senha, tipo_usuario } = req.body;

    if (!nome || !email || !telefone || !senha) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Preencha nome, email, telefone e senha."
      });
    }

    const [usuarioExiste] = await db.execute(
      "SELECT id FROM usuarios WHERE email = ? LIMIT 1",
      [email]
    );

    if (usuarioExiste.length > 0) {
      return res.status(409).json({
        sucesso: false,
        mensagem: "Esse email já está cadastrado."
      });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    await db.execute(
      `
      INSERT INTO usuarios 
      (
        nome,
        email,
        telefone,
        senha_hash,
        tipo_usuario
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        nome,
        email,
        telefone,
        senhaHash,
        tipo_usuario || "CIDADAO"
      ]
    );

    return res.status(201).json({
      sucesso: true,
      mensagem: "Usuário cadastrado com sucesso."
    });

  } catch (error) {
    console.error("Erro ao cadastrar usuário:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno no servidor.",
      erro: error.message
    });
  }
});

function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      sucesso: false,
      mensagem: "Token não informado."
    });
  }

  const partes = authHeader.split(" ");

  if (partes.length !== 2) {
    return res.status(401).json({
      sucesso: false,
      mensagem: "Token mal formatado."
    });
  }

  const [tipo, token] = partes;

  if (tipo !== "Bearer") {
    return res.status(401).json({
      sucesso: false,
      mensagem: "Tipo de token inválido."
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      sucesso: false,
      mensagem: "Token inválido ou expirado."
    });
  }
}

app.get("/api/me", verificarToken, async (req, res) => {
  try {
    const [usuarios] = await db.execute(
      `
      SELECT 
        id,
        nome,
        email,
        telefone,
        tipo_usuario,
        pontos,
        ativo,
        data_cadastro
      FROM usuarios
      WHERE id = ?
      LIMIT 1
      `,
      [req.usuario.id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Usuário não encontrado."
      });
    }

    return res.status(200).json({
      sucesso: true,
      usuario: usuarios[0]
    });

  } catch (error) {
    console.error("Erro ao buscar usuário:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno no servidor.",
      erro: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});