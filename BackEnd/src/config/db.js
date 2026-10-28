const mysql = require("mysql2/promise");
const path = require("path");
const fs = require("fs");

require("dotenv").config({
    path: path.resolve(__dirname, "../../.env")
});

const host = process.env.DB_HOST;
const caConfigurada = String(process.env.DB_SSL_CA || "").trim();
const hostLocal = ["localhost", "127.0.0.1", "::1"].includes(host);

if (!hostLocal && !caConfigurada) {
    throw new Error("DB_SSL_CA é obrigatório para conexões remotas com o banco.");
}

const ssl = caConfigurada
    ? {
        ca: fs.readFileSync(path.resolve(__dirname, "../..", caConfigurada)),
        rejectUnauthorized: true
    }
    : undefined;

const db = mysql.createPool({
    host,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,

    ssl
});

module.exports = db;
