const bcrypt =
    require("bcryptjs");

const crypto =
    require("crypto");

const AdministradorModel =
    require("../models/administradorModel");

const AdminAccessModel = require("../models/adminAccessModel");
const PermissaoAdminModel = require("../models/permissaoAdminModel");
const { CHAVES, interpretarSelecao, podeDar, podeGerenciar, lista, legado, normalizarLinha } = require("../utils/permissoesAdmin");
const { aoMudarEquipe } = require("../utils/eventosNotificacao");

const gerarToken =
    require("../utils/gerarToken");

const {
    CIDADES_ATENDIDAS
} =
    require("../config/cidadeAtendida");

const {
    normalizarEmail,
    normalizarNome,
    apenasNumeros,
    validarEmail,
    validarNome,
    validarTelefone,
    validarCpf,
    validarSenhaForte,
    mascararCpf
} =
    require("../utils/validacoesUsuario");

const {
    enviarConviteAdministrador,
    enviarAvisoPromovido,
    enviarAvisoRemovido
} =
    require("../utils/emailsAdministrador");


/*========================================================================================================

ADMINISTRADORES

Duas formas de alguém virar administrador:
1) Promover: a pessoa já tem conta de cidadão e um administrador troca o tipo dela.
2) Convite: a pessoa ainda não tem conta. Recebe um link por e-mail, cria a própria
   senha e a conta já nasce como ADMIN. O administrador nunca define a senha de ninguém.

Regras de segurança:
- Promover, remover, convidar e cancelar convite pedem a senha de quem está fazendo.
- Ninguém remove o próprio acesso. Como quem remove continua administrador,
  o sistema nunca fica sem administrador.
- Remover acesso não apaga a conta: a pessoa volta a ser cidadã.
- Toda mudança vai para historico_administradores (migração 011).

=========================================================================================================*/

const DIAS_VALIDADE_CONVITE = 7;

const BCRYPT_ROUNDS_SENHA = 12;


/*========================================================================================================

AUXILIARES

=========================================================================================================*/

function responder(res, status, mensagem, extra = {}) {
    return res
        .status(status)
        .json({
            sucesso: status < 400,
            mensagem,
            ...extra
        });
}


function responderConvitesIndisponiveis(res) {
    return responder(
        res,
        503,
        "Os convites por e-mail ainda não foram configurados no banco de dados. Por enquanto, use \"Já tem conta\" para promover um cidadão.",
        { codigo: "CONVITES_INDISPONIVEIS" }
    );
}

function responderErroAcesso(res, error, mensagem) {
    if (error.status && error.codigoAplicacao) {
        return responder(res, error.status, error.message, { codigo: error.codigoAplicacao });
    }
    console.error(mensagem, error);
    return responder(res, 500, "Não foi possível concluir essa mudança.");
}

function selecaoObrigatoria(res, valor, permitirVazio = false) {
    const selecao = interpretarSelecao(valor, { permitirVazio });
    if (!selecao) {
        responder(res, 400, "Escolha as permissões válidas para o administrador.", { codigo: "PERMISSOES_INVALIDAS" });
    }
    return selecao;
}

function notificarEquipe(dados) {
    aoMudarEquipe(dados).catch((error) => console.error("Falha ao avisar a equipe:", error));
}


function idValido(valor) {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
}


// Confere a senha de quem está fazendo a ação (segunda confirmação).
async function senhaConfere(usuarioId, senha) {
    const texto = String(senha || "");

    if (!texto || texto.length > 72) {
        return false;
    }

    const hash =
        await AdministradorModel.buscarSenhaHash(usuarioId);

    return Boolean(hash) && bcrypt.compare(texto, hash);
}


async function exigirSenha(req, res) {
    if (await senhaConfere(req.usuario.id, req.body?.senha_confirmacao)) {
        return true;
    }

    responder(
        res,
        401,
        "Senha incorreta. Digite a senha que você usa para entrar no Cidade360.",
        { codigo: "SENHA_INCORRETA" }
    );

    return false;
}


function gerarTokenConvite() {
    return crypto
        .randomBytes(32)
        .toString("hex");
}


