const API_URL = "/api";
const EMAIL_LEMBRADO_KEY = "cidade360_email_lembrado";

/*========================================================================================================

VARIÁVEIS GERAIS

=========================================================================================================*/

var modoCadastro = false;
var modoRecuperarSenha = false;
var transicaoTelaAtiva = false;

var formLogin = document.getElementById("formLogin");
var emailInput = document.getElementById("email");
var passwordInput = document.getElementById("password");
var mensagemLogin = document.getElementById("mensagemLogin");
var btnEntrar = document.getElementById("btnEntrar");
var mostrarSenha = document.getElementById("mostrarSenha");
var btnCriarConta = document.getElementById("btnCriarConta");
var rememberInput = document.getElementById("remember");
var campoEmailLogin = document.getElementById("campoEmailLogin");
var campoSenhaLogin = document.getElementById("campoSenhaLogin");

var tituloFormulario = document.getElementById("tituloFormulario");
var subtituloFormulario = document.getElementById("subtituloFormulario");
var indicadorEtapa = document.getElementById("indicadorEtapa");
var areaLembrete = document.getElementById("areaLembrete");
var textoOu = document.getElementById("textoOu");
var camposCadastro = document.getElementById("camposCadastro");
var btnVoltarEtapa = document.getElementById("btnVoltarEtapa");

var etapa1 = document.getElementById("etapa1");
var etapa2 = document.getElementById("etapa2");
var etapa3 = document.getElementById("etapa3");

var textoEtapa1 = document.getElementById("textoEtapa1");
var textoEtapa2 = document.getElementById("textoEtapa2");
var textoEtapa3 = document.getElementById("textoEtapa3");

var barra1 = document.getElementById("barra1");
var barra2 = document.getElementById("barra2");

/*========================================================================================================

EVENTOS INICIAIS

=========================================================================================================*/

document.addEventListener("DOMContentLoaded", () => {
    prepararAnimacoesLogin();

    const token = buscarTokenSalvo();

    if (token) {
        window.location.href = "/";
        return;
    }

    carregarEmailLembrado();
});

/*========================================================================================================

BLOQUEAR ENVIO PADRÃO

=========================================================================================================*/

if (formLogin) {
    formLogin.addEventListener("submit", (event) => {
        event.preventDefault();
        executarAcaoPrincipal();
    });
}

/*========================================================================================================

MOSTRAR / OCULTAR SENHA DO LOGIN

=========================================================================================================*/

if (mostrarSenha && passwordInput) {
    mostrarSenha.addEventListener("click", (event) => {
        event.preventDefault();

        passwordInput.type = passwordInput.type === "password" ? "text" : "password";
    });
}

/*========================================================================================================

BOTÃO ENTRAR / PRÓXIMO / FINALIZAR

=========================================================================================================*/

if (btnEntrar) {
    btnEntrar.addEventListener("click", (event) => {
        event.preventDefault();
        executarAcaoPrincipal();
    });
}

function executarAcaoPrincipal() {
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

/*========================================================================================================

BOTÃO VOLTAR ETAPA

=========================================================================================================*/

if (btnVoltarEtapa) {
    btnVoltarEtapa.addEventListener("click", (event) => {
        event.preventDefault();

        if (modoCadastro && typeof voltarEtapaCadastro === "function") {
            voltarEtapaCadastro();
            return;
        }

        if (modoRecuperarSenha && typeof voltarEtapaRecuperacaoSenha === "function") {
            voltarEtapaRecuperacaoSenha();
            return;
        }
    });
}

/*========================================================================================================

ENTER NOS CAMPOS PRINCIPAIS

=========================================================================================================*/

if (passwordInput) {
    passwordInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            executarAcaoPrincipal();
        }
    });
}

if (emailInput) {
    emailInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            executarAcaoPrincipal();
        }
    });
}

if (emailInput) {
    emailInput.addEventListener("input", () => {
        limparErroCampo(emailInput);
        limparMensagemGeral();
    });
}

if (passwordInput) {
    passwordInput.addEventListener("input", () => {
        limparErroCampo(passwordInput);
        limparMensagemGeral();
    });
}

/*========================================================================================================

LOGIN

=========================================================================================================*/

async function fazerLogin() {
    limparMensagemGeral();

    if (!emailInput || !passwordInput || !btnEntrar) {
        mostrarMensagem("Erro ao carregar a tela de login. Verifique o HTML da página.", "erro");
        return;
    }

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

LEMBRAR-ME

=========================================================================================================*/

function salvarLogin(token, usuario, email) {
    if (rememberInput && rememberInput.checked) {
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
    if (!rememberInput || !emailInput) {
        return;
    }

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

ANIMAÇÕES DE TROCA DE TELA

=========================================================================================================*/

function prepararAnimacoesLogin() {
    if (document.getElementById("cidade360-login-animacoes")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "cidade360-login-animacoes";
    style.textContent = `
        .caixa-login.animacao-saida {
            opacity: 0;
            transform: translateX(-18px) scale(0.985);
            transition: opacity 260ms ease, transform 260ms ease;
        }

        .caixa-login.animacao-entrada {
            opacity: 0;
            transform: translateX(18px) scale(0.985);
        }

        .caixa-login.animacao-entrada.ativa {
            opacity: 1;
            transform: translateX(0) scale(1);
            transition: opacity 260ms ease, transform 260ms ease;
        }

        .seta-btn {
            display: inline-block;
            margin-left: 8px;
            transition: transform 180ms ease;
        }

        #btnEntrar:hover .seta-btn {
            transform: translateX(3px);
        }

        .mostrar-senha-cadastro,
        .mostrar-senha-recuperacao {
            cursor: pointer;
            user-select: none;
        }
    `;

    document.head.appendChild(style);
}

function trocarTela(callback) {
    const caixa = document.querySelector(".caixa-login");

    if (!caixa || typeof callback !== "function") {
        if (typeof callback === "function") {
            callback();
        }

        return;
    }

    if (transicaoTelaAtiva) {
        return;
    }

    transicaoTelaAtiva = true;

    caixa.classList.remove("animacao-entrada", "ativa");
    caixa.classList.add("animacao-saida");

    setTimeout(() => {
        callback();

        caixa.classList.remove("animacao-saida");
        caixa.classList.add("animacao-entrada");

        requestAnimationFrame(() => {
            caixa.classList.add("ativa");
        });

        setTimeout(() => {
            caixa.classList.remove("animacao-entrada", "ativa");
            transicaoTelaAtiva = false;
        }, 280);
    }, 260);
}

/*========================================================================================================

MENSAGENS GERAIS

=========================================================================================================*/

function mostrarMensagem(texto, tipo) {
    if (!mensagemLogin) {
        console.warn(texto);
        return;
    }

    mensagemLogin.style.display = "block";
    mensagemLogin.textContent = texto;
    mensagemLogin.style.color = tipo === "sucesso" ? "#00b894" : "#ff4d4d";
}

function limparMensagemGeral() {
    if (!mensagemLogin) return;

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