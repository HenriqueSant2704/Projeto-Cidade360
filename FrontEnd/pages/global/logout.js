/*========================================================================================================

LOGOUT DO SISTEMA

Remove todos os dados do login, limpa o "Lembrar-me"
e manda o usuário para a tela de login.

=========================================================================================================*/

document.addEventListener("DOMContentLoaded", () => {
    const btnSair = document.getElementById("btnSair");

    if (!btnSair) {
        console.warn("Botão sair não encontrado. Verifique se existe id='btnSair'.");
        return;
    }

    btnSair.addEventListener("click", () => {
        sairDoSistema();
    });
});

function sairDoSistema() {
    limparDadosLogin();

    /*
        Usa replace para trocar a página atual pelo login.
        Assim, se o usuário tentar voltar, o authGuard verifica de novo.
    */
    window.location.replace("pages/login/login.html");
}

function limparDadosLogin() {
    /* 
        Remove dados principais do login salvos no localStorage.
        localStorage é usado quando o usuário marca "Lembrar-me".
    */
    localStorage.removeItem("cidade360_token");
    localStorage.removeItem("cidade360_usuario");
    localStorage.removeItem("cidade360_id");

    /*
        Remove dados do lembrar-me.
        Isso faz o checkbox voltar desmarcado no próximo acesso.
    */
    localStorage.removeItem("cidade360_lembrar");
    localStorage.removeItem("cidade360_email_lembrado");

    /*
        Remove dados principais do login salvos no sessionStorage.
        sessionStorage é usado quando o usuário NÃO marca "Lembrar-me".
    */
    sessionStorage.removeItem("cidade360_token");
    sessionStorage.removeItem("cidade360_usuario");
    sessionStorage.removeItem("cidade360_id");

    /*
        Segurança extra:
        remove qualquer outra chave antiga do sistema que comece com cidade360_.
    */
    Object.keys(localStorage).forEach((chave) => {
        if (chave.startsWith("cidade360_")) {
            localStorage.removeItem(chave);
        }
    });

    Object.keys(sessionStorage).forEach((chave) => {
        if (chave.startsWith("cidade360_")) {
            sessionStorage.removeItem(chave);
        }
    });
}