/*========================================================================================================

RECUPERAÇÃO DE SENHA - VERSÃO 2 (PELO CPF)

Etapas:
1. CPF (o código vai para o email cadastrado na conta)
2. Código
3. Nova senha

=========================================================================================================*/

const linkEsqueciSenha = document.getElementById("linkEsqueciSenha");

let etapaRecuperacaoSenha = 1;

const NOMES_ETAPAS_RECUPERACAO = ["CPF", "Código", "Senha"];

const dadosRecuperacaoSenha = {
    cpf: "",
    emailMascarado: "",
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

        if (btnEntrar.disabled) {
            return;
        }

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

        modoFormulario(true);

        renderizarEtapaRecuperacaoSenha();
    });
}

/*========================================================================================================

RENDERIZAR ETAPAS DA RECUPERAÇÃO

=========================================================================================================*/

function renderizarEtapaRecuperacaoSenha() {
    atualizarProgressoEtapas(etapaRecuperacaoSenha, NOMES_ETAPAS_RECUPERACAO);

    btnVoltarEtapa.hidden = etapaRecuperacaoSenha === 1;

    if (etapaRecuperacaoSenha === 1) {
        tituloFormulario.textContent = "Recuperar Senha";
        subtituloFormulario.textContent = "Informe o CPF da sua conta. O código vai para o email cadastrado.";

        camposCadastro.innerHTML = campoHTML({
            id: "cpfRecuperacao",
            rotulo: "CPF",
            icone: "cpf",
            placeholder: "000.000.000-00",
            max: 14,
            valor: formatarCpfRecuperacao(dadosRecuperacaoSenha.cpf),
            extra: 'inputmode="numeric" autocomplete="off"'
        });

        rotuloBotaoPrincipal("Enviar código");
    }

    if (etapaRecuperacaoSenha === 2) {
        tituloFormulario.textContent = "Código de Segurança";
        subtituloFormulario.textContent = "Digite o código enviado para o email da sua conta.";

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
                    value="${escaparTextoLogin(dadosRecuperacaoSenha.codigo)}">
            </div>

            <p class="codigo-ajuda">
                Código enviado para o email cadastrado:<br>
                <b>${escaparTextoLogin(dadosRecuperacaoSenha.emailMascarado)}</b>
            </p>

            <p class="codigo-ajuda codigo-ajuda-suave">
                Não chegou? Olhe a caixa de spam. Se não tem mais acesso a esse email, procure a Prefeitura.
            </p>
        `;

        rotuloBotaoPrincipal("Continuar");
    }

    if (etapaRecuperacaoSenha === 3) {
        tituloFormulario.textContent = "Criar Nova Senha";
        subtituloFormulario.textContent = "Escolha uma nova senha segura para sua conta.";

        camposCadastro.innerHTML =
            campoHTML({
                id: "novaSenhaRecuperacao",
                rotulo: "Nova senha",
                icone: "cadeado",
                tipo: "password",
                placeholder: "Mínimo 8 caracteres, letra, número e símbolo",
                max: 72,
                valor: dadosRecuperacaoSenha.novaSenha,
                senha: true,
                extra: 'autocomplete="new-password"'
            }) +
            campoHTML({
                id: "confirmarNovaSenhaRecuperacao",
                rotulo: "Confirmar nova senha",
                icone: "escudo",
                tipo: "password",
                placeholder: "Confirme sua nova senha",
                max: 72,
                valor: dadosRecuperacaoSenha.confirmarNovaSenha,
                senha: true,
                extra: 'autocomplete="new-password"'
            });

        rotuloBotaoPrincipal("Redefinir senha");
    }

    prepararOlhosSenha(camposCadastro);
    adicionarEventosRecuperacaoSenha();
}

/*========================================================================================================

EVENTOS DOS INPUTS DA RECUPERAÇÃO

=========================================================================================================*/

function adicionarEventosRecuperacaoSenha() {
    const inputs = camposCadastro.querySelectorAll("input");

    inputs.forEach((input) => {
        input.addEventListener("input", () => {
            if (input.id === "codigoRecuperacao") {
                input.value = input.value.replace(/\D/g, "").slice(0, 6);
            }

            if (input.id === "cpfRecuperacao") {
                input.value = formatarCpfRecuperacao(input.value);
            }

            salvarDadosRecuperacaoSenha();

            limparErroCampo(input);
            limparMensagemGeral();
        });
    });
}

/*========================================================================================================

SALVAR DADOS DA RECUPERAÇÃO

=========================================================================================================*/

function salvarDadosRecuperacaoSenha() {
    const cpfRecuperacao = document.getElementById("cpfRecuperacao");
    const codigoRecuperacao = document.getElementById("codigoRecuperacao");
    const novaSenhaRecuperacao = document.getElementById("novaSenhaRecuperacao");
    const confirmarNovaSenhaRecuperacao = document.getElementById("confirmarNovaSenhaRecuperacao");

    if (cpfRecuperacao) {
        dadosRecuperacaoSenha.cpf = cpfRecuperacao.value.replace(/\D/g, "").slice(0, 11);
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
        limparMensagemGeral();

        etapaRecuperacaoSenha--;

        renderizarEtapaRecuperacaoSenha();
    });
}

/*========================================================================================================

ENVIAR CÓDIGO (BUSCA A CONTA PELO CPF)

=========================================================================================================*/

async function enviarCodigoRecuperacao() {
    const cpfRecuperacao = document.getElementById("cpfRecuperacao");

    limparErroCampo(cpfRecuperacao);

    if (!dadosRecuperacaoSenha.cpf) {
        mostrarErroCampo(cpfRecuperacao, "Informe o CPF da sua conta.");
        return;
    }

    if (!cpfValidoRecuperacao(dadosRecuperacaoSenha.cpf)) {
        mostrarErroCampo(cpfRecuperacao, "Digite um CPF válido, com os 11 números.");
        return;
    }

    try {
        carregandoBotaoPrincipal("Enviando...");

        const resposta = await fetch(`${API_URL}/recuperar-senha/enviar-codigo`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                cpf: dadosRecuperacaoSenha.cpf
            })
        });

        const dados = await lerRespostaJson(resposta);

        if (!resposta.ok || !dados.sucesso) {
            // CPF inválido ou não encontrado: a tela fica presa no CPF, com o erro embaixo do campo
            if (resposta.status === 400 || resposta.status === 404) {
                mostrarErroCampo(
                    cpfRecuperacao,
                    dados.mensagem || "CPF não encontrado. Confira os números ou crie uma conta."
                );
                return;
            }

            mostrarMensagem(
                dados.mensagem || "Não foi possível enviar o código de recuperação no momento.",
                "erro"
            );
            return;
        }

        dadosRecuperacaoSenha.emailMascarado = dados.emailMascarado || "o email da sua conta";
        dadosRecuperacaoSenha.codigo = "";

        trocarTela(() => {
            etapaRecuperacaoSenha = 2;

            renderizarEtapaRecuperacaoSenha();

            mostrarMensagem(
                dados.mensagem || "Código de recuperação enviado para o email cadastrado.",
                "sucesso"
            );
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
            rotuloBotaoPrincipal("Enviar código");
        }
    }
}

/*========================================================================================================

CONFERIR CÓDIGO E IR PARA SENHA

=========================================================================================================*/

async function validarCodigoEIrParaSenha() {
    const codigoRecuperacao = document.getElementById("codigoRecuperacao");

    limparErroCampo(codigoRecuperacao);
    limparMensagemGeral();

    salvarDadosRecuperacaoSenha();

    if (!dadosRecuperacaoSenha.codigo) {
        mostrarErroCampo(codigoRecuperacao, "Digite o código enviado para o email da sua conta.");
        return;
    }

    if (!/^\d{6}$/.test(dadosRecuperacaoSenha.codigo)) {
        mostrarErroCampo(codigoRecuperacao, "O código deve conter exatamente 6 números.");
        return;
    }

    try {
        carregandoBotaoPrincipal("Verificando...");

        const resposta = await fetch(`${API_URL}/recuperar-senha/confirmar-codigo`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                cpf: dadosRecuperacaoSenha.cpf,
                codigo: dadosRecuperacaoSenha.codigo
            })
        });

        const dados = await lerRespostaJson(resposta);

        if (!resposta.ok || !dados.sucesso) {
            // Uma mensagem só, embaixo do campo do código
            mostrarErroCampo(
                codigoRecuperacao,
                dados.mensagem || "Código inválido ou expirado. Confira e tente novamente."
            );

            return;
        }

        trocarTela(() => {
            etapaRecuperacaoSenha = 3;

            renderizarEtapaRecuperacaoSenha();

            mostrarMensagem("Código confirmado com sucesso.", "sucesso");
        });

    } catch (error) {
        console.error("Erro ao confirmar código:", error);

        mostrarMensagem(
            "Não foi possível verificar o código agora. Tente novamente em alguns instantes.",
            "erro"
        );

    } finally {
        btnEntrar.disabled = false;

        if (modoRecuperarSenha && etapaRecuperacaoSenha === 2) {
            rotuloBotaoPrincipal("Continuar");
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

    let redefiniu = false;

    try {
        carregandoBotaoPrincipal("Redefinindo...");

        const resposta = await fetch(`${API_URL}/recuperar-senha/redefinir`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                cpf: dadosRecuperacaoSenha.cpf,
                codigo: dadosRecuperacaoSenha.codigo,
                novaSenha: dadosRecuperacaoSenha.novaSenha
            })
        });

        const dados = await lerRespostaJson(resposta);

        if (!resposta.ok || !dados.sucesso) {
            mostrarMensagem(
                dados.mensagem || "Não foi possível redefinir a senha. Confira o código e tente novamente.",
                "erro"
            );
            return;
        }

        redefiniu = true;

        mostrarMensagem(
            dados.mensagem || "Senha redefinida com sucesso. Você já pode acessar sua conta.",
            "sucesso"
        );

        // O servidor devolve o email da conta só depois que o código foi confirmado
        const emailConta = dados.email || "";

        setTimeout(() => {
            voltarModoLogin();

            setTimeout(() => {
                emailInput.value = emailConta;
                passwordInput.value = "";
                (emailConta ? passwordInput : emailInput).focus();
            }, 300);
        }, 1200);

    } catch (error) {
        console.error("Erro ao redefinir senha:", error);

        mostrarMensagem(
            "Não foi possível conectar ao servidor. Tente novamente em alguns instantes.",
            "erro"
        );

    } finally {
        if (!redefiniu) {
            btnEntrar.disabled = false;

            if (modoRecuperarSenha) {
                rotuloBotaoPrincipal("Redefinir senha");
            }
        }
    }
}

/*========================================================================================================

LIMPAR DADOS

=========================================================================================================*/

function limparDadosRecuperacaoSenha() {
    dadosRecuperacaoSenha.cpf = "";
    dadosRecuperacaoSenha.emailMascarado = "";
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
            cpf: dadosRecuperacaoSenha.cpf
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

CPF: MÁSCARA E VALIDAÇÃO

Usa as funções do cadastro.js quando existem, para não ter duas regras diferentes.

=========================================================================================================*/

function formatarCpfRecuperacao(valor) {
    const numeros = String(valor || "").replace(/\D/g, "").slice(0, 11);

    if (typeof formatarCPF === "function") {
        return formatarCPF(numeros);
    }

    return numeros
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function cpfValidoRecuperacao(cpf) {
    if (typeof validarCPF === "function") {
        return validarCPF(cpf);
    }

    return /^\d{11}$/.test(String(cpf || ""));
}
