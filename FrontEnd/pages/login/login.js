const API_URL = "http://localhost:3000/api";

const formLogin = document.getElementById("formLogin");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const mensagemLogin = document.getElementById("mensagemLogin");
const btnEntrar = document.getElementById("btnEntrar");
const mostrarSenha = document.getElementById("mostrarSenha");
const btnCriarConta = document.getElementById("btnCriarConta");
const rememberInput = document.getElementById("remember");

mostrarSenha.addEventListener("click", () => {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
    } else {
        passwordInput.type = "password";
    }
});

btnEntrar.addEventListener("click", fazerLogin);

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

btnCriarConta.addEventListener("click", () => {
    alert("Tela de cadastro ainda não foi configurada.");
});

function mostrarMensagem(texto, tipo) {
    mensagemLogin.style.display = "block";
    mensagemLogin.textContent = texto;

    if (tipo === "sucesso") {
        mensagemLogin.style.color = "#00b894";
    } else {
        mensagemLogin.style.color = "#ff4d4d";
    }
}