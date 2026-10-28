const API_URL = "/api";
const EMAIL_LEMBRADO_KEY = "cidade360_email_lembrado";

/*========================================================================================================

ÍCONES (SVG: ficam nítidos em qualquer tela e seguem a cor do tema)

=========================================================================================================*/

const ICONES_LOGIN = {
    seta: '<svg class="seta" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 6l6 6-6 6"/></svg>',
    entrar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    criar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M19 8v6M16 11h6"/></svg>',
    voltar: '<svg class="icone-voltar" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="M12 6l-6 6 6 6"/></svg>',
    olho: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    olhoFechado: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
    erro: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
    ok: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
    pessoa: '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    cpf: '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2"/><path d="M6 16a3 3 0 0 1 6 0M15 10h3M15 14h3"/></svg>',
    email: '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>',
    telefone: '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>',
    cadeado: '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    escudo: '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    mapa: '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>',
    predio: '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 9h5a1 1 0 0 1 1 1v11M3 21h18M8 8h2M8 12h2M8 16h2"/></svg>',
    setaSelect: '<svg class="seta-select" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'
};

/*========================================================================================================

VARIÁVEIS GERAIS

=========================================================================================================*/

var modoCadastro = false;
var modoRecuperarSenha = false;
var transicaoTelaAtiva = false;

var formularioLogin = document.getElementById("formularioLogin");
var formLogin = document.getElementById("formLogin");
var emailInput = document.getElementById("email");
var passwordInput = document.getElementById("password");
var mensagemLogin = document.getElementById("mensagemLogin");
var btnEntrar = document.getElementById("btnEntrar");
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

/*========================================================================================================

EVENTOS INICIAIS

=========================================================================================================*/

document.addEventListener("DOMContentLoaded", () => {
    const token = buscarTokenSalvo();

    if (token) {
        window.location.href = "/";
        return;
    }

    rotuloBotaoPrincipal("Entrar", "entrar");
    rotuloBotaoCriarConta(false);
    prepararOlhosSenha(formLogin);
    carregarEmailLembrado();
});

/*========================================================================================================

ENVIO DO FORMULÁRIO (botão principal e Enter em qualquer campo)

=========================================================================================================*/

if (formularioLogin) {
    formularioLogin.addEventListener("submit", (event) => {
        event.preventDefault();
        executarAcaoPrincipal();
    });
}

function executarAcaoPrincipal() {
    // Evita enviar duas vezes (duplo clique ou Enter durante o carregamento)
    if (btnEntrar.disabled || transicaoTelaAtiva) {
        return;
    }

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

        if (btnEntrar.disabled) {
            return;
        }

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

LIMPAR ERROS AO DIGITAR

=========================================================================================================*/

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
        mostrarMensagem("Erro ao carregar a tela de login. Atualize a página e tente novamente.", "erro");
        return;
    }

    const email = emailInput.value.trim().toLowerCase();
    const senha = passwordInput.value.trim();

    if (!validarLogin(email, senha)) {
        return;
    }

    let entrou = false;

    try {
        carregandoBotaoPrincipal("Entrando...");

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

        const dados = await lerRespostaJson(resposta);

        if (!resposta.ok || !dados.sucesso) {
            mostrarMensagem(
                dados.mensagem || "Não foi possível entrar. Verifique seu email e senha.",
                "erro"
            );

            passwordInput.classList.add("input-erro");
            balancar(passwordInput.closest(".campo"));
            return;
        }

        salvarLogin(dados.token, dados.usuario, email);

        entrou = true;

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
        // Depois de entrar o botão fica girando até a página trocar
        if (!entrou) {
            btnEntrar.disabled = false;

            if (!modoCadastro && !modoRecuperarSenha) {
                rotuloBotaoPrincipal("Entrar", "entrar");
            }
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

RESPOSTA DO SERVIDOR

Se o servidor responder algo que não é JSON (queda, página de erro do Render),
devolve um objeto vazio para a tela mostrar a mensagem padrão em vez de travar.

=========================================================================================================*/

async function lerRespostaJson(resposta) {
    try {
        return await resposta.json();
    } catch (error) {
        return {};
    }
}

/*========================================================================================================

TROCA DE TELA (login, cadastro e recuperação usam a mesma caixa)

=========================================================================================================*/

function trocarTela(callback) {
    if (!formLogin || typeof callback !== "function") {
        if (typeof callback === "function") {
            callback();
        }

        return;
    }

    if (transicaoTelaAtiva) {
        return;
    }

    transicaoTelaAtiva = true;

    formLogin.classList.remove("animacao-entrada", "ativa");
    formLogin.classList.add("animacao-saida");

    setTimeout(() => {
        callback();

        formLogin.classList.remove("animacao-saida");
        formLogin.classList.add("animacao-entrada");

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                formLogin.classList.add("ativa");
            });
        });

        setTimeout(() => {
            formLogin.classList.remove("animacao-entrada", "ativa");
            transicaoTelaAtiva = false;
        }, 320);
    }, 260);
}

