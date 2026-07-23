/*========================================================================================================

RECUPERAÇÃO DE SENHA - VERSÃO 1 COM ETAPAS

Etapas:
1. Email
2. Código
3. Nova senha

=========================================================================================================*/

const linkEsqueciSenha = document.getElementById("linkEsqueciSenha");

let etapaRecuperacaoSenha = 1;

const dadosRecuperacaoSenha = {
    email: "",
    codigo: "",
    novaSenha: "",
    confirmarNovaSenha: ""
};

/*========================================================================================================

CLIQUE EM ESQUECEU SUA SENHA

=========================================================================================================*/

if (linkEsqueciSenha) {
    linkEsqueciSenha.addEventListener("click", (event) => {
        event.preventDefault();
        entrarModoRecuperarSenha();
    });
}

/*========================================================================================================

ENTRAR NO MODO RECUPERAÇÃO

=========================================================================================================*/

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
        subtituloFormulario.textContent = "Informe o email cadastrado para receber um código.";

        textoEtapa1.textContent = "Email";
        textoEtapa2.textContent = "Código";
        textoEtapa3.textContent = "Senha";

        indicadorEtapa.style.display = "flex";
        areaLembrete.style.display = "none";

        campoEmailLogin.style.display = "none";
        campoSenhaLogin.style.display = "none";

        if (btnVoltarEtapa) {
            btnVoltarEtapa.style.display = "none";
        }

        btnEntrar.innerHTML = 'Enviar código <span class="seta-btn">➔</span>';

        btnCriarConta.innerHTML = `
            <img src="../../../assets/icons/login/saida.png" alt="">
            Voltar para Login
        `;

        atualizarProgressoRecuperacaoSenha();
        renderizarEtapaRecuperacaoSenha();
    });
}

/*========================================================================================================

BARRA DE PROGRESSO DA RECUPERAÇÃO

=========================================================================================================*/

function atualizarProgressoRecuperacaoSenha() {
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

    if (etapaRecuperacaoSenha >= 1) {
        etapa1.classList.add("ativa");
        textoEtapa1.classList.add("ativo");
    }

    if (etapaRecuperacaoSenha >= 2) {
        etapa1.innerHTML = "✓";

        etapa2.classList.add("ativa");
        textoEtapa2.classList.add("ativo");

        barra1.classList.add("ativa");
    }

    if (etapaRecuperacaoSenha >= 3) {
        etapa2.innerHTML = "✓";

        etapa3.classList.add("ativa");
        textoEtapa3.classList.add("ativo");

        barra2.classList.add("ativa");
    }
}

/*========================================================================================================

RENDERIZAR ETAPAS DA RECUPERAÇÃO

=========================================================================================================*/

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
            <div class="caixa-input codigo-seguranca">
                <label for="codigoRecuperacao">Código de segurança</label>
                <input
                    type="text"
                    id="codigoRecuperacao"
                    placeholder="000000"
                    maxlength="6"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    value="${escaparValorInputRecuperacao(dadosRecuperacaoSenha.codigo)}">
            </div>
        `;
    }

    if (etapaRecuperacaoSenha === 3) {
        camposCadastro.innerHTML = `
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

/*========================================================================================================

EVENTOS DOS INPUTS DA RECUPERAÇÃO

=========================================================================================================*/

