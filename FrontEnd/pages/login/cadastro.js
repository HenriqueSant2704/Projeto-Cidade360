/*========================================================================================================

VARIÁVEIS DO CADASTRO

=========================================================================================================*/

let etapaCadastro = 1;

const dadosCadastro = {
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
    senha: "",
    confirmarSenha: "",

    emailVerificado: false,
    emailVerificacaoToken: "",
    codigoEmail: "",
    aguardandoCodigoEmail: false
};

/*========================================================================================================

BOTÃO CRIAR CONTA / VOLTAR PARA LOGIN

=========================================================================================================*/

if (btnCriarConta) {
    btnCriarConta.addEventListener("click", (event) => {
        event.preventDefault();

        if (modoRecuperarSenha) {
            voltarModoLogin();
            return;
        }

        if (!modoCadastro) {
            entrarModoCadastro();
        } else {
            voltarModoLogin();
        }
    });
}

/*========================================================================================================

ENTRAR / SAIR DO MODO CADASTRO

=========================================================================================================*/

function entrarModoCadastro() {
    trocarTela(() => {
        modoCadastro = true;
        modoRecuperarSenha = false;
        etapaCadastro = 1;

        limparDadosCadastro();

        limparMensagemGeral();
        limparErroCampo(emailInput);
        limparErroCampo(passwordInput);

        atualizarProgresso();
        renderizarEtapaCadastro();

        tituloFormulario.textContent = "Criar Conta";
        subtituloFormulario.textContent = "Informe seus dados para continuar.";

        indicadorEtapa.style.display = "flex";
        areaLembrete.style.display = "none";

        campoEmailLogin.style.display = "none";
        campoSenhaLogin.style.display = "none";

        if (btnVoltarEtapa) {
            btnVoltarEtapa.style.display = "none";
        }

        btnEntrar.innerHTML = 'Próximo <span class="seta-btn">➔</span>';

        btnCriarConta.innerHTML = `
            <img src="../../../assets/icons/login/adicionar-usuario.png" alt="">
            Voltar para Login
        `;
    });
}

