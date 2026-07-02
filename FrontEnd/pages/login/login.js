const API_URL = "http://localhost:3000/api";
const EMAIL_LEMBRADO_KEY = "cidade360_email_lembrado";

/*========================================================================================================

VARIÁVEIS GERAIS

=========================================================================================================*/

let modoCadastro = false;
let modoRecuperarSenha = false;

const formLogin = document.getElementById("formLogin");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const mensagemLogin = document.getElementById("mensagemLogin");
const btnEntrar = document.getElementById("btnEntrar");
const mostrarSenha = document.getElementById("mostrarSenha");
const btnCriarConta = document.getElementById("btnCriarConta");
const rememberInput = document.getElementById("remember");
const campoEmailLogin = document.getElementById("campoEmailLogin");
const campoSenhaLogin = document.getElementById("campoSenhaLogin");

const tituloFormulario = document.getElementById("tituloFormulario");
const subtituloFormulario = document.getElementById("subtituloFormulario");
const indicadorEtapa = document.getElementById("indicadorEtapa");
const areaLembrete = document.getElementById("areaLembrete");
const textoOu = document.getElementById("textoOu");
const camposCadastro = document.getElementById("camposCadastro");

const etapa1 = document.getElementById("etapa1");
const etapa2 = document.getElementById("etapa2");
const etapa3 = document.getElementById("etapa3");

const textoEtapa1 = document.getElementById("textoEtapa1");
const textoEtapa2 = document.getElementById("textoEtapa2");
const textoEtapa3 = document.getElementById("textoEtapa3");

const barra1 = document.getElementById("barra1");
const barra2 = document.getElementById("barra2");

/*========================================================================================================

EVENTOS INICIAIS

=========================================================================================================*/

document.addEventListener("DOMContentLoaded", () => {
    const token = buscarTokenSalvo();

    if (token) {
        window.location.href = "/";
        return;
    }

    carregarEmailLembrado();
});

if (mostrarSenha) {
    mostrarSenha.addEventListener("click", () => {
        passwordInput.type = passwordInput.type === "password" ? "text" : "password";
    });
}

btnEntrar.addEventListener("click", () => {
    if (modoRecuperarSenha && typeof avancarRecuperacaoSenha === "function") {
        avancarRecuperacaoSenha();
        return;
    }

    if (modoCadastro && typeof avancarCadastro === "function") {
        avancarCadastro();
        return;
    }

    fazerLogin();
});

passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        if (modoRecuperarSenha && typeof avancarRecuperacaoSenha === "function") {
            avancarRecuperacaoSenha();
            return;
        }

        if (modoCadastro && typeof avancarCadastro === "function") {
            avancarCadastro();
            return;
        }

        fazerLogin();
    }
});

emailInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        if (modoRecuperarSenha && typeof avancarRecuperacaoSenha === "function") {
            avancarRecuperacaoSenha();
            return;
        }

        if (modoCadastro && typeof avancarCadastro === "function") {
            avancarCadastro();
            return;
        }

        fazerLogin();
    }
});

emailInput.addEventListener("input", () => {
    limparErroCampo(emailInput);
    limparMensagemGeral();
});

passwordInput.addEventListener("input", () => {
    limparErroCampo(passwordInput);
    limparMensagemGeral();
});

/*========================================================================================================

LOGIN

=========================================================================================================*/

async function fazerLogin() {
    limparMensagemGeral();

    const email = emailInput.value.trim().toLowerCase();
    const senha = passwordInput.value.trim();

    if (!validarLogin(email, senha)) {
        return;
    }

    try {
        btnEntrar.disabled = true;
        btnEntrar.innerHTML = "Entrando...";

        const resposta = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                senha
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            mostrarMensagem(
                dados.mensagem || "Não foi possível entrar. Verifique seu email e senha.",
                "erro"
            );
            return;
        }

        salvarLogin(dados.token, dados.usuario, email);

        mostrarMensagem("Acesso autorizado. Redirecionando para o sistema...", "sucesso");

        setTimeout(() => {
            window.location.href = "/";
        }, 800);

    } catch (error) {
        console.error("Erro ao conectar com o servidor:", error);
        mostrarMensagem(
            "Não foi possível conectar ao servidor. Tente novamente em alguns instantes.",
            "erro"
        );

    } finally {
        btnEntrar.disabled = false;

        if (!modoCadastro && !modoRecuperarSenha) {
            btnEntrar.innerHTML = `
                <img src="../../../assets/icons/login/usuario.png" alt="">
                Entrar
            `;
        }
    }
}

