/*========================================================================================================

MODELO VISUAL DOS E-MAILS DO CIDADE360

Responsável por:
- Dar a mesma cara para todos os e-mails do sistema (cores e fonte do site)
- Montar as peças que se repetem: cabeçalho, código, botão, caixa de dados, selo de status e rodapé
- Funcionar nos leitores de e-mail mais comuns (Gmail, Outlook, celular)

Por que tabelas e estilo "inline"?
Leitores de e-mail ignoram boa parte do CSS moderno (flex, grid, <style>).
Tabela com estilo direto na tag é o jeito que funciona em todos.

Quem usa: authController.js (código de cadastro e recuperação de senha),
emailsOcorrencia.js (mudança de status) e emailsAdministrador.js (convite e permissões).

=========================================================================================================*/

const {
    CIDADES_ATENDIDAS
} =
    require("../config/cidadeAtendida");


// Mesmas cores do global.css (tema claro)
const CORES = {
    fundo: "#f6f6f6",
    cartao: "#ffffff",
    linha: "#ececec",
    texto: "#1f2937",
    textoSuave: "#374151",
    apagado: "#616880",
    azul: "#2563EB",
    azulForte: "#0041ce",
    azulSuave: "#eef3fb",
    roxo: "#6d4cf0"
};

// Mesmas cores dos selos de status das telas (--s-*)
const CORES_STATUS = {
    "Recebido": { cor: "#2563eb", fundo: "#eaf1fe" },
    "Em análise": { cor: "#b45309", fundo: "#fff4e0" },
    "Em andamento": { cor: "#15803d", fundo: "#e7f7ec" },
    "Resolvido": { cor: "#7c3aed", fundo: "#f1ebff" },
    "Cancelado": { cor: "#dc2626", fundo: "#fdecec" }
};

const FONTE =
    "'Poppins', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";


function escaparHtml(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}


function nomePrefeitura() {
    const cidade = CIDADES_ATENDIDAS[0];
    return cidade ? `Prefeitura de ${cidade.nome}-${cidade.uf}` : "Prefeitura";
}


// Endereço do site (APP_URL no Render). Sem ele, o e-mail sai sem logo e sem botão "abrir o site".
function enderecoDoSite() {
    return String(process.env.APP_URL || "").trim().replace(/\/+$/, "");
}


/*========================================================================================================

PEÇAS DO E-MAIL

Cada função devolve um pedaço de HTML pronto para colocar dentro de montarEmail().
Textos vindos do usuário precisam chegar aqui já escapados (escaparHtml).

=========================================================================================================*/

function paragrafo(html) {
    return `<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.65; color: ${CORES.textoSuave};">${html}</p>`;
}


function blocoCodigo(codigo, validade = "15 minutos") {
    const codigoSeguro = escaparHtml(codigo);

    return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0 24px;">
            <tr>
                <td align="center" style="background: ${CORES.azulSuave}; border: 1px dashed #b9cdf6; border-radius: 14px; padding: 22px 12px;">
                    <div style="font-size: 12px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: ${CORES.apagado}; margin-bottom: 8px;">
                        Seu código
                    </div>
                    <div style="font-family: 'Courier New', Consolas, monospace; font-size: 36px; font-weight: 700; letter-spacing: 10px; color: ${CORES.azul}; padding-left: 10px;">
                        ${codigoSeguro}
                    </div>
                    <div style="font-size: 13px; color: ${CORES.apagado}; margin-top: 8px;">
                        Válido por <strong style="color: ${CORES.texto};">${escaparHtml(validade)}</strong>
                    </div>
                </td>
            </tr>
        </table>
    `;
}


// Texto do botão azul é sempre branco (regra de design do sistema)
function botao(texto, link) {
    return `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0 24px;">
            <tr>
                <td align="center" bgcolor="${CORES.azul}" style="border-radius: 12px; background: ${CORES.azul};">
                    <a href="${escaparHtml(link)}" target="_blank"
                       style="display: inline-block; padding: 14px 28px; font-family: ${FONTE}; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 12px;">
                        ${escaparHtml(texto)}
                    </a>
                </td>
            </tr>
        </table>
    `;
}


function linkReserva(link) {
    return `
        <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.6; color: ${CORES.apagado};">
            Se o botão não funcionar, copie este endereço no navegador:<br>
            <a href="${escaparHtml(link)}" style="color: ${CORES.azul}; word-break: break-all;">${escaparHtml(link)}</a>
        </p>
    `;
}


function seloStatus(nome) {
    const estilo = CORES_STATUS[nome] || { cor: CORES.apagado, fundo: "#f1f3f6" };

    return `<span style="display: inline-block; padding: 4px 12px; border-radius: 999px; background: ${estilo.fundo}; color: ${estilo.cor}; font-size: 13px; font-weight: 600; white-space: nowrap;">${escaparHtml(nome)}</span>`;
}


// linhas: [{ rotulo, valor }] — valor já em HTML seguro
function caixaDados(linhas) {
    const conteudo = linhas.map((linha, indice) => `
        <tr>
            <td style="padding: 12px 18px; ${indice ? `border-top: 1px solid ${CORES.linha};` : ""} font-size: 13px; color: ${CORES.apagado}; width: 38%; vertical-align: top;">
                ${escaparHtml(linha.rotulo)}
            </td>
            <td style="padding: 12px 18px; ${indice ? `border-top: 1px solid ${CORES.linha};` : ""} font-size: 14px; font-weight: 600; color: ${CORES.texto}; vertical-align: top;">
                ${linha.valor}
            </td>
        </tr>
    `).join("");

    return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="margin: 8px 0 24px; border: 1px solid ${CORES.linha}; border-radius: 14px; border-collapse: separate; background: #f8fafc;">
            ${conteudo}
        </table>
    `;
}


