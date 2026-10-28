const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const db = require("../src/config/db");
const AdministradorModel = require("../src/models/administradorModel");
const { login: limiteLogin } = require("../src/middlewares/limiteTentativas");

test("login devolve 429 depois do limite de tentativas", async () => {
    const app = express();
    app.set("trust proxy", 1);
    app.post("/login", limiteLogin, (req, res) => res.json({ sucesso: true }));

    const servidor = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => servidor.once("listening", resolve));

    try {
        const url = `http://127.0.0.1:${servidor.address().port}/login`;
        for (let i = 0; i < 30; i++) {
            const resposta = await fetch(url, { method: "POST" });
            assert.equal(resposta.status, 200);
        }
        const bloqueada = await fetch(url, { method: "POST" });
        assert.equal(bloqueada.status, 429);
        assert.equal((await bloqueada.json()).sucesso, false);
    } finally {
        await new Promise((resolve) => servidor.close(resolve));
    }
});

test("falha ao gravar histórico desfaz a promoção", async () => {
    const original = db.getConnection;
    const chamadas = [];
    db.getConnection = async () => ({
        async beginTransaction() { chamadas.push("begin"); },
        async execute(sql) {
            if (sql.includes("SELECT id FROM usuarios")) {
                return [[{ id: 1 }, { id: 2 }]];
            }
            if (sql.includes("UPDATE usuarios")) {
                chamadas.push("update");
                return [{ affectedRows: 1 }];
            }
            throw new Error("histórico indisponível");
        },
        async commit() { chamadas.push("commit"); },
        async rollback() { chamadas.push("rollback"); },
        release() { chamadas.push("release"); }
    });

    try {
        await assert.rejects(
            AdministradorModel.trocarTipoComHistorico({
                usuarioId: 2,
                tipoAtual: "CIDADAO",
                tipoNovo: "ADMIN",
                usuario: { nome: "Teste", email: "teste@example.com" },
                feitoPor: { id: 1, nome: "Admin" }
            }),
            /histórico indisponível/
        );
        assert.deepEqual(chamadas, ["begin", "update", "rollback", "release"]);
    } finally {
        db.getConnection = original;
    }
});

test("remoção do último administrador é recusada", async () => {
    const original = db.getConnection;
    const chamadas = [];
    db.getConnection = async () => ({
        async beginTransaction() { chamadas.push("begin"); },
        async execute(sql) {
            assert.match(sql, /SELECT id FROM usuarios/);
            return [[{ id: 1 }]];
        },
        async commit() { chamadas.push("commit"); },
        async rollback() { chamadas.push("rollback"); },
        release() { chamadas.push("release"); }
    });

    try {
        await assert.rejects(
            AdministradorModel.trocarTipoComHistorico({
                usuarioId: 1,
                tipoAtual: "ADMIN",
                tipoNovo: "CIDADAO",
                usuario: { nome: "Teste", email: "teste@example.com" },
                feitoPor: { id: 1, nome: "Admin" }
            }),
            (error) => error.codigoAplicacao === "ULTIMO_ADMIN"
        );
        assert.deepEqual(chamadas, ["begin", "rollback", "release"]);
    } finally {
        db.getConnection = original;
    }
});