/*========================================================================================================

VALIDAÇÃO DO LOGIN

=========================================================================================================*/

function validarLogin(email, senha) {
    let valido = true;

    limparErroCampo(emailInput);
    limparErroCampo(passwordInput);

    if (!email) {
        mostrarErroCampo(emailInput, "Informe seu email para continuar.");
        valido = false;
    } else if (!validarEmailLogin(email)) {
        mostrarErroCampo(emailInput, "Digite um email válido, como nome@exemplo.com.");
        valido = false;
    }

    if (!senha) {
        mostrarErroCampo(passwordInput, "Informe sua senha para acessar.");
        valido = false;
    }

    return valido;
}

function validarEmailLogin(email) {
    email = String(email || "").trim().toLowerCase();

    if (!email) return false;
    if (email.length > 254) return false;
    if (/\s/.test(email)) return false;

    return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email);
}

/*========================================================================================================

LEMBRAR-ME DO LOGIN

=========================================================================================================*/

function salvarLogin(token, usuario, email) {
    if (rememberInput.checked) {
        localStorage.setItem("cidade360_token", token);
        localStorage.setItem("cidade360_usuario", JSON.stringify(usuario));
        localStorage.setItem("cidade360_lembrar", "true");
        localStorage.setItem(EMAIL_LEMBRADO_KEY, email);

        sessionStorage.removeItem("cidade360_token");
        sessionStorage.removeItem("cidade360_usuario");
    } else {
        sessionStorage.setItem("cidade360_token", token);
        sessionStorage.setItem("cidade360_usuario", JSON.stringify(usuario));

        localStorage.removeItem("cidade360_token");
        localStorage.removeItem("cidade360_usuario");
        localStorage.removeItem("cidade360_lembrar");
        localStorage.removeItem(EMAIL_LEMBRADO_KEY);
    }
}

function carregarEmailLembrado() {
    const lembrar = localStorage.getItem("cidade360_lembrar");
    const emailLembrado = localStorage.getItem(EMAIL_LEMBRADO_KEY);

    rememberInput.checked = false;

    if (lembrar === "true" && emailLembrado) {
        emailInput.value = emailLembrado;
        rememberInput.checked = true;
    } else {
        emailInput.value = "";
        rememberInput.checked = false;
    }
}

function buscarTokenSalvo() {
    return (
        localStorage.getItem("cidade360_token") ||
        sessionStorage.getItem("cidade360_token")
    );
}

/*========================================================================================================

MENSAGENS GERAIS

=========================================================================================================*/

function mostrarMensagem(texto, tipo) {
    mensagemLogin.style.display = "block";
    mensagemLogin.textContent = texto;

    mensagemLogin.style.color = tipo === "sucesso" ? "#00b894" : "#ff4d4d";
}

function limparMensagemGeral() {
    mensagemLogin.style.display = "none";
    mensagemLogin.textContent = "";
}

/*========================================================================================================

ERROS DOS INPUTS

=========================================================================================================*/

function mostrarErroCampo(input, mensagem) {
    if (!input) return;

    const caixaInput = input.closest(".caixa-input");

    if (!caixaInput) return;

    let erro = caixaInput.querySelector(".erro-input");

    if (!erro) {
        erro = document.createElement("small");
        erro.classList.add("erro-input");
        caixaInput.appendChild(erro);
    }

    input.classList.add("input-erro");

    erro.textContent = mensagem;
    erro.style.display = "block";
}

function limparErroCampo(input) {
    if (!input) return;

    const caixaInput = input.closest(".caixa-input");

    if (!caixaInput) return;

    const erro = caixaInput.querySelector(".erro-input");

    input.classList.remove("input-erro");

    if (erro) {
        erro.textContent = "";
        erro.style.display = "none";
    }
}