const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const db = require("../config/db");
const UsuarioModel = require("../models/usuarioModel");
const EmailVerificacaoModel = require("../models/emailVerificacaoModel");

const gerarToken = require("../utils/gerarToken");
const enviarEmail = require("../utils/enviarEmail");

const {
    invalidarCodigosAnteriores,
    criarCodigoRecuperacao,
    buscarCodigoValido
} = require("../models/recuperacaoSenhaModel");


/*========================================================================================================

CONFIGURAÇÕES

=========================================================================================================*/

const BCRYPT_ROUNDS_SENHA = 12;
const BCRYPT_ROUNDS_CODIGO = 10;


/*========================================================================================================

FUNÇÕES AUXILIARES GERAIS

=========================================================================================================*/

function normalizarEmail(email) {

    return String(email || "")
        .trim()
        .toLowerCase();
}


function normalizarNome(nome) {

    return String(nome || "")
        .replace(/\0/g, "")
        .replace(/\s+/g, " ")
        .trim();
}


function apenasNumeros(valor) {

    return String(valor || "")
        .replace(/\D/g, "");
}


function validarEmail(email) {

    const emailNormalizado =
        normalizarEmail(email);

    if (!emailNormalizado) {
        return false;
    }

    if (emailNormalizado.length > 254) {
        return false;
    }

    if (/\s/.test(emailNormalizado)) {
        return false;
    }

    return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
        .test(emailNormalizado);
}


function validarNome(nome) {

    const nomeNormalizado =
        normalizarNome(nome);

    return (
        nomeNormalizado.length >= 3 &&
        nomeNormalizado.length <= 150
    );
}


function validarTelefone(telefone) {

    const numeros =
        apenasNumeros(telefone);

    return (
        numeros.length === 10 ||
        numeros.length === 11
    );
}


/*========================================================================================================

VALIDAÇÃO DE CPF

=========================================================================================================*/

function validarCpf(cpf) {

    const numeros =
        apenasNumeros(cpf);


    if (!/^\d{11}$/.test(numeros)) {
        return false;
    }


    // Bloqueia CPFs como:
    // 00000000000
    // 11111111111
    // 22222222222
    if (/^(\d)\1{10}$/.test(numeros)) {
        return false;
    }


    function calcularDigito(
        base,
        pesoInicial
    ) {

        let soma = 0;


        for (
            let i = 0;
            i < base.length;
            i += 1
        ) {

            soma +=
                Number(base[i]) *
                (pesoInicial - i);
        }


        const resto =
            soma % 11;


        return resto < 2
            ? 0
            : 11 - resto;
    }


    const primeiroDigito =
        calcularDigito(
            numeros.slice(0, 9),
            10
        );


    if (
        primeiroDigito !==
        Number(numeros[9])
    ) {

        return false;
    }


    const segundoDigito =
        calcularDigito(
            numeros.slice(0, 10),
            11
        );


    return (
        segundoDigito ===
        Number(numeros[10])
    );
}


/*========================================================================================================

VALIDAÇÃO DE SENHA

=========================================================================================================*/