function adicionarEventosRecuperacaoSenha() {
    const inputs = camposCadastro.querySelectorAll("input");

    inputs.forEach((input) => {
        input.addEventListener("input", () => {
            salvarDadosRecuperacaoSenha();

            if (input.id === "codigoRecuperacao") {
                input.value = input.value.replace(/\D/g, "").slice(0, 6);
                dadosRecuperacaoSenha.codigo = input.value;
            }

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

/*========================================================================================================

SALVAR DADOS DA RECUPERAÇÃO

=========================================================================================================*/

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

/*========================================================================================================

AVANÇAR RECUPERAÇÃO

=========================================================================================================*/

function avancarRecuperacaoSenha() {
    salvarDadosRecuperacaoSenha();
    limparMensagemGeral();

    if (etapaRecuperacaoSenha === 1) {
        enviarCodigoRecuperacao();
        return;
    }

    if (etapaRecuperacaoSenha === 2) {
        validarCodigoEIrParaSenha();
        return;
    }

    if (etapaRecuperacaoSenha === 3) {
        redefinirSenha();
    }
}

/*========================================================================================================

VOLTAR ETAPA RECUPERAÇÃO

=========================================================================================================*/

function voltarEtapaRecuperacaoSenha() {
    if (etapaRecuperacaoSenha <= 1) {
        return;
    }

    trocarTela(() => {
        etapaRecuperacaoSenha--;

        atualizarProgressoRecuperacaoSenha();
        renderizarEtapaRecuperacaoSenha();

        if (btnVoltarEtapa) {
            btnVoltarEtapa.style.display = etapaRecuperacaoSenha > 1 ? "block" : "none";
        }

        if (etapaRecuperacaoSenha === 1) {
            tituloFormulario.textContent = "Recuperar Senha";
            subtituloFormulario.textContent = "Informe o email cadastrado para receber um código.";
            btnEntrar.innerHTML = 'Enviar código <span class="seta-btn">➔</span>';
        }

        if (etapaRecuperacaoSenha === 2) {
            tituloFormulario.textContent = "Código de Segurança";
            subtituloFormulario.textContent = "Digite o código enviado para seu email.";
            btnEntrar.innerHTML = 'Continuar <span class="seta-btn">➔</span>';
        }
    });
}

/*========================================================================================================

ENVIAR CÓDIGO PARA EMAIL

=========================================================================================================*/

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

            tituloFormulario.textContent = "Código de Segurança";
            subtituloFormulario.textContent = "Digite o código enviado para seu email.";

            btnEntrar.innerHTML = 'Continuar <span class="seta-btn">➔</span>';

            if (btnVoltarEtapa) {
                btnVoltarEtapa.style.display = "block";
            }

            atualizarProgressoRecuperacaoSenha();
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

/*========================================================================================================

VALIDAR CÓDIGO LOCALMENTE E IR PARA SENHA

=========================================================================================================*/

async function validarCodigoEIrParaSenha() {
    const codigoRecuperacao = document.getElementById("codigoRecuperacao");

    limparErroCampo(codigoRecuperacao);
    limparMensagemGeral();

    salvarDadosRecuperacaoSenha();

    if (!dadosRecuperacaoSenha.codigo) {
        mostrarErroCampo(codigoRecuperacao, "Digite o código enviado para seu email.");
        return;
    }

    if (!/^\d{6}$/.test(dadosRecuperacaoSenha.codigo)) {
        mostrarErroCampo(codigoRecuperacao, "O código deve conter exatamente 6 números.");
        return;
    }

    try {
        btnEntrar.disabled = true;
        btnEntrar.textContent = "Verificando...";

        const resposta = await fetch(`${API_URL}/recuperar-senha/confirmar-codigo`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: dadosRecuperacaoSenha.email,
                codigo: dadosRecuperacaoSenha.codigo
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            mostrarErroCampo(
                codigoRecuperacao,
                dados.mensagem || "Código inválido ou expirado."
            );

            mostrarMensagem(
                dados.mensagem || "Código inválido ou expirado. Confira e tente novamente.",
                "erro"
            );

            return;
        }

        mostrarMensagem("Código confirmado com sucesso.", "sucesso");

        trocarTela(() => {
            etapaRecuperacaoSenha = 3;

            tituloFormulario.textContent = "Criar Nova Senha";
            subtituloFormulario.textContent = "Escolha uma nova senha segura para sua conta.";

            btnEntrar.innerHTML = 'Redefinir senha <span class="seta-btn">➔</span>';

            if (btnVoltarEtapa) {
                btnVoltarEtapa.style.display = "block";
            }

            atualizarProgressoRecuperacaoSenha();
            renderizarEtapaRecuperacaoSenha();
        });

    } catch (error) {
        console.error("Erro ao confirmar código:", error);

        mostrarMensagem(
            "Não foi possível verificar o código. Verifique o servidor e tente novamente.",
            "erro"
        );

    } finally {
        btnEntrar.disabled = false;

        if (modoRecuperarSenha && etapaRecuperacaoSenha === 2) {
            btnEntrar.innerHTML = 'Continuar <span class="seta-btn">➔</span>';
        }
    }
}

/*========================================================================================================

REDEFINIR SENHA

=========================================================================================================*/

async function redefinirSenha() {
    const novaSenhaRecuperacao = document.getElementById("novaSenhaRecuperacao");
    const confirmarNovaSenhaRecuperacao = document.getElementById("confirmarNovaSenhaRecuperacao");

    limparErroCampo(novaSenhaRecuperacao);
    limparErroCampo(confirmarNovaSenhaRecuperacao);

    let valido = true;

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

/*========================================================================================================

LIMPAR DADOS

=========================================================================================================*/

function limparDadosRecuperacaoSenha() {
    dadosRecuperacaoSenha.email = "";
    dadosRecuperacaoSenha.codigo = "";
    dadosRecuperacaoSenha.novaSenha = "";
    dadosRecuperacaoSenha.confirmarNovaSenha = "";
}

/*========================================================================================================

VALIDAR SENHA

=========================================================================================================*/

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

/*========================================================================================================

ESCAPAR VALORES

=========================================================================================================*/

function escaparValorInputRecuperacao(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}