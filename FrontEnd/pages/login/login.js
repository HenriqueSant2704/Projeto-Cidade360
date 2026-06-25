const API_URL = "http://localhost:3000/api";

/*========================================================================================================

variaveis para  login

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

variaveis para cadastro de login

=========================================================================================================*/


let modoCadastro = false;
let etapaCadastro = 1;


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



=========================================================================================================*/



mostrarSenha.addEventListener("click", () => {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
    } else {
        passwordInput.type = "password";
    }
});

btnEntrar.addEventListener("click", () => {

    if (modoCadastro) {
        avancarCadastro();
    } else {
        fazerLogin();
    }

});

passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        fazerLogin();
    }
});

emailInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        fazerLogin();
    }
});

async function fazerLogin() {
    const email = emailInput.value.trim();
    const senha = passwordInput.value.trim();

    if (!email || !senha) {
        mostrarMensagem("Preencha email e senha.", "erro");
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
            mostrarMensagem(dados.mensagem || "Email ou senha inválidos.", "erro");
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
            window.location.href = "../../../FrontEnd/pages/painel/index.html";
        }, 800);

    } catch (error) {
        console.error("Erro ao conectar com o servidor:", error);
        mostrarMensagem("Não foi possível conectar ao servidor.", "erro");
    } finally {
        btnEntrar.disabled = false;
        btnEntrar.innerHTML = `
            <img src="../../../assets/icons/login/usuario.png" alt="">
            Entrar
        `;
    }
}

function mostrarMensagem(texto, tipo) {
    mensagemLogin.style.display = "block";
    mensagemLogin.textContent = texto;

    if (tipo === "sucesso") {
        mensagemLogin.style.color = "#00b894";
    } else {
        mensagemLogin.style.color = "#ff4d4d";
    }
}

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

Barra de progresso do cadastro

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

    estrutra de cadastro de login Inputs

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
            placeholder="Digite seu nome completo">
    </div>

    <div class="caixa-input">
        <label for="cpfCadastro">CPF</label>
        <img src="../../../assets/icons/login/cpf.png" alt="">
        <input
            type="text"
            id="cpfCadastro"
            placeholder="Digite seu CPF">
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
            placeholder="Digite seu email">
    </div>

    <div class="caixa-input">
        <label for="telefoneCadastro">Telefone</label>
        <img src="../../../assets/icons/login/telefone.png" alt="">
        <input
            type="text"
            id="telefoneCadastro"
            placeholder="Digite seu telefone">
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
            placeholder="Digite sua senha">
    </div>

    <div class="caixa-input">
        <label for="confirmarSenhaCadastro">
            Confirmar Senha
        </label>

        <img src="../../../assets/icons/login/confirmar-senha.png" alt="">
        <input
            type="password"
            id="confirmarSenhaCadastro"
            placeholder="Confirme sua senha">
    </div>

    `;
    }
}

function avancarCadastro() {

    if (etapaCadastro < 3) {

        etapaCadastro++;

        atualizarProgresso();
        renderizarEtapaCadastro();

        if (etapaCadastro === 3) {
            btnEntrar.textContent = "Finalizar Cadastro";
        }

    } else {

        alert("Cadastro finalizado!");

    }

}