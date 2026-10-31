const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const db = require("../config/db");
const UsuarioModel = require("../models/usuarioModel");
const PermissaoAdminModel = require("../models/permissaoAdminModel");
const EmailVerificacaoModel = require("../models/emailVerificacaoModel");

const gerarToken = require("../utils/gerarToken");
const enviarEmail = require("../utils/enviarEmail");

const {
    htmlCodigoCadastro,
    htmlRecuperacaoSenha
} = require("../utils/emailsConta");

const {
    invalidarCodigosAnteriores,
    criarCodigoRecuperacao,
    buscarCodigoValido
} = require("../models/recuperacaoSenhaModel");

const {
    MENSAGEM_CIDADE_INDISPONIVEL,
    normalizarUf,
    cidadeEhAtendida
} = require("../utils/cidadeAtendida");


/*========================================================================================================

CONFIGURAÇÕES

=========================================================================================================*/

const BCRYPT_ROUNDS_SENHA = 12;
const BCRYPT_ROUNDS_CODIGO = 10;


/*========================================================================================================

INSERIR CIDADÃO (com cidade e estado)

As colunas cidade/uf chegam com a migração 010. Enquanto ela não roda no banco,
o cadastro continua funcionando sem gravar a cidade (a regra da cidade já foi
conferida antes de chegar aqui).

=========================================================================================================*/

async function inserirUsuarioCidadao(conexao, dados) {

    try {

        const [resultado] =
            await conexao.execute(
                `
                INSERT INTO usuarios
                (
                    nome,
                    email,
                    telefone,
                    cpf,
                    senha_hash,
                    cidade,
                    uf,
                    tipo_usuario
                )
                VALUES
                (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    'CIDADAO'
                )
                `,
                [
                    dados.nome,
                    dados.email,
                    dados.telefone,
                    dados.cpf,
                    dados.senhaHash,
                    dados.cidade,
                    dados.uf
                ]
            );

        return resultado;

    } catch (error) {

        if (error.code !== "ER_BAD_FIELD_ERROR") {
            throw error;
        }

        console.warn(
            "Colunas cidade/uf ainda não existem em usuarios (rode a migração 010). Cadastrando sem a cidade."
        );

        const [resultado] =
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
                    dados.nome,
                    dados.email,
                    dados.telefone,
                    dados.cpf,
                    dados.senhaHash
                ]
            );

        return resultado;
    }
}


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

RECUPERAÇÃO DE SENHA PELO CPF

A conta é encontrada pelo CPF (só existe uma conta por CPF) e o código vai
para o email cadastrado nela. A tela mostra o email mascarado (ex.: he***@gmail.com).

Ainda aceita "email" no corpo, para quem estiver com a página antiga em cache.

=========================================================================================================*/

const MAX_ERROS_CODIGO_RECUPERACAO = 5;

/*
 * Erros de código por usuário (fica na memória do servidor).
 * Depois de 5 erros o código é cancelado e a pessoa precisa pedir outro.
 * Se o servidor reiniciar, a contagem zera: tudo bem, o código expira em 15 minutos.
 */
const errosCodigoRecuperacao = new Map();

function lerIdentificacaoRecuperacao(corpo) {
    const cpf =
        apenasNumeros(
            corpo?.cpf
        );

    if (cpf) {
        if (!validarCpf(cpf)) {
            return {
                erro: "Digite um CPF válido para continuar."
            };
        }

        return {
            coluna: "cpf",
            valor: cpf
        };
    }

    const email =
        normalizarEmail(
            corpo?.email
        );

    if (validarEmail(email)) {
        return {
            coluna: "email",
            valor: email
        };
    }

    return {
        erro: "Informe o CPF da sua conta para continuar."
    };
}

function buscarUsuarioRecuperacao(identificacao) {
    if (identificacao.coluna === "cpf") {
        return UsuarioModel.buscarPorCpf(
            identificacao.valor
        );
    }

    return UsuarioModel.buscarPorEmail(
        identificacao.valor
    );
}

function usuarioInativo(usuario) {
    return (
        !usuario ||
        usuario.ativo === 0 ||
        usuario.ativo === false
    );
}

/*
 * henriquesantanamiguel@gmail.com -> he*****@gmail.com
 * Sempre 5 asteriscos, para não entregar o tamanho do email.
 */
function mascararEmail(email) {
    const [usuario, dominio] =
        String(email || "")
            .split("@");

    if (!usuario || !dominio) {
        return "";
    }

    const visivel =
        usuario.length <= 2
            ? usuario.slice(0, 1)
            : usuario.slice(0, 2);

    return `${visivel}*****@${dominio}`;
}

/*
 * Conta um erro de código. Devolve true quando chegou no limite
 * (e já cancela o código).
 */
async function registrarErroCodigoRecuperacao(usuarioId) {
    const erros =
        (errosCodigoRecuperacao.get(usuarioId) || 0) + 1;

    if (erros < MAX_ERROS_CODIGO_RECUPERACAO) {
        errosCodigoRecuperacao.set(usuarioId, erros);
        return false;
    }

    errosCodigoRecuperacao.delete(usuarioId);

    await invalidarCodigosAnteriores(
        usuarioId
    );

    return true;
}

const MENSAGEM_CODIGO_BLOQUEADO =
    "Você errou o código 5 vezes. Por segurança, ele foi cancelado. Volte e peça um novo código.";