// Só o hash fica no banco. Quem tiver acesso ao banco não consegue montar o link.
function hashTokenConvite(token) {
    return crypto
        .createHmac("sha256", process.env.JWT_SECRET || "")
        .update(String(token || ""))
        .digest("hex");
}


// Endereço do site para o link do e-mail.
// No Render, configure APP_URL (ex.: https://cidade360-api-virginia.onrender.com).
function enderecoDoSite(req) {
    const configurado =
        String(process.env.APP_URL || "").trim().replace(/\/+$/, "");

    if (configurado) {
        return configurado;
    }

    const protocolo =
        String(req.get("x-forwarded-proto") || req.protocol || "http").split(",")[0].trim();

    return `${protocolo}://${req.get("host")}`;
}


function linkDoConvite(req, token) {
    return `${enderecoDoSite(req)}/FrontEnd/pages/login/convite.html?token=${token}`;
}


// E-mail de aviso não pode desfazer a ação: se a Brevo falhar, só registra no log.
function avisarPorEmail(envio, descricao) {
    envio.catch((error) => {
        console.error(
            `Não foi possível enviar o e-mail (${descricao}):`,
            error.message
        );
    });
}


function formatarAdministrador(linha, usuarioLogadoId) {
    return {
        id: linha.id,
        nome: linha.nome,
        email: linha.email,
        voce: Number(linha.id) === Number(usuarioLogadoId),
        origem: linha.origem === "PROMOVIDO"
            ? "promovido"
            : linha.origem === "CONVITE_ACEITO"
                ? "convite"
                : null,
        adicionado_por: linha.adicionado_por || null,
        admin_desde: linha.admin_desde || linha.data_cadastro,
        permissoes: linha.permissoes,
        pode_gerenciar: Boolean(linha.pode_gerenciar)
    };
}


/*========================================================================================================

CONTROLLER

=========================================================================================================*/

