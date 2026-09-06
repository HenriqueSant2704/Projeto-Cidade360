/*========================================================================================================

SERVIÇO DE ENVIO DE E-MAIL

Responsável por:
- Enviar e-mails transacionais do Cidade360
- Utilizar a API HTTPS da Brevo
- Evitar dependência de SMTP
- Funcionar no ambiente gratuito do Render
- Tratar erros e timeout de conexão

=========================================================================================================*/

const BREVO_API_URL =
    "https://api.brevo.com/v3/smtp/email";


/*========================================================================================================

VALIDAÇÃO DAS CONFIGURAÇÕES

=========================================================================================================*/

function validarConfiguracaoEmail() {
    const apiKey =
        String(
            process.env.BREVO_API_KEY || ""
        )
            .trim();

    const emailRemetente =
        String(
            process.env.BREVO_SENDER_EMAIL || ""
        )
            .trim();

    const nomeRemetente =
        String(
            process.env.BREVO_SENDER_NAME ||
            "Cidade360"
        )
            .trim();


    if (!apiKey) {
        throw new Error(
            "BREVO_API_KEY não configurada."
        );
    }


    if (!emailRemetente) {
        throw new Error(
            "BREVO_SENDER_EMAIL não configurado."
        );
    }


    return {
        apiKey,
        emailRemetente,
        nomeRemetente
    };
}


/*========================================================================================================

LÊ RESPOSTA DA API

=========================================================================================================*/

async function lerRespostaBrevo(resposta) {
    const corpo =
        await resposta.text();


    if (!corpo) {
        return null;
    }


    try {
        return JSON.parse(
            corpo
        );

    } catch (error) {
        return {
            mensagem:
                corpo
        };
    }
}


/*========================================================================================================

ENVIO DE E-MAIL

=========================================================================================================*/

async function enviarEmail(destinatario, assunto, html) {
    const {
        apiKey,
        emailRemetente,
        nomeRemetente
    } =
        validarConfiguracaoEmail();


    const emailDestino =
        String(
            destinatario || ""
        )
            .trim();


    const assuntoEmail =
        String(
            assunto || ""
        )
            .trim();


    if (!emailDestino) {
        throw new Error(
            "Destinatário do e-mail não informado."
        );
    }


    if (!assuntoEmail) {
        throw new Error(
            "Assunto do e-mail não informado."
        );
    }


    const controlador =
        new AbortController();


    const timeout =
        setTimeout(
            () => {
                controlador.abort();
            },
            15000
        );


    try {
        console.log(
            `Enviando e-mail para ${emailDestino}...`
        );


        const resposta =
            await fetch(
                BREVO_API_URL,
                {
                    method:
                        "POST",

                    headers: {
                        "accept":
                            "application/json",

                        "api-key":
                            apiKey,

                        "content-type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            sender: {
                                name:
                                    nomeRemetente,

                                email:
                                    emailRemetente
                            },

                            to: [
                                {
                                    email:
                                        emailDestino
                                }
                            ],

                            subject:
                                assuntoEmail,

                            htmlContent:
                                html
                        }),

                    signal:
                        controlador.signal
                }
            );


        const dados =
            await lerRespostaBrevo(
                resposta
            );


        if (!resposta.ok) {
            const mensagem =
                dados?.message ||
                dados?.mensagem ||
                `Erro HTTP ${resposta.status}`;


            throw new Error(
                `Brevo: ${mensagem}`
            );
        }


        console.log(
            `E-mail enviado com sucesso para ${emailDestino}.`
        );


        if (dados?.messageId) {
            console.log(
                `ID da mensagem: ${dados.messageId}`
            );
        }


        return {
            sucesso:
                true,

            messageId:
                dados?.messageId || null
        };


    } catch (error) {
        if (
            error?.name ===
            "AbortError"
        ) {
            console.error(
                "Timeout ao enviar e-mail pela Brevo."
            );


            throw new Error(
                "Tempo limite excedido durante o envio do e-mail."
            );
        }


        console.error(
            "Erro ao enviar e-mail:",
            error
        );


        throw error;


    } finally {
        clearTimeout(
            timeout
        );
    }
}


module.exports =
    enviarEmail;