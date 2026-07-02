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
const btnVoltarEtapa = document.getElementById("btnVoltarEtapa");

const etapa1 = document.getElementById("etapa1");
const etapa2 = document.getElementById("etapa2");
const etapa3 = document.getElementById("etapa3");

const textoEtapa1 = document.getElementById("textoEtapa1");
const textoEtapa2 = document.getElementById("textoEtapa2");
const textoEtapa3 = document.getElementById("textoEtapa3");

const barra1 = document.getElementById("barra1");
const barra2 = document.getElementById("barra2");


/*========================================================================================================

VARIÁVEIS PARA Recuperação DE Senha

=========================================================================================================*/


let modoRecuperacao = false;
let etapaRecuperacao = 1;


const btnEsqueciSenha = document.getElementById("btnEsqueciSenha");

btnEsqueciSenha.addEventListener("click", (e) => {
    e.preventDefault();
    entrarModoRecuperacao();
});
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

    if (modoRecuperacao) {
        avancarRecuperacao();
    }
    else if (modoCadastro) {
        avancarCadastro();
    }
    else {
        fazerLogin();
    }

});

btnVoltarEtapa.addEventListener("click", () => {

    if (modoCadastro) {
        voltarEtapaCadastro();
    }

    if (modoRecuperacao) {
        voltarEtapaRecuperacao();
    }

});

passwordInput.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {

        if (modoRecuperacao) {
            avancarRecuperacao();
        }
        else if (modoCadastro) {
            avancarCadastro();
        }
        else {
            fazerLogin();
        }

    }
});

