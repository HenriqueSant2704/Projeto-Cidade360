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


function primeiroNome(nome) {
    return String(nome || "").trim().split(/\s+/)[0] || "";
}


function moldura(titulo, conteudo) {
    return `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 560px;">
            <h2 style="color: #2563EB; margin: 0 0 16px;">
                ${titulo}
            </h2>

            ${conteudo}

            <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0 16px;">

            <p style="font-size: 13px; color: #777; margin: 0;">
                Cidade360 - Prefeitura de Jaborandi-SP
            </p>
        </div>
    `;
}


async function enviarConviteAdministrador({ nome, email, link, convidadoPor, diasValidade }) {
    const html = moldura(
        "Convite para administrar o Cidade360",
        `
            <p>Olá, ${escaparHtml(primeiroNome(nome))}!</p>

            <p>
                ${escaparHtml(convidadoPor)} convidou você para ser
                <strong>administrador(a)</strong> do Cidade360.
            </p>

            <p>
                Com esse acesso você acompanha todas as ocorrências da cidade,
                muda o status, cancela trotes e publica avisos para a população.
            </p>

            <p style="margin: 24px 0;">
                <a href="${escaparHtml(link)}"
                   style="background: #2563EB; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 10px; font-weight: bold; display: inline-block;">
                    Ativar meu acesso
                </a>
            </p>

            <p>
                O convite vale por <strong>${diasValidade} dias</strong>.
                Se o botão não funcionar, copie este endereço no navegador:<br>
                <span style="font-size: 13px; color: #555; word-break: break-all;">${escaparHtml(link)}</span>
            </p>

            <p>Não esperava este e-mail? É só ignorar. Nada acontece sem você clicar.</p>
        `
    );

    return enviarEmail(
        email,
        "Cidade360 - Convite para administrador",
        html
    );
}


async function enviarAvisoPromovido({ nome, email, feitoPor }) {
    const html = moldura(
        "Você agora é administrador(a)",
        `
            <p>Olá, ${escaparHtml(primeiroNome(nome))}!</p>

            <p>
                ${escaparHtml(feitoPor)} deu a você o acesso de
                <strong>administrador(a)</strong> do Cidade360.
            </p>

            <p>
                Entre com o mesmo e-mail e a mesma senha de sempre.
                As ocorrências que você abriu como cidadão continuam na sua conta.
            </p>

            <p>Se você não reconhece essa mudança, avise a prefeitura.</p>
        `
    );

    return enviarEmail(
        email,
        "Cidade360 - Você agora é administrador(a)",
        html
    );
}


async function enviarAvisoRemovido({ nome, email, feitoPor }) {
    const html = moldura(
        "Seu acesso de administrador foi removido",
        `
            <p>Olá, ${escaparHtml(primeiroNome(nome))}.</p>

            <p>
                ${escaparHtml(feitoPor)} removeu o seu acesso de administrador(a) do Cidade360.
            </p>

            <p>
                Sua conta continua ativa como cidadão: você pode entrar com o mesmo
                e-mail e senha para registrar e acompanhar ocorrências.
            </p>

            <p>Se você não reconhece essa mudança, avise a prefeitura.</p>
        `
    );

    return enviarEmail(
        email,
        "Cidade360 - Acesso de administrador removido",
        html
    );
}


module.exports = {
    enviarConviteAdministrador,
    enviarAvisoPromovido,
    enviarAvisoRemovido
};
