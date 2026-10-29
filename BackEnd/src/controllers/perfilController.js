/*========================================================================================================

MEU PERFIL

O usuário logado (cidadão ou administrador) vê e altera a própria conta:

- GET  /api/perfil                       dados da conta (CPF só mascarado)
- PUT  /api/perfil/dados                 nome, telefone e cidade (cidade só para cidadão)
- POST /api/perfil/email/enviar-codigo   senha atual + e-mail novo → código no e-mail novo
- POST /api/perfil/email/confirmar       código + bilhete da etapa anterior → e-mail trocado
- PUT  /api/perfil/senha                 senha atual + senha nova

Segurança:
- Trocar e-mail ou senha sempre pede a senha atual.
- O código da troca de e-mail usa a tabela do código do cadastro. Para um código pedido
  no cadastro não servir aqui, a etapa 1 devolve um "bilhete" (JWT curto, com o id do
  usuário e o e-mail novo) que precisa voltar na etapa 2.
- O e-mail antigo e o dono da conta recebem aviso quando algo sensível muda.

=========================================================================================================*/

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const PerfilModel = require("../models/perfilModel");
const UsuarioModel = require("../models/usuarioModel");
const EmailVerificacaoModel = require("../models/emailVerificacaoModel");

const gerarToken = require("../utils/gerarToken");
const enviarEmail = require("../utils/enviarEmail");

const {
    normalizarEmail,
    normalizarNome,
    apenasNumeros,
    validarEmail,
    validarNome,
    validarTelefone,
    validarSenhaForte,
    mascararCpf
} = require("../utils/validacoesUsuario");

const {
    MENSAGEM_CIDADE_INDISPONIVEL,
    normalizarUf,
    cidadeEhAtendida
} = require("../utils/cidadeAtendida");

const {
    htmlCodigoTrocaEmail,
    htmlAvisoEmailAlterado,
    htmlAvisoSenhaAlterada
} = require("../utils/emailsConta");


const BCRYPT_ROUNDS_SENHA = 12;
const BCRYPT_ROUNDS_CODIGO = 10;
const VALIDADE_BILHETE_EMAIL = "15m";
const FINALIDADE_BILHETE_EMAIL = "troca_email";


/*========================================================================================================
RESPOSTAS
=========================================================================================================*/

function responderErro(res, status, mensagem, campo) {
    return res
        .status(status)
        .json({
            sucesso: false,
            mensagem,
            ...(campo ? { campo } : {})
        });
}

function responderErroInterno(res, mensagem, error) {
    console.error(mensagem, error);

    return responderErro(
        res,
        500,
        "Ocorreu um erro interno. Tente novamente em alguns instantes."
    );
}

// O que a página recebe: nunca o CPF inteiro nem a senha.
function perfilPublico(usuario) {
    const admin = usuario.tipo_usuario === "ADMIN";

    return {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
        cpf_mascarado: mascararCpf(usuario.cpf),
        tipo_usuario: usuario.tipo_usuario,
        cidade: admin ? null : usuario.cidade,
        uf: admin ? null : usuario.uf,
        data_cadastro: usuario.data_cadastro
    };
}

async function senhaAtualConfere(usuarioId, senhaAtual) {
    const senhaHash = await PerfilModel.buscarSenhaHash(usuarioId);

    if (!senhaHash || !senhaAtual) {
        return false;
    }

    return bcrypt.compare(String(senhaAtual), senhaHash);
}

// Aviso por e-mail não pode travar a resposta: se a Brevo falhar, a troca já foi feita.
function enviarAvisoSemEsperar(destinatario, assunto, html) {
    enviarEmail(destinatario, assunto, html)
        .catch((error) => console.error("Erro ao enviar aviso do perfil:", error));
}


