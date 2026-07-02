/*========================================================================================================

RECUPERAÇÃO DE SENHA

=========================================================================================================*/

const linkEsqueciSenha = document.getElementById("linkEsqueciSenha");

let etapaRecuperacaoSenha = 1;

const dadosRecuperacaoSenha = {
    email: "",
    codigo: "",
    novaSenha: "",
    confirmarNovaSenha: ""
};

if (linkEsqueciSenha) {
    linkEsqueciSenha.addEventListener("click", (event) => {
        event.preventDefault();
        entrarModoRecuperarSenha();
    });
}

function entrarModoRecuperarSenha() {
    trocarTela(() => {
        modoCadastro = false;
        modoRecuperarSenha = true;
        etapaRecuperacaoSenha = 1;

        limparDadosRecuperacaoSenha();
        limparMensagemGeral();
        limparErroCampo(emailInput);
        limparErroCampo(passwordInput);

        tituloFormulario.textContent = "Recuperar Senha";
        subtituloFormulario.textContent = "Informe o email cadastrado para receber um código de recuperação.";

        indicadorEtapa.style.display = "none";
        areaLembrete.style.display = "none";

        campoEmailLogin.style.display = "none";
        campoSenhaLogin.style.display = "none";

        if (btnVoltarEtapa) {
            btnVoltarEtapa.style.display = "none";
        }

        btnEntrar.innerHTML = 'Enviar código <span class="seta-btn">➔</span>';

        btnCriarConta.innerHTML = `
            <img src="../../../assets/icons/login/adicionar-usuario.png" alt="">
            Voltar para Login
        `;

        renderizarEtapaRecuperacaoSenha();
    });
}

function renderizarEtapaRecuperacaoSenha() {
    if (etapaRecuperacaoSenha === 1) {
        camposCadastro.innerHTML = `
            <div class="caixa-input">
                <label for="emailRecuperacao">Email cadastrado</label>
                <img src="../../../assets/icons/login/e-mail.png" alt="">
                <input
                    type="email"
                    id="emailRecuperacao"
                    placeholder="Digite o email da sua conta"
                    maxlength="254"
                    autocomplete="email"
                    value="${escaparValorInputRecuperacao(dadosRecuperacaoSenha.email)}">
            </div>
        `;
    }

    if (etapaRecuperacaoSenha === 2) {
        camposCadastro.innerHTML = `
            <div class="caixa-input">
                <label for="codigoRecuperacao">Código recebido</label>
                <img src="../../../assets/icons/login/confirmar-senha.png" alt="">
                <input
                    type="text"
                    id="codigoRecuperacao"
                    placeholder="Digite o código de 6 dígitos"
                    maxlength="6"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    value="${escaparValorInputRecuperacao(dadosRecuperacaoSenha.codigo)}">
            </div>

            <div class="caixa-input">
                <label for="novaSenhaRecuperacao">Nova senha</label>
                <img src="../../../assets/icons/login/trancar.png" alt="">
                <input
                    type="password"
                    id="novaSenhaRecuperacao"
                    placeholder="Mínimo 8 caracteres, letra, número e símbolo"
                    maxlength="72"
                    autocomplete="new-password"
                    value="${escaparValorInputRecuperacao(dadosRecuperacaoSenha.novaSenha)}">
                <img
                    class="mostrar-senha-recuperacao"
                    data-target="novaSenhaRecuperacao"
                    src="../../../assets/icons/login/olho.png"
                    alt="Mostrar senha">
            </div>

            <div class="caixa-input">
                <label for="confirmarNovaSenhaRecuperacao">Confirmar nova senha</label>
                <img src="../../../assets/icons/login/confirmar-senha.png" alt="">
                <input
                    type="password"
                    id="confirmarNovaSenhaRecuperacao"
                    placeholder="Confirme sua nova senha"
                    maxlength="72"
                    autocomplete="new-password"
                    value="${escaparValorInputRecuperacao(dadosRecuperacaoSenha.confirmarNovaSenha)}">
                <img
                    class="mostrar-senha-recuperacao"
                    data-target="confirmarNovaSenhaRecuperacao"
                    src="../../../assets/icons/login/olho.png"
                    alt="Mostrar senha">
            </div>
        `;
    }

    adicionarEventosRecuperacaoSenha();
    adicionarEventosMostrarSenhaRecuperacao();
}

