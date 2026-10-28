const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");

const db = require("../src/config/db");
const UsuarioModel = require("../src/models/usuarioModel");
const PermissaoAdminModel = require("../src/models/permissaoAdminModel");
const AdminAccessModel = require("../src/models/adminAccessModel");
const authMiddleware = require("../src/middlewares/authMiddleware");
const permissaoMiddleware = require("../src/middlewares/permissaoMiddleware");
const { interpretarSelecao, podeDar, podeGerenciar } = require("../src/utils/permissoesAdmin");

test("regras de delegação protegem principal, Equipe e acesso próprio", () => {
    const principal = { id: 1, tipo_usuario: "ADMIN", permissoes: { principal: true, equipe: true } };
    const gestor = { id: 2, tipo_usuario: "ADMIN", permissoes: { equipe: true, avisos: true } };
    const alvo = { id: 3, tipo_usuario: "ADMIN", permissoes: { avisos: true } };
    assert.equal(interpretarSelecao([]), null);
    assert.deepEqual(interpretarSelecao(["avisos"]), { ocorrencias: false, avisos: true, equipe: false });
    assert.equal(interpretarSelecao(["avisos", "avisos"]), null);
    assert.equal(podeDar(gestor, interpretarSelecao(["equipe"])), false);
    assert.equal(podeDar(gestor, interpretarSelecao(["ocorrencias"])), false);
    assert.equal(podeDar(gestor, interpretarSelecao(["avisos"])), true);
    assert.equal(podeGerenciar(gestor, principal), false);
    assert.equal(podeGerenciar(gestor, gestor), false);
    assert.equal(podeGerenciar(gestor, alvo), true);
    assert.equal(podeGerenciar(principal, gestor), true);
});

test("permissão revogada vale na requisição seguinte", async () => {
    const originalUsuario = UsuarioModel.buscarPorId;
    const originalPermissao = PermissaoAdminModel.buscar;
    const segredo = process.env.JWT_SECRET || "teste-de-permissoes-admin";
    const segredoAnterior = process.env.JWT_SECRET;
    process.env.JWT_SECRET = segredo;
    let equipe = true;
    UsuarioModel.buscarPorId = async () => ({ id: 2, tipo_usuario: "ADMIN", ativo: 1 });
    PermissaoAdminModel.buscar = async () => ({ principal: false, equipe, avisos: true, ocorrencias: false, configurado: true });
    const app = express();
    app.get("/equipe", authMiddleware, permissaoMiddleware("equipe"), (req, res) => res.json({ sucesso: true }));
    const servidor = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => servidor.once("listening", resolve));
    try {
        const token = jwt.sign({ id: 2, tipo_usuario: "ADMIN" }, segredo, { expiresIn: "1m" });
        const url = `http://127.0.0.1:${servidor.address().port}/equipe`;
        const opcoes = { headers: { Authorization: `Bearer ${token}` } };
        assert.equal((await fetch(url, opcoes)).status, 200);
        equipe = false;
        const resposta = await fetch(url, opcoes);
        assert.equal(resposta.status, 403);
        assert.equal((await resposta.json()).codigo, "SEM_PERMISSAO");
    } finally {
        await new Promise((resolve) => servidor.close(resolve));
        UsuarioModel.buscarPorId = originalUsuario;
        PermissaoAdminModel.buscar = originalPermissao;
        if (segredoAnterior === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = segredoAnterior;
    }
});

function simularConexao({ usuarios, permissoes, falhaHistorico = false }) {
    const chamadas = [];
    const conexao = {
        async beginTransaction() { chamadas.push("begin"); },
        async query(sql) {
            if (sql.includes("FROM usuarios")) return [usuarios];
            if (sql.includes("FROM permissoes_admin")) return [permissoes];
            throw new Error("Query inesperada");
        },
        async execute(sql) {
            if (sql.includes("INSERT INTO historico_administradores") && falhaHistorico) {
                throw new Error("histórico indisponível");
            }
            chamadas.push(sql.trim().split(/\s+/).slice(0, 3).join(" "));
            return [{ affectedRows: 1, insertId: 1 }];
        },
        async commit() { chamadas.push("commit"); },
        async rollback() { chamadas.push("rollback"); },
        release() { chamadas.push("release"); }
    };
    return { conexao, chamadas };
}

