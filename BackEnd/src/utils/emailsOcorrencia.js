/*========================================================================================================

E-MAILS DE ATUALIZAÇÃO DAS OCORRÊNCIAS

Responsável por:
- Avisar o cidadão sobre cada mudança de status
- Utilizar o serviço HTTPS da Brevo já configurado
- Guardar os envios pendentes no histórico da ocorrência
- Tentar novamente quando houver falha temporária
- Retomar os envios após um reinício do servidor

=========================================================================================================*/

const db =
    require("../config/db");

const enviarEmail =
    require("./enviarEmail");

const {
    randomUUID
} =
    require("crypto");

const INTERVALO_PROCESSAMENTO =
    30000;

const LIMITE_POR_PROCESSAMENTO =
    10;

let processamentoAtivo =
    false;

let processamentoIniciado =
    false;

let campoDataCriacao =
    null;

let avisoMigracaoExibido =
    false;


/*========================================================================================================

FORMATAÇÃO SEGURA DO CONTEÚDO

=========================================================================================================*/

function escaparHtml(
    valor
) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}


function nomeStatus(
    valor
) {
    const nome =
        String(valor || "")
            .trim();

    const normalizado =
        nome
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

    const nomes = {
        "recebido":
            "Recebido",

        "em analise":
            "Em análise",

        "em atendimento":
            "Em andamento",

        "em andamento":
            "Em andamento",

        "resolvido":
            "Resolvido",

        "cancelado":
            "Cancelado"
    };

    return nomes[normalizado] || nome;
}