function adicionarEventosRecuperacaoSenha() {
    const inputs = camposCadastro.querySelectorAll("input");

    inputs.forEach((input) => {
        input.addEventListener("input", () => {
            salvarDadosRecuperacaoSenha();
            limparErroCampo(input);
            limparMensagemGeral();
        });

        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                avancarRecuperacaoSenha();
            }
        });
    });
}

function adicionarEventosMostrarSenhaRecuperacao() {
    const botoes = camposCadastro.querySelectorAll(".mostrar-senha-recuperacao");

    botoes.forEach((botao) => {
        botao.addEventListener("click", (event) => {
            event.preventDefault();

            const target = botao.getAttribute("data-target");
            const input = document.getElementById(target);

            if (!input) return;

            input.type = input.type === "password" ? "text" : "password";
        });
    });
}

function salvarDadosRecuperacaoSenha() {
    const emailRecuperacao = document.getElementById("emailRecuperacao");
    const codigoRecuperacao = document.getElementById("codigoRecuperacao");
    const novaSenhaRecuperacao = document.getElementById("novaSenhaRecuperacao");
    const confirmarNovaSenhaRecuperacao = document.getElementById("confirmarNovaSenhaRecuperacao");

    if (emailRecuperacao) {
        dadosRecuperacaoSenha.email = emailRecuperacao.value.trim().toLowerCase();
    }

    if (codigoRecuperacao) {
        dadosRecuperacaoSenha.codigo = codigoRecuperacao.value.replace(/\D/g, "");
        codigoRecuperacao.value = dadosRecuperacaoSenha.codigo;
    }

    if (novaSenhaRecuperacao) {
        dadosRecuperacaoSenha.novaSenha = novaSenhaRecuperacao.value;
    }

    if (confirmarNovaSenhaRecuperacao) {
        dadosRecuperacaoSenha.confirmarNovaSenha = confirmarNovaSenhaRecuperacao.value;
    }
}

function avancarRecuperacaoSenha() {
    salvarDadosRecuperacaoSenha();
    limparMensagemGeral();

    if (etapaRecuperacaoSenha === 1) {
        enviarCodigoRecuperacao();
        return;
    }

    if (etapaRecuperacaoSenha === 2) {
        redefinirSenha();
    }
}

function voltarEtapaRecuperacaoSenha() {
    if (etapaRecuperacaoSenha <= 1) {
        return;
    }

    trocarTela(() => {
        etapaRecuperacaoSenha = 1;
        btnEntrar.innerHTML = 'Enviar código <span class="seta-btn">➔</span>';

        if (btnVoltarEtapa) {
            btnVoltarEtapa.style.display = "none";
        }

        renderizarEtapaRecuperacaoSenha();
    });
}

async function enviarCodigoRecuperacao() {
    const emailRecuperacao = document.getElementById("emailRecuperacao");

    limparErroCampo(emailRecuperacao);

    if (!dadosRecuperacaoSenha.email) {
        mostrarErroCampo(emailRecuperacao, "Informe o email cadastrado na sua conta.");
        return;
    }

    if (!validarEmailLogin(dadosRecuperacaoSenha.email)) {
        mostrarErroCampo(emailRecuperacao, "Digite um email válido, como nome@exemplo.com.");
        return;
    }

    try {
        btnEntrar.disabled = true;
        btnEntrar.textContent = "Enviando...";

        const resposta = await fetch(`${API_URL}/recuperar-senha/enviar-codigo`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: dadosRecuperacaoSenha.email
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            mostrarMensagem(
                dados.mensagem || "Não foi possível enviar o código de recuperação no momento.",
                "erro"
            );
            return;
        }

        mostrarMensagem(
            dados.mensagem || "Enviamos um código de recuperação para o email informado.",
            "sucesso"
        );

        trocarTela(() => {
            etapaRecuperacaoSenha = 2;

            tituloFormulario.textContent = "Criar nova senha";
            subtituloFormulario.textContent = "Digite o código recebido e escolha uma nova senha segura.";

            btnEntrar.innerHTML = 'Redefinir senha <span class="seta-btn">➔</span>';

            if (btnVoltarEtapa) {
                btnVoltarEtapa.style.display = "block";
            }

            renderizarEtapaRecuperacaoSenha();
        });

    } catch (error) {
        console.error("Erro ao enviar código:", error);

        mostrarMensagem(
            "Não foi possível conectar ao servidor. Tente novamente em alguns instantes.",
            "erro"
        );

    } finally {
        btnEntrar.disabled = false;

        if (modoRecuperarSenha && etapaRecuperacaoSenha === 1) {
            btnEntrar.innerHTML = 'Enviar código <span class="seta-btn">➔</span>';
        }
    }
}