const AdministradorController = {

    /*----------------------------------------------------------------------------------------------------
      GET /api/administradores
      Equipe, convites pendentes e histórico.
    ----------------------------------------------------------------------------------------------------*/

    async listar(req, res) {
        try {
            const administradores =
                await AdministradorModel.listarAdministradores();

            let convites = [];
            let historico = [];
            const configurado = await PermissaoAdminModel.configurado();
            const permissoesPorId = configurado
                ? await PermissaoAdminModel.buscarVarios(administradores.map((admin) => Number(admin.id)))
                : new Map();
            const admins = administradores.map((admin) => ({
                ...admin,
                permissoes: configurado
                    ? (permissoesPorId.get(Number(admin.id)) || normalizarLinha(null))
                    : legado()
            }));

            if (configurado) {
                [convites, historico] =
                    await Promise.all([
                        AdministradorModel.listarConvitesPendentes(),
                        AdministradorModel.listarHistorico(10)
                    ]);
            }

            return res
                .status(200)
                .json({
                    sucesso: true,
                    migracao_pendente: !configurado,
                    dias_validade_convite: DIAS_VALIDADE_CONVITE,
                    eu: {
                        id: req.usuario.id,
                        principal: Boolean(req.usuario.permissoes?.principal),
                        pode_dar: req.usuario.permissoes?.principal ? [...CHAVES] : lista(req.usuario.permissoes)
                    },
                    administradores: admins.map(
                        linha => formatarAdministrador({
                            ...linha,
                            pode_gerenciar: configurado && podeGerenciar(req.usuario, linha)
                        }, req.usuario.id)
                    ),
                    convites: convites.map(convite => ({
                        id: convite.id,
                        nome: convite.nome,
                        email: convite.email,
                        expira_em: convite.expira_em,
                        expirado: Boolean(Number(convite.expirado)),
                        enviado_em: convite.data_criacao,
                        convidado_por: convite.convidado_por_nome || null,
                        permissoes: lista({
                            ocorrencias: convite.perm_ocorrencias,
                            avisos: convite.perm_avisos,
                            equipe: convite.perm_equipe
                        })
                    })),
                    historico
                });

        } catch (error) {
            console.error("Erro ao listar administradores:", error);
            return responder(res, 500, "Não foi possível carregar os administradores.");
        }
    },


    /*----------------------------------------------------------------------------------------------------
      GET /api/administradores/cidadaos?busca=
      Busca cidadãos para promover. CPF sai mascarado (LGPD).
    ----------------------------------------------------------------------------------------------------*/

    async buscarCidadaos(req, res) {
        try {
            const termo =
                normalizarNome(req.query.busca).slice(0, 100);

            if (termo.length < 3) {
                return res
                    .status(200)
                    .json({ sucesso: true, cidadaos: [] });
            }

            const numeros =
                apenasNumeros(termo);

            const cpfCompleto =
                numeros.length === 11 ? numeros : null;

            const linhas =
                await AdministradorModel.buscarCidadaos(termo, cpfCompleto);

            return res
                .status(200)
                .json({
                    sucesso: true,
                    cidadaos: linhas.map(linha => ({
                        id: linha.id,
                        nome: linha.nome,
                        email: linha.email,
                        cpf: mascararCpf(linha.cpf),
                        cidadao_desde: linha.data_cadastro,
                        total_ocorrencias: Number(linha.total_ocorrencias || 0)
                    }))
                });

        } catch (error) {
            console.error("Erro ao buscar cidadãos:", error);
            return responder(res, 500, "Não foi possível buscar os cidadãos.");
        }
    },


    /*----------------------------------------------------------------------------------------------------
      POST /api/administradores/promover   { usuario_id, permissoes, senha_confirmacao }
    ----------------------------------------------------------------------------------------------------*/

    async promover(req, res) {
        try {
            const usuarioId =
                idValido(req.body?.usuario_id);

            if (!usuarioId) {
                return responder(res, 400, "Escolha o cidadão que vai virar administrador.");
            }

            const selecao = selecaoObrigatoria(res, req.body?.permissoes);
            if (!selecao) return;
            if (!podeDar(req.usuario, selecao)) {
                return responder(res, 403, "Você não pode conceder essas permissões.", { codigo: "PERMISSAO_NAO_PERMITIDA" });
            }

            if (!(await exigirSenha(req, res))) {
                return;
            }

            const usuario = await AdminAccessModel.promover({
                atorId: req.usuario.id, alvoId: usuarioId, selecao
            });

            avisarPorEmail(
                enviarAvisoPromovido({
                    nome: usuario.nome,
                    email: usuario.email,
                    feitoPor: req.usuario.nome,
                    permissoes: lista(selecao)
                }),
                "promovido a administrador"
            );

            notificarEquipe({ tipo: "promovido", usuarioId, atorId: req.usuario.id,
                nome: usuario.nome, permissoes: lista(selecao) });

            return responder(res, 200, `${usuario.nome} agora é administrador.`);

        } catch (error) {
            return responderErroAcesso(res, error, "Erro ao promover administrador:");
        }
    },


    /*----------------------------------------------------------------------------------------------------
      POST /api/administradores/:id/remover   { senha_confirmacao }
      A conta continua existindo, como cidadã.
    ----------------------------------------------------------------------------------------------------*/

    async remover(req, res) {
        try {
            const usuarioId =
                idValido(req.params.id);

            if (!usuarioId) {
                return responder(res, 400, "Administrador inválido.");
            }

            if (usuarioId === Number(req.usuario.id)) {
                return responder(res, 400, "Você não pode remover o seu próprio acesso. Peça para outro administrador.");
            }

            if (!(await exigirSenha(req, res))) {
                return;
            }

            const usuario = await AdminAccessModel.remover({
                atorId: req.usuario.id, alvoId: usuarioId
            });

            avisarPorEmail(
                enviarAvisoRemovido({
                    nome: usuario.nome,
                    email: usuario.email,
                    feitoPor: req.usuario.nome
                }),
                "acesso de administrador removido"
            );

            notificarEquipe({ tipo: "removido", usuarioId, atorId: req.usuario.id,
                nome: usuario.nome });

            return responder(res, 200, `${usuario.nome} voltou a ser cidadão.`);

        } catch (error) {
            return responderErroAcesso(res, error, "Erro ao remover administrador:");
        }
    },

    async alterarPermissoes(req, res) {
        try {
            const usuarioId = idValido(req.params.id);
            if (!usuarioId) return responder(res, 400, "Administrador inválido.");
            if (usuarioId === Number(req.usuario.id)) {
                return responder(res, 400, "Você não pode mudar o próprio acesso.", { codigo: "ACAO_PROPRIA" });
            }
            const selecao = selecaoObrigatoria(res, req.body?.permissoes, true);
            if (!selecao) return;
            if (!podeDar(req.usuario, selecao)) {
                return responder(res, 403, "Você não pode conceder essas permissões.", { codigo: "PERMISSAO_NAO_PERMITIDA" });
            }
            if (!(await exigirSenha(req, res))) return;
            const usuario = await AdminAccessModel.alterarPermissoes({
                atorId: req.usuario.id, alvoId: usuarioId, selecao
            });
            notificarEquipe({ tipo: "permissoes", usuarioId, atorId: req.usuario.id,
                nome: usuario.nome, permissoes: lista(selecao) });
            return responder(res, 200, "Permissões atualizadas.", { permissoes: lista(selecao) });
        } catch (error) {
            return responderErroAcesso(res, error, "Erro ao mudar permissões:");
        }
    },

    async transferirPrincipal(req, res) {
        try {
            const usuarioId = idValido(req.params.id);
            if (!usuarioId) return responder(res, 400, "Administrador inválido.");
            if (!req.usuario.permissoes?.principal) {
                return responder(res, 403, "Só o administrador principal pode passar o cargo.", { codigo: "SO_PRINCIPAL" });
            }
            if (!(await exigirSenha(req, res))) return;
            const usuario = await AdminAccessModel.transferirPrincipal({
                atorId: req.usuario.id, alvoId: usuarioId
            });
            notificarEquipe({ tipo: "principal", usuarioId, atorId: req.usuario.id,
                nome: usuario.nome });
            return responder(res, 200, `${usuario.nome} agora é o administrador principal.`);
        } catch (error) {
            return responderErroAcesso(res, error, "Erro ao transferir cargo:");
        }
    },


    /*----------------------------------------------------------------------------------------------------
      POST /api/administradores/convites   { nome, email, permissoes, senha_confirmacao }
    ----------------------------------------------------------------------------------------------------*/

    async convidar(req, res) {
        try {
            const nome =
                normalizarNome(req.body?.nome);

            const email =
                normalizarEmail(req.body?.email);

            if (!validarNome(nome)) {
                return responder(res, 400, "Digite o nome completo da pessoa.");
            }

            if (!validarEmail(email)) {
                return responder(res, 400, "Digite um e-mail válido.");
            }

            const selecao = selecaoObrigatoria(res, req.body?.permissoes);
            if (!selecao) return;
            if (!podeDar(req.usuario, selecao)) {
                return responder(res, 403, "Você não pode conceder essas permissões.", { codigo: "PERMISSAO_NAO_PERMITIDA" });
            }

            // E-mail que já tem conta: o caminho certo é promover (ou nada a fazer).
            const [contaExistente] =
                await AdministradorModel.buscarPorEmailOuCpf(email, null);

            if (contaExistente) {
                if (contaExistente.tipo_usuario === "ADMIN") {
                    return responder(res, 409, `${contaExistente.nome} já é administrador.`, {
                        codigo: "EMAIL_JA_ADMIN"
                    });
                }

                return responder(res, 409, `Esse e-mail já tem conta de cidadão (${contaExistente.nome}). Promova essa conta em vez de convidar.`, {
                    codigo: "EMAIL_JA_CIDADAO",
                    cidadao: {
                        id: contaExistente.id,
                        nome: contaExistente.nome,
                        email: contaExistente.email
                    }
                });
            }

            let convitePendente;

            try {
                convitePendente =
                    await AdministradorModel.buscarConvitePendentePorEmail(email);

            } catch (error) {
                if (AdministradorModel.tabelaFaltando(error)) {
                    return responderConvitesIndisponiveis(res);
                }

                throw error;
            }

            if (convitePendente) {
                return responder(res, 409, "Já existe um convite pendente para esse e-mail. Use \"Reenviar\" na lista.", {
                    codigo: "CONVITE_PENDENTE"
                });
            }

            if (!(await exigirSenha(req, res))) {
                return;
            }

            const token =
                gerarTokenConvite();

            const conviteId =
                await AdministradorModel.criarConvite({
                    nome,
                    email,
                    tokenHash: hashTokenConvite(token),
                    convidadoPor: req.usuario.id,
                    diasValidade: DIAS_VALIDADE_CONVITE,
                    permissoes: selecao
                });

            try {
                await enviarConviteAdministrador({
                    nome,
                    email,
                    link: linkDoConvite(req, token),
                    convidadoPor: req.usuario.nome,
                    diasValidade: DIAS_VALIDADE_CONVITE,
                    permissoes: lista(selecao)
                });

            } catch (error) {
                // Sem e-mail o convite não serve para nada: desfaz.
                await AdministradorModel.cancelarConvite(conviteId);

                console.error("Erro ao enviar convite de administrador:", error.message);

                return responder(res, 502, "Não foi possível enviar o e-mail do convite. Confira o endereço e tente de novo.");
            }

            await AdministradorModel.registrarHistorico({
                acao: "CONVITE_ENVIADO",
                nomeUsuario: nome,
                emailUsuario: email,
                feitoPor: req.usuario.id,
                nomeFeitoPor: req.usuario.nome
            });

            notificarEquipe({ tipo: "convite", atorId: req.usuario.id,
                nome, permissoes: lista(selecao) });

            return responder(res, 201, `Convite enviado para ${email}.`, {
                convite_id: conviteId
            });

        } catch (error) {
            if (AdministradorModel.tabelaFaltando(error)) {
                return responderConvitesIndisponiveis(res);
            }
            return responderErroAcesso(res, error, "Erro ao convidar administrador:");
        }
    },


    /*----------------------------------------------------------------------------------------------------
      POST /api/administradores/convites/:id/reenviar
      Gera um link novo (o antigo para de funcionar) e renova o prazo.
    ----------------------------------------------------------------------------------------------------*/

    async reenviarConvite(req, res) {
        try {
            const conviteId =
                idValido(req.params.id);

            const convite =
                conviteId && await AdministradorModel.buscarConvitePorId(conviteId);

            if (!convite || convite.status !== "PENDENTE") {
                return responder(res, 404, "Esse convite não está mais pendente.");
            }

            if (convite.perm_equipe && !req.usuario.permissoes?.principal) {
                return responder(res, 403, "Só o principal pode reenviar convite com Equipe.", { codigo: "SEM_PERMISSAO_SOBRE_ALVO" });
            }
            if (!podeDar(req.usuario, {
                ocorrencias: Boolean(convite.perm_ocorrencias),
                avisos: Boolean(convite.perm_avisos),
                equipe: Boolean(convite.perm_equipe)
            })) {
                return responder(res, 403, "Você não pode mais conceder as permissões deste convite.", { codigo: "PERMISSAO_NAO_PERMITIDA" });
            }
            if (!(await exigirSenha(req, res))) return;

            const token =
                gerarTokenConvite();

            const hashNovo = hashTokenConvite(token);
            const renovou = await AdministradorModel.renovarConvite(
                conviteId,
                hashNovo,
                DIAS_VALIDADE_CONVITE,
                req.usuario.id
            );
            if (!renovou) return responder(res, 404, "Esse convite não está mais pendente.");

            try {
                await enviarConviteAdministrador({
                    nome: convite.nome,
                    email: convite.email,
                    link: linkDoConvite(req, token),
                    convidadoPor: req.usuario.nome,
                    diasValidade: DIAS_VALIDADE_CONVITE,
                    permissoes: lista({
                        ocorrencias: convite.perm_ocorrencias,
                        avisos: convite.perm_avisos,
                        equipe: convite.perm_equipe
                    })
                });

            } catch (error) {
                await AdministradorModel.restaurarConviteAposFalhaDeEmail(
                    conviteId, hashNovo, convite.token_hash, convite.expira_em
                ).catch((restauracao) => console.error("Falha ao restaurar link do convite:", restauracao));
                console.error("Erro ao reenviar convite de administrador:", error.message);
                return responder(res, 502, "Não foi possível enviar o e-mail agora. Tente de novo em alguns minutos.");
            }

            await AdministradorModel.registrarHistorico({
                acao: "CONVITE_REENVIADO",
                nomeUsuario: convite.nome,
                emailUsuario: convite.email,
                feitoPor: req.usuario.id,
                nomeFeitoPor: req.usuario.nome
            });

            notificarEquipe({ tipo: "convite reenviado", atorId: req.usuario.id,
                nome: convite.nome });

            return responder(res, 200, `Convite reenviado para ${convite.email}. Vale por mais ${DIAS_VALIDADE_CONVITE} dias.`);

        } catch (error) {
            if (AdministradorModel.tabelaFaltando(error)) {
                return responderConvitesIndisponiveis(res);
            }

            return responderErroAcesso(res, error, "Erro ao reenviar convite:");
        }
    },


    /*----------------------------------------------------------------------------------------------------
      POST /api/administradores/convites/:id/cancelar   { senha_confirmacao }
    ----------------------------------------------------------------------------------------------------*/

    async cancelarConvite(req, res) {
        try {
            const conviteId =
                idValido(req.params.id);

            const convite =
                conviteId && await AdministradorModel.buscarConvitePorId(conviteId);

            if (!convite || convite.status !== "PENDENTE") {
                return responder(res, 404, "Esse convite não está mais pendente.");
            }

            if (convite.perm_equipe && !req.usuario.permissoes?.principal) {
                return responder(res, 403, "Só o principal pode cancelar convite com Equipe.", { codigo: "SEM_PERMISSAO_SOBRE_ALVO" });
            }

            if (!(await exigirSenha(req, res))) {
                return;
            }

            const cancelou = await AdministradorModel.cancelarConvite(conviteId, req.usuario.id);
            if (!cancelou) return responder(res, 404, "Esse convite não está mais pendente.");

            await AdministradorModel.registrarHistorico({
                acao: "CONVITE_CANCELADO",
                nomeUsuario: convite.nome,
                emailUsuario: convite.email,
                feitoPor: req.usuario.id,
                nomeFeitoPor: req.usuario.nome
            });

            notificarEquipe({ tipo: "convite cancelado", atorId: req.usuario.id,
                nome: convite.nome });

            return responder(res, 200, "Convite cancelado. O link do e-mail parou de funcionar.");

        } catch (error) {
            if (AdministradorModel.tabelaFaltando(error)) {
                return responderConvitesIndisponiveis(res);
            }

            return responderErroAcesso(res, error, "Erro ao cancelar convite:");
        }
    },


    /*====================================================================================================

    ROTAS PÚBLICAS DO CONVITE (a pessoa convidada ainda não tem login)

    =====================================================================================================*/

    // GET /api/convites-admin/:token
    async verConvite(req, res) {
        try {
            const convite =
                await buscarConviteValido(req.params.token);

            if (convite.erro) {
                return responder(res, convite.status, convite.erro, { codigo: convite.codigo });
            }

            return res
                .status(200)
                .json({
                    sucesso: true,
                    convite: {
                        nome: convite.nome,
                        email: convite.email,
                        convidado_por: convite.convidado_por_nome || null,
                        expira_em: convite.expira_em,
                        permissoes: lista({
                            ocorrencias: convite.perm_ocorrencias,
                            avisos: convite.perm_avisos,
                            equipe: convite.perm_equipe
                        })
                    }
                });

        } catch (error) {
            if (AdministradorModel.tabelaFaltando(error)) {
                return responder(res, 404, "Convite não encontrado.", { codigo: "CONVITE_INVALIDO" });
            }

            console.error("Erro ao abrir convite:", error);
            return responder(res, 500, "Não foi possível abrir o convite.");
        }
    },


    // POST /api/convites-admin/:token/aceitar   { cpf, telefone, senha, confirmar_senha }
    async aceitarConvite(req, res) {
        try {
            const convite =
                await buscarConviteValido(req.params.token);

            if (convite.erro) {
                return responder(res, convite.status, convite.erro, { codigo: convite.codigo });
            }

            const cpf =
                apenasNumeros(req.body?.cpf);

            const telefone =
                apenasNumeros(req.body?.telefone);

            const senha =
                String(req.body?.senha || "");

            if (!validarCpf(cpf)) {
                return responder(res, 400, "CPF inválido. Confira os números.", { campo: "cpf" });
            }

            if (!validarTelefone(telefone)) {
                return responder(res, 400, "Telefone inválido. Use DDD + número.", { campo: "telefone" });
            }

            if (!validarSenhaForte(senha)) {
                return responder(res, 400, "A senha precisa ter 8 caracteres ou mais, com letra maiúscula, minúscula, número e símbolo.", { campo: "senha" });
            }

            if (senha !== String(req.body?.confirmar_senha || "")) {
                return responder(res, 400, "As senhas não são iguais.", { campo: "confirmar_senha" });
            }

            const existentes =
                await AdministradorModel.buscarPorEmailOuCpf(convite.email, cpf);

            if (existentes.some(conta => conta.email === convite.email)) {
                return responder(res, 409, "Esse e-mail já tem uma conta no Cidade360. Entre com ela e peça para um administrador promover você.");
            }

            if (existentes.some(conta => conta.cpf === cpf)) {
                return responder(res, 409, "Esse CPF já tem uma conta no Cidade360. Peça para o administrador promover a sua conta em vez de usar o convite.", { campo: "cpf" });
            }

            const cidade =
                CIDADES_ATENDIDAS[0];

            const usuarioId =
                await AdministradorModel.aceitarConvite(convite, {
                    cpf,
                    telefone,
                    cidade: cidade.nome,
                    uf: cidade.uf,
                    senhaHash: await bcrypt.hash(senha, BCRYPT_ROUNDS_SENHA)
                });

            if (!usuarioId) {
                return responder(res, 410, "Esse convite já foi usado ou cancelado.", { codigo: "CONVITE_INVALIDO" });
            }

            const usuario = {
                id: usuarioId,
                nome: convite.nome,
                email: convite.email,
                tipo_usuario: "ADMIN",
                permissoes: {
                    principal: false,
                    ocorrencias: Boolean(convite.perm_ocorrencias),
                    avisos: Boolean(convite.perm_avisos),
                    equipe: Boolean(convite.perm_equipe),
                    configurado: true
                }
            };

            notificarEquipe({ tipo: "aceito", usuarioId, atorId: convite.convidado_por,
                nome: convite.nome, permissoes: lista(usuario.permissoes) });

            return res
                .status(201)
                .json({
                    sucesso: true,
                    mensagem: "Acesso ativado.",
                    token: gerarToken(usuario),
                    usuario
                });

        } catch (error) {
            if (error?.code === "ER_DUP_ENTRY") {
                return responder(res, 409, "Esse e-mail ou CPF já tem uma conta no Cidade360.");
            }

            console.error("Erro ao aceitar convite:", error);
            return responder(res, 500, "Não foi possível ativar o acesso. Tente de novo em alguns instantes.");
        }
    }
};


async function buscarConviteValido(token) {
    if (!(await PermissaoAdminModel.configurado())) {
        return { status: 503, erro: "As permissões da equipe ainda estão sendo configuradas.", codigo: "MIGRACAO_PENDENTE" };
    }
    const texto =
        String(token || "");

    if (!/^[a-f0-9]{64}$/.test(texto)) {
        return { status: 404, erro: "Convite não encontrado. Confira se copiou o link inteiro.", codigo: "CONVITE_INVALIDO" };
    }

    const convite =
        await AdministradorModel.buscarConvitePorToken(hashTokenConvite(texto));

    if (!convite || convite.status === "CANCELADO") {
        return { status: 404, erro: "Esse convite não vale mais. Peça um novo para o administrador.", codigo: "CONVITE_INVALIDO" };
    }

    if (convite.status === "ACEITO") {
        return { status: 410, erro: "Esse convite já foi usado. Entre pela tela de login.", codigo: "CONVITE_USADO" };
    }

    if (Number(convite.expirado)) {
        return { status: 410, erro: "Esse convite venceu. Peça para o administrador reenviar.", codigo: "CONVITE_EXPIRADO" };
    }

    return convite;
}


module.exports =
    AdministradorController;
