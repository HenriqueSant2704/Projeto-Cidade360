/*========================================================================================================

AUTH GUARD

Protege páginas privadas.
Se não tiver token ou se o token for inválido, manda para login.

=========================================================================================================*/

const API_URL_AUTH = "http://localhost:3000/api";
const LOGIN_PAGE = "../../../FrontEnd/pages/login/login.html";

// Esconde a página enquanto verifica o login
document.documentElement.style.visibility = "hidden";

// Verifica ao carregar normalmente
verificarAcesso();

// Verifica também quando o usuário volta pelo botão "voltar" do navegador
window.addEventListener("pageshow", () => {
    verificarAcesso();
});

async function verificarAcesso() {
    const token =
        localStorage.getItem("cidade360_token") ||
        sessionStorage.getItem("cidade360_token");

    if (!token) {
        limparDadosLogin();
        window.location.replace(LOGIN_PAGE);
        return;
    }

    try {
        const resposta = await fetch(`${API_URL_AUTH}/me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            limparDadosLogin();
            window.location.replace(LOGIN_PAGE);
            return;
        }

        // Usuário válido, libera a tela
        window.usuarioLogado = dados.usuario;
        document.documentElement.style.visibility = "visible";

    } catch (error) {
        console.error("Erro ao verificar login:", error);

        limparDadosLogin();
        window.location.replace(LOGIN_PAGE);
    }
}

function limparDadosLogin() {
    localStorage.removeItem("cidade360_token");
    localStorage.removeItem("cidade360_usuario");
    localStorage.removeItem("cidade360_id");

    sessionStorage.removeItem("cidade360_token");
    sessionStorage.removeItem("cidade360_usuario");
    sessionStorage.removeItem("cidade360_id");

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