emailInput.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {

        if (modoRecuperacao) {
            avancarRecuperacao();
        }
        else if (modoCadastro) {
            avancarCadastro();
        }
        else {
            fazerLogin();
        }

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

function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/*========================================================================================================

BOTÃO CRIAR CONTA / VOLTAR PARA LOGIN

=========================================================================================================*/

btnCriarConta.addEventListener("click", () => {

    if (modoRecuperacao) {
        voltarModoLogin();
    }
    else if (!modoCadastro) {
        entrarModoCadastro();
    }
    else {
        voltarModoLogin();
    }

});

/*========================================================================================================

CADASTRO DE LOGIN

=========================================================================================================*/

function entrarModoCadastro() {
    trocarTela(() => {

        modoCadastro = true;
        etapaCadastro = 1;

        atualizarProgresso();
        renderizarEtapaCadastro();

        tituloFormulario.textContent = "Criar Conta";
        subtituloFormulario.textContent = "Informe seus dados para continuar.";

        indicadorEtapa.style.display = "flex";

        areaLembrete.style.display = "none";
        btnVoltarEtapa.style.display = "none";
        campoEmailLogin.style.display = "none";
        campoSenhaLogin.style.display = "none";

        btnEntrar.innerHTML =
            'Próximo <span class="seta-btn">➔</span>';
        btnCriarConta.innerHTML = `

    <img src="../../../assets/icons/login/adicionar-usuario.png" alt="">
    Voltar para Login
    `;
    })
}

function voltarModoLogin() {
    trocarTela(() => {

        modoCadastro = false;
        etapaCadastro = 1;

        modoRecuperacao = false;
        etapaRecuperacao = 1;

        btnVoltarEtapa.style.display = "none";

        textoEtapa1.textContent = "Dados";
        textoEtapa2.textContent = "Contato";
        textoEtapa3.textContent = "Segurança";

        tituloFormulario.textContent = "Bem-vindo de volta!";
        subtituloFormulario.textContent = "Acesse sua conta para continuar.";

        indicadorEtapa.style.display = "none";

        areaLembrete.style.display = "flex";

        campoEmailLogin.style.display = "flex";
        campoSenhaLogin.style.display = "flex";

        camposCadastro.innerHTML = "";

        btnEntrar.innerHTML = `
        <img src="../../../assets/icons/login/usuario.png" alt="">
        Entrar
    `;

        btnCriarConta.innerHTML = `
        <img src="../../../assets/icons/login/adicionar-usuario.png" alt="">
        Criar nova conta
    `;
    })
}


/*========================================================================================================

BARRA DE PROGRESSO DO CADASTRO

=========================================================================================================*/

function atualizarProgresso() {
    etapa1.classList.remove("ativa");
    etapa2.classList.remove("ativa");
    etapa3.classList.remove("ativa");

    textoEtapa1.classList.remove("ativo");
    textoEtapa2.classList.remove("ativo");
    textoEtapa3.classList.remove("ativo");

    barra1.classList.remove("ativa");
    barra2.classList.remove("ativa");

    etapa1.innerHTML = "";
    etapa2.innerHTML = "";
    etapa3.innerHTML = "";

    if (etapaCadastro === 1) {
        etapa1.classList.add("ativa");
        textoEtapa1.classList.add("ativo");
    }

    if (etapaCadastro === 2) {
        etapa1.classList.add("ativa");
        etapa2.classList.add("ativa");

        etapa1.innerHTML = "✓";

        textoEtapa1.classList.add("ativo");
        textoEtapa2.classList.add("ativo");

        barra1.classList.add("ativa");
    }

    if (etapaCadastro === 3) {
        etapa1.classList.add("ativa");
        etapa2.classList.add("ativa");
        etapa3.classList.add("ativa");

        etapa1.innerHTML = "✓";
        etapa2.innerHTML = "✓";

        textoEtapa1.classList.add("ativo");
        textoEtapa2.classList.add("ativo");
        textoEtapa3.classList.add("ativo");

        barra1.classList.add("ativa");
        barra2.classList.add("ativa");
    }
}

/*========================================================================================================

ESTRUTURA DE CADASTRO DE LOGIN INPUTS

=========================================================================================================*/

function renderizarEtapaCadastro() {
    if (etapaCadastro === 1) {
        camposCadastro.innerHTML = `
    <div class="caixa-input">
        <label for="nomeCadastro">Nome Completo</label>
        <img src="../../../assets/icons/login/nome-cinza.png" alt="">
        <input
            type="text"
            id="nomeCadastro"
            placeholder="Digite seu nome completo"
            value="${dadosCadastro.nome}">
            
    </div>

    <div class="caixa-input">
        <label for="cpfCadastro">CPF</label>
        <img src="../../../assets/icons/login/cpf.png" alt="">
        <input
            type="text"
            id="cpfCadastro"
            placeholder="Digite seu CPF"
            value="${dadosCadastro.cpf}">
    </div>
`;
    }

    if (etapaCadastro === 2) {
        camposCadastro.innerHTML = `
    
    <div class="caixa-input">
        <label for="emailCadastro">Email</label>
        <img src="../../../assets/icons/login/e-mail.png" alt="">
        <input
            type="email"
            id="emailCadastro"
            placeholder="Digite seu email"
            value="${dadosCadastro.email}">
    </div>

    <div class="caixa-input">
        <label for="telefoneCadastro">Telefone</label>
        <img src="../../../assets/icons/login/telefone.png" alt="">
        <input
            type="text"
            id="telefoneCadastro"
            placeholder="Digite seu telefone"
            value="${dadosCadastro.telefone}">
    </div>

    `;
    }

    if (etapaCadastro === 3) {
        camposCadastro.innerHTML = `
    
    <div class="caixa-input">
        <label for="senhaCadastro">Senha</label>

        <img src="../../../assets/icons/login/trancar.png" alt="">

        <input
            type="password"
            id="senhaCadastro"
            placeholder="Digite sua senha"
            value="${dadosCadastro.senha}">

        <img
            class="mostrar-senha"
            data-target="senhaCadastro"
            src="../../../assets/icons/login/olho.png"
            alt="">
    </div>

    <div class="caixa-input">
        <label for="confirmarSenhaCadastro">
            Confirmar Senha
        </label>

        <img src="../../../assets/icons/login/confirmar-senha.png" alt="">

        <input
            type="password"
            id="confirmarSenhaCadastro"
            placeholder="Confirme sua senha"
            value="${dadosCadastro.confirmarSenha}">

        <img
            class="mostrar-senha"
            data-target="confirmarSenhaCadastro"
            src="../../../assets/icons/login/olho.png"
            alt="">
    </div>
    `;
    }

    adicionarEventosNosInputsCadastro();
}

/*========================================================================================================

AVANÇAR CADASTRO

=========================================================================================================*/

function avancarCadastro() {
    salvarDadosDaEtapaAtual();


    if (etapaCadastro < 3) {
        trocarTela(() => {

            etapaCadastro++;

            atualizarProgresso();
            renderizarEtapaCadastro();



            btnVoltarEtapa.style.display =
                etapaCadastro > 1 ? "block" : "none";
        });

        if (etapaCadastro === 3) {
            btnEntrar.textContent = "Finalizar Cadastro";
        }

    } else {
        finalizarCadastro();
    }
}

function voltarEtapaCadastro() {

    if (etapaCadastro > 1) {

        trocarTela(() => {

            etapaCadastro--;

            atualizarProgresso();
            renderizarEtapaCadastro();

            btnVoltarEtapa.style.display =
                etapaCadastro > 1 ? "block" : "none";

            btnEntrar.innerHTML =
                etapaCadastro === 3
                    ? 'Finalizar Cadastro <span class="seta-btn">➔</span>'
                    : 'Próximo <span class="seta-btn">➔</span>';
        });
    }
}

/*========================================================================================================

SALVAR DADOS ENTRE AS ETAPAS

=========================================================================================================*/

function salvarDadosDaEtapaAtual() {
    const nomeCadastro = document.getElementById("nomeCadastro");
    const cpfCadastro = document.getElementById("cpfCadastro");
    const emailCadastro = document.getElementById("emailCadastro");
    const telefoneCadastro = document.getElementById("telefoneCadastro");
    const senhaCadastro = document.getElementById("senhaCadastro");
    const confirmarSenhaCadastro = document.getElementById("confirmarSenhaCadastro");

    if (nomeCadastro) dadosCadastro.nome = nomeCadastro.value.trim();
    if (cpfCadastro) dadosCadastro.cpf = cpfCadastro.value.trim();

    if (emailCadastro) dadosCadastro.email = emailCadastro.value.trim();
    if (telefoneCadastro) dadosCadastro.telefone = telefoneCadastro.value.trim();

    if (senhaCadastro) dadosCadastro.senha = senhaCadastro.value.trim();
    if (confirmarSenhaCadastro) dadosCadastro.confirmarSenha = confirmarSenhaCadastro.value.trim();
}

function adicionarEventosNosInputsCadastro() {
    const inputs = camposCadastro.querySelectorAll("input");

    inputs.forEach((input) => {
        input.addEventListener("input", () => {
            salvarDadosDaEtapaAtual();
        });

        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                avancarCadastro();
            }
        });
    });
}