function voltarModoLogin() {
    trocarTela(() => {
        modoCadastro = false;
        modoRecuperarSenha = false;
        etapaCadastro = 1;

        limparDadosCadastro();
        limparMensagemGeral();

        tituloFormulario.textContent = "Bem-vindo de volta!";
        subtituloFormulario.textContent = "Acesse sua conta para continuar.";

        if (textoEtapa1) textoEtapa1.textContent = "Dados";
        if (textoEtapa2) textoEtapa2.textContent = "Contato";
        if (textoEtapa3) textoEtapa3.textContent = "Segurança";

        indicadorEtapa.style.display = "none";
        areaLembrete.style.display = "flex";

        campoEmailLogin.style.display = "flex";
        campoSenhaLogin.style.display = "flex";

        if (btnVoltarEtapa) {
            btnVoltarEtapa.style.display = "none";
        }

        camposCadastro.innerHTML = "";

        btnEntrar.innerHTML = `
            <img src="../../../assets/icons/login/usuario.png" alt="">
            Entrar
        `;

        btnCriarConta.innerHTML = `
            <img src="../../../assets/icons/login/adicionar-usuario.png" alt="">
            Criar nova conta
        `;
    });
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

RENDERIZAR CAMPOS DO CADASTRO

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
                    maxlength="80"
                    autocomplete="name"
                    value="${escaparValorInput(dadosCadastro.nome)}">
            </div>

            <div class="caixa-input">
                <label for="cpfCadastro">CPF</label>
                <img src="../../../assets/icons/login/cpf.png" alt="">
                <input
                    type="text"
                    id="cpfCadastro"
                    placeholder="Digite seu CPF"
                    maxlength="14"
                    inputmode="numeric"
                    autocomplete="off"
                    value="${escaparValorInput(formatarCPF(dadosCadastro.cpf))}">
            </div>
        `;
    }

    if (etapaCadastro === 2) {
        if (!dadosCadastro.aguardandoCodigoEmail) {
            camposCadastro.innerHTML = `
                <div class="caixa-input">
                    <label for="emailCadastro">Email</label>
                    <img src="../../../assets/icons/login/e-mail.png" alt="">
                    <input
                        type="email"
                        id="emailCadastro"
                        placeholder="Digite seu email"
                        maxlength="254"
                        autocomplete="email"
                        value="${escaparValorInput(dadosCadastro.email)}">
                </div>

                <div class="caixa-input">
                    <label for="telefoneCadastro">Telefone</label>
                    <img src="../../../assets/icons/login/telefone.png" alt="">
                    <input
                        type="text"
                        id="telefoneCadastro"
                        placeholder="Digite seu telefone com DDD"
                        maxlength="15"
                        inputmode="numeric"
                        autocomplete="tel"
                        value="${escaparValorInput(formatarTelefone(dadosCadastro.telefone))}">
                </div>
            `;
        } else {
            camposCadastro.innerHTML = `
                <div class="caixa-input">
                    <label for="emailCadastro">Email</label>
                    <img src="../../../assets/icons/login/e-mail.png" alt="">
                    <input
                        type="email"
                        id="emailCadastro"
                        value="${escaparValorInput(dadosCadastro.email)}"
                        readonly>
                </div>

                <div class="caixa-input">
                    <label for="telefoneCadastro">Telefone</label>
                    <img src="../../../assets/icons/login/telefone.png" alt="">
                    <input
                        type="text"
                        id="telefoneCadastro"
                        value="${escaparValorInput(formatarTelefone(dadosCadastro.telefone))}"
                        readonly>
                </div>

                <div class="caixa-input">
                    <label for="codigoEmailCadastro">Código enviado ao email</label>
                    <img src="../../../assets/icons/login/confirmar-senha.png" alt="">
                    <input
                        type="text"
                        id="codigoEmailCadastro"
                        placeholder="Digite o código de 6 dígitos"
                        maxlength="6"
                        inputmode="numeric"
                        autocomplete="one-time-code"
                        value="${escaparValorInput(dadosCadastro.codigoEmail)}">
                </div>
            `;
        }
    }

    if (etapaCadastro === 3) {
        camposCadastro.innerHTML = `
            <div class="caixa-input">
                <label for="senhaCadastro">Senha</label>
                <img src="../../../assets/icons/login/trancar.png" alt="">
                <input
                    type="password"
                    id="senhaCadastro"
                    placeholder="Mínimo 8 caracteres, letra, número e símbolo"
                    maxlength="72"
                    autocomplete="new-password"
                    value="${escaparValorInput(dadosCadastro.senha)}">
                <img
                    class="mostrar-senha-cadastro"
                    data-target="senhaCadastro"
                    src="../../../assets/icons/login/olho.png"
                    alt="Mostrar senha">
            </div>

            <div class="caixa-input">
                <label for="confirmarSenhaCadastro">Confirmar Senha</label>
                <img src="../../../assets/icons/login/confirmar-senha.png" alt="">
                <input
                    type="password"
                    id="confirmarSenhaCadastro"
                    placeholder="Confirme sua senha"
                    maxlength="72"
                    autocomplete="new-password"
                    value="${escaparValorInput(dadosCadastro.confirmarSenha)}">
                <img
                    class="mostrar-senha-cadastro"
                    data-target="confirmarSenhaCadastro"
                    src="../../../assets/icons/login/olho.png"
                    alt="Mostrar senha">
            </div>
        `;
    }

    adicionarEventosNosInputsCadastro();
    adicionarEventosMostrarSenhaCadastro();
}

/*========================================================================================================

AVANÇAR / VOLTAR CADASTRO

=========================================================================================================*/

async function avancarCadastro() {
    salvarDadosDaEtapaAtual();
    limparMensagemGeral();

    if (!validarEtapaCadastro()) {
        return;
    }

    if (etapaCadastro === 2 && !dadosCadastro.emailVerificado) {
        if (!dadosCadastro.aguardandoCodigoEmail) {
            await enviarCodigoEmailCadastro();
            return;
        }

        const emailConfirmado = await confirmarCodigoEmailCadastro();

        if (!emailConfirmado) {
            return;
        }
    }

    if (etapaCadastro < 3) {
        trocarTela(() => {
            etapaCadastro++;

            atualizarProgresso();
            renderizarEtapaCadastro();

            if (btnVoltarEtapa) {
                btnVoltarEtapa.style.display = etapaCadastro > 1 ? "block" : "none";
            }

            if (etapaCadastro === 3) {
                btnEntrar.innerHTML = 'Finalizar Cadastro <span class="seta-btn">➔</span>';
            } else {
                btnEntrar.innerHTML = 'Próximo <span class="seta-btn">➔</span>';
            }
        });

    } else {
        finalizarCadastro();
    }
}

function voltarEtapaCadastro() {
    if (etapaCadastro <= 1) {
        return;
    }

    trocarTela(() => {
        etapaCadastro--;

        atualizarProgresso();
        renderizarEtapaCadastro();

        if (btnVoltarEtapa) {
            btnVoltarEtapa.style.display = etapaCadastro > 1 ? "block" : "none";
        }

        btnEntrar.innerHTML = 'Próximo <span class="seta-btn">➔</span>';
    });
}

/*========================================================================================================

SALVAR DADOS ENTRE AS ETAPAS

=========================================================================================================*/

function salvarDadosDaEtapaAtual() {
    const nomeCadastro = document.getElementById("nomeCadastro");
    const cpfCadastro = document.getElementById("cpfCadastro");
    const emailCadastro = document.getElementById("emailCadastro");
    const telefoneCadastro = document.getElementById("telefoneCadastro");
    const codigoEmailCadastro = document.getElementById("codigoEmailCadastro");
    const senhaCadastro = document.getElementById("senhaCadastro");
    const confirmarSenhaCadastro = document.getElementById("confirmarSenhaCadastro");

    if (nomeCadastro) {
        dadosCadastro.nome = normalizarEspacos(nomeCadastro.value);
    }

    if (cpfCadastro) {
        dadosCadastro.cpf = apenasNumeros(cpfCadastro.value);
        cpfCadastro.value = formatarCPF(dadosCadastro.cpf);
    }

    if (emailCadastro) {
        dadosCadastro.email = emailCadastro.value.trim().toLowerCase();
    }

    if (telefoneCadastro) {
        dadosCadastro.telefone = apenasNumeros(telefoneCadastro.value);
        telefoneCadastro.value = formatarTelefone(dadosCadastro.telefone);
    }

    if (codigoEmailCadastro) {
        dadosCadastro.codigoEmail = codigoEmailCadastro.value.replace(/\D/g, "");
        codigoEmailCadastro.value = dadosCadastro.codigoEmail;
    }

    if (senhaCadastro) {
        dadosCadastro.senha = senhaCadastro.value;
    }

    if (confirmarSenhaCadastro) {
        dadosCadastro.confirmarSenha = confirmarSenhaCadastro.value;
    }
}

function adicionarEventosNosInputsCadastro() {
    const inputs = camposCadastro.querySelectorAll("input");

    inputs.forEach((input) => {
        input.addEventListener("input", () => {
            salvarDadosDaEtapaAtual();

            if (input.id === "emailCadastro") {
                dadosCadastro.emailVerificado = false;
                dadosCadastro.emailVerificacaoToken = "";
                dadosCadastro.codigoEmail = "";
                dadosCadastro.aguardandoCodigoEmail = false;
            }

            limparErroCampo(input);
            limparMensagemGeral();
        });

        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                avancarCadastro();
            }
        });
    });
}

function adicionarEventosMostrarSenhaCadastro() {
    const botoes = camposCadastro.querySelectorAll(".mostrar-senha-cadastro");

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

VALIDAR ETAPA DO CADASTRO

=========================================================================================================*/

function validarEtapaCadastro() {
    salvarDadosDaEtapaAtual();

    let valido = true;

    const nomeCadastro = document.getElementById("nomeCadastro");
    const cpfCadastro = document.getElementById("cpfCadastro");
    const emailCadastro = document.getElementById("emailCadastro");
    const telefoneCadastro = document.getElementById("telefoneCadastro");
    const codigoEmailCadastro = document.getElementById("codigoEmailCadastro");
    const senhaCadastro = document.getElementById("senhaCadastro");
    const confirmarSenhaCadastro = document.getElementById("confirmarSenhaCadastro");

    if (etapaCadastro === 1) {
        limparErroCampo(nomeCadastro);
        limparErroCampo(cpfCadastro);

        const validacaoNome = validarNomeCompleto(dadosCadastro.nome);

        if (!validacaoNome.valido) {
            mostrarErroCampo(nomeCadastro, validacaoNome.mensagem);
            valido = false;
        } else {
            dadosCadastro.nome = validacaoNome.valor;
        }

        if (!dadosCadastro.cpf) {
            mostrarErroCampo(cpfCadastro, "Informe seu CPF.");
            valido = false;
        } else if (!validarCPF(dadosCadastro.cpf)) {
            mostrarErroCampo(cpfCadastro, "Digite um CPF válido para continuar.");
            valido = false;
        }
    }

    if (etapaCadastro === 2) {
        limparErroCampo(emailCadastro);
        limparErroCampo(telefoneCadastro);
        limparErroCampo(codigoEmailCadastro);

        const validacaoEmail = validarEmailCadastro(dadosCadastro.email);

        if (!validacaoEmail.valido) {
            mostrarErroCampo(emailCadastro, validacaoEmail.mensagem);
            valido = false;
        } else {
            dadosCadastro.email = validacaoEmail.valor;
        }

        if (!dadosCadastro.telefone) {
            mostrarErroCampo(telefoneCadastro, "Informe seu telefone.");
            valido = false;
        } else if (!validarTelefone(dadosCadastro.telefone)) {
            mostrarErroCampo(telefoneCadastro, "Digite um telefone válido com DDD.");
            valido = false;
        }

        if (dadosCadastro.aguardandoCodigoEmail) {
            if (!dadosCadastro.codigoEmail) {
                mostrarErroCampo(codigoEmailCadastro, "Digite o código que enviamos para seu email.");
                valido = false;
            } else if (!/^\d{6}$/.test(dadosCadastro.codigoEmail)) {
                mostrarErroCampo(codigoEmailCadastro, "O código deve conter exatamente 6 números.");
                valido = false;
            }
        }
    }

    if (etapaCadastro === 3) {
        limparErroCampo(senhaCadastro);
        limparErroCampo(confirmarSenhaCadastro);

        if (!dadosCadastro.emailVerificado || !dadosCadastro.emailVerificacaoToken) {
            mostrarMensagem(
                "Confirme seu email com o código enviado antes de finalizar o cadastro.",
                "erro"
            );
            valido = false;
        }

        const validacaoSenha = validarSenhaForte(dadosCadastro.senha, dadosCadastro);

        if (!validacaoSenha.valido) {
            mostrarErroCampo(senhaCadastro, validacaoSenha.mensagem);
            valido = false;
        }

        if (!dadosCadastro.confirmarSenha) {
            mostrarErroCampo(confirmarSenhaCadastro, "Confirme a senha criada.");
            valido = false;
        } else if (dadosCadastro.senha !== dadosCadastro.confirmarSenha) {
            mostrarErroCampo(confirmarSenhaCadastro, "As senhas digitadas não são iguais.");
            valido = false;
        }
    }

    return valido;
}

/*========================================================================================================

FINALIZAR CADASTRO

=========================================================================================================*/

async function finalizarCadastro() {
    salvarDadosDaEtapaAtual();

    if (!validarEtapaCadastro()) {
        mostrarMensagem("Antes de finalizar, corrija os campos destacados.", "erro");
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
                cpf: apenasNumeros(dadosCadastro.cpf),
                email: dadosCadastro.email,
                telefone: apenasNumeros(dadosCadastro.telefone),
                senha: dadosCadastro.senha,
                tipo_usuario: "CIDADAO",
                email_verificacao_token: dadosCadastro.emailVerificacaoToken
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            mostrarMensagem(
                dados.mensagem || "Não foi possível concluir o cadastro. Revise os dados e tente novamente.",
                "erro"
            );
            return;
        }

        mostrarMensagem("Conta criada com sucesso! Agora você já pode fazer login.", "sucesso");

        emailInput.value = dadosCadastro.email;
        passwordInput.value = "";

        limparDadosCadastro();

        setTimeout(() => {
            voltarModoLogin();
        }, 1000);

    } catch (error) {
        console.error("Erro ao cadastrar usuário:", error);

        mostrarMensagem(
            "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
            "erro"
        );

    } finally {
        btnEntrar.disabled = false;

        if (modoCadastro) {
            btnEntrar.innerHTML = 'Finalizar Cadastro <span class="seta-btn">➔</span>';
        }
    }
}

function limparDadosCadastro() {
    dadosCadastro.nome = "";
    dadosCadastro.cpf = "";
    dadosCadastro.email = "";
    dadosCadastro.telefone = "";
    dadosCadastro.senha = "";
    dadosCadastro.confirmarSenha = "";

    dadosCadastro.emailVerificado = false;
    dadosCadastro.emailVerificacaoToken = "";
    dadosCadastro.codigoEmail = "";
    dadosCadastro.aguardandoCodigoEmail = false;
}

/*========================================================================================================

ENVIO E CONFIRMAÇÃO DE CÓDIGO DE EMAIL

=========================================================================================================*/

async function enviarCodigoEmailCadastro() {
    try {
        btnEntrar.disabled = true;
        btnEntrar.textContent = "Enviando código...";

        const resposta = await fetch(`${API_URL}/cadastro/email/enviar-codigo`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: dadosCadastro.email
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            mostrarMensagem(
                dados.mensagem || "Não foi possível enviar o código. Verifique o email informado.",
                "erro"
            );
            return false;
        }

        dadosCadastro.aguardandoCodigoEmail = true;

        mostrarMensagem(
            "Enviamos um código para seu email. Digite o código para continuar.",
            "sucesso"
        );

        renderizarEtapaCadastro();

        btnEntrar.innerHTML = 'Verificar Email <span class="seta-btn">➔</span>';

        return true;

    } catch (error) {
        console.error("Erro ao enviar código de email:", error);

        mostrarMensagem(
            "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
            "erro"
        );

        return false;

    } finally {
        btnEntrar.disabled = false;

        if (modoCadastro && etapaCadastro === 2 && dadosCadastro.aguardandoCodigoEmail) {
            btnEntrar.innerHTML = 'Verificar Email <span class="seta-btn">➔</span>';
        }
    }
}

async function confirmarCodigoEmailCadastro() {
    const codigoEmailCadastro = document.getElementById("codigoEmailCadastro");

    limparErroCampo(codigoEmailCadastro);

    if (!dadosCadastro.codigoEmail) {
        mostrarErroCampo(codigoEmailCadastro, "Digite o código recebido.");
        return false;
    }

    if (!/^\d{6}$/.test(dadosCadastro.codigoEmail)) {
        mostrarErroCampo(codigoEmailCadastro, "O código deve conter exatamente 6 números.");
        return false;
    }

    try {
        btnEntrar.disabled = true;
        btnEntrar.textContent = "Verificando...";

        const resposta = await fetch(`${API_URL}/cadastro/email/confirmar-codigo`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: dadosCadastro.email,
                codigo: dadosCadastro.codigoEmail
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            mostrarMensagem(
                dados.mensagem || "Código inválido ou expirado. Confira o código e tente novamente.",
                "erro"
            );
            return false;
        }

        dadosCadastro.emailVerificado = true;
        dadosCadastro.emailVerificacaoToken = dados.email_verificacao_token;
        dadosCadastro.aguardandoCodigoEmail = false;

        mostrarMensagem("Email confirmado com sucesso. Agora crie uma senha segura.", "sucesso");

        return true;

    } catch (error) {
        console.error("Erro ao confirmar código de email:", error);

        mostrarMensagem(
            "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
            "erro"
        );

        return false;

    } finally {
        btnEntrar.disabled = false;

        if (modoCadastro && etapaCadastro === 2) {
            btnEntrar.innerHTML = 'Verificar Email <span class="seta-btn">➔</span>';
        }
    }
}

/*========================================================================================================

VALIDAÇÕES FORTES DO CADASTRO

=========================================================================================================*/

function normalizarTexto(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function normalizarEspacos(texto) {
    return String(texto || "").replace(/\s+/g, " ").trim();
}

function apenasNumeros(texto) {
    return String(texto || "").replace(/\D/g, "");
}

function validarNomeCompleto(nome) {
    nome = normalizarEspacos(nome);

    if (!nome) {
        return { valido: false, mensagem: "Informe seu nome completo." };
    }

    if (nome.length < 6) {
        return { valido: false, mensagem: "Digite seu nome e sobrenome." };
    }

    if (nome.length > 80) {
        return { valido: false, mensagem: "O nome informado é muito longo." };
    }

    if (/[0-9]/.test(nome)) {
        return { valido: false, mensagem: "O nome não deve conter números." };
    }

    if (/[^A-Za-zÀ-ÖØ-öø-ÿ' -]/.test(nome)) {
        return { valido: false, mensagem: "O nome não deve conter símbolos ou caracteres especiais." };
    }

    if (/(.)\1\1/i.test(normalizarTexto(nome))) {
        return { valido: false, mensagem: "O nome informado parece inválido. Revise antes de continuar." };
    }

    const palavras = nome.split(" ").filter(Boolean);
    const conectores = ["da", "de", "do", "das", "dos", "e"];

    const palavrasImportantes = palavras.filter((palavra) => {
        return !conectores.includes(normalizarTexto(palavra));
    });

    if (palavrasImportantes.length < 2) {
        return { valido: false, mensagem: "Digite seu nome e sobrenome." };
    }

    for (const palavra of palavrasImportantes) {
        const limpa = palavra.replace(/['-]/g, "");

        if (limpa.length < 2) {
            return { valido: false, mensagem: "Cada parte do nome precisa ter pelo menos 2 letras." };
        }
    }

    const nomeLimpo = normalizarTexto(nome).replace(/[^a-z]/g, "");
    const letrasUnicas = new Set(nomeLimpo).size;

    if (letrasUnicas <= 2) {
        return { valido: false, mensagem: "O nome informado parece inválido. Revise antes de continuar." };
    }

    const palavrasBloqueadas = [
        "teste",
        "admin",
        "usuario",
        "nome",
        "sobrenome",
        "asdf",
        "qwerty",
        "aaaa",
        "fulano",
        "ciclano"
    ];

    if (palavrasBloqueadas.some((palavra) => normalizarTexto(nome).includes(palavra))) {
        return { valido: false, mensagem: "Informe um nome válido para continuar." };
    }

    return { valido: true, valor: nome };
}

function validarEmailCadastro(email) {
    email = String(email || "").trim().toLowerCase();

    if (!email) {
        return { valido: false, mensagem: "Informe seu email." };
    }

    if (email.length > 254) {
        return { valido: false, mensagem: "O email informado é muito longo." };
    }

    if (/\s/.test(email)) {
        return { valido: false, mensagem: "O email não deve conter espaços." };
    }

    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) {
        return { valido: false, mensagem: "Digite um email válido, como nome@exemplo.com." };
    }

    const partes = email.split("@");

    if (partes.length !== 2) {
        return { valido: false, mensagem: "Digite um email válido, como nome@exemplo.com." };
    }

    const usuario = partes[0];
    const dominio = partes[1];

    if (usuario.startsWith(".") || usuario.endsWith(".") || usuario.includes("..")) {
        return { valido: false, mensagem: "Digite um email válido, como nome@exemplo.com." };
    }

    if (dominio.startsWith("-") || dominio.endsWith("-") || dominio.includes("..")) {
        return { valido: false, mensagem: "Digite um email válido, como nome@exemplo.com." };
    }

    const dominiosBloqueados = [
        "teste.com",
        "example.com",
        "exemplo.com",
        "mailinator.com",
        "10minutemail.com",
        "tempmail.com",
        "yopmail.com",
        "guerrillamail.com"
    ];

    if (dominiosBloqueados.includes(dominio)) {
        return { valido: false, mensagem: "Use um email válido e permanente para criar sua conta." };
    }

    const usuariosInvalidos = [
        "teste",
        "test",
        "admin",
        "usuario",
        "user",
        "fake",
        "email"
    ];

    if (usuariosInvalidos.includes(usuario)) {
        return { valido: false, mensagem: "Informe um email válido para continuar." };
    }

    return { valido: true, valor: email };
}

function validarSenhaForte(senha, dados = {}) {
    senha = String(senha || "");

    if (!senha) {
        return { valido: false, mensagem: "Crie uma senha para sua conta." };
    }

    if (senha.length < 8) {
        return { valido: false, mensagem: "A senha deve ter pelo menos 8 caracteres." };
    }

    if (senha.length > 72) {
        return { valido: false, mensagem: "A senha deve ter no máximo 72 caracteres." };
    }

    if (/\s/.test(senha)) {
        return { valido: false, mensagem: "A senha não deve conter espaços." };
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

    if (/(.)\1\1/.test(senha)) {
        return { valido: false, mensagem: "Evite repetir o mesmo caractere várias vezes seguidas." };
    }

    const senhaNormalizada = normalizarTexto(senha);

    const sequenciasBloqueadas = [
        "123456",
        "12345678",
        "abcdef",
        "qwerty",
        "asdf",
        "senha",
        "password",
        "admin",
        "cidade360",
        "usuario",
        "teste"
    ];

    if (sequenciasBloqueadas.some((item) => senhaNormalizada.includes(item))) {
        return {
            valido: false,
            mensagem: "Essa senha é muito fácil de adivinhar. Escolha uma senha mais segura."
        };
    }

    const nome = normalizarTexto(dados.nome || "").replace(/\s+/g, "");
    const emailUsuario = normalizarTexto((dados.email || "").split("@")[0]);
    const cpf = apenasNumeros(dados.cpf || "");
    const telefone = apenasNumeros(dados.telefone || "");

    if (nome && nome.length >= 4 && senhaNormalizada.includes(nome)) {
        return { valido: false, mensagem: "Por segurança, a senha não deve conter seu nome." };
    }

    if (emailUsuario && emailUsuario.length >= 4 && senhaNormalizada.includes(emailUsuario)) {
        return { valido: false, mensagem: "Por segurança, a senha não deve conter parte do seu email." };
    }

    if (cpf && senha.includes(cpf)) {
        return { valido: false, mensagem: "Por segurança, a senha não deve conter seu CPF." };
    }

    if (telefone && telefone.length >= 8 && senha.includes(telefone)) {
        return { valido: false, mensagem: "Por segurança, a senha não deve conter seu telefone." };
    }

    return { valido: true };
}

function validarCPF(cpf) {
    cpf = apenasNumeros(cpf);

    if (cpf.length !== 11) {
        return false;
    }

    if (/^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    let soma = 0;

    for (let i = 0; i < 9; i++) {
        soma += Number(cpf[i]) * (10 - i);
    }

    let digito1 = 11 - (soma % 11);

    if (digito1 >= 10) {
        digito1 = 0;
    }

    if (digito1 !== Number(cpf[9])) {
        return false;
    }

    soma = 0;

    for (let i = 0; i < 10; i++) {
        soma += Number(cpf[i]) * (11 - i);
    }

    let digito2 = 11 - (soma % 11);

    if (digito2 >= 10) {
        digito2 = 0;
    }

    return digito2 === Number(cpf[10]);
}

function validarTelefone(telefone) {
    const numeros = apenasNumeros(telefone);

    if (numeros.length < 10 || numeros.length > 11) {
        return false;
    }

    if (/^(\d)\1+$/.test(numeros)) {
        return false;
    }

    return true;
}

/*========================================================================================================

FORMATAÇÃO E SEGURANÇA DE INPUT

=========================================================================================================*/

function escaparValorInput(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function formatarCPF(cpf) {
    const numeros = apenasNumeros(cpf).slice(0, 11);

    if (numeros.length <= 3) {
        return numeros;
    }

    if (numeros.length <= 6) {
        return `${numeros.slice(0, 3)}.${numeros.slice(3)}`;
    }

    if (numeros.length <= 9) {
        return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`;
    }

    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9, 11)}`;
}

function formatarTelefone(telefone) {
    const numeros = apenasNumeros(telefone).slice(0, 11);

    if (numeros.length <= 2) {
        return numeros;
    }

    if (numeros.length <= 6) {
        return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    }

    if (numeros.length <= 10) {
        return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    }

    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
}