const MENSAGEM_CODIGO_INVALIDO =
    "Código inválido ou expirado. Solicite um novo código, se necessário.";


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

            const permissoes = usuario.tipo_usuario === "ADMIN"
                ? await PermissaoAdminModel.buscar(usuario.id)
                : undefined;


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

                        permissoes,

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

                cidade,

                uf,

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


            const ufInformada =
                normalizarUf(uf);


            const cidadeInformada =
                String(cidade || "")
                    .replace(/\s+/g, " ")
                    .trim()
                    .slice(0, 120);


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

            CIDADE E ESTADO

            Só cria conta quem escolhe uma cidade atendida pelo Cidade360
            (hoje, somente Jaborandi-SP). Regra em src/config/cidadeAtendida.js.

            ============================================================================================*/

            if (
                !cidadeInformada ||
                !/^[A-Z]{2}$/.test(ufInformada)
            ) {

                return res
                    .status(400)
                    .json({
                        sucesso: false,
                        mensagem:
                            "Informe o estado e a cidade onde você mora."
                    });
            }


            const cidadeAtendida =
                cidadeEhAtendida(
                    cidadeInformada,
                    ufInformada
                );


            if (!cidadeAtendida) {

                return res
                    .status(400)
                    .json({
                        sucesso: false,
                        codigo:
                            "CIDADE_INDISPONIVEL",
                        mensagem:
                            MENSAGEM_CIDADE_INDISPONIVEL
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


            const resultado =
                await inserirUsuarioCidadao(
                    conexao,
                    {
                        nome:
                            nomeNormalizado,

                        email:
                            emailNormalizado,

                        telefone:
                            telefoneNumerico,

                        cpf:
                            cpfNumerico,

                        senhaHash,

                        cidade:
                            cidadeAtendida.nome,

                        uf:
                            cidadeAtendida.uf
                    }
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


            const html =
                htmlCodigoCadastro(
                    codigo
                );


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

            const identificacao =
                lerIdentificacaoRecuperacao(
                    req.body
                );


            if (
                identificacao.erro
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            identificacao.erro
                    });
            }


            const usuario =
                await buscarUsuarioRecuperacao(
                    identificacao
                );


            /*
             * Decisão do Miguel (31/10/2026): CPF não cadastrado não avança.
             * A tela fica no CPF com a mensagem abaixo.
             * Quem tenta "chutar" CPFs é barrado pelo limite de tentativas da rota.
             */
            if (
                usuarioInativo(usuario)
            ) {

                return res
                    .status(404)
                    .json({

                        sucesso: false,

                        mensagem:
                            identificacao.coluna === "cpf"
                                ? "CPF não encontrado. Confira os números ou crie uma conta."
                                : "Email não encontrado. Confira o email ou crie uma conta."
                    });
            }


            const respostaSucesso = {

                sucesso: true,

                mensagem:
                    "Código de recuperação enviado para o email cadastrado.",

                emailMascarado:
                    mascararEmail(
                        usuario.email
                    )
            };


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


            errosCodigoRecuperacao.delete(
                usuario.id
            );


            /*============================================================================================
            NOVO CÓDIGO
            ============================================================================================*/


            await criarCodigoRecuperacao(

                usuario.id,

                codigoHash
            );


            const html =
                htmlRecuperacaoSenha(
                    usuario.nome,
                    codigo
                );


            await enviarEmail(

                usuario.email,

                "Cidade360 - Recuperação de senha",

                html
            );


            return res
                .status(200)
                .json(
                    respostaSucesso
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

            const identificacao =
                lerIdentificacaoRecuperacao(
                    req.body
                );


            const codigo =
                String(
                    req.body?.codigo || ""
                )
                    .trim();


            if (
                identificacao.erro
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            identificacao.erro
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
                await buscarUsuarioRecuperacao(
                    identificacao
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

                const bloqueou =
                    await registrarErroCodigoRecuperacao(
                        usuario.id
                    );


                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        codigoCancelado:
                            bloqueou,

                        mensagem:
                            bloqueou
                                ? MENSAGEM_CODIGO_BLOQUEADO
                                : MENSAGEM_CODIGO_INVALIDO
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

            const identificacao =
                lerIdentificacaoRecuperacao(
                    req.body
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
            CPF (ou email, na página antiga)
            ============================================================================================*/


            if (
                identificacao.erro
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        mensagem:
                            identificacao.erro
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

                        email,

                        senha_hash,

                        ativo

                    FROM usuarios

                    WHERE ${identificacao.coluna === "cpf" ? "cpf" : "email"} = ?

                    LIMIT 1

                    FOR UPDATE
                    `,
                    [
                        identificacao.valor
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


                const bloqueou =
                    await registrarErroCodigoRecuperacao(
                        usuario.id
                    );


                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        codigoCancelado:
                            bloqueou,

                        mensagem:
                            bloqueou
                                ? MENSAGEM_CODIGO_BLOQUEADO
                                : MENSAGEM_CODIGO_INVALIDO
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


            errosCodigoRecuperacao.delete(
                usuario.id
            );


            return res
                .status(200)
                .json({

                    sucesso: true,

                    mensagem:
                        "Senha redefinida com sucesso. Você já pode acessar sua conta.",

                    // A pessoa já provou que tem acesso ao email: pode preencher o login
                    email:
                        usuario.email
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
