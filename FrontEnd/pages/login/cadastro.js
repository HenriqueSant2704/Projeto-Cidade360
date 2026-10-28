/*========================================================================================================

VARIÁVEIS DO CADASTRO

=========================================================================================================*/

let etapaCadastro = 1;

const NOMES_ETAPAS_CADASTRO = ["Dados", "Contato", "Segurança"];

const dadosCadastro = {
    nome: "",
    cpf: "",
    uf: "SP",
    cidade: "",
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

ESTADOS, CIDADES E CIDADES ATENDIDAS

- A lista de cidades (IBGE) fica em /assets/data/municipios-brasil.json e só carrega ao abrir o cadastro.
- As cidades atendidas vêm do servidor (GET /api/cidade-atendida). Hoje: somente Jaborandi-SP.
- O servidor confere tudo de novo no /cadastrar, então a tela é só uma ajuda para a pessoa.

=========================================================================================================*/

const ESTADOS_BRASIL = [
    ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"],
    ["BA", "Bahia"], ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"],
    ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"],
    ["MG", "Minas Gerais"], ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"],
    ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"],
    ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"],
    ["SP", "São Paulo"], ["SE", "Sergipe"], ["TO", "Tocantins"]
];

let cidadesPorEstado = null;
let carregandoCidadesPorEstado = null;

let cidadesAtendidas = [
    { nome: "Jaborandi", uf: "SP" }
];

let mensagemCidadeIndisponivel =
    "Essa cidade ainda não está disponível no Cidade360. No momento, atendemos somente Jaborandi-SP.";

let cidadesAtendidasCarregadas = false;

function carregarCidadesDoBrasil() {
    if (cidadesPorEstado) {
        return Promise.resolve(cidadesPorEstado);
    }

    if (!carregandoCidadesPorEstado) {
        carregandoCidadesPorEstado = fetch("/assets/data/municipios-brasil.json?v=1")
            .then((resposta) => {
                if (!resposta.ok) {
                    throw new Error("Lista de cidades indisponível");
                }

                return resposta.json();
            })
            .then((dados) => {
                cidadesPorEstado = dados;
                return dados;
            })
            .catch((error) => {
                console.warn("Não foi possível carregar a lista de cidades:", error);
                carregandoCidadesPorEstado = null;
                return null;
            });
    }

    return carregandoCidadesPorEstado;
}

async function carregarCidadesAtendidas() {
    if (cidadesAtendidasCarregadas) {
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/cidade-atendida`);
        const dados = await lerRespostaJson(resposta);

        if (resposta.ok && dados.sucesso && Array.isArray(dados.cidades) && dados.cidades.length) {
            cidadesAtendidas = dados.cidades.map((cidade) => ({
                nome: cidade.nome,
                uf: cidade.uf
            }));

            if (dados.mensagem_indisponivel) {
                mensagemCidadeIndisponivel = dados.mensagem_indisponivel;
            }

            cidadesAtendidasCarregadas = true;
        }
    } catch (error) {
        // Sem conexão: segue com a lista padrão (o servidor confere no final).
        console.warn("Não foi possível carregar as cidades atendidas:", error);
    }
}

function cidadesDoEstado(uf) {
    if (cidadesPorEstado && Array.isArray(cidadesPorEstado[uf])) {
        return cidadesPorEstado[uf];
    }

    // Lista ainda não carregou (ou falhou): ao menos as cidades atendidas aparecem
    return cidadesAtendidas
        .filter((cidade) => cidade.uf === uf)
        .map((cidade) => cidade.nome);
}

function nomeOficialDaCidade(cidade, uf) {
    return cidadesDoEstado(uf).find((nome) => {
        return normalizarTexto(nome) === normalizarTexto(cidade);
    }) || "";
}

function cidadeEstaDisponivel(cidade, uf) {
    return cidadesAtendidas.some((atendida) => {
        return atendida.uf === uf && normalizarTexto(atendida.nome) === normalizarTexto(cidade);
    });
}

/*========================================================================================================

BOTÃO CRIAR CONTA / VOLTAR PARA LOGIN

=========================================================================================================*/

if (btnCriarConta) {
    btnCriarConta.addEventListener("click", (event) => {
        event.preventDefault();

        if (btnEntrar.disabled) {
            return;
        }

        if (modoCadastro || modoRecuperarSenha) {
            voltarModoLogin();
            return;
        }

        entrarModoCadastro();
    });
}

/*========================================================================================================

ENTRAR NO MODO CADASTRO

=========================================================================================================*/

function entrarModoCadastro() {
    carregarCidadesDoBrasil();
    carregarCidadesAtendidas();

    trocarTela(() => {
        modoCadastro = true;
        modoRecuperarSenha = false;
        etapaCadastro = 1;

        limparDadosCadastro();

        limparMensagemGeral();
        limparErroCampo(emailInput);
        limparErroCampo(passwordInput);

        modoFormulario(true);

        tituloFormulario.textContent = "Criar Conta";
        subtituloFormulario.textContent = "Informe seus dados para continuar.";

        renderizarEtapaCadastro();
    });
}

/*========================================================================================================

RENDERIZAR CAMPOS DO CADASTRO

=========================================================================================================*/

function renderizarEtapaCadastro() {
    atualizarProgressoEtapas(etapaCadastro, NOMES_ETAPAS_CADASTRO);

    btnVoltarEtapa.hidden = etapaCadastro === 1;

    if (etapaCadastro === 1) {
        camposCadastro.innerHTML =
            campoHTML({
                id: "nomeCadastro",
                rotulo: "Nome Completo",
                icone: "pessoa",
                placeholder: "Digite seu nome completo",
                max: 80,
                valor: dadosCadastro.nome,
                extra: 'autocomplete="name"'
            }) +
            campoHTML({
                id: "cpfCadastro",
                rotulo: "CPF",
                icone: "cpf",
                placeholder: "Digite seu CPF",
                max: 14,
                valor: formatarCPF(dadosCadastro.cpf),
                extra: 'inputmode="numeric" autocomplete="off"'
            }) +
            `
            <div class="linha-dupla">
                <div class="caixa-input">
                    <label for="ufCadastro">Estado</label>
                    <div class="campo">
                        ${ICONES_LOGIN.mapa}
                        <select id="ufCadastro" autocomplete="address-level1">
                            ${ESTADOS_BRASIL.map(([uf, nome]) => `
                                <option value="${uf}" title="${nome}" ${uf === dadosCadastro.uf ? "selected" : ""}>${uf}</option>
                            `).join("")}
                        </select>
                        ${ICONES_LOGIN.setaSelect}
                    </div>
                </div>

                <div class="caixa-input">
                    <label for="cidadeCadastro">Cidade</label>
                    <div class="campo">
                        ${ICONES_LOGIN.predio}
                        <input
                            type="text"
                            id="cidadeCadastro"
                            placeholder="Digite sua cidade"
                            maxlength="80"
                            autocomplete="off"
                            role="combobox"
                            aria-expanded="false"
                            aria-controls="listaCidades"
                            aria-autocomplete="list"
                            value="${escaparTextoLogin(dadosCadastro.cidade)}">
                    </div>
                    <ul class="lista-cidades" id="listaCidades" role="listbox" hidden></ul>
                </div>
            </div>

            <div class="aviso-cidade" id="avisoCidade" role="status" hidden></div>
        `;

        rotuloBotaoPrincipal("Próximo");
    }

    if (etapaCadastro === 2) {
        if (!dadosCadastro.aguardandoCodigoEmail) {
            camposCadastro.innerHTML =
                campoHTML({
                    id: "emailCadastro",
                    rotulo: "Email",
                    icone: "email",
                    tipo: "email",
                    placeholder: "Digite seu email",
                    max: 254,
                    valor: dadosCadastro.email,
                    extra: 'autocomplete="email"'
                }) +
                campoHTML({
                    id: "telefoneCadastro",
                    rotulo: "Telefone",
                    icone: "telefone",
                    placeholder: "Digite seu telefone com DDD",
                    max: 15,
                    valor: formatarTelefone(dadosCadastro.telefone),
                    extra: 'inputmode="tel" autocomplete="tel"'
                });

            rotuloBotaoPrincipal("Próximo");
        } else {
            camposCadastro.innerHTML =
                campoHTML({
                    id: "emailCadastro",
                    rotulo: "Email",
                    icone: "email",
                    valor: dadosCadastro.email,
                    somenteLeitura: true
                }) +
                campoHTML({
                    id: "telefoneCadastro",
                    rotulo: "Telefone",
                    icone: "telefone",
                    valor: formatarTelefone(dadosCadastro.telefone),
                    somenteLeitura: true
                }) +
                campoHTML({
                    id: "codigoEmailCadastro",
                    rotulo: "Código enviado ao email",
                    icone: "escudo",
                    placeholder: "Digite o código de 6 dígitos",
                    max: 6,
                    valor: dadosCadastro.codigoEmail,
                    extra: 'inputmode="numeric" autocomplete="one-time-code"'
                });

            rotuloBotaoPrincipal("Verificar Email");
        }
    }

    if (etapaCadastro === 3) {
        camposCadastro.innerHTML =
            campoHTML({
                id: "senhaCadastro",
                rotulo: "Senha",
                icone: "cadeado",
                tipo: "password",
                placeholder: "Mínimo 8 caracteres, letra, número e símbolo",
                max: 72,
                valor: dadosCadastro.senha,
                senha: true,
                extra: 'autocomplete="new-password"'
            }) +
            campoHTML({
                id: "confirmarSenhaCadastro",
                rotulo: "Confirmar Senha",
                icone: "escudo",
                tipo: "password",
                placeholder: "Confirme sua senha",
                max: 72,
                valor: dadosCadastro.confirmarSenha,
                senha: true,
                extra: 'autocomplete="new-password"'
            });

        rotuloBotaoPrincipal("Finalizar Cadastro");
    }

    prepararOlhosSenha(camposCadastro);
    adicionarEventosNosInputsCadastro();

    if (etapaCadastro === 1) {
        prepararCampoCidade();
        atualizarAvisoCidade();
    }
}

/*========================================================================================================

CAMPO CIDADE (busca com sugestões, só aceita cidade da lista do estado escolhido)

=========================================================================================================*/

function prepararCampoCidade() {
    const selectUf = document.getElementById("ufCadastro");
    const inputCidade = document.getElementById("cidadeCadastro");
    const lista = document.getElementById("listaCidades");

    if (!selectUf || !inputCidade || !lista) return;

    let marcado = -1;

    function sugestoes() {
        const termo = normalizarTexto(inputCidade.value);

        const cidades = cidadesDoEstado(selectUf.value);

        // Primeiro as que começam com o texto, depois as que contêm
        const comecam = cidades.filter((cidade) => normalizarTexto(cidade).startsWith(termo));
        const contem = cidades.filter((cidade) => {
            const nome = normalizarTexto(cidade);
            return !nome.startsWith(termo) && nome.includes(termo);
        });

        return comecam.concat(contem).slice(0, 8);
    }

    function abrirLista() {
        const itens = sugestoes();

        marcado = -1;
        inputCidade.removeAttribute("aria-activedescendant");

        lista.innerHTML = itens.length
            ? itens.map((cidade, indice) => `
                <li role="option" id="opcaoCidade${indice}" data-cidade="${escaparTextoLogin(cidade)}">
                    <span>${escaparTextoLogin(cidade)}</span>
                    <small>${selectUf.value}</small>
                </li>
            `).join("")
            : `<li class="vazio">Nenhuma cidade encontrada em ${selectUf.value}</li>`;

        lista.hidden = false;
        inputCidade.setAttribute("aria-expanded", "true");
    }

    function fecharLista() {
        lista.hidden = true;
        inputCidade.setAttribute("aria-expanded", "false");
    }

    function escolherCidade(cidade) {
        inputCidade.value = cidade;
        dadosCadastro.cidade = cidade;

        fecharLista();
        limparErroCampo(inputCidade);
        limparMensagemGeral();
        atualizarAvisoCidade();
    }

    function marcarOpcao(indice) {
        const itens = [...lista.querySelectorAll("[data-cidade]")];

        if (!itens.length) return;

        marcado = (indice + itens.length) % itens.length;

        itens.forEach((item, posicao) => {
            item.setAttribute("aria-selected", String(posicao === marcado));
        });

        inputCidade.setAttribute("aria-activedescendant", itens[marcado].id);
        itens[marcado].scrollIntoView({ block: "nearest" });
    }

    inputCidade.addEventListener("focus", () => {
        // A lista do IBGE pode chegar depois do primeiro foco
        carregarCidadesDoBrasil().then(() => {
            if (document.activeElement === inputCidade) {
                abrirLista();
            }
        });

        abrirLista();
    });

    inputCidade.addEventListener("input", () => {
        dadosCadastro.cidade = normalizarEspacos(inputCidade.value);

        limparErroCampo(inputCidade);
        limparMensagemGeral();
        abrirLista();
        atualizarAvisoCidade();
    });

    inputCidade.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();

            if (lista.hidden) abrirLista();

            marcarOpcao(marcado + 1);
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            marcarOpcao(marcado - 1);
        }

        if (event.key === "Escape") {
            fecharLista();
        }

        if (event.key === "Enter" && !lista.hidden && marcado >= 0) {
            event.preventDefault();

            const opcao = lista.querySelectorAll("[data-cidade]")[marcado];

            if (opcao) escolherCidade(opcao.dataset.cidade);
        }
    });

    inputCidade.addEventListener("blur", () => {
        setTimeout(fecharLista, 150);
    });

    lista.addEventListener("mousedown", (event) => {
        const opcao = event.target.closest("[data-cidade]");

        if (!opcao) return;

        event.preventDefault();
        escolherCidade(opcao.dataset.cidade);
    });

    selectUf.addEventListener("change", () => {
        dadosCadastro.uf = selectUf.value;

        // Trocou o estado: a cidade digitada só fica se existir no novo estado
        if (!nomeOficialDaCidade(inputCidade.value, selectUf.value)) {
            inputCidade.value = "";
            dadosCadastro.cidade = "";
        }

        limparErroCampo(selectUf);
        limparErroCampo(inputCidade);
        limparMensagemGeral();
        atualizarAvisoCidade();
    });
}

function atualizarAvisoCidade() {
    const aviso = document.getElementById("avisoCidade");

    if (!aviso) return;

    const cidadeOficial = nomeOficialDaCidade(dadosCadastro.cidade, dadosCadastro.uf);

    if (!dadosCadastro.cidade || !cidadeOficial) {
        aviso.hidden = true;
        return;
    }

    const texto = document.createElement("span");

    if (cidadeEstaDisponivel(cidadeOficial, dadosCadastro.uf)) {
        aviso.dataset.tipo = "ok";
        texto.textContent = `Tudo certo. ${cidadeOficial}-${dadosCadastro.uf} está disponível no Cidade360.`;
        aviso.innerHTML = ICONES_LOGIN.ok;
    } else {
        aviso.dataset.tipo = "erro";
        texto.textContent = mensagemCidadeIndisponivel;
        aviso.innerHTML = ICONES_LOGIN.erro;
    }

    aviso.appendChild(texto);
    aviso.hidden = false;
}

/*========================================================================================================

AVANÇAR / VOLTAR CADASTRO

=========================================================================================================*/

async function avancarCadastro() {
    salvarDadosDaEtapaAtual();
    limparMensagemGeral();

    if (etapaCadastro === 1) {
        // Garante a lista de cidades antes de conferir a cidade digitada
        await carregarCidadesDoBrasil();
        await carregarCidadesAtendidas();
    }

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
            renderizarEtapaCadastro();
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
        limparMensagemGeral();

        // Esperando o código: "Voltar" deixa corrigir o email antes de voltar etapa
        if (etapaCadastro === 2 && dadosCadastro.aguardandoCodigoEmail && !dadosCadastro.emailVerificado) {
            dadosCadastro.aguardandoCodigoEmail = false;
            dadosCadastro.codigoEmail = "";
        } else {
            etapaCadastro--;
        }

        renderizarEtapaCadastro();
    });
}

/*========================================================================================================

SALVAR DADOS ENTRE AS ETAPAS

=========================================================================================================*/

function salvarDadosDaEtapaAtual() {
    const nomeCadastro = document.getElementById("nomeCadastro");
    const cpfCadastro = document.getElementById("cpfCadastro");
    const ufCadastro = document.getElementById("ufCadastro");
    const cidadeCadastro = document.getElementById("cidadeCadastro");
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

    if (ufCadastro) {
        dadosCadastro.uf = ufCadastro.value;
    }

    if (cidadeCadastro) {
        dadosCadastro.cidade = normalizarEspacos(cidadeCadastro.value);
    }

    if (emailCadastro && !emailCadastro.readOnly) {
        dadosCadastro.email = emailCadastro.value.trim().toLowerCase();
    }

    if (telefoneCadastro && !telefoneCadastro.readOnly) {
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
    // O campo Cidade tem eventos próprios (prepararCampoCidade)
    const inputs = camposCadastro.querySelectorAll("input:not([readonly]):not(#cidadeCadastro)");

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
    const ufCadastro = document.getElementById("ufCadastro");
    const cidadeCadastro = document.getElementById("cidadeCadastro");
    const emailCadastro = document.getElementById("emailCadastro");
    const telefoneCadastro = document.getElementById("telefoneCadastro");
    const codigoEmailCadastro = document.getElementById("codigoEmailCadastro");
    const senhaCadastro = document.getElementById("senhaCadastro");
    const confirmarSenhaCadastro = document.getElementById("confirmarSenhaCadastro");

    if (etapaCadastro === 1) {
        limparErroCampo(nomeCadastro);
        limparErroCampo(cpfCadastro);
        limparErroCampo(ufCadastro);
        limparErroCampo(cidadeCadastro);

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

        const cidadeOficial = nomeOficialDaCidade(dadosCadastro.cidade, dadosCadastro.uf);

        if (!dadosCadastro.uf) {
            mostrarErroCampo(ufCadastro, "Selecione seu estado.");
            valido = false;
        }

        if (!dadosCadastro.cidade) {
            mostrarErroCampo(cidadeCadastro, "Informe sua cidade.");
            valido = false;
        } else if (!cidadeOficial) {
            mostrarErroCampo(cidadeCadastro, "Escolha uma cidade da lista.");
            valido = false;
        } else if (!cidadeEstaDisponivel(cidadeOficial, dadosCadastro.uf)) {
            // O aviso vermelho embaixo já explica; só destaca o campo
            atualizarAvisoCidade();

            if (cidadeCadastro) {
                cidadeCadastro.classList.add("input-erro");
                balancar(cidadeCadastro.closest(".campo"));
            }

            balancar(document.getElementById("avisoCidade"));
            valido = false;
        } else {
            dadosCadastro.cidade = cidadeOficial;
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
        if (mensagemLogin.hidden) {
            mostrarMensagem("Antes de finalizar, corrija os campos destacados.", "erro");
        }
        return;
    }

    let cadastrou = false;

    try {
        carregandoBotaoPrincipal("Cadastrando...");

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
                cidade: dadosCadastro.cidade,
                uf: dadosCadastro.uf,
                senha: dadosCadastro.senha,
                tipo_usuario: "CIDADAO",
                email_verificacao_token: dadosCadastro.emailVerificacaoToken
            })
        });

        const dados = await lerRespostaJson(resposta);

        if (!resposta.ok || !dados.sucesso) {
            mostrarMensagem(
                dados.mensagem || "Não foi possível concluir o cadastro. Revise os dados e tente novamente.",
                "erro"
            );
            return;
        }

        cadastrou = true;

        mostrarMensagem("Conta criada com sucesso! Agora você já pode fazer login.", "sucesso");

        const emailCriado = dadosCadastro.email;

        setTimeout(() => {
            voltarModoLogin();

            setTimeout(() => {
                emailInput.value = emailCriado;
                passwordInput.value = "";
                passwordInput.focus();
            }, 300);
        }, 1200);

    } catch (error) {
        console.error("Erro ao cadastrar usuário:", error);

        mostrarMensagem(
            "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
            "erro"
        );

    } finally {
        if (!cadastrou) {
            btnEntrar.disabled = false;

            if (modoCadastro) {
                rotuloBotaoPrincipal("Finalizar Cadastro");
            }
        }
    }
}

function limparDadosCadastro() {
    dadosCadastro.nome = "";
    dadosCadastro.cpf = "";
    dadosCadastro.uf = "SP";
    dadosCadastro.cidade = "";
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
        carregandoBotaoPrincipal("Enviando código...");

        const resposta = await fetch(`${API_URL}/cadastro/email/enviar-codigo`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: dadosCadastro.email
            })
        });

        const dados = await lerRespostaJson(resposta);

        if (!resposta.ok || !dados.sucesso) {
            mostrarMensagem(
                dados.mensagem || "Não foi possível enviar o código. Verifique o email informado.",
                "erro"
            );
            return false;
        }

        dadosCadastro.aguardandoCodigoEmail = true;

        renderizarEtapaCadastro();

        mostrarMensagem(
            "Enviamos um código para seu email. Digite o código para continuar.",
            "sucesso"
        );

        const codigo = document.getElementById("codigoEmailCadastro");

        if (codigo) codigo.focus();

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

        if (modoCadastro && etapaCadastro === 2) {
            rotuloBotaoPrincipal(dadosCadastro.aguardandoCodigoEmail ? "Verificar Email" : "Próximo");
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

    let confirmou = false;

    try {
        carregandoBotaoPrincipal("Verificando...");

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

        const dados = await lerRespostaJson(resposta);

        if (!resposta.ok || !dados.sucesso) {
            // Erro do código fica só embaixo do campo (sem repetir em cima)
            mostrarErroCampo(
                codigoEmailCadastro,
                dados.mensagem || "Código inválido ou expirado. Confira o código e tente novamente."
            );
            return false;
        }

        dadosCadastro.emailVerificado = true;
        dadosCadastro.emailVerificacaoToken = dados.email_verificacao_token;
        dadosCadastro.aguardandoCodigoEmail = false;

        confirmou = true;

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

        if (!confirmou && modoCadastro && etapaCadastro === 2) {
            rotuloBotaoPrincipal("Verificar Email");
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