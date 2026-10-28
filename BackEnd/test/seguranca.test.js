const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

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
