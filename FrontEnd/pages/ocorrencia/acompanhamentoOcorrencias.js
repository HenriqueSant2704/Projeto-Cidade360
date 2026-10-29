/*========================================================================================================

ACOMPANHAMENTO DE OCORRÊNCIAS

- Listagem real das ocorrências (cidadão vê as dele, admin vê todas)
- Filtros por status, busca e paginação
- Detalhes em tela cheia: a lista some e os detalhes aparecem no lugar
- Admin: lixeira no card, "Próximo passo" nos detalhes e cancelamento com motivo
- Atualização automática da listagem após novo registro

Fluxo de status (o status "pendente" NÃO existe mais):
Recebido > Em análise > Em andamento > Resolvido
Cancelado (pode acontecer antes de resolver)

Este arquivo substitui o adminOcorrencias.js, que pode ser apagado.

=========================================================================================================*/

(() => {
    "use strict";


    /*====================================================================================================

    CONFIGURAÇÃO

    ====================================================================================================*/

    const API_OCORRENCIAS_ACOMPANHAMENTO = "/api/ocorrencias";
    const API_USUARIO_ACOMPANHAMENTO = "/api/me";
    const LOGIN_PAGE_ACOMPANHAMENTO = "/FrontEnd/pages/login/login.html";

    // Computador e notebook: 9 cards (3 linhas de 3). Celular e tablet: 5.
    // Mesmo ponto de corte do menu lateral (global.css). Vale para cidadão e admin.
    const TELA_COMPUTADOR = window.matchMedia("(min-width: 1025px)");
    const POR_PAGINA_COMPUTADOR = 9;
    const POR_PAGINA_CELULAR = 5;
    const TEMPO_BUSCA = 350;

    // PONTE TEMPORÁRIA
    // O backend ainda usa os nomes antigos: não entende ?status=recebidos / ?status=em_analise
    // e o resumo não manda "recebidos" nem "em_analise" separados.
    // Enquanto isso, o front busca a lista sem filtro de status, filtra e conta aqui.
    // Quando o backend for ajustado, troque para false e tudo volta a ser feito no servidor.
    const PONTE_STATUS_ANTIGOS = true;
    const FILTROS_NO_NAVEGADOR = ["recebidos", "em_analise"];
    const LIMITE_PONTE = 50;        // itens por página ao buscar tudo (diminua se o backend recusar)
    const MAX_PAGINAS_PONTE = 40;   // trava de segurança

    // Nome, ícone e posição de cada status (compartilhado com o Painel, em icones.js).
    // As cores vêm do CSS: .st[data-st="..."]
    const { STATUS, icone, iconeCategoria, pilula, PINO, tempoRelativo, iniciais } = window.Cidade360;

    // O que o cidadão vê no quadro "Agora" dos detalhes.
    const AGORA_CIDADAO = {
        recebido: ["Recebemos sua ocorrência", "A prefeitura vai analisar o problema em breve. Você recebe uma notificação a cada mudança de status."],
        em_analise: ["A prefeitura está analisando", "A equipe está avaliando o problema e definindo quem vai atender."],
        em_andamento: ["Equipe em atendimento", "Uma equipe foi designada e está trabalhando para resolver o problema no local."],
        resolvido: ["Problema resolvido", "Obrigado por ajudar a cuidar da cidade! Se o problema voltar, registre uma nova ocorrência."],
        cancelado: ["Ocorrência cancelada", "Veja o motivo acima. Se o problema continuar, você pode registrar uma nova ocorrência."]
    };

    const FLUXO = [
        "recebido",
        "em_analise",
        "em_andamento",
        "resolvido"
    ];

    // Para cada status, qual é o próximo passo que o admin pode dar.
    const PROXIMA_ETAPA = {
        recebido: {
            status: "em_analise",
            botao: "Aceitar ocorrência",
            sucesso: "Ocorrência aceita",
            mensagemPadrao: "A prefeitura aceitou sua ocorrência e está analisando o problema.",
            ajuda: "Revise as informações acima. Ao aceitar, o cidadão é avisado de que a prefeitura está analisando o problema."
        },
        em_analise: {
            status: "em_andamento",
            botao: "Iniciar atendimento",
            sucesso: "Atendimento iniciado",
            mensagemPadrao: "Uma equipe foi designada e o atendimento já está em andamento.",
            ajuda: "Use quando uma equipe for designada para resolver o problema no local."
        },
        em_andamento: {
            status: "resolvido",
            botao: "Marcar como resolvida",
            sucesso: "Ocorrência resolvida",
            mensagemPadrao: "O problema foi resolvido pela prefeitura. Obrigado por ajudar a cuidar da cidade!",
            ajuda: "Use quando o serviço for concluído. Depois disso o status não pode mais ser alterado."
        }
    };

    // Títulos e textos usados no histórico quando o banco não manda observação.
    const HISTORICO_PADRAO = {
        recebido: {
            titulo: "Ocorrência registrada",
            descricao: "Sua solicitação foi recebida pelo sistema e aguarda triagem."
        },
        em_analise: {
            titulo: "Ocorrência aceita pela prefeitura",
            descricao: PROXIMA_ETAPA.recebido.mensagemPadrao
        },
        em_andamento: {
            titulo: "Atendimento iniciado",
            descricao: PROXIMA_ETAPA.em_analise.mensagemPadrao
        },
        resolvido: {
            titulo: "Ocorrência resolvida",
            descricao: PROXIMA_ETAPA.em_andamento.mensagemPadrao
        },
        cancelado: {
            titulo: "Ocorrência cancelada",
            descricao: "A ocorrência foi cancelada pela prefeitura."
        }
    };

    const MOTIVOS_CANCELAMENTO = {
        trote: "Trote ou sem fundamento",
        duplicada: "Ocorrência duplicada",
        fora_competencia: "Fora da competência da prefeitura",
        outro: "Outro motivo"
    };

    // Valor enviado no ?status= da listagem -> status que deve voltar
    const FILTRO_PARA_STATUS = {
        recebidos: "recebido",
        em_analise: "em_analise",
        em_andamento: "em_andamento",
        resolvidos: "resolvido",
        cancelados: "cancelado"
    };


    /*====================================================================================================

    ELEMENTOS DA TELA

    ====================================================================================================*/

    const telaOcorrencias = document.getElementById("tela-ocorrencias");
    const telaFormulario = document.getElementById("tela-formulario");
    const telaDetalhes = document.getElementById("tela-detalhes");
    const containerCards = document.querySelector(".container-cards-ocorrencia");
    const botoesFiltro = document.querySelectorAll(".filtro-ocorrencia button");
    const campoPesquisa = document.querySelector(".campo-pesquisa input");

    const numeroTotal = document.querySelector(".numero.total");
    const numeroRecebidos = document.querySelector(".numero.recebidos");
    const numeroEmAnalise = document.querySelector(".numero.emanalise");
    const numeroAndamento = document.querySelector(".numero.andamento");
    const numeroResolvidas = document.querySelector(".numero.resolvido");
    const numeroCancelados = document.querySelector(".numero.cancelado");

    const tituloPaginaOcorrencias = document.querySelector("#tela-ocorrencias .titulo-lista");
    const descricaoPaginaOcorrencias = document.querySelector("#tela-ocorrencias .descricao-lista");
    const btnNovaOcorrencia = document.getElementById("btn-nova-ocorrencia");
    const areaToast = document.getElementById("toastOcorrencias");

    // Criado pelo próprio JS
    let dialogoEl = null;


    /*====================================================================================================

    ESTADO

    ====================================================================================================*/

    const estado = {
        usuario: null,
        statusDisponiveis: [],

        ocorrencias: [],
        pagina: 1,
        totalPaginas: 1,
        total: 0,
        filtroStatus: "",
        busca: "",
        requisicaoLista: 0,
        debounceBusca: null,

        atualizandoStatus: false,

        detalhes: {
            id: null,
            ocorrencia: null,
            requisicao: 0,
            mapa: null,
            rolagemLista: 0,
            timerTela: null
        },

        dialogo: {
            aberto: false,
            ocupado: false,
            aoConfirmar: null,
            focoAnterior: null
        }
    };


    /*====================================================================================================

    ÍCONES (SVG)

    ====================================================================================================*/

    // Os desenhos ficam em /FrontEnd/pages/global/icones.js (mesmos do Painel).
    const ICONES = {
        lixeira: icone("lixeira", 16),
        lixeiraGrande: icone("lixeira", 22),
        bloqueio: icone("bloqueio", 16),
        bloqueioGrande: icone("bloqueio", 22),
        fechar: icone("x", 18),
        check: icone("check", 16),
        seta: icone("direita", 14),
        setaVer: icone("direita", 15),
        voltar: icone("voltar", 17),
        predio: icone("predio", 14),
        etiqueta: icone("etiqueta", 15),
        local: icone("local", 15),
        localGrande: icone("local", 18),
        alerta: icone("alerta", 22),
        anterior: icone("voltar", 16),
        proxima: icone("direita", 16)
    };


    /*====================================================================================================

    TOKEN E AUTENTICAÇÃO

    ====================================================================================================*/

    function obterToken() {
        return (
            localStorage.getItem("cidade360_token") ||
            sessionStorage.getItem("cidade360_token")
        );
    }

    function limparSessao() {
        ["cidade360_token", "cidade360_usuario", "cidade360_id"].forEach((chave) => {
            localStorage.removeItem(chave);
            sessionStorage.removeItem(chave);
        });
    }

    function redirecionarParaLogin() {
        limparSessao();
        window.location.replace(LOGIN_PAGE_ACOMPANHAMENTO);
    }

    async function fetchAutenticado(url, opcoes = {}) {
        const token = obterToken();

        if (!token) {
            redirecionarParaLogin();
            throw new Error("Sessão não encontrada.");
        }

        const headers = new Headers(opcoes.headers || {});
        headers.set("Authorization", `Bearer ${token}`);

        const resposta = await fetch(url, {
            ...opcoes,
            headers,
            cache: "no-store"
        });

        if (resposta.status === 401) {
            redirecionarParaLogin();
            throw new Error("Sua sessão expirou.");
        }

        return resposta;
    }

    async function lerResposta(resposta) {
        const corpo = await resposta.text();

        if (!corpo) {
            return null;
        }

        try {
            return JSON.parse(corpo);
        } catch (error) {
            return {
                sucesso: false,
                mensagem: corpo
            };
        }
    }


    /*====================================================================================================

    UTILITÁRIOS

    ====================================================================================================*/

    // Evita que um texto digitado pelo cidadão vire HTML na tela.
    function escaparHtml(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Minúsculas e sem acento: "Em Análise" e "em analise" viram a mesma coisa.
    function normalizarTexto(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    }

    function formatarData(valor, incluirHora = false) {
        if (!valor) {
            return "--/--/----";
        }

        const data = new Date(valor);

        if (Number.isNaN(data.getTime())) {
            return "--/--/----";
        }

        if (incluirHora) {
            return data.toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short"
            });
        }

        return data.toLocaleDateString("pt-BR");
    }

    function formatarCodigo(ocorrencia) {
        const id = Number(ocorrencia?.id) || 0;

        const data = new Date(
            ocorrencia?.data_criacao ||
            ocorrencia?.data_ocorrencia ||
            Date.now()
        );

        const ano = Number.isNaN(data.getTime())
            ? new Date().getFullYear()
            : data.getFullYear();

        return `OC-${ano}-${String(id).padStart(4, "0")}`;
    }

    function temCoordenadas(ocorrencia) {
        return (
            ocorrencia?.latitude !== null &&
            ocorrencia?.latitude !== undefined &&
            ocorrencia?.longitude !== null &&
            ocorrencia?.longitude !== undefined &&
            Number.isFinite(Number(ocorrencia.latitude)) &&
            Number.isFinite(Number(ocorrencia.longitude))
        );
    }

    function obterEndereco(ocorrencia) {
        const partes = [
            ocorrencia?.endereco,
            ocorrencia?.bairro,
            ocorrencia?.cidade
        ]
            .map((item) => String(item || "").trim())
            .filter(Boolean)
            // Não repete o bairro/cidade se o endereço digitado já tiver ("Praça X - Centro" + "Centro")
            .filter((item, indice, lista) =>
                !lista.slice(0, indice).some((anterior) => normalizarTexto(anterior).includes(normalizarTexto(item)))
            );

        if (partes.length > 0) {
            return partes.join(" - ");
        }

        if (temCoordenadas(ocorrencia)) {
            return `Localização: ${Number(ocorrencia.latitude).toFixed(5)}, ${Number(ocorrencia.longitude).toFixed(5)}`;
        }

        return "Localização não informada";
    }

    // Administrador sem a permissão "Ocorrências" vê só as dele, como cidadão
    function ehAdministrador() {
        const permissoes = estado.usuario?.permissoes;

        return String(estado.usuario?.tipo_usuario || "")
            .trim()
            .toUpperCase() === "ADMIN"
            && (!permissoes || permissoes.principal === true || permissoes.ocorrencias === true);
    }


    /*====================================================================================================

    STATUS

    ====================================================================================================*/

    // Transforma o nome que vem do banco em uma chave fixa.
    // "Em atendimento" (nome antigo) e "Em andamento" viram a mesma chave.
    function obterChaveStatus(status) {
        const valor = normalizarTexto(status);

        if (valor === "recebido") {
            return "recebido";
        }

        // "pendente" foi descartado. Registros antigos aparecem como "Em análise".
        if (valor === "em analise" || valor === "pendente") {
            return "em_analise";
        }

        if (valor === "em andamento" || valor === "em atendimento") {
            return "em_andamento";
        }

        if (valor === "resolvido") {
            return "resolvido";
        }

        if (valor === "cancelado") {
            return "cancelado";
        }

        return null;
    }

    function obterConfigStatus(status) {
        const chave = obterChaveStatus(status);

        if (chave) {
            return {
                chave,
                ...STATUS[chave]
            };
        }

        return {
            chave: null,
            ...STATUS.recebido,
            nome: status || STATUS.recebido.nome
        };
    }

    function podeCancelar(chave) {
        return chave === "recebido" || chave === "em_analise" || chave === "em_andamento";
    }

    // Procura o id do status na lista que veio de /api/ocorrencias/status.
    function obterIdStatus(chave) {
        const encontrado = estado.statusDisponiveis.find(
            (status) => obterChaveStatus(status.nome) === chave
        );

        return encontrado ? Number(encontrado.id) || null : null;
    }

    function obterFiltroBotao(botao) {
        if (botao?.dataset.filtro !== undefined) {
            return botao.dataset.filtro;
        }

        const texto = normalizarTexto(botao?.textContent);

        if (texto === "recebidos") return "recebidos";
        if (texto === "em analise") return "em_analise";
        if (texto === "em andamento") return "em_andamento";
        if (texto === "resolvidos") return "resolvidos";
        if (texto === "cancelados") return "cancelados";

        return "";
    }


    /*====================================================================================================

    USUÁRIO

    ====================================================================================================*/

    function obterUsuarioArmazenado() {
        const valor =
            localStorage.getItem("cidade360_usuario") ||
            sessionStorage.getItem("cidade360_usuario");

        if (!valor) {
            return null;
        }

        try {
            return JSON.parse(valor);
        } catch (error) {
            return null;
        }
    }

    async function carregarUsuario() {
        const usuarioArmazenado = obterUsuarioArmazenado();

        if (usuarioArmazenado?.tipo_usuario) {
            estado.usuario = usuarioArmazenado;
            configurarInterfacePorPerfil();
            return;
        }

        const resposta = await fetchAutenticado(API_USUARIO_ACOMPANHAMENTO, {
            method: "GET"
        });

        const dados = await lerResposta(resposta);

        if (!resposta.ok || !dados?.sucesso || !dados?.usuario) {
            throw new Error(
                dados?.mensagem ||
                "Não foi possível identificar o usuário."
            );
        }

        estado.usuario = dados.usuario;
        configurarInterfacePorPerfil();
    }

    function configurarInterfacePorPerfil() {
        if (!ehAdministrador()) {
            return;
        }

        document.body.classList.add("modo-admin");

        if (tituloPaginaOcorrencias) {
            tituloPaginaOcorrencias.innerHTML =
                `Todas as Ocorrências <span class="selo-prefeitura">${ICONES.predio}Prefeitura</span>`;
        }

        if (descricaoPaginaOcorrencias) {
            descricaoPaginaOcorrencias.textContent =
                "Analise, atualize o status e mantenha o cidadão informado em cada etapa do atendimento.";
        }

        if (btnNovaOcorrencia) {
            btnNovaOcorrencia.hidden = true;
        }

        if (campoPesquisa) {
            campoPesquisa.placeholder = "Buscar ocorrências";
        }
    }


    /*====================================================================================================

    STATUS DISPONÍVEIS (id de cada status no banco)

    ====================================================================================================*/

    async function carregarStatusDisponiveis() {
        const resposta = await fetchAutenticado(
            `${API_OCORRENCIAS_ACOMPANHAMENTO}/status`,
            { method: "GET" }
        );

        const dados = await lerResposta(resposta);

        if (!resposta.ok || !dados?.sucesso || !Array.isArray(dados.status)) {
            throw new Error(
                dados?.mensagem ||
                "Não foi possível carregar os status."
            );
        }

        estado.statusDisponiveis = dados.status;
    }


    /*====================================================================================================

    RESUMO (contadores do topo)

    ====================================================================================================*/

    // Se o backend não mandar o campo, mostra "-" em vez de um número inventado.
    function definirNumeroResumo(elemento, valor) {
        if (!elemento) {
            return;
        }

        if (valor === undefined || valor === null) {
            elemento.textContent = "-";
            return;
        }

        elemento.textContent = String(Number(valor) || 0);
    }

    async function carregarResumo() {
        const url = ehAdministrador()
            ? `${API_OCORRENCIAS_ACOMPANHAMENTO}/admin/resumo`
            : `${API_OCORRENCIAS_ACOMPANHAMENTO}/resumo`;

        const resposta = await fetchAutenticado(url, { method: "GET" });
        const dados = await lerResposta(resposta);

        if (!resposta.ok || !dados?.sucesso || !dados?.resumo) {
            throw new Error(
                dados?.mensagem ||
                "Não foi possível carregar o resumo."
            );
        }

        const resumo = { ...dados.resumo };

        // PONTE TEMPORÁRIA: o backend ainda não conta "recebidos" e "em_analise" separados.
        // Enquanto isso, o front conta a partir da lista.
        if (
            PONTE_STATUS_ANTIGOS &&
            (resumo.recebidos === undefined || resumo.em_analise === undefined)
        ) {
            try {
                const todas = await buscarTodasOcorrencias({ busca: "" });

                resumo.recebidos = todas.filter((o) => obterChaveStatus(o.status) === "recebido").length;
                resumo.em_analise = todas.filter((o) => obterChaveStatus(o.status) === "em_analise").length;

            } catch (error) {
                console.error("Erro ao contar recebidos e em análise:", error);
            }
        }

        definirNumeroResumo(numeroTotal, resumo.total);
        definirNumeroResumo(numeroRecebidos, resumo.recebidos);
        definirNumeroResumo(numeroEmAnalise, resumo.em_analise ?? resumo.pendentes);
        definirNumeroResumo(numeroAndamento, resumo.em_andamento);
        definirNumeroResumo(numeroResolvidas, resumo.resolvidas);
        definirNumeroResumo(numeroCancelados, resumo.canceladas);
    }


    /*====================================================================================================

    LISTAGEM

    ====================================================================================================*/

    function limitePorPagina() {
        return TELA_COMPUTADOR.matches ? POR_PAGINA_COMPUTADOR : POR_PAGINA_CELULAR;
    }

    // Girou o celular ou mudou o tamanho da janela: troca 9 por 5 (ou o
    // contrário) e recarrega mantendo na tela a ocorrência que estava primeiro.
    function registrarMudancaDeTela() {
        TELA_COMPUTADOR.addEventListener("change", (event) => {
            const limiteAnterior = event.matches ? POR_PAGINA_CELULAR : POR_PAGINA_COMPUTADOR;
            const primeiroItem = (estado.pagina - 1) * limiteAnterior;

            estado.pagina = Math.floor(primeiroItem / limitePorPagina()) + 1;
            carregarLista();
        });
    }

    function construirUrlListagem({
        pagina = estado.pagina,
        limite = limitePorPagina(),
        status = estado.filtroStatus,
        busca = estado.busca
    } = {}) {
        const base = ehAdministrador()
            ? `${API_OCORRENCIAS_ACOMPANHAMENTO}/admin`
            : API_OCORRENCIAS_ACOMPANHAMENTO;

        const parametros = new URLSearchParams();

        parametros.set("pagina", String(pagina));
        parametros.set("limite", String(limite));

        if (status) {
            parametros.set("status", status);
        }

        if (busca) {
            parametros.set("busca", busca);
        }

        return `${base}?${parametros.toString()}`;
    }

    // Busca uma página da API e devolve { ocorrencias, paginacao }.
    async function buscarPagina(url) {
        const resposta = await fetchAutenticado(url, { method: "GET" });
        const dados = await lerResposta(resposta);

        if (!resposta.ok || !dados?.sucesso || !Array.isArray(dados.ocorrencias)) {
            throw new Error(
                dados?.mensagem ||
                "Não foi possível carregar as ocorrências."
            );
        }

        return {
            ocorrencias: dados.ocorrencias,
            paginacao: dados.paginacao || {}
        };
    }

    // PONTE TEMPORÁRIA: busca todas as páginas, sem filtro de status,
    // para o front conseguir filtrar e contar Recebido / Em análise.
    async function buscarTodasOcorrencias({ busca = estado.busca } = {}) {
        const todas = [];
        let pagina = 1;
        let totalPaginas = 1;

        do {
            const dados = await buscarPagina(
                construirUrlListagem({ pagina, limite: LIMITE_PONTE, status: "", busca })
            );

            todas.push(...dados.ocorrencias);
            totalPaginas = Number(dados.paginacao.total_paginas) || 1;
            pagina++;

        } while (pagina <= totalPaginas && pagina <= MAX_PAGINAS_PONTE);

        return todas;
    }

    // PONTE TEMPORÁRIA: filtra e pagina no navegador.
    async function buscarListaFiltradaNoNavegador() {
        const esperado = FILTRO_PARA_STATUS[estado.filtroStatus];

        const filtradas = (await buscarTodasOcorrencias()).filter(
            (ocorrencia) => obterChaveStatus(ocorrencia.status) === esperado
        );

        const limite = limitePorPagina();
        const totalPaginas = Math.max(1, Math.ceil(filtradas.length / limite));
        const pagina = Math.min(Math.max(1, estado.pagina), totalPaginas);

        return {
            ocorrencias: filtradas.slice(
                (pagina - 1) * limite,
                pagina * limite
            ),
            paginacao: {
                pagina,
                total_paginas: totalPaginas,
                total: filtradas.length
            }
        };
    }

    // Antes, se a lista estava carregando, um clique no filtro era ignorado
    // (o botão ficava ativo, mas a lista não mudava). Agora toda chamada é feita e
    // só a resposta mais recente é desenhada.
    async function carregarLista() {
        const requisicao = ++estado.requisicaoLista;

        renderizarCarregando();

        try {
            const filtrarNoNavegador =
                PONTE_STATUS_ANTIGOS &&
                FILTROS_NO_NAVEGADOR.includes(estado.filtroStatus);

            const dados = filtrarNoNavegador
                ? await buscarListaFiltradaNoNavegador()
                : await buscarPagina(construirUrlListagem());

            if (requisicao !== estado.requisicaoLista) {
                return;
            }

            estado.ocorrencias = dados.ocorrencias;
            estado.pagina = Number(dados.paginacao.pagina) || 1;
            estado.totalPaginas = Number(dados.paginacao.total_paginas) || 1;
            estado.total = Number(dados.paginacao.total) || 0;

            avisarSeFiltroFoiIgnorado();
            renderizarLista();

        } catch (error) {
            if (requisicao !== estado.requisicaoLista) {
                return;
            }

            console.error("Erro ao carregar ocorrências:", error);

            renderizarErroLista(
                error.message ||
                "Não foi possível carregar as ocorrências."
            );
        }
    }

    // Ajuda a achar problema no backend: se pedimos "recebidos" e voltou
    // ocorrência com outro status, o filtro não foi aplicado lá.
    function avisarSeFiltroFoiIgnorado() {
        const esperado = FILTRO_PARA_STATUS[estado.filtroStatus];

        if (!esperado) {
            return;
        }

        const fora = estado.ocorrencias.filter(
            (ocorrencia) => obterChaveStatus(ocorrencia.status) !== esperado
        );

        if (fora.length > 0) {
            console.warn(
                `[Cidade360] O backend não aplicou o filtro "status=${estado.filtroStatus}". ` +
                `Vieram ${fora.length} ocorrência(s) com outro status. ` +
                "Verifique se a rota de listagem aceita esse valor."
            );
        }
    }

    function renderizarCarregando() {
        if (!containerCards) {
            return;
        }

        // Esqueleto dos cards enquanto a lista carrega
        containerCards.innerHTML = Array.from({ length: 3 }, () =>
            '<div class="card-oc esqueleto" aria-hidden="true"></div>'
        ).join("") + '<span class="sr">Carregando ocorrências...</span>';
    }

    function renderizarErroLista(mensagem) {
        if (!containerCards) {
            return;
        }

        containerCards.innerHTML = `
            <div class="vazio">
                <span class="emoji">⚠️</span>
                <strong>Não foi possível carregar as ocorrências.</strong>
                ${escaparHtml(mensagem)}
                <br>
                <button class="btn-secundario" data-acao-lista="tentar-novamente" type="button">
                    Tentar novamente
                </button>
            </div>
        `;
    }

    function renderizarListaVazia() {
        if (!containerCards) {
            return;
        }

        const existeFiltro = Boolean(estado.filtroStatus || estado.busca);

        const titulo = existeFiltro
            ? "Nenhuma ocorrência por aqui"
            : ehAdministrador()
                ? "Nenhuma ocorrência registrada ainda"
                : "Você ainda não possui ocorrências registradas";

        const texto = estado.busca
            ? "Tente buscar com outras palavras."
            : existeFiltro
                ? "Nenhuma ocorrência com esse status no momento."
                : ehAdministrador()
                    ? "Quando um cidadão registrar uma ocorrência, ela aparece aqui."
                    : "Registre uma nova ocorrência para acompanhar o atendimento por aqui.";

        const botao = !existeFiltro && !ehAdministrador()
            ? `
                <br>
                <button class="btn-primario" data-acao-lista="primeira-ocorrencia" type="button">
                    ${icone("mais", 18)}Registrar nova ocorrência
                </button>
            `
            : "";

        containerCards.innerHTML = `
            <div class="vazio">
                <span class="emoji">${estado.busca ? "🔎" : "📭"}</span>
                <strong>${titulo}</strong>
                ${texto}
                ${botao}
            </div>
        `;
    }

    function montarCard(ocorrencia, indice = 0) {
        const id = Number(ocorrencia.id) || 0;
        const config = obterConfigStatus(ocorrencia.status);
        const chave = config.chave || "recebido";
        const passo = STATUS[chave]?.passo ?? 0;
        const codigo = formatarCodigo(ocorrencia);
        const data = tempoRelativo(ocorrencia.data_criacao || ocorrencia.data_ocorrencia) || formatarData(ocorrencia.data_criacao);
        const endereco = obterEndereco(ocorrencia);
        const admin = ehAdministrador();
        const titulo = ocorrencia.titulo || "Ocorrência";

        const cidadao = admin && ocorrencia.usuario_nome
            ? `<div class="cidadao-linha"><i>${escaparHtml(iniciais(ocorrencia.usuario_nome))}</i>${escaparHtml(ocorrencia.usuario_nome)}</div>`
            : "";

        const lixeira = admin && podeCancelar(config.chave)
            ? `
                <button class="btn-lixeira" type="button" data-cancelar-id="${id}"
                    title="Cancelar ocorrência" aria-label="Cancelar ocorrência ${codigo}">
                    ${ICONES.lixeira}
                </button>
            `
            : "";

        // Cancelada não tem progresso: a barrinha fica vazia.
        const progresso = [0, 1, 2, 3]
            .map((etapa) => `<i class="${chave !== "cancelado" && etapa <= passo ? "on" : ""}"></i>`)
            .join("");

        return `
            <article class="card-oc st${chave === "cancelado" ? " cancelada" : ""}" data-st="${chave}"
                data-id="${id}" data-detalhes-id="${id}" tabindex="0" role="link"
                aria-label="${escaparHtml(titulo)}, ${escaparHtml(config.nome)}" style="--i:${indice}">

                <div class="topo">
                    <span class="ico">${iconeCategoria(ocorrencia.categoria, 22)}</span>
                    ${pilula(chave)}
                </div>

                <h3>${escaparHtml(titulo)}</h3>

                <div class="infos">
                    <div class="info">${ICONES.etiqueta}<span>${escaparHtml(ocorrencia.categoria || "Sem categoria")}</span></div>
                    <div class="info">${ICONES.local}<span>${escaparHtml(endereco)}</span></div>
                    ${cidadao}
                </div>

                <div class="mini-progresso" aria-hidden="true">${progresso}</div>

                <div class="rodape">
                    <div>
                        <div class="codigo">${codigo}</div>
                        <div class="data">${escaparHtml(data)}</div>
                    </div>

                    <div class="acoes-card">
                        ${lixeira}
                        <span class="ver">Ver detalhes ${ICONES.setaVer}</span>
                    </div>
                </div>

            </article>
        `;
    }

    function renderizarLista() {
        if (!containerCards) {
            return;
        }

        if (estado.ocorrencias.length === 0) {
            renderizarListaVazia();
            return;
        }

        containerCards.innerHTML =
            estado.ocorrencias.map((ocorrencia, indice) => montarCard(ocorrencia, indice)).join("") +
            (estado.totalPaginas > 1 || estado.total > limitePorPagina()
                ? `<div class="paginacao">${montarPaginacao()}</div>`
                : "");
    }

    function montarPaginacao() {
        const pagina = estado.pagina;
        const totalPaginas = estado.totalPaginas;
        const limite = limitePorPagina();

        const inicio = estado.total === 0
            ? 0
            : ((pagina - 1) * limite) + 1;

        const fim = Math.min(pagina * limite, estado.total);

        return `
            <span class="paginacao-informacao">
                Exibindo ${inicio}-${fim} de ${estado.total}
            </span>

            <div class="paginacao-botoes">
                <button class="btn-icone" data-acao-lista="pagina-anterior" type="button"
                    aria-label="Página anterior" ${pagina <= 1 ? "disabled" : ""}>
                    ${ICONES.anterior}
                </button>

                <span>Página ${pagina} de ${totalPaginas}</span>

                <button class="btn-icone" data-acao-lista="proxima-pagina" type="button"
                    aria-label="Próxima página" ${pagina >= totalPaginas ? "disabled" : ""}>
                    ${ICONES.proxima}
                </button>
            </div>
        `;
    }

    function rolarParaLista() {
        document
            .querySelector("#tela-ocorrencias .barra-filtros")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Um único listener para toda a lista (cards, lixeira, paginação e botões de estado).
    function registrarEventosLista() {
        if (!containerCards) {
            return;
        }

        containerCards.addEventListener("click", (event) => {
            const lixeira = event.target.closest("[data-cancelar-id]");

            if (lixeira) {
                event.stopPropagation();
                iniciarCancelamento(Number(lixeira.dataset.cancelarId));
                return;
            }

            const detalhes = event.target.closest("[data-detalhes-id]");

            if (detalhes) {
                event.stopPropagation();
                abrirDetalhes(Number(detalhes.dataset.detalhesId));
                return;
            }

            const acao = event.target.closest("[data-acao-lista]")?.dataset.acaoLista;

            if (acao === "tentar-novamente") {
                carregarLista();
            }

            if (acao === "primeira-ocorrencia") {
                btnNovaOcorrencia?.click();
            }

            if (acao === "pagina-anterior" && estado.pagina > 1) {
                estado.pagina--;
                carregarLista();
                rolarParaLista();
            }

            if (acao === "proxima-pagina" && estado.pagina < estado.totalPaginas) {
                estado.pagina++;
                carregarLista();
                rolarParaLista();
            }
        });

        // O card inteiro abre os detalhes: Enter ou espaço também funcionam.
        containerCards.addEventListener("keydown", (event) => {
            const card = event.target.closest?.(".card-oc[data-detalhes-id]");

            if (card && event.target === card && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                abrirDetalhes(Number(card.dataset.detalhesId));
            }
        });
    }


    /*====================================================================================================

    FILTROS E BUSCA

    ====================================================================================================*/

    function marcarFiltro(botaoAtivo) {
        botoesFiltro.forEach((item) => {
            item.classList.toggle("ativo", item === botaoAtivo);
            item.setAttribute("aria-pressed", String(item === botaoAtivo));
        });
    }

    function registrarFiltros() {
        botoesFiltro.forEach((botao) => {
            botao.addEventListener("click", () => {
                marcarFiltro(botao);

                estado.filtroStatus = obterFiltroBotao(botao);
                estado.pagina = 1;

                carregarLista();
            });
        });

        campoPesquisa?.addEventListener("input", () => {
            clearTimeout(estado.debounceBusca);

            estado.debounceBusca = setTimeout(() => {
                estado.busca = String(campoPesquisa.value || "").trim().slice(0, 100);
                estado.pagina = 1;
                carregarLista();
            }, TEMPO_BUSCA);
        });
    }


    /*====================================================================================================

    OVERLAY DO DIÁLOGO (abrir e fechar com animação)

    ====================================================================================================*/

    function mostrarOverlay(elemento) {
        elemento.hidden = false;
    }

    function esconderOverlay(elemento) {
        const fundo = elemento.querySelector(".fundo");

        fundo?.classList.add("fechando");
        elemento.querySelector(".dialogo")?.classList.add("saindo");

        setTimeout(() => {
            elemento.hidden = true;
            fundo?.classList.remove("fechando");
            elemento.querySelector(".dialogo")?.classList.remove("saindo");
        }, 220);
    }

    function atualizarTravaDeRolagem() {
        document.body.classList.toggle("dialogo-aberto", estado.dialogo.aberto);
    }


    /*====================================================================================================

    TELA DE DETALHES

    Igual era antes: a lista some e os detalhes aparecem no lugar.
    O botão "Voltar para a lista" (ou a tecla Esc) faz o caminho de volta.

    ====================================================================================================*/

    function detalhesVisiveis() {
        return Boolean(telaDetalhes) && !telaDetalhes.classList.contains("oculto");
    }

    // Mesma animação que o ocorrencia.js usa para abrir o formulário.
    function trocarTela(saindo, entrando, aoTerminar) {
        clearTimeout(estado.detalhes.timerTela);

        [saindo, entrando].forEach((tela) => {
            tela.classList.remove("animar-entrada", "animar-saida");
        });

        saindo.classList.add("animar-saida");

        estado.detalhes.timerTela = setTimeout(() => {
            saindo.classList.add("oculto");
            saindo.classList.remove("animar-saida");

            entrando.classList.remove("oculto");
            entrando.classList.add("animar-entrada");

            aoTerminar?.();
        }, 280);
    }

    // Um único listener para tudo que tem dentro da tela de detalhes.
    function registrarEventosDetalhes() {
        if (!telaDetalhes) {
            return;
        }

        telaDetalhes.addEventListener("click", (event) => {
            const alvo = event.target.closest("[data-acao]");

            if (!alvo) {
                return;
            }

            switch (alvo.dataset.acao) {
                case "voltar-lista":
                    voltarParaLista();
                    break;
                case "avancar":
                    avancarStatus(alvo);
                    break;
                case "cancelar":
                    iniciarCancelamento(estado.detalhes.id);
                    break;
                case "ver-foto":
                    abrirFoto(alvo.dataset.src);
                    break;
                case "tentar-novamente":
                    abrirDetalhes(estado.detalhes.id);
                    break;
            }
        });

        telaDetalhes.addEventListener("input", (event) => {
            if (event.target.id === "admin-mensagem") {
                const contador = telaDetalhes.querySelector('[data-contador="admin-mensagem"]');

                if (contador) {
                    contador.textContent = `${event.target.value.length}/1000`;
                }
            }
        });
    }

    async function buscarOcorrencia(id) {
        const resposta = await fetchAutenticado(
            `${API_OCORRENCIAS_ACOMPANHAMENTO}/${id}`,
            { method: "GET" }
        );

        const dados = await lerResposta(resposta);

        if (!resposta.ok || !dados?.sucesso || !dados?.ocorrencia) {
            throw new Error(
                dados?.mensagem ||
                "Não foi possível carregar os detalhes."
            );
        }

        return dados.ocorrencia;
    }

    async function abrirDetalhes(id) {
        if (!telaDetalhes || !telaOcorrencias || !Number.isInteger(id) || id <= 0) {
            return;
        }

        const requisicao = ++estado.detalhes.requisicao;

        estado.detalhes.id = id;
        estado.detalhes.ocorrencia = null;

        destruirMapa();
        telaDetalhes.innerHTML = renderCarregandoDetalhes();

        if (!detalhesVisiveis()) {
            estado.detalhes.rolagemLista = window.scrollY;

            trocarTela(telaOcorrencias, telaDetalhes, () => {
                window.scrollTo({ top: 0, behavior: "smooth" });

                // O Leaflet precisa saber o tamanho real depois que a tela aparece.
                estado.detalhes.mapa?.invalidateSize();
            });
        }

        try {
            const ocorrencia = await buscarOcorrencia(id);

            if (requisicao !== estado.detalhes.requisicao) {
                return;
            }

            estado.detalhes.ocorrencia = ocorrencia;
            renderizarDetalhes(ocorrencia);

        } catch (error) {
            if (requisicao !== estado.detalhes.requisicao) {
                return;
            }

            console.error("Erro ao abrir detalhes:", error);
            telaDetalhes.innerHTML = renderErroDetalhes(error.message);
        }
    }

    // Recarrega os dados sem mostrar o "carregando" de novo (usado depois de mudar o status).
    async function recarregarDetalhes(id) {
        const requisicao = ++estado.detalhes.requisicao;

        try {
            const ocorrencia = await buscarOcorrencia(id);

            if (requisicao !== estado.detalhes.requisicao || estado.detalhes.id !== id) {
                return;
            }

            estado.detalhes.ocorrencia = ocorrencia;
            renderizarDetalhes(ocorrencia);

        } catch (error) {
            console.error("Erro ao atualizar detalhes:", error);
        }
    }

    function voltarParaLista() {
        if (!telaDetalhes || !telaOcorrencias || estado.detalhes.id === null) {
            return;
        }

        estado.detalhes.id = null;
        estado.detalhes.ocorrencia = null;
        estado.detalhes.requisicao++;

        trocarTela(telaDetalhes, telaOcorrencias, () => {
            destruirMapa();
            telaDetalhes.innerHTML = "";

            // Volta para o ponto da lista onde o usuário estava.
            window.scrollTo({ top: estado.detalhes.rolagemLista, behavior: "auto" });
        });
    }

    function renderBarraVoltar() {
        return `
            <button class="voltar" type="button" data-acao="voltar-lista">
                ${ICONES.voltar}
                Voltar para ocorrências
            </button>
        `;
    }

    function renderCarregandoDetalhes() {
        return `
            ${renderBarraVoltar()}

            <section class="cartao estado-detalhe">
                <span class="girando azul" aria-hidden="true"></span>
                <strong>Carregando ocorrência</strong>
                <span>Buscando descrição, localização e histórico.</span>
            </section>
        `;
    }

    function renderErroDetalhes(mensagem) {
        return `
            ${renderBarraVoltar()}

            <section class="cartao estado-detalhe">
                <span class="icone-erro">${ICONES.alerta}</span>
                <strong>Não foi possível abrir a ocorrência</strong>
                <span>${escaparHtml(mensagem)}</span>
                <button type="button" class="btn-secundario" data-acao="tentar-novamente">Tentar novamente</button>
            </section>
        `;
    }

    function renderizarDetalhes(ocorrencia) {
        destruirMapa();

        const admin = ehAdministrador();
        const config = obterConfigStatus(ocorrencia.status);
        const chave = config.chave || "recebido";
        const fotos = obterFotos(ocorrencia);
        const codigo = formatarCodigo(ocorrencia);
        const categoria = ocorrencia.categoria || "Sem categoria";
        const registrada = ocorrencia.data_criacao || ocorrencia.data_ocorrencia;
        const atualizada = ocorrencia.data_atualizacao || registrada;

        const colunaDireita = [];

        if (admin) {
            colunaDireita.push(renderPainelAcoes(chave));
            colunaDireita.push(`
                <section class="cartao">
                    <div class="cartao-topo"><h3>Registrada por</h3></div>
                    ${renderCidadao(ocorrencia)}
                </section>
            `);
        } else {
            const [titulo, texto] = AGORA_CIDADAO[chave] || AGORA_CIDADAO.recebido;

            colunaDireita.push(`
                <section class="cartao st" data-st="${chave}">
                    <div class="agora-box">
                        <span class="ico">${icone(STATUS[chave]?.icone || "entrada", 20)}</span>
                        <div>
                            <strong>${titulo}</strong>
                            <p>${texto}</p>
                        </div>
                    </div>
                </section>
            `);
        }

        colunaDireita.push(`
            <section class="cartao">
                <div class="cartao-topo"><h3>Localização</h3></div>
                <div class="endereco">${ICONES.localGrande}<span>${escaparHtml(obterEndereco(ocorrencia))}</span></div>
                ${renderMapa(ocorrencia)}
            </section>
        `);

        telaDetalhes.innerHTML = `
            ${renderBarraVoltar()}

            <section class="cartao st" data-st="${chave}">
                <div class="cab-detalhe">
                    <div class="ident">
                        <span class="ico">${iconeCategoria(categoria, 26)}</span>
                        <div class="titulos">
                            <small>${codigo} · ${escaparHtml(categoria)}</small>
                            <h2>${escaparHtml(ocorrencia.titulo || "Ocorrência")}</h2>
                        </div>
                    </div>
                    ${pilula(chave)}
                </div>

                <div class="area-progresso">${renderProgresso(ocorrencia, chave)}</div>
            </section>

            <div class="grade-detalhe">
                <div class="coluna">
                    <section class="cartao">
                        <div class="cartao-topo"><h3>Descrição</h3></div>
                        <p class="descricao">${escaparHtml(ocorrencia.descricao || "O cidadão não informou uma descrição.")}</p>

                        <div class="meta">
                            <div><span>Categoria</span><strong>${escaparHtml(categoria)}</strong></div>
                            <div><span>Registrada em</span><strong>${formatarDataHora(registrada)}</strong></div>
                            <div><span>Código</span><strong>${codigo}</strong></div>
                            <div><span>Última atualização</span><strong>${escaparHtml(tempoRelativo(atualizada) || formatarData(atualizada))}</strong></div>
                        </div>
                    </section>

                    <section class="cartao">
                        <div class="cartao-topo">
                            <h3>Evidências</h3>
                            <small>${fotos.length ? `${fotos.length} ${fotos.length === 1 ? "foto" : "fotos"}` : "Sem fotos"}</small>
                        </div>
                        ${renderFotos(fotos)}
                    </section>

                    <section class="cartao">
                        <div class="cartao-topo"><h3>Histórico</h3><small>Mais recente primeiro</small></div>
                        ${renderHistorico(ocorrencia)}
                    </section>
                </div>

                <div class="coluna">
                    ${colunaDireita.join("")}
                </div>
            </div>
        `;

        iniciarMapa(ocorrencia);
    }

    function renderProgresso(ocorrencia, chaveAtual) {
        if (chaveAtual === "cancelado") {
            const motivo = obterMotivoCancelamento(ocorrencia);

            return `
                <div class="faixa-cancelada">
                    ${ICONES.bloqueioGrande}
                    <div>
                        <strong>Ocorrência cancelada</strong>
                        <span>${escaparHtml(motivo)}</span>
                    </div>
                </div>
            `;
        }

        const indiceAtual = Math.max(0, FLUXO.indexOf(chaveAtual));
        const resolvido = chaveAtual === "resolvido";

        const passos = FLUXO.map((chave, indice) => {
            const feito = indice < indiceAtual || (resolvido && indice === indiceAtual);
            const atual = indice === indiceAtual && !resolvido;

            return `
                <div class="passo${feito ? " feito" : ""}${atual ? " atual" : ""}" ${atual ? 'aria-current="step"' : ""}>
                    <span class="bola">${feito ? ICONES.check : indice + 1}</span>
                    <span>${STATUS[chave].nome}</span>
                </div>
            `;
        }).join("");

        return `
            <div class="stepper">
                <div class="trilho-passos"><i style="width:${(indiceAtual / (FLUXO.length - 1)) * 100}%"></i></div>
                ${passos}
            </div>
        `;
    }

    // O motivo do cancelamento é a observação do último registro "Cancelado" no histórico.
    function obterMotivoCancelamento(ocorrencia) {
        const historico = Array.isArray(ocorrencia.historico) ? ocorrencia.historico : [];

        const cancelamento = historico
            .slice()
            .reverse()
            .find((item) => obterChaveStatus(item.status_novo) === "cancelado");

        return cancelamento?.observacao || "Consulte o histórico abaixo para mais detalhes.";
    }

    function montarItensHistorico(ocorrencia) {
        const historico = Array.isArray(ocorrencia.historico) ? ocorrencia.historico : [];

        if (historico.length === 0) {
            return [{
                chave: "recebido",
                titulo: HISTORICO_PADRAO.recebido.titulo,
                descricao: HISTORICO_PADRAO.recebido.descricao,
                data: formatarDataHora(ocorrencia.data_criacao || ocorrencia.data_ocorrencia),
                responsavel: "Sistema"
            }];
        }

        return historico.map((item, indice) => {
            const registro = indice === 0 && !item.status_anterior;
            const chave = registro ? "recebido" : (obterChaveStatus(item.status_novo) || "recebido");
            const padrao = HISTORICO_PADRAO[chave];
            const nomeStatus = obterConfigStatus(item.status_novo).nome;

            return {
                chave,
                titulo: registro
                    ? HISTORICO_PADRAO.recebido.titulo
                    : (padrao?.titulo || `Status alterado para ${nomeStatus}`),
                descricao: item.observacao || padrao?.descricao || `A solicitação avançou para o status ${nomeStatus}.`,
                data: formatarDataHora(item.data_alteracao),
                responsavel: item.usuario_responsavel_nome || (registro ? "Sistema" : "Prefeitura")
            };
        });
    }

    function renderHistorico(ocorrencia) {
        // Mais recente primeiro: dá para ver logo o que aconteceu por último.
        const itens = montarItensHistorico(ocorrencia)
            .reverse()
            .map((item) => `
                <li class="st" data-st="${item.chave}">
                    <span class="marca" aria-hidden="true"></span>
                    <div>
                        <div class="topo-hist">
                            <strong>${escaparHtml(item.titulo)}</strong>
                            <time>${escaparHtml(item.data)}</time>
                        </div>
                        <p>${escaparHtml(item.descricao)}</p>
                        <span class="resp">${escaparHtml(item.responsavel)}</span>
                    </div>
                </li>
            `)
            .join("");

        return `<ol class="linha-tempo">${itens}</ol>`;
    }

    function renderCidadao(ocorrencia) {
        if (!ocorrencia.usuario_nome) {
            return '<p class="texto-suave">Os dados de quem registrou não foram informados.</p>';
        }

        return `
            <div class="cidadao-box">
                <span class="avatar-p">${escaparHtml(iniciais(ocorrencia.usuario_nome))}</span>
                <div>
                    <strong>${escaparHtml(ocorrencia.usuario_nome)}</strong>
                    <span>${escaparHtml(ocorrencia.usuario_email || "Cidadão")}</span>
                </div>
            </div>
        `;
    }

    function renderMapa(ocorrencia) {
        if (!temCoordenadas(ocorrencia)) {
            return '<div class="sem-foto">A localização por GPS não foi registrada.</div>';
        }

        if (typeof window.L === "undefined") {
            return `<div class="sem-foto">${Number(ocorrencia.latitude).toFixed(5)}, ${Number(ocorrencia.longitude).toFixed(5)}</div>`;
        }

        return '<div class="mapa pequeno" data-mapa-ocorrencia></div>';
    }

    function obterFotos(ocorrencia) {
        return Array.isArray(ocorrencia.imagens)
            ? ocorrencia.imagens.filter((imagem) => Boolean(imagem?.url))
            : [];
    }

    function renderFotos(fotos) {
        if (fotos.length === 0) {
            return `<div class="sem-foto">${ehAdministrador() ? "O cidadão" : "Você"} não enviou fotos nesta ocorrência.</div>`;
        }

        const itens = fotos.map((foto, indice) => `
            <button type="button" class="foto" data-acao="ver-foto"
                data-src="${escaparHtml(foto.url)}" aria-label="Ampliar foto ${indice + 1}">
                <img src="${escaparHtml(foto.url)}" alt="Foto ${indice + 1} da ocorrência" loading="lazy">
            </button>
        `).join("");

        return `<div class="galeria">${itens}</div>`;
    }

    function renderPainelAcoes(chaveAtual) {
        if (chaveAtual === "resolvido" || chaveAtual === "cancelado") {
            return `
                <section class="cartao st" data-st="${chaveAtual}">
                    <div class="final-box">
                        ${icone(STATUS[chaveAtual].icone, 26)}
                        <div>
                            <strong>${chaveAtual === "resolvido" ? "Atendimento concluído" : "Ocorrência encerrada"}</strong>
                            ${chaveAtual === "resolvido"
                                ? "O status desta ocorrência não pode mais ser alterado."
                                : "Ela foi cancelada e só aparece para o cidadão que a registrou."}
                        </div>
                    </div>
                </section>
            `;
        }

        const proxima = PROXIMA_ETAPA[chaveAtual] || PROXIMA_ETAPA.recebido;

        return `
            <section class="cartao proximo-passo">
                <div class="cartao-topo">
                    <h3>Próximo passo</h3>
                    <span class="transicao">${pilula(chaveAtual)}${ICONES.seta}${pilula(proxima.status)}</span>
                </div>

                <p class="ajuda">${proxima.ajuda}</p>

                <div class="campo">
                    <label for="admin-mensagem">Mensagem para o cidadão <small data-contador="admin-mensagem">0/1000</small></label>
                    <textarea id="admin-mensagem" maxlength="1000" placeholder="${escaparHtml(proxima.mensagemPadrao)}"></textarea>
                    <span class="dica-campo">Opcional. Se ficar em branco, enviamos a mensagem sugerida.</span>
                </div>

                <div class="mensagem-admin-status erro" role="alert" hidden></div>

                <div class="botoes">
                    <button type="button" class="btn-primario" data-acao="avancar">
                        ${ICONES.check}<span>${proxima.botao}</span>
                    </button>

                    <button type="button" class="btn-cancelar-oc" data-acao="cancelar">
                        ${ICONES.bloqueio}<span>Cancelar ocorrência</span>
                    </button>
                </div>
            </section>
        `;
    }

    function iniciarMapa(ocorrencia) {
        const elemento = telaDetalhes.querySelector("[data-mapa-ocorrencia]");

        if (!elemento || typeof window.L === "undefined" || !temCoordenadas(ocorrencia)) {
            return;
        }

        const posicao = [Number(ocorrencia.latitude), Number(ocorrencia.longitude)];
        const chave = obterChaveStatus(ocorrencia.status) || "recebido";

        estado.detalhes.mapa = window.L.map(elemento, {
            zoomControl: true,
            scrollWheelZoom: false
        }).setView(posicao, 17);

        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap"
        }).addTo(estado.detalhes.mapa);

        window.L.marker(posicao, {
            icon: window.L.divIcon({
                className: "pino-mapa",
                html: `<span class="pino st" data-st="${chave}">${PINO}</span>`,
                iconSize: [30, 38],
                iconAnchor: [15, 38]
            }),
            title: ocorrencia.titulo || "Ocorrência"
        }).addTo(estado.detalhes.mapa);

        // Mesma trava de Jaborandi-SP dos outros mapas (global/mapaCidade.js)
        window.MapaCidade360?.travar(estado.detalhes.mapa, {
            pontoVisivel: posicao,
            zoomMinimo: 12
        });

        // O Leaflet precisa recalcular o tamanho depois que a tela termina de aparecer.
        setTimeout(() => {
            estado.detalhes.mapa?.invalidateSize();
        }, 400);
    }

    function destruirMapa() {
        if (estado.detalhes.mapa) {
            estado.detalhes.mapa.remove();
            estado.detalhes.mapa = null;
        }
    }

    function abrirFoto(url) {
        if (!url) {
            return;
        }

        const overlay = document.createElement("div");
        overlay.className = "lightbox visualizador-foto-ocorrencia";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-label", "Foto ampliada");
        overlay.innerHTML = `
            <button class="btn-icone fechar-visualizador-foto" type="button" aria-label="Fechar foto">${ICONES.fechar}</button>
            <img src="${escaparHtml(url)}" alt="Evidência da ocorrência">
        `;

        // Toque em qualquer lugar fecha a foto
        overlay.addEventListener("click", () => fecharFoto(overlay));

        document.body.appendChild(overlay);
        overlay.querySelector(".fechar-visualizador-foto").focus();
    }

    function fecharFoto(overlay = document.querySelector(".visualizador-foto-ocorrencia")) {
        if (!overlay || overlay.classList.contains("fechando")) {
            return;
        }

        overlay.classList.add("fechando");
        setTimeout(() => overlay.remove(), 250);
    }

    function formatarDataHora(valor) {
        const data = new Date(valor);

        if (!valor || Number.isNaN(data.getTime())) {
            return "--";
        }

        const dia = data
            .toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })
            .replace(/\./g, "")
            .replace(/ de /g, " ");

        return `${dia}, ${data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    }


    /*====================================================================================================

    ADMIN: ALTERAR STATUS

    ====================================================================================================*/

    function definirCarregando(botao, carregando, texto) {
        if (!botao) {
            return;
        }

        if (carregando) {
            botao.dataset.htmlOriginal = botao.innerHTML;
            botao.disabled = true;
            botao.innerHTML = `<span class="girando" aria-hidden="true"></span><span>${escaparHtml(texto)}</span>`;
        } else if (botao.dataset.htmlOriginal) {
            botao.disabled = false;
            botao.innerHTML = botao.dataset.htmlOriginal;
            delete botao.dataset.htmlOriginal;
        }
    }

    // Usa a rota que já existe: PATCH /api/ocorrencias/{id}/status
    async function enviarStatus(id, statusId, observacao) {
        const resposta = await fetchAutenticado(
            `${API_OCORRENCIAS_ACOMPANHAMENTO}/${id}/status`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    status_id: statusId,
                    observacao
                })
            }
        );

        const dados = await lerResposta(resposta);

        if (!resposta.ok || !dados?.sucesso) {
            throw new Error(
                dados?.mensagem ||
                "Não foi possível atualizar o status."
            );
        }

        return dados;
    }

    async function atualizarTelaAposMudanca(id) {
        await Promise.allSettled([
            carregarResumo(),
            carregarLista()
        ]);

        if (estado.detalhes.id === id) {
            await recarregarDetalhes(id);
        }
    }

    async function avancarStatus(botao) {
        const ocorrencia = estado.detalhes.ocorrencia;

        if (estado.atualizandoStatus || !ocorrencia) {
            return;
        }

        const id = Number(ocorrencia.id);
        const proxima = PROXIMA_ETAPA[obterChaveStatus(ocorrencia.status)];

        if (!proxima) {
            return;
        }

        const aviso = telaDetalhes.querySelector(".mensagem-admin-status");
        const btnCancelar = telaDetalhes.querySelector('[data-acao="cancelar"]');
        const campoMensagem = telaDetalhes.querySelector("#admin-mensagem");
        const mensagem = campoMensagem ? campoMensagem.value.trim().slice(0, 1000) : "";

        const mostrarAviso = (texto) => {
            if (aviso) {
                aviso.textContent = texto;
                aviso.hidden = false;
            }
        };

        if (aviso) {
            aviso.hidden = true;
        }

        const statusId = obterIdStatus(proxima.status);

        if (!statusId) {
            mostrarAviso(`O status "${STATUS[proxima.status].nome}" não foi encontrado na lista de status do sistema.`);
            return;
        }

        estado.atualizandoStatus = true;
        definirCarregando(botao, true, "Salvando...");

        if (btnCancelar) {
            btnCancelar.disabled = true;
        }

        try {
            await enviarStatus(id, statusId, mensagem || proxima.mensagemPadrao);

            mostrarToast(
                proxima.sucesso,
                `${formatarCodigo(ocorrencia)} agora está como "${STATUS[proxima.status].nome}".`
            );

            await atualizarTelaAposMudanca(id);

        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            mostrarAviso(error.message || "Não foi possível atualizar o status.");

        } finally {
            estado.atualizandoStatus = false;

            // Se a tela não foi redesenhada, devolve os botões ao normal.
            if (document.contains(botao)) {
                definirCarregando(botao, false);
            }

            if (btnCancelar && document.contains(btnCancelar)) {
                btnCancelar.disabled = false;
            }
        }
    }


    /*====================================================================================================

    ADMIN: CANCELAR OCORRÊNCIA

    O cancelamento usa a mesma rota de status, enviando o id de "Cancelado"
    e o motivo na observação. Assim ele aparece no histórico do cidadão.

    ====================================================================================================*/

    function iniciarCancelamento(id) {
        if (!Number.isInteger(id) || id <= 0) {
            return;
        }

        const ocorrencia =
            estado.ocorrencias.find((item) => Number(item.id) === id) ||
            (Number(estado.detalhes.ocorrencia?.id) === id ? estado.detalhes.ocorrencia : null);

        const codigo = ocorrencia ? formatarCodigo(ocorrencia) : `#${id}`;

        abrirDialogo(codigo, async (motivo, justificativa) => {
            const statusId = obterIdStatus("cancelado");

            if (!statusId) {
                throw new Error('O status "Cancelado" não foi encontrado na lista de status do sistema.');
            }

            const rotulo = MOTIVOS_CANCELAMENTO[motivo] || "Motivo não informado";
            const observacao = justificativa ? `${rotulo}. ${justificativa}` : `${rotulo}.`;

            await enviarStatus(id, statusId, observacao);

            mostrarToast(
                "Ocorrência cancelada",
                `${codigo} foi cancelada. Só quem registrou continua vendo.`
            );

            atualizarTelaAposMudanca(id);
        });
    }

    function criarDialogo() {
        const opcoesMotivo = Object.entries(MOTIVOS_CANCELAMENTO).map(([valor, rotulo]) => `
            <label class="motivo">
                <input type="radio" name="motivo-cancelamento" value="${valor}">
                <span>${rotulo}</span>
            </label>
        `).join("");

        dialogoEl = document.createElement("div");
        dialogoEl.className = "camada-dialogo";
        dialogoEl.hidden = true;
        dialogoEl.innerHTML = `
            <div class="fundo" data-acao="fundo"></div>

            <div class="dialogo largo" role="alertdialog" aria-modal="true"
                aria-labelledby="dialogo-cancelamento-titulo" aria-describedby="dialogo-cancelamento-texto">

                <div class="icone-perigo">${ICONES.bloqueioGrande}</div>

                <h3 id="dialogo-cancelamento-titulo">Cancelar <span data-dialogo-codigo></span>?</h3>

                <p id="dialogo-cancelamento-texto">
                    Ela deixa de aparecer para os outros cidadãos. Quem registrou continua vendo a ocorrência,
                    com o status Cancelado e o motivo que você escolher.
                </p>

                <div class="motivos" role="radiogroup" aria-label="Motivo do cancelamento">${opcoesMotivo}</div>

                <div class="campo">
                    <label for="justificativa-cancelamento">
                        <span data-rotulo-justificativa>Justificativa para o cidadão (opcional)</span>
                        <small data-contador="justificativa">0/300</small>
                    </label>
                    <textarea id="justificativa-cancelamento" maxlength="300"
                        placeholder="Ex.: Já existe uma ocorrência aberta para este mesmo problema."></textarea>
                </div>

                <span class="erro dialogo-cancelamento-erro" role="alert" hidden></span>

                <div class="acoes">
                    <button type="button" class="btn-secundario" data-acao="voltar">Voltar</button>
                    <button type="button" class="btn-perigo" data-acao="confirmar">Cancelar ocorrência</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialogoEl);

        dialogoEl.addEventListener("click", (event) => {
            const acao = event.target.closest("[data-acao]")?.dataset.acao;

            if ((acao === "fundo" || acao === "voltar") && !estado.dialogo.ocupado) {
                fecharDialogo();
            }

            if (acao === "confirmar") {
                confirmarCancelamento();
            }
        });

        dialogoEl.addEventListener("input", (event) => {
            if (event.target.id === "justificativa-cancelamento") {
                dialogoEl.querySelector('[data-contador="justificativa"]').textContent =
                    `${event.target.value.length}/300`;
            }

            esconderErroDialogo();
        });

        dialogoEl.addEventListener("change", (event) => {
            if (event.target.name === "motivo-cancelamento") {
                dialogoEl.querySelector("[data-rotulo-justificativa]").textContent =
                    event.target.value === "outro"
                        ? "Justificativa para o cidadão (obrigatória)"
                        : "Justificativa para o cidadão (opcional)";

                esconderErroDialogo();
            }
        });
    }

    function abrirDialogo(codigo, aoConfirmar) {
        estado.dialogo.focoAnterior = document.activeElement;
        estado.dialogo.aoConfirmar = aoConfirmar;
        estado.dialogo.aberto = true;

        dialogoEl.querySelector("[data-dialogo-codigo]").textContent = codigo;
        dialogoEl.querySelectorAll('input[name="motivo-cancelamento"]').forEach((radio) => {
            radio.checked = false;
        });
        dialogoEl.querySelector("#justificativa-cancelamento").value = "";
        dialogoEl.querySelector('[data-contador="justificativa"]').textContent = "0/300";
        dialogoEl.querySelector("[data-rotulo-justificativa]").textContent = "Justificativa para o cidadão (opcional)";
        esconderErroDialogo();

        atualizarTravaDeRolagem();
        mostrarOverlay(dialogoEl);

        setTimeout(() => {
            dialogoEl.querySelector('input[name="motivo-cancelamento"]')?.focus();
        }, 60);
    }

    function fecharDialogo() {
        if (!estado.dialogo.aberto) {
            return;
        }

        estado.dialogo.aberto = false;
        estado.dialogo.aoConfirmar = null;

        esconderOverlay(dialogoEl);
        atualizarTravaDeRolagem();

        const foco = estado.dialogo.focoAnterior;

        if (foco && document.contains(foco)) {
            foco.focus();
        }
    }

    function mostrarErroDialogo(mensagem) {
        const erro = dialogoEl.querySelector(".dialogo-cancelamento-erro");
        erro.textContent = mensagem;
        erro.hidden = false;
    }

    function esconderErroDialogo() {
        const erro = dialogoEl?.querySelector(".dialogo-cancelamento-erro");

        if (erro) {
            erro.hidden = true;
        }
    }

    async function confirmarCancelamento() {
        if (estado.dialogo.ocupado || !estado.dialogo.aoConfirmar) {
            return;
        }

        const selecionado = dialogoEl.querySelector('input[name="motivo-cancelamento"]:checked');
        const justificativa = dialogoEl.querySelector("#justificativa-cancelamento").value.trim();

        if (!selecionado) {
            mostrarErroDialogo("Escolha o motivo do cancelamento.");
            return;
        }

        if (selecionado.value === "outro" && justificativa.length < 10) {
            mostrarErroDialogo("Explique o motivo para o cidadão com pelo menos 10 caracteres.");
            return;
        }

        const btnConfirmar = dialogoEl.querySelector('[data-acao="confirmar"]');
        const btnVoltar = dialogoEl.querySelector('[data-acao="voltar"]');

        estado.dialogo.ocupado = true;
        definirCarregando(btnConfirmar, true, "Cancelando...");
        btnVoltar.disabled = true;

        try {
            await estado.dialogo.aoConfirmar(selecionado.value, justificativa);
            estado.dialogo.ocupado = false;
            fecharDialogo();

        } catch (error) {
            console.error("Erro ao cancelar ocorrência:", error);
            mostrarErroDialogo(error.message || "Não foi possível cancelar a ocorrência.");

        } finally {
            estado.dialogo.ocupado = false;
            definirCarregando(btnConfirmar, false);
            btnVoltar.disabled = false;
        }
    }


    /*====================================================================================================

    TOAST (aviso rápido no canto da tela)

    ====================================================================================================*/

    function criarAreaToast() {
        // A área dos toasts já existe no HTML (#toastOcorrencias).
    }

    function mostrarToast(titulo, texto) {
        if (!areaToast) {
            return;
        }

        const toast = document.createElement("div");
        toast.className = "toast";
        toast.setAttribute("role", "status");
        toast.innerHTML = `
            <span class="ok">${icone("check", 14)}</span>
            <span><strong>${escaparHtml(titulo)}</strong><small>${escaparHtml(texto)}</small></span>
        `;

        areaToast.appendChild(toast);

        setTimeout(() => {
            toast.classList.add("saindo");
            toast.addEventListener("animationend", () => toast.remove(), { once: true });
        }, 4000);
    }


    /*====================================================================================================

    TECLADO (Esc fecha: foto > diálogo > volta da tela de detalhes)

    ====================================================================================================*/

    function registrarTeclado() {
        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") {
                return;
            }

            if (document.querySelector(".visualizador-foto-ocorrencia")) {
                fecharFoto();
                return;
            }

            if (estado.dialogo.aberto) {
                if (!estado.dialogo.ocupado) {
                    fecharDialogo();
                }
                return;
            }

            // Não volta para a lista se a pessoa estiver digitando.
            if (event.target.closest?.("textarea, input")) {
                return;
            }

            if (estado.detalhes.id !== null) {
                voltarParaLista();
            }
        });
    }


    /*====================================================================================================

    ATUALIZAÇÃO APÓS REGISTRAR NOVA OCORRÊNCIA

    O ocorrencia.js controla a abertura e o retorno do formulário.
    Quando o formulário volta a ficar oculto, a lista e os contadores são recarregados.

    ====================================================================================================*/

    function observarFormulario() {
        if (!telaFormulario) {
            return;
        }

        let estavaVisivel = !telaFormulario.classList.contains("oculto");

        const observer = new MutationObserver(() => {
            const estaVisivel = !telaFormulario.classList.contains("oculto");

            if (estavaVisivel && !estaVisivel) {
                estado.pagina = 1;

                Promise.allSettled([
                    carregarResumo(),
                    carregarLista()
                ]);
            }

            estavaVisivel = estaVisivel;
        });

        observer.observe(telaFormulario, {
            attributes: true,
            attributeFilter: ["class"]
        });
    }


    /*====================================================================================================

    INICIALIZAÇÃO

    ====================================================================================================*/

    /*====================================================================================================

    LINKS DO PAINEL

    ocorrencia.html?status=resolvido   abre a lista já filtrada
    ocorrencia.html?ocorrencia=7       abre os detalhes da ocorrência 7
    ocorrencia.html?nova=1             abre o formulário de nova ocorrência (cidadão)

    ====================================================================================================*/

    const STATUS_PARA_FILTRO = {
        recebido: "recebidos",
        em_analise: "em_analise",
        em_andamento: "em_andamento",
        resolvido: "resolvidos",
        cancelado: "cancelados"
    };

    function aplicarParametrosDaUrl() {
        const parametros = new URLSearchParams(window.location.search);

        const status = parametros.get("status");
        const filtro = STATUS_PARA_FILTRO[status] || (Object.values(STATUS_PARA_FILTRO).includes(status) ? status : "");
        const botaoFiltro = [...botoesFiltro].find((botao) => obterFiltroBotao(botao) === filtro);

        if (filtro && botaoFiltro) {
            estado.filtroStatus = filtro;
            marcarFiltro(botaoFiltro);
        }

        const id = Number(parametros.get("ocorrencia"));

        if (Number.isInteger(id) && id > 0) {
            abrirDetalhes(id);
        } else if (parametros.get("nova") === "1" && !ehAdministrador()) {
            btnNovaOcorrencia?.click();
        }

        // Limpa o endereço para o "atualizar" da página não repetir a ação.
        if (parametros.has("status") || parametros.has("ocorrencia") || parametros.has("nova")) {
            window.history.replaceState(null, "", window.location.pathname);
        }
    }


    async function inicializar() {
        if (!telaOcorrencias || !containerCards) {
            return;
        }

        registrarEventosDetalhes();
        criarDialogo();
        criarAreaToast();

        registrarEventosLista();
        registrarMudancaDeTela();
        registrarFiltros();
        registrarTeclado();
        observarFormulario();

        try {
            await carregarUsuario();

            if (ehAdministrador()) {
                try {
                    await carregarStatusDisponiveis();
                } catch (error) {
                    // A lista continua funcionando. O erro aparece quando o admin tentar mudar um status.
                    console.error("Erro ao carregar status:", error);
                }
            }

            aplicarParametrosDaUrl();

            await Promise.allSettled([
                carregarResumo(),
                carregarLista()
            ]);

            // O ocorrencia.js também carrega o resumo (do cidadão).
            // Para o admin, lemos o resumo geral por último para ele prevalecer.
            if (ehAdministrador()) {
                await carregarResumo();
            }

        } catch (error) {
            console.error("Erro ao inicializar acompanhamento:", error);

            renderizarErroLista(
                error.message ||
                "Não foi possível iniciar o acompanhamento das ocorrências."
            );
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", inicializar);
    } else {
        inicializar();
    }

})();