async function redefinirSenha() {
    const codigoRecuperacao = document.getElementById("codigoRecuperacao");
    const novaSenhaRecuperacao = document.getElementById("novaSenhaRecuperacao");
    const confirmarNovaSenhaRecuperacao = document.getElementById("confirmarNovaSenhaRecuperacao");

    limparErroCampo(codigoRecuperacao);
    limparErroCampo(novaSenhaRecuperacao);
    limparErroCampo(confirmarNovaSenhaRecuperacao);

    let valido = true;

    if (!dadosRecuperacaoSenha.codigo) {
        mostrarErroCampo(codigoRecuperacao, "Digite o código enviado para seu email.");
        valido = false;
    } else if (!/^\d{6}$/.test(dadosRecuperacaoSenha.codigo)) {
        mostrarErroCampo(codigoRecuperacao, "O código deve conter exatamente 6 números.");
        valido = false;
    }

    const validacaoSenha = validarSenhaRecuperacao(dadosRecuperacaoSenha.novaSenha);

    if (!validacaoSenha.valido) {
        mostrarErroCampo(novaSenhaRecuperacao, validacaoSenha.mensagem);
        valido = false;
    }

    if (!dadosRecuperacaoSenha.confirmarNovaSenha) {
        mostrarErroCampo(confirmarNovaSenhaRecuperacao, "Confirme a nova senha.");
        valido = false;
    } else if (dadosRecuperacaoSenha.novaSenha !== dadosRecuperacaoSenha.confirmarNovaSenha) {
        mostrarErroCampo(confirmarNovaSenhaRecuperacao, "As senhas digitadas não são iguais.");
        valido = false;
    }

    if (!valido) {
        return;
    }

    try {
        btnEntrar.disabled = true;
        btnEntrar.textContent = "Redefinindo...";

        const resposta = await fetch(`${API_URL}/recuperar-senha/redefinir`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: dadosRecuperacaoSenha.email,
                codigo: dadosRecuperacaoSenha.codigo,
                novaSenha: dadosRecuperacaoSenha.novaSenha
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            mostrarMensagem(
                dados.mensagem || "Não foi possível redefinir a senha. Confira o código e tente novamente.",
                "erro"
            );
            return;
        }

        mostrarMensagem(
            dados.mensagem || "Senha redefinida com sucesso. Você já pode acessar sua conta.",
            "sucesso"
        );

        emailInput.value = dadosRecuperacaoSenha.email;
        passwordInput.value = "";

        limparDadosRecuperacaoSenha();

        setTimeout(() => {
            voltarModoLogin();
        }, 1200);

    } catch (error) {
        console.error("Erro ao redefinir senha:", error);

        mostrarMensagem(
            "Não foi possível conectar ao servidor. Tente novamente em alguns instantes.",
            "erro"
        );

    } finally {
        btnEntrar.disabled = false;

        if (modoRecuperarSenha) {
            btnEntrar.innerHTML = 'Redefinir senha <span class="seta-btn">➔</span>';
        }
    }
}

function limparDadosRecuperacaoSenha() {
    dadosRecuperacaoSenha.email = "";
    dadosRecuperacaoSenha.codigo = "";
    dadosRecuperacaoSenha.novaSenha = "";
    dadosRecuperacaoSenha.confirmarNovaSenha = "";
}

function validarSenhaRecuperacao(senha) {
    if (typeof validarSenhaForte === "function") {
        return validarSenhaForte(senha, {
            email: dadosRecuperacaoSenha.email
        });
    }

    senha = String(senha || "");

    if (!senha) {
        return { valido: false, mensagem: "Crie uma nova senha para sua conta." };
    }

    if (senha.length < 8) {
        return { valido: false, mensagem: "A senha deve ter pelo menos 8 caracteres." };
    }

    if (!/[A-Z]/.test(senha)) {
        return { valido: false, mensagem: "Use pelo menos uma letra maiúscula na senha." };
    }

    if (!/[a-z]/.test(senha)) {
        return { valido: false, mensagem: "Use pelo menos uma letra minúscula na senha." };
    }

    if (!/[0-9]/.test(senha)) {
        return { valido: false, mensagem: "Use pelo menos um número na senha." };
    }

    if (!/[!@#$%&*()_\-+=?.,:;{}[\]^~]/.test(senha)) {
        return { valido: false, mensagem: "Use pelo menos um caractere especial, como @, # ou !." };
    }

    return { valido: true };
}

function escaparValorInputRecuperacao(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}