/*========================================================================================================

FINALIZAR CADASTRO

=========================================================================================================*/

async function finalizarCadastro() {
    salvarDadosDaEtapaAtual();

    if (
        !dadosCadastro.nome ||
        !dadosCadastro.cpf ||
        !dadosCadastro.email ||
        !dadosCadastro.telefone ||
        !dadosCadastro.senha ||
        !dadosCadastro.confirmarSenha
    ) {
        mostrarMensagem("Preencha todos os campos do cadastro.", "erro");
        return;
    }

    if (dadosCadastro.senha !== dadosCadastro.confirmarSenha) {
        mostrarMensagem("As senhas não conferem.", "erro");
        return;
    }

    try {
        btnEntrar.disabled = true;
        btnEntrar.textContent = "Cadastrando...";

        const resposta = await fetch(`${API_URL}/cadastrar`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nome: dadosCadastro.nome,
                cpf: dadosCadastro.cpf,
                email: dadosCadastro.email,
                telefone: dadosCadastro.telefone,
                senha: dadosCadastro.senha,
                tipo_usuario: "CIDADAO"
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            mostrarMensagem(dados.mensagem || "Erro ao cadastrar usuário.", "erro");
            return;
        }

        mostrarMensagem("Cadastro realizado com sucesso! Faça login.", "sucesso");

        emailInput.value = dadosCadastro.email;
        passwordInput.value = "";

        setTimeout(() => {
            voltarModoLogin();
        }, 1000);

    } catch (error) {
        console.error("Erro ao cadastrar usuário:", error);
        mostrarMensagem("Não foi possível conectar ao servidor.", "erro");

    } finally {
        btnEntrar.disabled = false;

        if (modoCadastro) {
            btnEntrar.textContent = "Finalizar Cadastro";
        }
    }
}


/*========================================================================================================

RECUPERAÇÃO DE SENHA

=========================================================================================================*/


function entrarModoRecuperacao() {

    trocarTela(() => {

        modoRecuperacao = true;
        etapaRecuperacao = 1;

        tituloFormulario.textContent =
            "Recuperar senha";

        subtituloFormulario.textContent =
            "Siga as etapas para recuperar sua conta.";

        indicadorEtapa.style.display = "flex";

        areaLembrete.style.display = "none";

        campoEmailLogin.style.display = "none";
        campoSenhaLogin.style.display = "none";
        btnVoltarEtapa.style.display = "none";
        textoEtapa1.textContent = "Email";
        textoEtapa2.textContent = "Código";
        textoEtapa3.textContent = "Senha";

        atualizarProgressoRecuperacao();
        renderizarRecuperacao();

        btnEntrar.textContent =
            "Enviar código";

        btnCriarConta.innerHTML = `
    <img src="../../../assets/icons/login/adicionar-usuario.png" alt="">
    Voltar para Login
`;
    })
}


/*========================================================================================================

ESTRUTURA DE RECUPERAÇÃO DE SENHA INPUTS

=========================================================================================================*/