/*
 * Mostra ou esconde as partes do login quando entra no cadastro ou na recuperação.
 */
function modoFormulario(ativo) {
    indicadorEtapa.hidden = !ativo;
    areaLembrete.hidden = ativo;
    campoEmailLogin.hidden = ativo;
    campoSenhaLogin.hidden = ativo;
    textoOu.hidden = ativo;

    rotuloBotaoCriarConta(ativo);

    if (!ativo) {
        camposCadastro.innerHTML = "";
    }
}

function voltarModoLogin() {
    trocarTela(() => {
        modoCadastro = false;
        modoRecuperarSenha = false;

        if (typeof limparDadosCadastro === "function") {
            limparDadosCadastro();
        }

        if (typeof limparDadosRecuperacaoSenha === "function") {
            limparDadosRecuperacaoSenha();
        }

        modoFormulario(false);
        limparMensagemGeral();

        tituloFormulario.textContent = "Bem-vindo de volta!";
        subtituloFormulario.textContent = "Acesse sua conta para continuar.";

        btnVoltarEtapa.hidden = true;
        btnEntrar.disabled = false;

        rotuloBotaoPrincipal("Entrar", "entrar");
    });
}

/*========================================================================================================

PROGRESSO DAS ETAPAS (cadastro e recuperação)

=========================================================================================================*/

function atualizarProgressoEtapas(etapaAtual, nomes) {
    for (let i = 1; i <= 3; i++) {
        const bolinha = document.getElementById(`etapa${i}`);
        const texto = document.getElementById(`textoEtapa${i}`);

        bolinha.classList.toggle("ativa", i <= etapaAtual);
        bolinha.innerHTML = i < etapaAtual ? ICONES_LOGIN.check : "";

        texto.textContent = nomes[i - 1];
        texto.classList.toggle("ativo", i <= etapaAtual);
    }

    document.getElementById("barra1").classList.toggle("ativa", etapaAtual > 1);
    document.getElementById("barra2").classList.toggle("ativa", etapaAtual > 2);
}

/*========================================================================================================

BOTÕES

=========================================================================================================*/

function rotuloBotaoPrincipal(texto, icone) {
    if (!btnEntrar) return;

    const span = document.createElement("span");
    span.textContent = texto;

    btnEntrar.innerHTML = "";

    if (icone === "entrar") {
        btnEntrar.insertAdjacentHTML("beforeend", ICONES_LOGIN.entrar);
        btnEntrar.appendChild(span);
    } else {
        btnEntrar.appendChild(span);
        btnEntrar.insertAdjacentHTML("beforeend", ICONES_LOGIN.seta);
    }
}

function carregandoBotaoPrincipal(texto) {
    if (!btnEntrar) return;

    btnEntrar.disabled = true;
    btnEntrar.innerHTML = '<span class="girando" aria-hidden="true"></span>';
    btnEntrar.appendChild(document.createTextNode(texto));
}

