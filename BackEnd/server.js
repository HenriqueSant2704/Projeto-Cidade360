// Importa o path para trabalhar com caminhos de arquivos
const path = require("path");

// Importa o fs para verificar se arquivos existem
const fs = require("fs");

// Carrega o .env da pasta BackEnd
require("dotenv").config({
  path: path.resolve(__dirname, ".env")
});

// Importa o Express
const express = require("express");

// Importa o CORS
const cors = require("cors");

// Importa a conexão com o banco
const db = require("./src/config/db");

// Importa as rotas de autenticação
const authRoutes = require("./src/routes/authRoutes");

// Cria a aplicação
const app = express();

// Define a porta
const PORT = process.env.PORT || 3000;

// Caminhos principais do projeto
const caminhoFrontEnd = path.join(__dirname, "../FrontEnd");
const caminhoAssets = path.join(__dirname, "../assets");

// Páginas reais do seu projeto
const caminhoHome = path.join(caminhoFrontEnd, "index.html");
const caminhoPainel = path.join(caminhoFrontEnd, "pages/painel/index.html");
const caminhoLogin = path.join(caminhoFrontEnd, "pages/login/login.html");

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do FrontEnd
app.use(express.static(caminhoFrontEnd));

// Servir assets
app.use("/assets", express.static(caminhoAssets));

// Mantém compatibilidade com caminhos antigos que usam /FrontEnd
app.use("/FrontEnd", express.static(caminhoFrontEnd));

// Rota principal do sistema
app.get("/", (req, res) => {
  if (fs.existsSync(caminhoHome)) {
    return res.sendFile(caminhoHome);
  }

  if (fs.existsSync(caminhoPainel)) {
    return res.sendFile(caminhoPainel);
  }

  return res.status(404).send(`
    <h1>Home não encontrada</h1>
    <p>O servidor tentou encontrar:</p>
    <pre>${caminhoHome}</pre>
    <p>ou:</p>
    <pre>${caminhoPainel}</pre>
  `);
});

// Rota direta para login
app.get("/login", (req, res) => {
  if (fs.existsSync(caminhoLogin)) {
    return res.sendFile(caminhoLogin);
  }

  return res.status(404).send(`
    <h1>Login não encontrado</h1>
    <p>O servidor tentou encontrar:</p>
    <pre>${caminhoLogin}</pre>
  `);
});

// Rota direta do arquivo de login
app.get("/pages/login/login.html", (req, res) => {
  if (fs.existsSync(caminhoLogin)) {
    return res.sendFile(caminhoLogin);
  }

  return res.status(404).send("Login não encontrado.");
});

// Se por algum motivo ainda tentar abrir Produtos, manda para a Home
app.get("/pages/Produtos/produtos.html", (req, res) => {
  return res.redirect("/");
});

app.get("/Frontend/pages/Produtos/produtos.html", (req, res) => {
  return res.redirect("/");
});

app.get("/FrontEnd/pages/Produtos/produtos.html", (req, res) => {
  return res.redirect("/");
});

// Teste da API e banco
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

// Rotas da API
app.use("/api", authRoutes);

// Qualquer rota desconhecida volta para a Home
app.get("*", (req, res) => {
  if (fs.existsSync(caminhoHome)) {
    return res.sendFile(caminhoHome);
  }

  if (fs.existsSync(caminhoPainel)) {
    return res.sendFile(caminhoPainel);
  }

  return res.status(404).send("Página não encontrada.");
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log("======================================");
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Home: http://localhost:${PORT}`);
  console.log(`Login: http://localhost:${PORT}/login`);
  console.log(`Teste API: http://localhost:${PORT}/api/teste`);
  console.log("======================================");
});