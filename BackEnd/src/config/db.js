import dotenv from "dotenv";
import sql from "mssql";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: resolve(__dirname, "../../.env"),
});

let pool;

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variavel de ambiente ausente: ${name}`);
  }

  return value;
}

function getDbConfig() {
  const port = Number(process.env.DB_PORT);
  const database = process.env.DB_DATABASE?.trim();
  const instanceName = process.env.DB_INSTANCE?.trim();

  const config = {
    user: getRequiredEnv("DB_USER"),
    password: getRequiredEnv("DB_PASS"),
    server: getRequiredEnv("DB_SERVER"),
    options: {
      encrypt: process.env.DB_ENCRYPT === "true",
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  if (database) {
    config.database = database;
  }

  if (Number.isInteger(port) && port > 0) {
    config.port = port;
  }

  if (instanceName) {
    config.options.instanceName = instanceName;
  }

  return config;
}

export async function connectDB() {
  if (pool?.connected) {
    return pool;
  }

  pool = await sql.connect(getDbConfig());
  return pool;
}

export { sql };
