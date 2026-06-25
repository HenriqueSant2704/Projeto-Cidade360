const API_URL = "http://localhost:3000/api";

/*========================================================================================================

VARIÁVEIS PARA LOGIN

=========================================================================================================*/

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

/*========================================================================================================

VARIÁVEIS PARA CADASTRO DE LOGIN

=========================================================================================================*/

let modoCadastro = false;
let etapaCadastro = 1;

const dadosCadastro = {
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
    senha: "",
    confirmarSenha: ""
};

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

// Se já estiver logado, manda direto para a home
document.addEventListener("DOMContentLoaded", () => {
    const token =
        localStorage.getItem("cidade360_token") ||
        sessionStorage.getItem("cidade360_token");

    if (token) {
        window.location.href = "/";
    }
});

// Mostrar ou esconder senha
mostrarSenha.addEventListener("click", () => {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
    } else {
        passwordInput.type = "password";
    }
});

// Botão principal
btnEntrar.addEventListener("click", () => {
    if (modoCadastro) {
        avancarCadastro();
    } else {
        fazerLogin();
    }
});

// Enter no campo senha
passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        if (modoCadastro) {
            avancarCadastro();
        } else {
            fazerLogin();
        }
    }
});

// Enter no campo email
emailInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        if (modoCadastro) {
            avancarCadastro();
        } else {
            fazerLogin();
        }
    }
});

// Limpar erro enquanto digita no email
emailInput.addEventListener("input", () => {
    limparErroCampo(emailInput);
});

// Limpar erro enquanto digita na senha
passwordInput.addEventListener("input", () => {
    limparErroCampo(passwordInput);
});

/*========================================================================================================

LOGIN

=========================================================================================================*/

async function fazerLogin() {
    limparMensagemGeral();

    const email = emailInput.value.trim();
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
                email: email,
                senha: senha
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            mostrarMensagem("Email ou senha inválidos.", "erro");
            return;
        }

        if (rememberInput.checked) {
            localStorage.setItem("cidade360_token", dados.token);
            localStorage.setItem("cidade360_usuario", JSON.stringify(dados.usuario));

            sessionStorage.removeItem("cidade360_token");
            sessionStorage.removeItem("cidade360_usuario");
        } else {
            sessionStorage.setItem("cidade360_token", dados.token);
            sessionStorage.setItem("cidade360_usuario", JSON.stringify(dados.usuario));

            localStorage.removeItem("cidade360_token");
            localStorage.removeItem("cidade360_usuario");
        }

        mostrarMensagem("Login realizado com sucesso!", "sucesso");

        setTimeout(() => {
            window.location.href = "/";
        }, 800);

    } catch (error) {
        console.error("Erro ao conectar com o servidor:", error);
        mostrarMensagem("Não foi possível conectar ao servidor.", "erro");

    } finally {
        btnEntrar.disabled = false;

        if (!modoCadastro) {
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
        mostrarErroCampo(emailInput, "Preencha o email por favor.");
        valido = false;
    } else if (!validarEmail(email)) {
        mostrarErroCampo(emailInput, "Digite um email válido.");
        valido = false;
    }

    if (!senha) {
        mostrarErroCampo(passwordInput, "Preencha a senha por favor.");
        valido = false;
    }

    return valido;
}

/*========================================================================================================

MENSAGENS GERAIS

=========================================================================================================*/

function mostrarMensagem(texto, tipo) {
    mensagemLogin.style.display = "block";
    mensagemLogin.textContent = texto;

    if (tipo === "sucesso") {
        mensagemLogin.style.color = "#00b894";
    } else {
        mensagemLogin.style.color = "#ff4d4d";
    }
}

function limparMensagemGeral() {
    mensagemLogin.style.display = "none";
    mensagemLogin.textContent = "";
}

/*========================================================================================================

ERROS DOS INPUTS DO LOGIN

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

    input.style.borderColor = "#ff3b3b";
    input.style.borderWidth = "2px";

    erro.textContent = mensagem;
    erro.style.display = "block";
    erro.style.color = "#ff3b3b";
    erro.style.fontSize = "12px";
    erro.style.fontWeight = "600";
    erro.style.marginTop = "3px";
}

function limparErroCampo(input) {
    if (!input) return;

    const caixaInput = input.closest(".caixa-input");

    if (!caixaInput) return;

    const erro = caixaInput.querySelector(".erro-input");

    input.classList.remove("input-erro");

    input.style.borderColor = "";
    input.style.borderWidth = "";

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
    if (!modoCadastro) {
        entrarModoCadastro();
    } else {
        voltarModoLogin();
    }
});

/*========================================================================================================

CADASTRO DE LOGIN

=========================================================================================================*/

function entrarModoCadastro() {
    modoCadastro = true;
    etapaCadastro = 1;

    atualizarProgresso();
    renderizarEtapaCadastro();

    tituloFormulario.textContent = "Criar Conta";
    subtituloFormulario.textContent = "Informe seus dados para continuar.";

    indicadorEtapa.style.display = "flex";

    areaLembrete.style.display = "none";

    campoEmailLogin.style.display = "none";
    campoSenhaLogin.style.display = "none";

    btnEntrar.textContent = "Próximo";
    btnCriarConta.textContent = "Voltar para Login";
}

function voltarModoLogin() {
    modoCadastro = false;
    etapaCadastro = 1;

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
        etapaCadastro++;

        atualizarProgresso();
        renderizarEtapaCadastro();

        if (etapaCadastro === 3) {
            btnEntrar.textContent = "Finalizar Cadastro";
        }

    } else {
        finalizarCadastro();
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