function renderizarRecuperacao() {

    if (etapaRecuperacao === 1) {

        camposCadastro.innerHTML = `
            <div class="caixa-input">
                <label>Email</label>

                <img src="../../../assets/icons/login/e-mail.png">

                <input
                    type="email"
                    id="emailRecuperacao"
                    placeholder="Digite seu email">
            </div>
        `;
    }

    if (etapaRecuperacao === 2) {

        camposCadastro.innerHTML = `
        <div class="caixa-input codigo-seguranca">
            <label>Código de Segurança</label>

            <input
                type="text"
                id="codigoRecuperacao"
                maxlength="6"
                placeholder="000000">
                <a href="#" id="btnReenviarCodigo" class="link-reenviar">
                    Reenviar código
                </a>
        </div>
    `;
    }

    if (etapaRecuperacao === 3) {

        camposCadastro.innerHTML = `
        <div class="caixa-input">
            <label>Nova senha</label>

            <img src="../../../assets/icons/login/trancar.png">

            <input
                type="password"
                id="novaSenha"
                placeholder="Digite sua nova senha">

            <img
                class="mostrar-senha-recuperacao"
                data-target="novaSenha"
                src="../../../assets/icons/login/olho.png"
                alt="Mostrar senha">
        </div>

        <div class="caixa-input">
            <label>Confirmar senha</label>

            <img src="../../../assets/icons/login/confirmar-senha.png">

            <input
                type="password"
                id="confirmarNovaSenha"
                placeholder="Confirme sua nova senha">

            <img
                class="mostrar-senha-recuperacao"
                data-target="confirmarNovaSenha"
                src="../../../assets/icons/login/olho.png"
                alt="Mostrar senha">
        </div>
    `;
    }

    const inputs = camposCadastro.querySelectorAll("input");

    inputs.forEach(input => {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                avancarRecuperacao();
            }
        });
    });
}


/*========================================================================================================

ETAPAS DE RECUPERAÇÃO DE SENHA

=========================================================================================================*/

function avancarRecuperacao() {


    if (etapaRecuperacao < 3) {
        trocarTela(() => {

            etapaRecuperacao++;

            atualizarProgressoRecuperacao();
            renderizarRecuperacao();

            btnVoltarEtapa.style.display =
                etapaRecuperacao > 1 ? "block" : "none";

        });

        if (etapaRecuperacao === 1) {
            btnEntrar.textContent = "Validar código";
        }

        if (etapaRecuperacao === 2) {
            btnEntrar.textContent = "Alterar senha";
        }
    } else {

        alert("Senha alterada!");

    }
}

function voltarEtapaRecuperacao() {

    if (etapaRecuperacao <= 1) return;

    trocarTela(() => {

        etapaRecuperacao--;

        atualizarProgressoRecuperacao();
        renderizarRecuperacao();

        btnVoltarEtapa.style.display =
            etapaRecuperacao > 1 ? "block" : "none";

        if (etapaRecuperacao === 1)
            btnEntrar.textContent = "Enviar código";

        if (etapaRecuperacao === 2)
            btnEntrar.textContent = "Validar código";

        if (etapaRecuperacao === 3)
            btnEntrar.textContent = "Alterar senha";
    });
}


function atualizarProgressoRecuperacao() {

    etapa1.classList.remove("ativa");
    etapa2.classList.remove("ativa");
    etapa3.classList.remove("ativa");

    barra1.classList.remove("ativa");
    barra2.classList.remove("ativa");

    textoEtapa1.classList.remove("ativo");
    textoEtapa2.classList.remove("ativo");
    textoEtapa3.classList.remove("ativo");

    etapa1.innerHTML = "";
    etapa2.innerHTML = "";
    etapa3.innerHTML = "";



    if (etapaRecuperacao >= 1) {
        etapa1.classList.add("ativa");
        textoEtapa1.classList.add("ativo");
    }

    if (etapaRecuperacao >= 2) {

        etapa1.innerHTML = "✓";

        etapa2.classList.add("ativa");
        textoEtapa2.classList.add("ativo");
        barra1.classList.add("ativa");
    }

    if (etapaRecuperacao >= 3) {

        etapa2.innerHTML = "✓";

        etapa3.classList.add("ativa");
        textoEtapa3.classList.add("ativo");
        barra2.classList.add("ativa");
    }
}

function trocarTela(callback) {
    const caixa = document.querySelector(".caixa-login");

    caixa.classList.add("animacao-saida");

    setTimeout(() => {

        requestAnimationFrame(() => {
            callback();

            caixa.classList.remove("animacao-saida");
            caixa.classList.add("animacao-entrada");

            requestAnimationFrame(() => {
                caixa.classList.add("ativa");
            });

            setTimeout(() => {
                caixa.classList.remove(
                    "animacao-entrada",
                    "ativa"
                );
            }, 300);
        });

    }, 300);
}