function rotuloBotaoCriarConta(voltarParaLogin) {
    if (!btnCriarConta) return;

    btnCriarConta.innerHTML = voltarParaLogin
        ? `${ICONES_LOGIN.voltar}Voltar para Login`
        : `${ICONES_LOGIN.criar}Criar nova conta`;
}

/*========================================================================================================

CAMPOS (montagem padrão usada no cadastro e na recuperação)

=========================================================================================================*/

function campoHTML({
    id,
    rotulo,
    icone,
    tipo = "text",
    placeholder = "",
    max,
    valor = "",
    extra = "",
    somenteLeitura = false,
    senha = false
}) {
    return `
        <div class="caixa-input">
            <label for="${id}">${rotulo}</label>
            <div class="campo">
                ${ICONES_LOGIN[icone] || ""}
                <input
                    type="${tipo}"
                    id="${id}"
                    placeholder="${escaparTextoLogin(placeholder)}"
                    ${max ? `maxlength="${max}"` : ""}
                    value="${escaparTextoLogin(valor)}"
                    ${somenteLeitura ? "readonly" : ""}
                    ${extra}>
                ${senha ? `<button type="button" class="olho" data-alvo="${id}" aria-label="Mostrar senha"></button>` : ""}
            </div>
        </div>
    `;
}

function prepararOlhosSenha(raiz) {
    if (!raiz) return;

    raiz.querySelectorAll(".olho").forEach((botao) => {
        botao.innerHTML = ICONES_LOGIN.olho;

        botao.addEventListener("click", (event) => {
            event.preventDefault();

            const input = document.getElementById(botao.dataset.alvo);

            if (!input) return;

            const senhaVisivel = input.type === "text";

            input.type = senhaVisivel ? "password" : "text";
            botao.innerHTML = senhaVisivel ? ICONES_LOGIN.olho : ICONES_LOGIN.olhoFechado;
            botao.setAttribute("aria-label", senhaVisivel ? "Mostrar senha" : "Ocultar senha");
        });
    });
}

function escaparTextoLogin(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/*========================================================================================================

MENSAGENS GERAIS

=========================================================================================================*/

function mostrarMensagem(texto, tipo) {
    if (!mensagemLogin) {
        console.warn(texto);
        return;
    }

    const textoMensagem = document.createElement("span");
    textoMensagem.textContent = texto;

    mensagemLogin.dataset.tipo = tipo === "sucesso" ? "sucesso" : "erro";
    mensagemLogin.innerHTML = tipo === "sucesso" ? ICONES_LOGIN.ok : ICONES_LOGIN.erro;
    mensagemLogin.appendChild(textoMensagem);
    mensagemLogin.hidden = false;
}

function limparMensagemGeral() {
    if (!mensagemLogin) return;

    mensagemLogin.hidden = true;
    mensagemLogin.textContent = "";
}

/*========================================================================================================

ERROS DOS INPUTS

=========================================================================================================*/

function mostrarErroCampo(input, mensagem) {
    if (!input) return;

    const caixaInput = input.closest(".caixa-input");

    if (!caixaInput) return;

    let erro = caixaInput.querySelector(":scope > .erro-input");

    if (!erro) {
        erro = document.createElement("small");
        erro.classList.add("erro-input");
        caixaInput.appendChild(erro);
    }

    input.classList.add("input-erro");

    erro.textContent = mensagem;
    erro.hidden = false;

    balancar(input.closest(".campo") || input);
}

function limparErroCampo(input) {
    if (!input) return;

    input.classList.remove("input-erro");

    const caixaInput = input.closest(".caixa-input");

    if (!caixaInput) return;

    const erro = caixaInput.querySelector(":scope > .erro-input");

    if (erro) {
        erro.textContent = "";
        erro.hidden = true;
    }
}

function balancar(elemento) {
    if (!elemento) return;

    elemento.classList.remove("balancar");
    void elemento.offsetWidth;
    elemento.classList.add("balancar");
}