test("falha do histórico desfaz a promoção e as permissões", async () => {
    const original = db.getConnection;
    const { conexao, chamadas } = simularConexao({
        usuarios: [
            { id: 1, nome: "Principal", email: "p@example.com", tipo_usuario: "ADMIN", ativo: 1 },
            { id: 2, nome: "Cidadão", email: "c@example.com", tipo_usuario: "CIDADAO", ativo: 1 }
        ],
        permissoes: [{ usuario_id: 1, principal: 1, ocorrencias: 1, avisos: 1, equipe: 1 }],
        falhaHistorico: true
    });
    db.getConnection = async () => conexao;
    try {
        await assert.rejects(AdminAccessModel.promover({
            atorId: 1, alvoId: 2,
            selecao: { ocorrencias: true, avisos: false, equipe: false }
        }), /histórico indisponível/);
        assert.equal(chamadas.includes("commit"), false);
        assert.equal(chamadas.at(-2), "rollback");
    } finally {
        db.getConnection = original;
    }
});

test("principal não pode ser removido por outro administrador", async () => {
    const original = db.getConnection;
    const { conexao, chamadas } = simularConexao({
        usuarios: [
            { id: 1, nome: "Principal", tipo_usuario: "ADMIN", ativo: 1 },
            { id: 2, nome: "Gestor", tipo_usuario: "ADMIN", ativo: 1 }
        ],
        permissoes: [
            { usuario_id: 1, principal: 1, equipe: 1 },
            { usuario_id: 2, principal: 0, equipe: 1 }
        ]
    });
    db.getConnection = async () => conexao;
    try {
        await assert.rejects(AdminAccessModel.remover({ atorId: 2, alvoId: 1 }),
            (error) => error.status === 403 && error.codigoAplicacao === "SEM_PERMISSAO_SOBRE_ALVO");
        assert.equal(chamadas.includes("commit"), false);
        assert.equal(chamadas.at(-2), "rollback");
    } finally {
        db.getConnection = original;
    }
});

test("reenviar convite recusa permissões que o gestor perdeu", async () => {
    const original = db.getConnection;
    const chamadas = [];
    db.getConnection = async () => ({
        async beginTransaction() { chamadas.push("begin"); },
        async execute(sql) {
            if (sql.includes("FROM convites_admin")) {
                return [[{ perm_ocorrencias: 1, perm_avisos: 0, perm_equipe: 0 }]];
            }
            if (sql.includes("FROM usuarios")) {
                return [[{ id: 2, tipo_usuario: "ADMIN", ativo: 1 }]];
            }
            if (sql.includes("FROM permissoes_admin")) {
                return [[{ principal: 0, ocorrencias: 0, avisos: 1, equipe: 1 }]];
            }
            chamadas.push("update");
            return [{ affectedRows: 1 }];
        },
        async commit() { chamadas.push("commit"); },
        async rollback() { chamadas.push("rollback"); },
        release() { chamadas.push("release"); }
    });
    try {
        const AdministradorModel = require("../src/models/administradorModel");
        await assert.rejects(
            AdministradorModel.renovarConvite(9, "hash", 7, 2),
            (error) => error.status === 403 && error.codigoAplicacao === "SEM_PERMISSAO"
        );
        assert.equal(chamadas.includes("update"), false);
        assert.equal(chamadas.includes("commit"), false);
        assert.equal(chamadas.at(-2), "rollback");
    } finally {
        db.getConnection = original;
    }
});
