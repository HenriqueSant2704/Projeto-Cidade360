// Importa o MySQL com suporte a Promise, permitindo usar async/await
const mysql = require("mysql2/promise");

// Importa o path para montar caminhos de arquivos de forma segura
const path = require("path");

// Carrega o arquivo .env que está dentro da pasta BackEnd
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env")
});

// Cria uma pool de conexão com o banco.
// Pool é melhor do que abrir uma conexão nova para cada consulta.
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0
});

// Exporta a conexão para ser usada nos models
module.exports = db;