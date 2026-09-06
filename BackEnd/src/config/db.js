const mysql = require("mysql2/promise");
const path = require("path");
const fs = require("fs");

require("dotenv").config({
    path: path.resolve(__dirname, "../../.env")
});

const sslCaPath = path.resolve(
    path.dirname(path.resolve(__dirname, "../../.env")),
    process.env.DB_SSL_CA
);

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,

    ssl: {
        ca: fs.readFileSync(sslCaPath),
        rejectUnauthorized: true
    }
});

module.exports = db;