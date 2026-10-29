/*========================================================================================================

E-MAILS DA CONTA DO CIDADÃO

- Código para confirmar o e-mail no cadastro
- Código para recuperar a senha
- Meu perfil: código para confirmar o e-mail novo, aviso de e-mail trocado e aviso de senha trocada

O visual vem de utils/modeloEmail.js (o mesmo de todos os e-mails do sistema).
Quem envia é o authController.js (cadastro e senha) e o perfilController.js (Meu perfil),
pela Brevo (utils/enviarEmail.js).

=========================================================================================================*/

const {
    montarEmail,
    paragrafo,
    blocoCodigo,
    notaSeguranca,
    escaparHtml
} =
    require("./modeloEmail");


function primeiroNome(nome) {
    return String(nome || "").trim().split(/\s+/)[0] || "";
}


function htmlCodigoCadastro(codigo) {
    return montarEmail({
        assunto: "Cidade360 - Verificação de e-mail",
        previa: `Seu código de verificação é ${codigo}. Ele vale por 15 minutos.`,
        etiqueta: "Confirmação de cadastro",
        titulo: "Confirme seu e-mail",
        conteudo: `
            ${paragrafo("Olá! Recebemos um pedido para criar uma conta no Cidade360 com este endereço de e-mail.")}
            ${paragrafo("Para continuar o cadastro, digite o código abaixo na tela do sistema:")}
            ${blocoCodigo(codigo)}
            ${notaSeguranca("Não foi você que pediu? É só ignorar este e-mail. Nenhuma conta será criada sem o código.")}
        `
    });
}


function htmlRecuperacaoSenha(nome, codigo) {
    const nomeSeguro = escaparHtml(primeiroNome(nome) || "cidadão");

    return montarEmail({
        assunto: "Cidade360 - Recuperação de senha",
        previa: `Seu código para criar uma nova senha é ${codigo}.`,
        etiqueta: "Segurança da conta",
        titulo: "Vamos criar uma nova senha",
        conteudo: `
            ${paragrafo(`Olá, <strong style="color: #1f2937;">${nomeSeguro}</strong>!`)}
            ${paragrafo("Recebemos um pedido para redefinir a senha da sua conta. Digite o código abaixo na tela de recuperação:")}
            ${blocoCodigo(codigo)}
            ${notaSeguranca("Não pediu para trocar a senha? Ignore este e-mail. Sua senha atual continua a mesma.")}
        `
    });
}


// ma*****@gmail.com: o e-mail antigo fica sabendo da troca sem ver o endereço novo inteiro.
function mascararEmail(email) {
    const [usuario, dominio] = String(email || "").split("@");

    if (!usuario || !dominio) {
        return "";
    }

    return `${usuario.slice(0, 2)}${"*".repeat(Math.max(usuario.length - 2, 3))}@${dominio}`;
}


function htmlCodigoTrocaEmail(nome, codigo) {
    const nomeSeguro = escaparHtml(primeiroNome(nome) || "cidadão");

    return montarEmail({
        assunto: "Cidade360 - Confirme seu novo e-mail",
        previa: `Seu código para confirmar o novo e-mail é ${codigo}.`,
        etiqueta: "Meu perfil",
        titulo: "Confirme seu novo e-mail",
        conteudo: `
            ${paragrafo(`Olá, <strong style="color: #1f2937;">${nomeSeguro}</strong>!`)}
            ${paragrafo("Você pediu para usar este endereço como o novo e-mail da sua conta no Cidade360. Digite o código abaixo na página Meu perfil:")}
            ${blocoCodigo(codigo)}
            ${notaSeguranca("Não foi você? Ignore este e-mail. Sem o código, o e-mail da conta não muda.")}
        `
    });
}


function htmlAvisoEmailAlterado(nome, emailNovo) {
    const nomeSeguro = escaparHtml(primeiroNome(nome) || "cidadão");

    return montarEmail({
        assunto: "Cidade360 - O e-mail da sua conta foi alterado",
        previa: "O e-mail de acesso da sua conta no Cidade360 foi trocado.",
        etiqueta: "Segurança da conta",
        titulo: "O e-mail da sua conta mudou",
        conteudo: `
            ${paragrafo(`Olá, <strong style="color: #1f2937;">${nomeSeguro}</strong>!`)}
            ${paragrafo(`O e-mail de acesso da sua conta no Cidade360 foi trocado para <strong style="color: #1f2937;">${escaparHtml(mascararEmail(emailNovo))}</strong>. A partir de agora, este endereço não recebe mais os avisos da conta.`)}
            ${notaSeguranca("Não foi você? Procure a prefeitura o quanto antes para recuperar o acesso à sua conta.")}
        `
    });
}


function htmlAvisoSenhaAlterada(nome) {
    const nomeSeguro = escaparHtml(primeiroNome(nome) || "cidadão");

    return montarEmail({
        assunto: "Cidade360 - Sua senha foi alterada",
        previa: "A senha da sua conta no Cidade360 foi trocada.",
        etiqueta: "Segurança da conta",
        titulo: "Sua senha foi alterada",
        conteudo: `
            ${paragrafo(`Olá, <strong style="color: #1f2937;">${nomeSeguro}</strong>!`)}
            ${paragrafo("A senha da sua conta no Cidade360 acabou de ser trocada pela página Meu perfil.")}
            ${notaSeguranca("Não foi você? Use \"Esqueceu sua senha?\" na tela de login para criar uma nova senha e procure a prefeitura.")}
        `
    });
}


module.exports = {
    htmlCodigoCadastro,
    htmlRecuperacaoSenha,
    htmlCodigoTrocaEmail,
    htmlAvisoEmailAlterado,
    htmlAvisoSenhaAlterada
};
