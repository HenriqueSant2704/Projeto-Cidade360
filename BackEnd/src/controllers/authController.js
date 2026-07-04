const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const UsuarioModel = require("../models/usuarioModel");
const gerarToken = require("../utils/gerarToken");
const db = require("../config/db");
const enviarEmail = require("../utils/enviarEmail");

const {
    invalidarCodigosAnteriores,
    criarCodigoRecuperacao,
    buscarCodigoValido,
    marcarCodigoComoUsado
} = require("../models/recuperacaoSenhaModel");

const EmailVerificacaoModel = require("../models/emailVerificacaoModel");

/*========================================================================================================

FUNÇÕES AUXILIARES GERAIS

=========================================================================================================*/

function validarEmail(email) {
    email = String(email || "").trim().toLowerCase();

    if (!email) return false;
    if (email.length > 254) return false;
    if (/\s/.test(email)) return false;

    return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email);
}

function validarSenhaForte(senha) {
    senha = String(senha || "");

    if (senha.length < 8) return false;
    if (senha.length > 72) return false;
    if (/\s/.test(senha)) return false;
    if (!/[A-Z]/.test(senha)) return false;
    if (!/[a-z]/.test(senha)) return false;
    if (!/[0-9]/.test(senha)) return false;
    if (!/[!@#$%&*()_\-+=?.,:;{}[\]^~]/.test(senha)) return false;

    const senhaNormalizada = senha.toLowerCase();

    const bloqueadas = [
        "123456",
        "12345678",
        "abcdef",
        "qwerty",
        "senha",
        "password",
        "admin",
        "cidade360",
        "usuario",
        "teste"
    ];

    return !bloqueadas.some((item) => senhaNormalizada.includes(item));
}

function apenasNumeros(valor) {
    return String(valor || "").replace(/\D/g, "");
}

function normalizarEmail(email) {
    return String(email || "").trim().toLowerCase();
}

async function buscarUsuarioPorEmail(email) {
    const sql = `
        SELECT id, nome, email, senha_hash
        FROM usuarios
        WHERE email = ?
        LIMIT 1
    `;

    const [resultado] = await db.execute(sql, [email]);
    return resultado[0];
}

async function atualizarSenhaUsuario(usuarioId, senhaHash) {
    const sql = `
        UPDATE usuarios
        SET senha_hash = ?
        WHERE id = ?
    `;

    await db.execute(sql, [senhaHash, usuarioId]);
}

async function buscarSenhaAtualUsuario(usuarioId) {
    const sql = `
        SELECT senha_hash
        FROM usuarios
        WHERE id = ?
        LIMIT 1
    `;

    const [resultado] = await db.execute(sql, [usuarioId]);
    return resultado[0]?.senha_hash || null;
}

/*========================================================================================================

FUNÇÕES AUXILIARES DA VERIFICAÇÃO DE EMAIL

=========================================================================================================*/

function gerarTokenVerificacaoEmail() {
    return crypto.randomBytes(32).toString("hex");
}

function gerarHashTokenVerificacaoEmail(token) {
    const segredo =
        process.env.EMAIL_VERIFICATION_TOKEN_SECRET ||
        "cidade360-dev-secret-altere-no-env";

    return crypto
        .createHmac("sha256", segredo)
        .update(String(token || ""))
        .digest("hex");
}

async function validarTokenEmailCadastro(email, token) {
    if (!email || !token) {
        return null;
    }

    const tokenHash = gerarHashTokenVerificacaoEmail(token);

    return await EmailVerificacaoModel.buscarTokenValidoEmail(email, tokenHash);
}

/*========================================================================================================

CONTROLLER DE AUTENTICAÇÃO

=========================================================================================================*/

const AuthController = {
    /*====================================================================================================

    LOGIN

    =====================================================================================================*/

    async login(req, res) {
        try {
            const { email, senha } = req.body;

            if (!email || !senha) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Informe seu email e senha para continuar."
                });
            }

            const emailNormalizado = normalizarEmail(email);

            if (!validarEmail(emailNormalizado)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Digite um email válido para continuar."
                });
            }

            const usuario = await UsuarioModel.buscarPorEmail(emailNormalizado);

            if (!usuario) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: "Não foi possível entrar. Verifique seu email e senha."
                });
            }

            if (usuario.ativo === 0 || usuario.ativo === false) {
                return res.status(403).json({
                    sucesso: false,
                    mensagem: "Esta conta está inativa. Entre em contato com o suporte."
                });
            }

            const senhaBanco = usuario.senha_hash;

            if (!senhaBanco) {
                return res.status(500).json({
                    sucesso: false,
                    mensagem: "Esta conta ainda não possui uma senha cadastrada."
                });
            }

            const senhaEhHash =
                senhaBanco.startsWith("$2a$") ||
                senhaBanco.startsWith("$2b$") ||
                senhaBanco.startsWith("$2y$");

            let senhaCorreta = false;

            if (senhaEhHash) {
                senhaCorreta = await bcrypt.compare(senha, senhaBanco);
            } else {
                senhaCorreta = senha === senhaBanco;
            }

            if (!senhaCorreta) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: "Não foi possível entrar. Verifique seu email e senha."
                });
            }

            const token = gerarToken(usuario);

            return res.status(200).json({
                sucesso: true,
                mensagem: "Acesso autorizado com sucesso.",
                token,
                usuario: {
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email,
                    telefone: usuario.telefone,
                    cpf: usuario.cpf,
                    tipo_usuario: usuario.tipo_usuario,
                    pontos: usuario.pontos,
                    ativo: Boolean(usuario.ativo),
                    data_cadastro: usuario.data_cadastro
                }
            });

        } catch (error) {
            console.error("Erro no login:", error);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Ocorreu um erro interno. Tente novamente em alguns instantes.",
                erro: error.message
            });
        }
    },

    /*====================================================================================================

    CADASTRO COM EMAIL VERIFICADO

    =====================================================================================================*/

    async cadastrar(req, res) {
        try {
            const {
                nome,
                email,
                telefone,
                cpf,
                senha,
                tipo_usuario,
                email_verificacao_token
            } = req.body;

            if (!nome || !email || !telefone || !cpf || !senha) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Preencha todos os dados obrigatórios para criar sua conta."
                });
            }

            const emailNormalizado = normalizarEmail(email);
            const cpfNumerico = apenasNumeros(cpf);
            const telefoneNumerico = apenasNumeros(telefone);

            if (!validarEmail(emailNormalizado)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Digite um email válido para continuar."
                });
            }

            if (!validarSenhaForte(senha)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "A senha informada não atende aos requisitos de segurança."
                });
            }

            if (!email_verificacao_token) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Confirme seu email com o código enviado antes de finalizar o cadastro."
                });
            }

            const usuarioExiste = await UsuarioModel.buscarPorEmail(emailNormalizado);

            if (usuarioExiste) {
                return res.status(409).json({
                    sucesso: false,
                    mensagem: "Este email já está vinculado a uma conta."
                });
            }

            const cpfExiste = await UsuarioModel.buscarPorCpf(cpfNumerico);

            if (cpfExiste) {
                return res.status(409).json({
                    sucesso: false,
                    mensagem: "Este CPF já está vinculado a uma conta."
                });
            }

            const emailVerificado = await validarTokenEmailCadastro(
                emailNormalizado,
                email_verificacao_token
            );

            if (!emailVerificado) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "A verificação de email é inválida ou expirou. Solicite um novo código."
                });
            }

            const senhaHash = await bcrypt.hash(senha, 10);

            const idCriado = await UsuarioModel.cadastrar({
                nome,
                email: emailNormalizado,
                telefone: telefoneNumerico,
                cpf: cpfNumerico,
                senhaHash,
                tipoUsuario: tipo_usuario || "CIDADAO"
            });

            await EmailVerificacaoModel.consumirTokenEmail(emailVerificado.id);

            return res.status(201).json({
                sucesso: true,
                mensagem: "Conta criada com sucesso.",
                id: idCriado
            });

        } catch (error) {
            console.error("Erro ao cadastrar:", error);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Ocorreu um erro interno. Tente novamente em alguns instantes.",
                erro: error.message
            });
        }
    },

    /*====================================================================================================

    USUÁRIO LOGADO

    =====================================================================================================*/

    async me(req, res) {
        try {
            return res.status(200).json({
                sucesso: true,
                usuario: req.usuario
            });

        } catch (error) {
            return res.status(500).json({
                sucesso: false,
                mensagem: "Ocorreu um erro interno. Tente novamente em alguns instantes."
            });
        }
    },

    /*====================================================================================================

    ENVIAR CÓDIGO DE VERIFICAÇÃO DE EMAIL PARA CADASTRO

    =====================================================================================================*/

    async enviarCodigoVerificacaoEmailCadastro(req, res) {
        try {
            const email = normalizarEmail(req.body.email);

            if (!validarEmail(email)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Digite um email válido para receber o código."
                });
            }

            const usuarioExiste = await UsuarioModel.buscarPorEmail(email);

            if (usuarioExiste) {
                return res.status(409).json({
                    sucesso: false,
                    mensagem: "Este email já está vinculado a uma conta."
                });
            }

            const codigo = String(crypto.randomInt(100000, 999999));
            const codigoHash = await bcrypt.hash(codigo, 10);

            await EmailVerificacaoModel.invalidarCodigosEmail(email);
            await EmailVerificacaoModel.criarCodigoEmail(email, codigoHash);

            const html = `
                <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
                    <h2 style="color: #007BFF;">Confirme seu email no Cidade360</h2>

                    <p>Olá!</p>

                    <p>Recebemos uma solicitação para criar uma conta no Cidade360 usando este endereço de email.</p>

                    <p>Para continuar o cadastro, informe o código abaixo na tela do sistema:</p>

                    <h1 style="letter-spacing: 4px; color: #007BFF; font-size: 32px;">
                        ${codigo}
                    </h1>

                    <p>Este código é válido por <strong>15 minutos</strong>.</p>

                    <p>Se você não solicitou este cadastro, apenas ignore este email.</p>

                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

                    <p style="font-size: 13px; color: #777;">
                        Cidade360 - Verificação de segurança
                    </p>
                </div>
            `;

            await enviarEmail(
                email,
                "Cidade360 - Verificação de email",
                html
            );

            return res.json({
                sucesso: true,
                mensagem: "Enviamos um código de verificação para o email informado."
            });

        } catch (error) {
            console.error("Erro ao enviar código de verificação de email:", error);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Não foi possível enviar o código de verificação no momento.",
                erro: error.message
            });
        }
    },

    /*====================================================================================================

    CONFIRMAR CÓDIGO DE EMAIL DO CADASTRO

    =====================================================================================================*/

    async confirmarCodigoVerificacaoEmailCadastro(req, res) {
        try {
            const email = normalizarEmail(req.body.email);
            const codigo = String(req.body.codigo || "").trim();

            if (!validarEmail(email)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Digite um email válido para continuar."
                });
            }

            if (!/^\d{6}$/.test(codigo)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "O código deve conter exatamente 6 números."
                });
            }

            const registroCodigo = await EmailVerificacaoModel.buscarCodigoValidoEmail(email);

            if (!registroCodigo) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Código inválido ou expirado. Solicite um novo código, se necessário."
                });
            }

            const codigoCorreto = await bcrypt.compare(
                codigo,
                registroCodigo.codigo_hash
            );

            if (!codigoCorreto) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Código inválido ou expirado. Solicite um novo código, se necessário."
                });
            }

            const tokenVerificacao = gerarTokenVerificacaoEmail();
            const tokenHash = gerarHashTokenVerificacaoEmail(tokenVerificacao);

            await EmailVerificacaoModel.confirmarCodigoEmail(
                registroCodigo.id,
                tokenHash
            );

            return res.json({
                sucesso: true,
                mensagem: "Email confirmado com sucesso.",
                email_verificacao_token: tokenVerificacao
            });

        } catch (error) {
            console.error("Erro ao confirmar código de email:", error);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Ocorreu um erro ao confirmar o código. Tente novamente em alguns instantes.",
                erro: error.message
            });
        }
    },

    /*====================================================================================================

    ENVIAR CÓDIGO DE RECUPERAÇÃO DE SENHA

    =====================================================================================================*/

    async enviarCodigoRecuperacaoSenha(req, res) {
        try {
            const email = normalizarEmail(req.body.email);

            if (!validarEmail(email)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Digite um email válido para receber o código."
                });
            }

            const usuario = await buscarUsuarioPorEmail(email);

            if (!usuario) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: "Não encontramos uma conta vinculada a este email."
                });
            }

            const codigo = String(crypto.randomInt(100000, 999999));
            const codigoHash = await bcrypt.hash(codigo, 10);

            await invalidarCodigosAnteriores(usuario.id);
            await criarCodigoRecuperacao(usuario.id, codigoHash);

            const html = `
                <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
                    <h2 style="color: #007BFF;">Recuperação de senha - Cidade360</h2>

                    <p>Olá, ${usuario.nome || "usuário"}.</p>

                    <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>

                    <p>Para criar uma nova senha, informe o código abaixo na tela de recuperação:</p>

                    <h1 style="letter-spacing: 4px; color: #007BFF; font-size: 32px;">
                        ${codigo}
                    </h1>

                    <p>Este código é válido por <strong>15 minutos</strong>.</p>

                    <p>Se você não solicitou a recuperação de senha, ignore este email. Sua senha atual continuará a mesma.</p>

                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

                    <p style="font-size: 13px; color: #777;">
                        Cidade360 - Segurança da conta
                    </p>
                </div>
            `;

            await enviarEmail(
                usuario.email,
                "Cidade360 - Recuperação de senha",
                html
            );

            return res.json({
                sucesso: true,
                mensagem: "Enviamos um código de recuperação para o email informado."
            });

        } catch (error) {
            console.error("Erro ao enviar código de recuperação:", error);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Não foi possível enviar o código de recuperação no momento.",
                erro: error.message
            });
        }
    },

    /*====================================================================================================

    REDEFINIR SENHA

    =====================================================================================================*/

    async redefinirSenha(req, res) {
        try {
            const email = normalizarEmail(req.body.email);
            const codigo = String(req.body.codigo || "").trim();
            const novaSenha = String(req.body.novaSenha || "");

            if (!validarEmail(email)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Digite um email válido para continuar."
                });
            }

            if (!/^\d{6}$/.test(codigo)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "O código deve conter exatamente 6 números."
                });
            }

            if (!validarSenhaForte(novaSenha)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "A nova senha não atende aos requisitos de segurança."
                });
            }

            const usuario = await buscarUsuarioPorEmail(email);

            if (!usuario) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Código inválido ou expirado. Solicite um novo código, se necessário."
                });
            }

            const registroCodigo = await buscarCodigoValido(usuario.id);

            if (!registroCodigo) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Código inválido ou expirado. Solicite um novo código, se necessário."
                });
            }

            const codigoCorreto = await bcrypt.compare(
                codigo,
                registroCodigo.codigo_hash
            );

            if (!codigoCorreto) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Código inválido ou expirado. Solicite um novo código, se necessário."
                });
            }

            const senhaAtualHash = await buscarSenhaAtualUsuario(usuario.id);

            if (senhaAtualHash) {
                const senhaEhIgualAnterior = await bcrypt.compare(novaSenha, senhaAtualHash);

                if (senhaEhIgualAnterior) {
                    return res.status(400).json({
                        sucesso: false,
                        mensagem: "A nova senha não pode ser igual à senha anterior."
                    });
                }
            }

            const senhaHash = await bcrypt.hash(novaSenha, 12);

            await atualizarSenhaUsuario(usuario.id, senhaHash);
            await marcarCodigoComoUsado(registroCodigo.id);

            return res.json({
                sucesso: true,
                mensagem: "Senha redefinida com sucesso. Você já pode acessar sua conta."
            });

        } catch (error) {
            console.error("Erro ao redefinir senha:", error);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Ocorreu um erro interno. Tente novamente em alguns instantes.",
                erro: error.message
            });
        }
    },

    

    async confirmarCodigoRecuperacaoSenha(req, res) {
        try {
            const email = normalizarEmail(req.body.email);
            const codigo = String(req.body.codigo || "").trim();

            if (!validarEmail(email)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Digite um email válido para continuar."
                });
            }

            if (!/^\d{6}$/.test(codigo)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "O código deve conter exatamente 6 números."
                });
            }

            const usuario = await buscarUsuarioPorEmail(email);

            if (!usuario) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Código inválido ou expirado. Solicite um novo código, se necessário."
                });
            }

            const registroCodigo = await buscarCodigoValido(usuario.id);

            if (!registroCodigo) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Código inválido ou expirado. Solicite um novo código, se necessário."
                });
            }

            const codigoCorreto = await bcrypt.compare(
                codigo,
                registroCodigo.codigo_hash
            );

            if (!codigoCorreto) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Código inválido ou expirado. Solicite um novo código, se necessário."
                });
            }

            return res.status(200).json({
                sucesso: true,
                mensagem: "Código confirmado com sucesso."
            });

        } catch (error) {
            console.error("Erro ao confirmar código de recuperação:", error);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro interno ao confirmar código de recuperação.",
                erro: error.message
            });
        }
    }
};


module.exports = AuthController;