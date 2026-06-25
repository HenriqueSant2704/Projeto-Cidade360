/*========================================================================================================

LOGOUT DO SISTEMA

Remove todos os dados do login e manda o usuário para a tela de login.

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

    // Troca a página atual pelo login.
    // Assim dificulta voltar para a página protegida pelo histórico.
    window.location.replace("/pages/login/login.html");
}

function limparDadosLogin() {
    // Remove dados específicos do Cidade360
    localStorage.removeItem("cidade360_token");
    localStorage.removeItem("cidade360_usuario");
    localStorage.removeItem("cidade360_id");

    sessionStorage.removeItem("cidade360_token");
    sessionStorage.removeItem("cidade360_usuario");
    sessionStorage.removeItem("cidade360_id");

    // Garante que qualquer chave começando com cidade360_ também seja removida
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