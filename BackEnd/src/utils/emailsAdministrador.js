/*========================================================================================================

E-MAILS DA ÁREA DE ADMINISTRADORES

- Convite para quem ainda não tem conta (com o link para criar a senha)
- Aviso de que a pessoa virou administradora
- Aviso de que o acesso de administrador foi removido

Enviados pela Brevo (utils/enviarEmail.js), igual aos outros e-mails do sistema.

=========================================================================================================*/

const enviarEmail =
    require("./enviarEmail");

const {
    escaparHtml
} =
    require("./validacoesUsuario");

const {
    montarEmail,
    paragrafo,
    botao,
    linkReserva,
    listaItens,
    notaSeguranca
} =
    require("./modeloEmail");


function primeiroNome(nome) {
    return String(nome || "").trim().split(/\s+/)[0] || "";
}

function resumoPermissoes(permissoes = []) {
    const nomes = {
        ocorrencias: "<strong>Ocorrências:</strong> ver todas e mudar status",
        avisos: "<strong>Avisos:</strong> publicar e editar comunicados",
        equipe: "<strong>Equipe:</strong> gerenciar administradores"
    };
    const itens = permissoes.filter((chave) => nomes[chave]).map((chave) => nomes[chave]);
    return listaItens("Seu acesso inclui:", itens);
}

function saudacao(nome, pontuacao = "!") {
    return paragrafo(`Olá, <strong style="color: #1f2937;">${escaparHtml(primeiroNome(nome))}</strong>${pontuacao}`);
}


async function enviarConviteAdministrador({ nome, email, link, convidadoPor, diasValidade, permissoes = [] }) {
    const assunto = "Cidade360 - Convite para administrador";

    const html = montarEmail({
        assunto,
        previa: `${convidadoPor} convidou você para administrar o Cidade360.`,
        etiqueta: "Convite",
        titulo: "Você foi convidado(a) para administrar o Cidade360",
        conteudo: `
            ${saudacao(nome)}
            ${paragrafo(`<strong style="color: #1f2937;">${escaparHtml(convidadoPor)}</strong> convidou você para ser <strong style="color: #1f2937;">administrador(a)</strong> do Cidade360.`)}
            ${resumoPermissoes(permissoes)}
            ${botao("Ativar meu acesso", link)}
            ${paragrafo(`O convite vale por <strong style="color: #1f2937;">${diasValidade} dias</strong>.`)}
            ${linkReserva(link)}
            ${notaSeguranca("Não esperava este e-mail? É só ignorar. Nada acontece sem você clicar no botão.")}
        `
    });

    return enviarEmail(
        email,
        assunto,
        html
    );
}


async function enviarAvisoPromovido({ nome, email, feitoPor, permissoes = [] }) {
    const assunto = "Cidade360 - Você agora é administrador(a)";

    const html = montarEmail({
        assunto,
        previa: "Seu acesso de administrador(a) já está ativo.",
        etiqueta: "Acesso de administrador",
        titulo: "Você agora é administrador(a)",
        conteudo: `
            ${saudacao(nome)}
            ${paragrafo(`<strong style="color: #1f2937;">${escaparHtml(feitoPor)}</strong> deu a você o acesso de <strong style="color: #1f2937;">administrador(a)</strong> do Cidade360.`)}
            ${paragrafo("Entre com o mesmo e-mail e a mesma senha de sempre. As ocorrências que você abriu como cidadão continuam na sua conta.")}
            ${resumoPermissoes(permissoes)}
            ${notaSeguranca("Não reconhece essa mudança? Avise a prefeitura.")}
        `
    });

    return enviarEmail(
        email,
        assunto,
        html
    );
}


async function enviarAvisoRemovido({ nome, email, feitoPor }) {
    const assunto = "Cidade360 - Acesso de administrador removido";

    const html = montarEmail({
        assunto,
        previa: "Sua conta continua ativa como cidadão.",
        etiqueta: "Acesso de administrador",
        titulo: "Seu acesso de administrador foi removido",
        conteudo: `
            ${saudacao(nome, ".")}
            ${paragrafo(`<strong style="color: #1f2937;">${escaparHtml(feitoPor)}</strong> removeu o seu acesso de administrador(a) do Cidade360.`)}
            ${paragrafo("Sua conta continua ativa como cidadão: você pode entrar com o mesmo e-mail e senha para registrar e acompanhar ocorrências.")}
            ${notaSeguranca("Não reconhece essa mudança? Avise a prefeitura.")}
        `
    });

    return enviarEmail(
        email,
        assunto,
        html
    );
}


module.exports = {
    enviarConviteAdministrador,
    enviarAvisoPromovido,
    enviarAvisoRemovido
};