const PerfilController = {


    /*====================================================================================================
    DADOS DA CONTA
    =====================================================================================================*/

    async buscar(req, res) {
        try {
            const usuario = await PerfilModel.buscarPorId(req.usuario.id);

            if (!usuario) {
                return responderErro(res, 404, "Usuário não encontrado.");
            }

            return res.status(200).json({
                sucesso: true,
                usuario: perfilPublico(usuario)
            });

        } catch (error) {
            return responderErroInterno(res, "Erro ao buscar perfil:", error);
        }
    },


    /*====================================================================================================
    NOME, TELEFONE E CIDADE
    =====================================================================================================*/

    async atualizarDados(req, res) {
        try {
            const admin = req.usuario.tipo_usuario === "ADMIN";

            const nome = normalizarNome(req.body?.nome);
            const telefone = apenasNumeros(req.body?.telefone);

            if (!validarNome(nome) || nome.length > 80) {
                return responderErro(res, 400, "Digite seu nome completo (de 3 a 80 letras).", "nome");
            }

            if (!validarTelefone(telefone)) {
                return responderErro(res, 400, "Digite o telefone com DDD. Ex.: (16) 99999-9999.", "telefone");
            }

            const dados = { nome, telefone };

            // Administrador não tem cidade no perfil: o que vier é ignorado.
            if (!admin) {
                const cidade = cidadeEhAtendida(req.body?.cidade, normalizarUf(req.body?.uf));

                if (!cidade) {
                    return responderErro(res, 400, MENSAGEM_CIDADE_INDISPONIVEL, "cidade");
                }

                dados.cidade = cidade.nome;
                dados.uf = cidade.uf;
            }

            const cidadeGravada = await PerfilModel.atualizarDados(req.usuario.id, dados);
            const usuario = await PerfilModel.buscarPorId(req.usuario.id);

            return res.status(200).json({
                sucesso: true,
                mensagem: cidadeGravada
                    ? "Dados atualizados."
                    : "Nome e telefone atualizados. A cidade será salva quando o sistema terminar de ser atualizado.",
                usuario: perfilPublico(usuario)
            });

        } catch (error) {
            return responderErroInterno(res, "Erro ao atualizar dados do perfil:", error);
        }
    },


    /*====================================================================================================
    TROCAR E-MAIL — ETAPA 1: ENVIAR CÓDIGO PARA O E-MAIL NOVO
    =====================================================================================================*/

    async enviarCodigoEmail(req, res) {
        try {
            const email = normalizarEmail(req.body?.email);

            if (!validarEmail(email)) {
                return responderErro(res, 400, "Digite um e-mail válido.", "email");
            }

            if (email === normalizarEmail(req.usuario.email)) {
                return responderErro(res, 400, "Esse já é o seu e-mail atual.", "email");
            }

            if (!(await senhaAtualConfere(req.usuario.id, req.body?.senha_atual))) {
                return responderErro(res, 400, "Senha atual incorreta.", "senha_atual");
            }

            if (await UsuarioModel.buscarPorEmail(email)) {
                return responderErro(res, 409, "Esse e-mail já está em uso por outra conta.", "email");
            }

            const codigo = String(crypto.randomInt(100000, 1000000));
            const codigoHash = await bcrypt.hash(codigo, BCRYPT_ROUNDS_CODIGO);

            await EmailVerificacaoModel.invalidarCodigosEmail(email);
            await EmailVerificacaoModel.criarCodigoEmail(email, codigoHash);

            await enviarEmail(
                email,
                "Cidade360 - Confirme seu novo e-mail",
                htmlCodigoTrocaEmail(req.usuario.nome, codigo)
            );

            const bilhete = jwt.sign(
                { id: req.usuario.id, email, finalidade: FINALIDADE_BILHETE_EMAIL },
                process.env.JWT_SECRET,
                { expiresIn: VALIDADE_BILHETE_EMAIL }
            );

            return res.status(200).json({
                sucesso: true,
                mensagem: "Enviamos um código para o e-mail novo.",
                bilhete
            });

        } catch (error) {
            return responderErroInterno(res, "Erro ao enviar código de troca de e-mail:", error);
        }
    },


    /*====================================================================================================
    TROCAR E-MAIL — ETAPA 2: CONFIRMAR O CÓDIGO
    =====================================================================================================*/

    async confirmarEmail(req, res) {
        try {
            const email = normalizarEmail(req.body?.email);
            const codigo = String(req.body?.codigo || "").trim();

            let bilhete;

            try {
                bilhete = jwt.verify(String(req.body?.bilhete || ""), process.env.JWT_SECRET);
            } catch (error) {
                bilhete = null;
            }

            if (
                !bilhete ||
                bilhete.finalidade !== FINALIDADE_BILHETE_EMAIL ||
                String(bilhete.id) !== String(req.usuario.id) ||
                bilhete.email !== email
            ) {
                return responderErro(res, 400, "O pedido de troca expirou. Peça um código novo.", "bilhete");
            }

            if (!/^\d{6}$/.test(codigo)) {
                return responderErro(res, 400, "O código tem 6 números.", "codigo");
            }

            const registro = await EmailVerificacaoModel.buscarCodigoValidoEmail(email);

            if (!registro || !(await bcrypt.compare(codigo, registro.codigo_hash))) {
                return responderErro(res, 400, "Código inválido ou expirado.", "codigo");
            }

            if (await UsuarioModel.buscarPorEmail(email)) {
                return responderErro(res, 409, "Esse e-mail já está em uso por outra conta.", "email");
            }

            const emailAntigo = req.usuario.email;

            try {
                await PerfilModel.atualizarEmail(req.usuario.id, email);
            } catch (error) {
                if (error?.code === "ER_DUP_ENTRY") {
                    return responderErro(res, 409, "Esse e-mail já está em uso por outra conta.", "email");
                }
                throw error;
            }

            await PerfilModel.consumirCodigoEmail(registro.id);

            const usuario = await PerfilModel.buscarPorId(req.usuario.id);

            enviarAvisoSemEsperar(
                emailAntigo,
                "Cidade360 - O e-mail da sua conta foi alterado",
                htmlAvisoEmailAlterado(usuario.nome, email)
            );

            // O token guarda o e-mail, então a sessão ganha um token novo.
            return res.status(200).json({
                sucesso: true,
                mensagem: "E-mail trocado. Avisamos o e-mail antigo também.",
                token: gerarToken(usuario),
                usuario: perfilPublico(usuario)
            });

        } catch (error) {
            return responderErroInterno(res, "Erro ao confirmar troca de e-mail:", error);
        }
    },


    /*====================================================================================================
    TROCAR SENHA
    =====================================================================================================*/

    async atualizarSenha(req, res) {
        try {
            const senhaAtual = String(req.body?.senha_atual || "");
            const novaSenha = String(req.body?.nova_senha || "");
            const confirmarSenha = String(req.body?.confirmar_senha || "");

            if (!senhaAtual) {
                return responderErro(res, 400, "Digite sua senha atual.", "senha_atual");
            }

            if (!validarSenhaForte(novaSenha)) {
                return responderErro(res, 400, "A nova senha precisa ter 8 caracteres ou mais, letra maiúscula, minúscula, número e símbolo, sem palavras fáceis.", "nova_senha");
            }

            if (novaSenha !== confirmarSenha) {
                return responderErro(res, 400, "As senhas não são iguais.", "confirmar_senha");
            }

            if (!(await senhaAtualConfere(req.usuario.id, senhaAtual))) {
                return responderErro(res, 400, "Senha atual incorreta.", "senha_atual");
            }

            if (novaSenha === senhaAtual) {
                return responderErro(res, 400, "A nova senha precisa ser diferente da atual.", "nova_senha");
            }

            const senhaHash = await bcrypt.hash(novaSenha, BCRYPT_ROUNDS_SENHA);

            await PerfilModel.atualizarSenha(req.usuario.id, senhaHash);

            enviarAvisoSemEsperar(
                req.usuario.email,
                "Cidade360 - Sua senha foi alterada",
                htmlAvisoSenhaAlterada(req.usuario.nome)
            );

            return res.status(200).json({
                sucesso: true,
                mensagem: "Senha alterada. Mandamos um aviso para o seu e-mail."
            });

        } catch (error) {
            return responderErroInterno(res, "Erro ao trocar senha:", error);
        }
    }
};


module.exports = PerfilController;