// Lista com marcadores (ex.: permissões do administrador)
function listaItens(titulo, itens) {
    if (!itens.length) {
        return "";
    }

    return `
        <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: ${CORES.texto};">${escaparHtml(titulo)}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px;">
            ${itens.map((item) => `
                <tr>
                    <td style="padding: 4px 10px 4px 0; vertical-align: top; color: ${CORES.azul}; font-size: 14px;">&#10003;</td>
                    <td style="padding: 4px 0; font-size: 14px; line-height: 1.5; color: ${CORES.textoSuave};">${item}</td>
                </tr>
            `).join("")}
        </table>
    `;
}


// Caixa com a fala da prefeitura (observação ao mudar o status)
function citacao(titulo, textoHtml) {
    return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px;">
            <tr>
                <td style="border-left: 4px solid ${CORES.azul}; background: ${CORES.azulSuave}; border-radius: 0 12px 12px 0; padding: 14px 18px;">
                    <div style="font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: ${CORES.azul}; margin-bottom: 6px;">
                        ${escaparHtml(titulo)}
                    </div>
                    <div style="font-size: 14px; line-height: 1.6; color: ${CORES.texto};">${textoHtml}</div>
                </td>
            </tr>
        </table>
    `;
}


// Aviso discreto no fim do conteúdo ("Não foi você? ...")
function notaSeguranca(html) {
    return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0 0;">
            <tr>
                <td style="background: #f8fafc; border: 1px solid ${CORES.linha}; border-radius: 12px; padding: 12px 16px; font-size: 13px; line-height: 1.55; color: ${CORES.apagado};">
                    &#128274;&nbsp; ${html}
                </td>
            </tr>
        </table>
    `;
}


/*========================================================================================================

E-MAIL COMPLETO

opcoes:
- assunto:   vai no <title> (alguns leitores mostram)
- previa:    frase curta que aparece ao lado do assunto na caixa de entrada
- titulo:    título grande do cartão
- etiqueta:  palavra pequena acima do título (ex.: "Segurança da conta")
- conteudo:  HTML montado com as peças acima

=========================================================================================================*/

function montarEmail({ assunto = "Cidade360", previa = "", titulo, etiqueta = "", conteudo }) {
    const site = enderecoDoSite();

    const logo = site
        ? `<img src="${escaparHtml(site)}/assets/img/global/logo/icone-cidade360.png" width="40" height="40" alt=""
                style="display: block; width: 40px; height: 40px; border: 0; background: #ffffff; border-radius: 12px; padding: 4px;">`
        : "";

    const linkSite = site
        ? `<a href="${escaparHtml(site)}" style="color: ${CORES.azul}; text-decoration: none; font-weight: 600;">Acessar o Cidade360</a> &nbsp;·&nbsp; `
        : "";

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escaparHtml(assunto)}</title>
</head>
<body style="margin: 0; padding: 0; background: ${CORES.fundo}; -webkit-text-size-adjust: 100%;">

    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
        ${escaparHtml(previa)}&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${CORES.fundo}" style="background: ${CORES.fundo};">
        <tr>
            <td align="center" style="padding: 32px 12px;">

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                       style="max-width: 580px; font-family: ${FONTE}; color: ${CORES.texto};">

                    <!-- Cabeçalho: faixa com o gradiente do site -->
                    <tr>
                        <td bgcolor="${CORES.azul}"
                            style="background: ${CORES.azul}; background-image: linear-gradient(120deg, ${CORES.azul} 0%, ${CORES.roxo} 100%); border-radius: 18px 18px 0 0; padding: 22px 28px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    ${logo ? `<td style="padding-right: 12px; vertical-align: middle;">${logo}</td>` : ""}
                                    <td style="vertical-align: middle;">
                                        <div style="font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px; line-height: 1.1;">
                                            Cidade<span style="color: #c9d8ff;">360</span>
                                        </div>
                                        <div style="font-size: 12px; color: #dbe5ff; margin-top: 3px;">
                                            ${escaparHtml(nomePrefeitura())}
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Conteúdo -->
                    <tr>
                        <td bgcolor="${CORES.cartao}"
                            style="background: ${CORES.cartao}; border: 1px solid ${CORES.linha}; border-top: 0; border-radius: 0 0 18px 18px; padding: 32px 28px 28px;">

                            ${etiqueta ? `
                            <div style="font-size: 12px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: ${CORES.azul}; margin-bottom: 6px;">
                                ${escaparHtml(etiqueta)}
                            </div>` : ""}

                            <h1 style="margin: 0 0 20px; font-size: 22px; line-height: 1.3; font-weight: 700; color: ${CORES.texto};">
                                ${escaparHtml(titulo)}
                            </h1>

                            ${conteudo}
                        </td>
                    </tr>

                    <!-- Rodapé -->
                    <tr>
                        <td align="center" style="padding: 20px 16px 0; font-size: 12px; line-height: 1.6; color: ${CORES.apagado};">
                            ${linkSite}${escaparHtml(nomePrefeitura())}<br>
                            Esta é uma mensagem automática. Não é preciso responder.
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>`;
}


module.exports = {
    montarEmail,
    paragrafo,
    blocoCodigo,
    botao,
    linkReserva,
    seloStatus,
    caixaDados,
    listaItens,
    citacao,
    notaSeguranca,
    escaparHtml
};