function validarSenhaForte(senha) {

    const valor =
        String(senha || "");


    if (valor.length < 8) {
        return false;
    }


    // bcrypt considera apenas os primeiros
    // 72 bytes/caracteres em determinadas situações.
    if (valor.length > 72) {
        return false;
    }


    if (/\s/.test(valor)) {
        return false;
    }


    if (!/[A-Z]/.test(valor)) {
        return false;
    }


    if (!/[a-z]/.test(valor)) {
        return false;
    }


    if (!/[0-9]/.test(valor)) {
        return false;
    }


    if (
        !/[!@#$%&*()_\-+=?.,:;{}[\]^~]/
            .test(valor)
    ) {

        return false;
    }


    const senhaNormalizada =
        valor.toLowerCase();


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


    return !bloqueadas.some(
        item =>
            senhaNormalizada.includes(
                item
            )
    );
}


function validarCodigoSeisDigitos(
    codigo
) {

    return /^\d{6}$/.test(
        String(codigo || "")
            .trim()
    );
}


/*========================================================================================================

BCRYPT

=========================================================================================================*/

function senhaEhBcrypt(hash) {

    return (
        typeof hash === "string" &&
        /^\$2[aby]\$\d{2}\$/.test(hash)
    );
}


/*========================================================================================================

HTML

=========================================================================================================*/

function escaparHtml(valor) {

    return String(valor || "")

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


/*========================================================================================================

RESPOSTAS

=========================================================================================================*/

function responderErroInterno(
    res,
    mensagem
) {

    return res
        .status(500)
        .json({

            sucesso: false,

            mensagem
        });
}


function erroDuplicidadeBanco(
    error
) {

    return (
        error?.code === "ER_DUP_ENTRY" ||
        error?.errno === 1062
    );
}


/*========================================================================================================

VERIFICAÇÃO DE EMAIL

=========================================================================================================*/

function obterSegredoVerificacaoEmail() {

    const segredo =

        process.env
            .EMAIL_VERIFICATION_TOKEN_SECRET

        ||

        process.env.JWT_SECRET;


    if (!segredo) {

        throw new Error(
            "EMAIL_VERIFICATION_TOKEN_SECRET ou JWT_SECRET não configurado."
        );
    }


    return segredo;
}


function gerarTokenVerificacaoEmail() {

    return crypto
        .randomBytes(32)
        .toString("hex");
}


function gerarHashTokenVerificacaoEmail(
    token
) {

    return crypto

        .createHmac(
            "sha256",
            obterSegredoVerificacaoEmail()
        )

        .update(
            String(token || "")
        )

        .digest("hex");
}


/*========================================================================================================

CONTROLLER

=========================================================================================================*/

const AuthController = {


    /*====================================================================================================

    LOGIN

    =====================================================================================================*/


    async login(
        req,
        res
    ) {

        try {

            const {
                email,
                senha
            } =
                req.body || {};


            const emailNormalizado =
                normalizarEmail(email);


            const senhaInformada =
                String(senha || "");


            if (
                !emailNormalizado ||
                !senhaInformada
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Informe seu email e senha para continuar."
                    });
            }


            if (
                !validarEmail(
                    emailNormalizado
                )
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Digite um email válido para continuar."
                    });
            }


            const usuario =
                await UsuarioModel
                    .buscarPorEmail(
                        emailNormalizado
                    );


            /*
             * Não aceita mais senha em texto puro.
             *
             * O código antigo permitia:
             *
             * senha === senhaBanco
             *
             * Isso foi removido.
             */
            if (
                !usuario ||
                !senhaEhBcrypt(
                    usuario.senha_hash
                )
            ) {

                return res
                    .status(401)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Não foi possível entrar. Verifique seu email e senha."
                    });
            }


            if (
                usuario.ativo === 0 ||
                usuario.ativo === false
            ) {

                return res
                    .status(403)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Esta conta está inativa. Entre em contato com o suporte."
                    });
            }


            const senhaCorreta =
                await bcrypt.compare(

                    senhaInformada,

                    usuario.senha_hash
                );


            if (!senhaCorreta) {

                return res
                    .status(401)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Não foi possível entrar. Verifique seu email e senha."
                    });
            }


            const token =
                gerarToken(usuario);


            return res
                .status(200)
                .json({

                    sucesso: true,

                    mensagem:
                        "Acesso autorizado com sucesso.",

                    token,

                    usuario: {

                        id:
                            usuario.id,

                        nome:
                            usuario.nome,

                        email:
                            usuario.email,

                        telefone:
                            usuario.telefone,

                        cpf:
                            usuario.cpf,

                        tipo_usuario:
                            usuario.tipo_usuario,

                        pontos:
                            Number(
                                usuario.pontos || 0
                            ),

                        ativo:
                            Boolean(
                                usuario.ativo
                            ),

                        data_cadastro:
                            usuario.data_cadastro
                    }
                });


        } catch (error) {

            console.error(
                "Erro no login:",
                error
            );


            return responderErroInterno(

                res,

                "Ocorreu um erro interno. Tente novamente em alguns instantes."
            );
        }
    },


    /*====================================================================================================

    CADASTRO

    IMPORTANTE:

    O cadastro público SEMPRE cria:

    CIDADAO

    Mesmo que alguém envie:

    tipo_usuario: "ADMIN"

    o valor será completamente ignorado.

    A criação do usuário e o consumo do token de
    verificação acontecem dentro da mesma transação.

    =====================================================================================================*/


    async cadastrar(
        req,
        res
    ) {

        let conexao;


        try {

            const {

                nome,

                email,

                telefone,

                cpf,

                senha,

                email_verificacao_token

            } =
                req.body || {};


            /*
             * Repare que NÃO extraímos:
             *
             * tipo_usuario
             *
             * do body.
             */


            const nomeNormalizado =
                normalizarNome(nome);


            const emailNormalizado =
                normalizarEmail(email);


            const cpfNumerico =
                apenasNumeros(cpf);


            const telefoneNumerico =
                apenasNumeros(telefone);


            const senhaInformada =
                String(senha || "");


            const tokenVerificacao =
                String(
                    email_verificacao_token || ""
                )
                    .trim();


            /*============================================================================================
            CAMPOS OBRIGATÓRIOS
            ============================================================================================*/


            if (

                !nomeNormalizado ||

                !emailNormalizado ||

                !telefoneNumerico ||

                !cpfNumerico ||

                !senhaInformada

            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Preencha todos os dados obrigatórios para criar sua conta."
                    });
            }


            /*============================================================================================
            NOME
            ============================================================================================*/


            if (
                !validarNome(
                    nomeNormalizado
                )
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Informe um nome válido entre 3 e 150 caracteres."
                    });
            }


            /*============================================================================================
            EMAIL
            ============================================================================================*/


            if (
                !validarEmail(
                    emailNormalizado
                )
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Digite um email válido para continuar."
                    });
            }


            /*============================================================================================
            CPF
            ============================================================================================*/


            if (
                !validarCpf(
                    cpfNumerico
                )
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Digite um CPF válido para continuar."
                    });
            }


            /*============================================================================================
            TELEFONE
            ============================================================================================*/


            if (
                !validarTelefone(
                    telefoneNumerico
                )
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Digite um telefone válido com DDD."
                    });
            }


            /*============================================================================================
            SENHA
            ============================================================================================*/


            if (
                !validarSenhaForte(
                    senhaInformada
                )
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "A senha informada não atende aos requisitos de segurança."
                    });
            }


            /*============================================================================================
            EMAIL PRECISA ESTAR VERIFICADO
            ============================================================================================*/


            if (!tokenVerificacao) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Confirme seu email com o código enviado antes de finalizar o cadastro."
                    });
            }


            const tokenHash =
                gerarHashTokenVerificacaoEmail(
                    tokenVerificacao
                );


            /*
             * Gera o hash antes de iniciar a transação
             * para não manter a conexão presa durante
             * o cálculo do bcrypt.
             */
            const senhaHash =
                await bcrypt.hash(

                    senhaInformada,

                    BCRYPT_ROUNDS_SENHA
                );


            /*============================================================================================
            TRANSAÇÃO
            ============================================================================================*/


            conexao =
                await db.getConnection();


            await conexao
                .beginTransaction();


            /*============================================================================================
            VERIFICA TOKEN DO EMAIL
            ============================================================================================*/


            const [
                tokensValidos
            ] =
                await conexao.execute(
                    `
                    SELECT
                        id

                    FROM email_verificacao_cadastro

                    WHERE email = ?

                    AND token_hash = ?

                    AND verificado = 1

                    AND token_expira_em > NOW()

                    ORDER BY id DESC

                    LIMIT 1

                    FOR UPDATE
                    `,
                    [
                        emailNormalizado,
                        tokenHash
                    ]
                );


            const registroVerificacao =
                tokensValidos[0];


            if (
                !registroVerificacao
            ) {

                await conexao.rollback();


                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "A verificação de email é inválida ou expirou. Solicite um novo código."
                    });
            }


            /*============================================================================================
            EMAIL DUPLICADO
            ============================================================================================*/


            const [
                usuariosEmail
            ] =
                await conexao.execute(
                    `
                    SELECT
                        id

                    FROM usuarios

                    WHERE email = ?

                    LIMIT 1
                    `,
                    [
                        emailNormalizado
                    ]
                );


            if (
                usuariosEmail[0]
            ) {

                await conexao.rollback();


                return res
                    .status(409)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Este email já está vinculado a uma conta."
                    });
            }


            /*============================================================================================
            CPF DUPLICADO
            ============================================================================================*/


            const [
                usuariosCpf
            ] =
                await conexao.execute(
                    `
                    SELECT
                        id

                    FROM usuarios

                    WHERE cpf = ?

                    LIMIT 1
                    `,
                    [
                        cpfNumerico
                    ]
                );


            if (
                usuariosCpf[0]
            ) {

                await conexao.rollback();


                return res
                    .status(409)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Este CPF já está vinculado a uma conta."
                    });
            }


            /*============================================================================================
            CRIA O USUÁRIO

            O tipo de usuário é DEFINIDO PELO SERVIDOR.

            ============================================================================================*/


            const [
                resultado
            ] =
                await conexao.execute(
                    `
                    INSERT INTO usuarios
                    (
                        nome,

                        email,

                        telefone,

                        cpf,

                        senha_hash,

                        tipo_usuario
                    )

                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        'CIDADAO'
                    )
                    `,
                    [

                        nomeNormalizado,

                        emailNormalizado,

                        telefoneNumerico,

                        cpfNumerico,

                        senhaHash
                    ]
                );


            /*============================================================================================
            CONSOME O TOKEN

            Impede reutilização do mesmo token para
            concluir outro cadastro.

            ============================================================================================*/


            await conexao.execute(
                `
                UPDATE email_verificacao_cadastro

                SET
                    token_expira_em = NOW()

                WHERE id = ?
                `,
                [
                    registroVerificacao.id
                ]
            );


            /*============================================================================================
            COMMIT
            ============================================================================================*/


            await conexao.commit();


            return res
                .status(201)
                .json({

                    sucesso: true,

                    mensagem:
                        "Conta criada com sucesso.",

                    id:
                        resultado.insertId
                });


        } catch (error) {


            if (conexao) {

                try {

                    await conexao
                        .rollback();

                } catch (
                    rollbackError
                ) {

                    console.error(

                        "Erro ao desfazer cadastro:",

                        rollbackError
                    );
                }
            }


            console.error(
                "Erro ao cadastrar:",
                error
            );


            /*
             * Proteção contra condição de corrida.
             *
             * Mesmo que duas requisições passem
             * simultaneamente pelas verificações,
             * UNIQUE no banco continua sendo a
             * garantia final.
             */
            if (
                erroDuplicidadeBanco(
                    error
                )
            ) {

                return res
                    .status(409)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Já existe uma conta com o email ou CPF informado."
                    });
            }


            return responderErroInterno(

                res,

                "Ocorreu um erro interno. Tente novamente em alguns instantes."
            );


        } finally {


            if (conexao) {

                conexao.release();
            }
        }
    },


    /*====================================================================================================

    USUÁRIO LOGADO

    =====================================================================================================*/


    async me(
        req,
        res
    ) {

        try {

            return res
                .status(200)
                .json({

                    sucesso: true,

                    usuario:
                        req.usuario
                });


        } catch (error) {

            console.error(

                "Erro ao consultar usuário autenticado:",

                error
            );


            return responderErroInterno(

                res,

                "Ocorreu um erro interno. Tente novamente em alguns instantes."
            );
        }
    },


    /*====================================================================================================

    ENVIAR CÓDIGO DE VERIFICAÇÃO DE EMAIL PARA CADASTRO

    =====================================================================================================*/


    async enviarCodigoVerificacaoEmailCadastro(
        req,
        res
    ) {

        try {

            const email =
                normalizarEmail(
                    req.body?.email
                );


            if (
                !validarEmail(email)
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Digite um email válido para receber o código."
                    });
            }


            /*============================================================================================
            VERIFICA SE EMAIL JÁ EXISTE
            ============================================================================================*/


            const usuarioExiste =
                await UsuarioModel
                    .buscarPorEmail(
                        email
                    );


            if (
                usuarioExiste
            ) {

                return res
                    .status(409)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Este email já está vinculado a uma conta."
                    });
            }


            /*============================================================================================
            GERA CÓDIGO
            ============================================================================================*/


            const codigo =
                String(
                    crypto.randomInt(
                        100000,
                        1000000
                    )
                );


            const codigoHash =
                await bcrypt.hash(

                    codigo,

                    BCRYPT_ROUNDS_CODIGO
                );


            /*============================================================================================
            INVALIDA CÓDIGOS ANTERIORES
            ============================================================================================*/


            await EmailVerificacaoModel
                .invalidarCodigosEmail(
                    email
                );


            /*============================================================================================
            CRIA NOVO CÓDIGO
            ============================================================================================*/


            await EmailVerificacaoModel
                .criarCodigoEmail(

                    email,

                    codigoHash
                );


            /*============================================================================================
            EMAIL
            ============================================================================================*/


            const html = `
                <div
                    style="
                        font-family: Arial, sans-serif;
                        color: #333;
                        line-height: 1.5;
                    "
                >

                    <h2
                        style="
                            color: #007BFF;
                        "
                    >
                        Confirme seu email no Cidade360
                    </h2>


                    <p>
                        Olá!
                    </p>


                    <p>
                        Recebemos uma solicitação para criar uma conta
                        no Cidade360 usando este endereço de email.
                    </p>


                    <p>
                        Para continuar o cadastro, informe o código
                        abaixo na tela do sistema:
                    </p>


                    <h1
                        style="
                            letter-spacing: 4px;
                            color: #007BFF;
                            font-size: 32px;
                        "
                    >

                        ${codigo}

                    </h1>


                    <p>
                        Este código é válido por
                        <strong>
                            15 minutos
                        </strong>.
                    </p>


                    <p>
                        Se você não solicitou este cadastro,
                        apenas ignore este email.
                    </p>


                    <hr
                        style="
                            border: none;
                            border-top: 1px solid #ddd;
                            margin: 20px 0;
                        "
                    >


                    <p
                        style="
                            font-size: 13px;
                            color: #777;
                        "
                    >
                        Cidade360 - Verificação de segurança
                    </p>

                </div>
            `;


            await enviarEmail(

                email,

                "Cidade360 - Verificação de email",

                html
            );


            return res
                .status(200)
                .json({

                    sucesso: true,

                    mensagem:
                        "Enviamos um código de verificação para o email informado."
                });


        } catch (error) {

            console.error(

                "Erro ao enviar código de verificação de email:",

                error
            );


            return responderErroInterno(

                res,

                "Não foi possível enviar o código de verificação no momento."
            );
        }
    },


    /*====================================================================================================

    CONFIRMAR CÓDIGO DE EMAIL DO CADASTRO

    =====================================================================================================*/


    async confirmarCodigoVerificacaoEmailCadastro(
        req,
        res
    ) {

        try {

            const email =
                normalizarEmail(
                    req.body?.email
                );


            const codigo =
                String(
                    req.body?.codigo || ""
                )
                    .trim();


            /*============================================================================================
            EMAIL
            ============================================================================================*/


            if (
                !validarEmail(email)
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Digite um email válido para continuar."
                    });
            }


            /*============================================================================================
            CÓDIGO
            ============================================================================================*/


            if (
                !validarCodigoSeisDigitos(
                    codigo
                )
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "O código deve conter exatamente 6 números."
                    });
            }


            /*============================================================================================
            EMAIL JÁ CADASTRADO
            ============================================================================================*/


            const usuarioExiste =
                await UsuarioModel
                    .buscarPorEmail(
                        email
                    );


            if (
                usuarioExiste
            ) {

                return res
                    .status(409)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Este email já está vinculado a uma conta."
                    });
            }


            /*============================================================================================
            BUSCA CÓDIGO
            ============================================================================================*/


            const registroCodigo =
                await EmailVerificacaoModel
                    .buscarCodigoValidoEmail(
                        email
                    );


            if (
                !registroCodigo
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Código inválido ou expirado. Solicite um novo código, se necessário."
                    });
            }


            /*============================================================================================
            COMPARA CÓDIGO
            ============================================================================================*/


            const codigoCorreto =
                await bcrypt.compare(

                    codigo,

                    registroCodigo
                        .codigo_hash
                );


            if (
                !codigoCorreto
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Código inválido ou expirado. Solicite um novo código, se necessário."
                    });
            }


            /*============================================================================================
            GERA TOKEN DE VERIFICAÇÃO
            ============================================================================================*/


            const tokenVerificacao =
                gerarTokenVerificacaoEmail();


            /*
             * O token enviado para o usuário
             * nunca é salvo diretamente no banco.
             *
             * Só armazenamos o HMAC.
             */
            const tokenHash =
                gerarHashTokenVerificacaoEmail(
                    tokenVerificacao
                );


            /*============================================================================================
            CONFIRMA
            ============================================================================================*/


            await EmailVerificacaoModel
                .confirmarCodigoEmail(

                    registroCodigo.id,

                    tokenHash
                );


            return res
                .status(200)
                .json({

                    sucesso: true,

                    mensagem:
                        "Email confirmado com sucesso.",

                    email_verificacao_token:
                        tokenVerificacao
                });


        } catch (error) {

            console.error(

                "Erro ao confirmar código de email:",

                error
            );


            return responderErroInterno(

                res,

                "Ocorreu um erro ao confirmar o código. Tente novamente em alguns instantes."
            );
        }
    },


    /*====================================================================================================

    ENVIAR CÓDIGO DE RECUPERAÇÃO DE SENHA

    IMPORTANTE:

    Não revelamos se determinado email possui uma conta.

    Assim alguém não consegue usar a API para descobrir
    quais cidadãos estão cadastrados.

    =====================================================================================================*/


    async enviarCodigoRecuperacaoSenha(
        req,
        res
    ) {

        try {

            const email =
                normalizarEmail(
                    req.body?.email
                );


            if (
                !validarEmail(email)
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Digite um email válido para receber o código."
                    });
            }


            const usuario =
                await UsuarioModel
                    .buscarPorEmail(
                        email
                    );


            /*
             * Mesma resposta sendo conta existente
             * ou inexistente.
             */
            const respostaGenerica = {

                sucesso: true,

                mensagem:
                    "Se existir uma conta vinculada a este email, enviaremos um código de recuperação."
            };


            /*
             * Não informa que a conta não existe.
             */
            if (

                !usuario ||

                usuario.ativo === 0 ||

                usuario.ativo === false

            ) {

                return res
                    .status(200)
                    .json(
                        respostaGenerica
                    );
            }


            /*============================================================================================
            GERA CÓDIGO
            ============================================================================================*/


            const codigo =
                String(
                    crypto.randomInt(
                        100000,
                        1000000
                    )
                );


            const codigoHash =
                await bcrypt.hash(

                    codigo,

                    BCRYPT_ROUNDS_CODIGO
                );


            /*============================================================================================
            INVALIDA CÓDIGOS ANTIGOS
            ============================================================================================*/


            await invalidarCodigosAnteriores(
                usuario.id
            );


            /*============================================================================================
            NOVO CÓDIGO
            ============================================================================================*/


            await criarCodigoRecuperacao(

                usuario.id,

                codigoHash
            );


            /*
             * Evita que eventualmente um nome contendo
             * HTML interfira no conteúdo do email.
             */
            const nomeSeguro =
                escaparHtml(
                    usuario.nome ||
                    "usuário"
                );


            /*============================================================================================
            EMAIL
            ============================================================================================*/


            const html = `
                <div
                    style="
                        font-family: Arial, sans-serif;
                        color: #333;
                        line-height: 1.5;
                    "
                >

                    <h2
                        style="
                            color: #007BFF;
                        "
                    >
                        Recuperação de senha - Cidade360
                    </h2>


                    <p>
                        Olá, ${nomeSeguro}.
                    </p>


                    <p>
                        Recebemos uma solicitação para redefinir
                        a senha da sua conta.
                    </p>


                    <p>
                        Para criar uma nova senha, informe o código
                        abaixo na tela de recuperação:
                    </p>


                    <h1
                        style="
                            letter-spacing: 4px;
                            color: #007BFF;
                            font-size: 32px;
                        "
                    >

                        ${codigo}

                    </h1>


                    <p>
                        Este código é válido por
                        <strong>
                            15 minutos
                        </strong>.
                    </p>


                    <p>
                        Se você não solicitou a recuperação de senha,
                        ignore este email. Sua senha atual continuará
                        a mesma.
                    </p>


                    <hr
                        style="
                            border: none;
                            border-top: 1px solid #ddd;
                            margin: 20px 0;
                        "
                    >


                    <p
                        style="
                            font-size: 13px;
                            color: #777;
                        "
                    >
                        Cidade360 - Segurança da conta
                    </p>

                </div>
            `;


            await enviarEmail(

                usuario.email,

                "Cidade360 - Recuperação de senha",

                html
            );


            return res
                .status(200)
                .json(
                    respostaGenerica
                );


        } catch (error) {

            console.error(

                "Erro ao enviar código de recuperação:",

                error
            );


            return responderErroInterno(

                res,

                "Não foi possível processar a recuperação de senha no momento."
            );
        }
    },


    /*====================================================================================================

    CONFIRMAR CÓDIGO DE RECUPERAÇÃO DE SENHA

    Essa etapa apenas verifica o código.

    O código só será consumido definitivamente quando
    a senha for alterada.

    =====================================================================================================*/


    async confirmarCodigoRecuperacaoSenha(
        req,
        res
    ) {

        try {

            const email =
                normalizarEmail(
                    req.body?.email
                );


            const codigo =
                String(
                    req.body?.codigo || ""
                )
                    .trim();


            if (
                !validarEmail(email)
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Digite um email válido para continuar."
                    });
            }


            if (
                !validarCodigoSeisDigitos(
                    codigo
                )
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "O código deve conter exatamente 6 números."
                    });
            }


            const usuario =
                await UsuarioModel
                    .buscarPorEmail(
                        email
                    );


            if (

                !usuario ||

                usuario.ativo === 0 ||

                usuario.ativo === false

            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Código inválido ou expirado. Solicite um novo código, se necessário."
                    });
            }


            const registroCodigo =
                await buscarCodigoValido(
                    usuario.id
                );


            if (
                !registroCodigo
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Código inválido ou expirado. Solicite um novo código, se necessário."
                    });
            }


            const codigoCorreto =
                await bcrypt.compare(

                    codigo,

                    registroCodigo
                        .codigo_hash
                );


            if (
                !codigoCorreto
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Código inválido ou expirado. Solicite um novo código, se necessário."
                    });
            }


            return res
                .status(200)
                .json({

                    sucesso: true,

                    mensagem:
                        "Código confirmado com sucesso."
                });


        } catch (error) {

            console.error(

                "Erro ao confirmar código de recuperação:",

                error
            );


            return responderErroInterno(

                res,

                "Erro interno ao confirmar código de recuperação."
            );
        }
    },


    /*====================================================================================================

    REDEFINIR SENHA

    Aqui usamos transação.

    A operação:

        atualizar senha
              +
        invalidar código

    acontece de forma atômica.

    =====================================================================================================*/


    async redefinirSenha(
        req,
        res
    ) {

        let conexao;


        try {

            const email =
                normalizarEmail(
                    req.body?.email
                );


            const codigo =
                String(
                    req.body?.codigo || ""
                )
                    .trim();


            const novaSenha =
                String(
                    req.body?.novaSenha || ""
                );


            /*============================================================================================
            EMAIL
            ============================================================================================*/


            if (
                !validarEmail(email)
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Digite um email válido para continuar."
                    });
            }


            /*============================================================================================
            CÓDIGO
            ============================================================================================*/


            if (
                !validarCodigoSeisDigitos(
                    codigo
                )
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "O código deve conter exatamente 6 números."
                    });
            }


            /*============================================================================================
            NOVA SENHA
            ============================================================================================*/


            if (
                !validarSenhaForte(
                    novaSenha
                )
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "A nova senha não atende aos requisitos de segurança."
                    });
            }


            /*============================================================================================
            TRANSAÇÃO
            ============================================================================================*/


            conexao =
                await db.getConnection();


            await conexao
                .beginTransaction();


            /*============================================================================================
            USUÁRIO

            FOR UPDATE impede outra redefinição simultânea
            de alterar o mesmo registro até terminarmos.

            ============================================================================================*/


            const [
                usuarios
            ] =
                await conexao.execute(
                    `
                    SELECT

                        id,

                        senha_hash,

                        ativo

                    FROM usuarios

                    WHERE email = ?

                    LIMIT 1

                    FOR UPDATE
                    `,
                    [
                        email
                    ]
                );


            const usuario =
                usuarios[0];


            if (

                !usuario ||

                usuario.ativo === 0 ||

                usuario.ativo === false

            ) {

                await conexao.rollback();


                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Código inválido ou expirado. Solicite um novo código, se necessário."
                    });
            }


            /*============================================================================================
            CÓDIGO MAIS RECENTE

            ============================================================================================*/


            const [
                codigos
            ] =
                await conexao.execute(
                    `
                    SELECT

                        id,

                        codigo_hash

                    FROM recuperacao_senha

                    WHERE usuario_id = ?

                    AND usado = 0

                    AND expira_em > NOW()

                    ORDER BY id DESC

                    LIMIT 1

                    FOR UPDATE
                    `,
                    [
                        usuario.id
                    ]
                );


            const registroCodigo =
                codigos[0];


            if (
                !registroCodigo
            ) {

                await conexao.rollback();


                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Código inválido ou expirado. Solicite um novo código, se necessário."
                    });
            }


            /*============================================================================================
            CONFERE CÓDIGO
            ============================================================================================*/


            const codigoCorreto =
                await bcrypt.compare(

                    codigo,

                    registroCodigo
                        .codigo_hash
                );


            if (
                !codigoCorreto
            ) {

                await conexao.rollback();


                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            "Código inválido ou expirado. Solicite um novo código, se necessário."
                    });
            }


            /*============================================================================================
            NÃO PERMITE REPETIR A SENHA ATUAL
            ============================================================================================*/


            if (
                senhaEhBcrypt(
                    usuario.senha_hash
                )
            ) {

                const senhaEhIgualAnterior =
                    await bcrypt.compare(

                        novaSenha,

                        usuario.senha_hash
                    );


                if (
                    senhaEhIgualAnterior
                ) {

                    await conexao.rollback();


                    return res
                        .status(400)
                        .json({

                            sucesso: false,

                            mensagem:
                                "A nova senha não pode ser igual à senha anterior."
                        });
                }
            }


            /*============================================================================================
            NOVO HASH
            ============================================================================================*/


            const senhaHash =
                await bcrypt.hash(

                    novaSenha,

                    BCRYPT_ROUNDS_SENHA
                );


            /*============================================================================================
            ATUALIZA SENHA
            ============================================================================================*/


            await conexao.execute(
                `
                UPDATE usuarios

                SET
                    senha_hash = ?

                WHERE id = ?
                `,
                [

                    senhaHash,

                    usuario.id
                ]
            );


            /*============================================================================================
            CONSOME O CÓDIGO
            ============================================================================================*/


            await conexao.execute(
                `
                UPDATE recuperacao_senha

                SET
                    usado = 1

                WHERE id = ?

                AND usado = 0
                `,
                [
                    registroCodigo.id
                ]
            );


            /*============================================================================================
            COMMIT
            ============================================================================================*/


            await conexao.commit();


            return res
                .status(200)
                .json({

                    sucesso: true,

                    mensagem:
                        "Senha redefinida com sucesso. Você já pode acessar sua conta."
                });


        } catch (error) {


            if (conexao) {

                try {

                    await conexao
                        .rollback();

                } catch (
                    rollbackError
                ) {

                    console.error(

                        "Erro ao desfazer redefinição de senha:",

                        rollbackError
                    );
                }
            }


            console.error(

                "Erro ao redefinir senha:",

                error
            );


            return responderErroInterno(

                res,

                "Ocorreu um erro interno. Tente novamente em alguns instantes."
            );


        } finally {


            if (conexao) {

                conexao.release();
            }
        }
    }
};


module.exports =
    AuthController;