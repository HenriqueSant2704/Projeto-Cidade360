require("dotenv").config();

const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

async function testar() {
    let connection;

    try {
        const caPath = path.resolve(process.env.DB_SSL_CA);

        console.log("Conectando à Aiven...");
        console.log("Host:", process.env.DB_HOST);
        console.log("Porta:", process.env.DB_PORT);
        console.log("Banco:", process.env.DB_NAME);
        console.log("Certificado:", caPath);

        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,

            ssl: {
                ca: fs.readFileSync(caPath),
                rejectUnauthorized: true
            }
        });

        const [rows] = await connection.query(`
            SELECT
                DATABASE() AS banco,
                VERSION() AS versao
        `);

        console.log("\n✅ CONEXÃO COM AIVEN FUNCIONOU!");
        console.table(rows);

    } catch (error) {
        console.error("\n❌ ERRO NA CONEXÃO:");
        console.error(error.message);

    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testar();