function montarMensagem(
    registro
) {
    const dataCriacao =
        new Date(
            registro.data_criacao ||
            registro.data_alteracao
        );

    const ano =
        Number.isNaN(dataCriacao.getTime())
            ? new Date().getFullYear()
            : dataCriacao.getFullYear();

    const protocolo =
        `OC-${ano}-${String(registro.ocorrencia_id).padStart(4, "0")}`;

    const statusAnterior =
        nomeStatus(
            registro.status_anterior_nome
        );

    const statusNovo =
        nomeStatus(
            registro.status_novo_nome
        );

    const mensagens = {
        "Recebido":
            "Sua ocorrência foi recebida pela prefeitura.",

        "Em análise":
            "A prefeitura está analisando sua ocorrência.",

        "Em andamento":
            "Sua ocorrência entrou na etapa de atendimento.",

        "Resolvido":
            "A prefeitura marcou sua ocorrência como resolvida.",

        "Cancelado":
            "A prefeitura marcou sua ocorrência como cancelada."
    };

    const explicacao =
        mensagens[statusNovo] ||
        "A prefeitura atualizou o status da sua ocorrência.";

    const observacao =
        String(registro.observacao || "")
            .trim();

    const dataAlteracao =
        new Date(
            registro.data_alteracao
        );

    const dataFormatada =
        Number.isNaN(dataAlteracao.getTime())
            ? ""
            : dataAlteracao.toLocaleString(
                "pt-BR",
                {
                    timeZone:
                        "America/Sao_Paulo"
                }
            );

    const assunto =
        `Cidade360 | ${protocolo}: ${statusNovo}`;

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Atualização da ocorrência</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f4f6f9; font-family: Arial, sans-serif; color: #263238;">
    <div style="max-width: 600px; margin: 0 auto; padding: 28px; background-color: #ffffff; border-radius: 12px;">
        <h1 style="margin-top: 0; color: #1565c0; font-size: 24px;">Cidade360</h1>
        <h2 style="font-size: 20px;">Sua ocorrência foi atualizada</h2>
        <p>Olá, ${escaparHtml(registro.usuario_nome || "cidadão")}!</p>
        <p>${escaparHtml(explicacao)}</p>
        <div style="padding: 18px; background-color: #f0f5ff; border-radius: 8px;">
            <p style="margin-top: 0;"><strong>Protocolo:</strong> ${escaparHtml(protocolo)}</p>
            <p><strong>Ocorrência:</strong> ${escaparHtml(registro.titulo)}</p>
            <p><strong>Status anterior:</strong> ${escaparHtml(statusAnterior)}</p>
            <p style="margin-bottom: 0;"><strong>Novo status:</strong> ${escaparHtml(statusNovo)}</p>
        </div>
        ${observacao ? `
        <h3 style="font-size: 16px;">Observação da prefeitura</h3>
        <p style="line-height: 1.6;">${escaparHtml(observacao).replace(/\r?\n/g, "<br>")}</p>
        ` : ""}
        ${dataFormatada ? `
        <p><strong>Atualizado em:</strong> ${escaparHtml(dataFormatada)}</p>
        ` : ""}
        <p>Acompanhe os detalhes e o histórico da sua ocorrência pelo Cidade360.</p>
        <p style="margin-bottom: 0; color: #687684; font-size: 12px;">Esta é uma mensagem automática do Cidade360.</p>
    </div>
</body>
</html>
    `;

    return {
        assunto,
        html
    };
}


/*========================================================================================================

COMPATIBILIDADE COM A DATA DE CADASTRO DA OCORRÊNCIA

=========================================================================================================*/

async function obterCampoDataCriacao() {
    if (campoDataCriacao) {
        return campoDataCriacao;
    }

    const [colunas] =
        await db.execute(
            "SHOW COLUMNS FROM ocorrencias"
        );

    const nomes =
        colunas.map(
            coluna => coluna.Field
        );

    campoDataCriacao =
        nomes.includes("data_criacao")
            ? "o.data_criacao"
            : nomes.includes("data_ocorrencia")
                ? "o.data_ocorrencia"
                : "h.data_alteracao";

    return campoDataCriacao;
}


/*========================================================================================================

PROCESSAMENTO DOS AVISOS PENDENTES

O destinatário é sempre o dono da ocorrência.
Cada alteração utiliza uma linha própria do histórico.
O bloqueio temporário impede dois servidores de processarem a mesma linha ao mesmo tempo.

=========================================================================================================*/

async function processarEmailsOcorrencia() {
    if (processamentoAtivo) {
        return;
    }

    processamentoAtivo =
        true;

    try {
        await db.execute(`
            UPDATE historico_ocorrencia
            SET
                email_situacao = 'pendente',
                email_token = NULL,
                email_bloqueado_ate = NULL
            WHERE email_situacao = 'processando'
              AND (
                  email_bloqueado_ate IS NULL
                  OR email_bloqueado_ate <= NOW()
              )
        `);

        await db.execute(`
            UPDATE historico_ocorrencia
            SET email_situacao = 'ignorado'
            WHERE email_situacao = 'pendente'
              AND status_anterior IS NULL
        `);

        const campoData =
            await obterCampoDataCriacao();

        const [registros] =
            await db.execute(`
                SELECT
                    h.id,
                    h.ocorrencia_id,
                    h.observacao,
                    h.data_alteracao,
                    h.email_tentativas,
                    o.titulo,
                    ${campoData} AS data_criacao,
                    u.nome AS usuario_nome,
                    u.email AS usuario_email,
                    anterior.nome AS status_anterior_nome,
                    novo.nome AS status_novo_nome
                FROM historico_ocorrencia h
                JOIN ocorrencias o
                    ON o.id = h.ocorrencia_id
                JOIN usuarios u
                    ON u.id = o.usuario_id
                JOIN status_ocorrencia anterior
                    ON anterior.id = h.status_anterior
                JOIN status_ocorrencia novo
                    ON novo.id = h.status_novo
                WHERE h.email_situacao = 'pendente'
                  AND h.status_anterior IS NOT NULL
                  AND (
                      h.email_proxima_tentativa IS NULL
                      OR h.email_proxima_tentativa <= NOW()
                  )
                  AND NOT EXISTS (
                      SELECT 1
                      FROM historico_ocorrencia anterior_pendente
                      WHERE anterior_pendente.ocorrencia_id = h.ocorrencia_id
                        AND anterior_pendente.id < h.id
                        AND anterior_pendente.status_anterior IS NOT NULL
                        AND anterior_pendente.email_situacao IN ('pendente', 'processando')
                  )
                ORDER BY h.id ASC
                LIMIT ${LIMITE_POR_PROCESSAMENTO}
            `);

        avisoMigracaoExibido =
            false;

        for (const registro of registros) {
            const token =
                randomUUID();

            const [bloqueio] =
                await db.execute(
                    `
                        UPDATE historico_ocorrencia
                        SET
                            email_situacao = 'processando',
                            email_token = ?,
                            email_bloqueado_ate = DATE_ADD(NOW(), INTERVAL 2 MINUTE),
                            email_tentativas = email_tentativas + 1
                        WHERE id = ?
                          AND email_situacao = 'pendente'
                          AND (
                              email_proxima_tentativa IS NULL
                              OR email_proxima_tentativa <= NOW()
                          )
                    `,
                    [
                        token,
                        registro.id
                    ]
                );

            if (!bloqueio.affectedRows) {
                continue;
            }

            let resultado;

            try {
                const {
                    assunto,
                    html
                } =
                    montarMensagem(
                        registro
                    );

                resultado =
                    await enviarEmail(
                        registro.usuario_email,
                        assunto,
                        html
                    );

            } catch (error) {
                const tentativas =
                    Number(registro.email_tentativas || 0) + 1;

                const esperaSegundos =
                    60 * Math.pow(
                        2,
                        Math.min(tentativas - 1, 6)
                    );

                const mensagemErro =
                    String(error.message || "Falha no envio do e-mail.")
                        .slice(0, 1000);

                await db.execute(
                    `
                        UPDATE historico_ocorrencia
                        SET
                            email_situacao = 'pendente',
                            email_token = NULL,
                            email_bloqueado_ate = NULL,
                            email_proxima_tentativa = DATE_ADD(NOW(), INTERVAL ? SECOND),
                            email_ultimo_erro = ?
                        WHERE id = ?
                          AND email_token = ?
                    `,
                    [
                        Math.min(esperaSegundos, 3600),
                        mensagemErro,
                        registro.id,
                        token
                    ]
                );

                console.error(
                    `E-mail do histórico ${registro.id} pendente: ${mensagemErro}`
                );

                continue;
            }

            await db.execute(
                `
                    UPDATE historico_ocorrencia
                    SET
                        email_situacao = 'enviado',
                        email_enviado_em = NOW(),
                        email_message_id = ?,
                        email_token = NULL,
                        email_bloqueado_ate = NULL,
                        email_proxima_tentativa = NULL,
                        email_ultimo_erro = NULL
                    WHERE id = ?
                      AND email_token = ?
                `,
                [
                    resultado.messageId || null,
                    registro.id,
                    token
                ]
            );
        }

    } catch (error) {
        if (
            error.code === "ER_BAD_FIELD_ERROR" ||
            error.code === "ER_NO_SUCH_TABLE"
        ) {
            if (!avisoMigracaoExibido) {
                console.error(
                    "Os e-mails das ocorrências precisam da migração 005_emails_status_ocorrencias.sql no banco de dados."
                );

                avisoMigracaoExibido =
                    true;
            }

        } else {
            console.error(
                "Falha ao processar e-mails das ocorrências:",
                error.message
            );
        }

    } finally {
        processamentoAtivo =
            false;
    }
}


/*========================================================================================================

INICIA O PROCESSAMENTO AUTOMÁTICO

=========================================================================================================*/

function iniciarProcessamentoEmailsOcorrencia() {
    if (processamentoIniciado) {
        return;
    }

    processamentoIniciado =
        true;

    const temporizador =
        setInterval(
            processarEmailsOcorrencia,
            INTERVALO_PROCESSAMENTO
        );

    temporizador.unref();

    processarEmailsOcorrencia();
}


module.exports = {
    iniciarProcessamentoEmailsOcorrencia,
    processarEmailsOcorrencia
};