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

    const LIMITE_POR_PAGINA = 6;
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

    // Tudo que muda por status fica aqui, em um lugar só.
    const STATUS = {
        recebido: {
            nome: "Recebido",
            classe: "status-recebidos",
            classeIcone: "icone-recebidos"
        },
        em_analise: {
            nome: "Em análise",
            classe: "status-emanalise",
            classeIcone: "icone-emanalise"
        },
        em_andamento: {
            nome: "Em andamento",
            classe: "status-andamento",
            classeIcone: "icone-andamento"
        },
        resolvido: {
            nome: "Resolvido",
            classe: "status-resolvido",
            classeIcone: "icone-resolvido"
        },
        cancelado: {
            nome: "Cancelado",
            classe: "status-cancelado-acompanhamento",
            classeIcone: "icone-cancelado-acompanhamento"
        }
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

    const caixaTituloPagina = document.querySelector(".caixa-titulo .titulo");
    const tituloPaginaOcorrencias = document.querySelector(".caixa-titulo .titulo h2");
    const descricaoPaginaOcorrencias = document.querySelector(".caixa-titulo > p");
    const btnNovaOcorrencia = document.getElementById("btn-nova-ocorrencia");
    const textoPerfilUsuario = document.querySelector(".perfil-usuario .usuario p");

    // Criados pelo próprio JS
    let dialogoEl = null;
    let areaToast = null;


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

    function svg(caminhos, tamanho = 18, espessura = 2) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${espessura}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${caminhos}</svg>`;
    }

    const CAMINHO_LIXEIRA = '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>';

    const ICONES = {
        lixeira: svg(CAMINHO_LIXEIRA),
        lixeiraGrande: svg(CAMINHO_LIXEIRA, 24),
        fechar: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', 20),
        check: svg('<path d="M20 6 9 17l-5-5"/>', 18, 2.6),
        checkPequeno: svg('<path d="M20 6 9 17l-5-5"/>', 15, 3),
        seta: svg('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>', 16),
        escudo: svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', 14, 2.2),
        alerta: svg('<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>', 22)
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
            .filter(Boolean);

        if (partes.length > 0) {
            return partes.join(" - ");
        }

        if (temCoordenadas(ocorrencia)) {
            return `Localização: ${Number(ocorrencia.latitude).toFixed(5)}, ${Number(ocorrencia.longitude).toFixed(5)}`;
        }

        return "Localização não informada";
    }

    function ehAdministrador() {
        return String(estado.usuario?.tipo_usuario || "")
            .trim()
            .toUpperCase() === "ADMIN";
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

    function obterIconeCategoria(categoria) {
        const valor = normalizarTexto(categoria);

        if (valor.includes("buraco") || valor.includes("via")) {
            return "/assets/icons/painel/ocorrencia/estrada.png";
        }

        if (valor.includes("iluminacao") || valor.includes("poste")) {
            return "/assets/icons/painel/ocorrencia/iluminacao-publica.png";
        }

        if (valor.includes("lixo") || valor.includes("coleta")) {
            return "/assets/icons/painel/ocorrencia/lixeira-de-reciclagem.png";
        }

        if (valor.includes("praga")) {
            return "/assets/icons/painel/ocorrencia/controle-de-pragas.png";
        }

        if (valor.includes("manutencao")) {
            return "/assets/icons/painel/ocorrencia/manutencao.png";
        }

        if (valor.includes("arvore") || valor.includes("caida")) {
            return "/assets/icons/painel/ocorrencia/arvore-caida.png";
        }

        return "/assets/icons/painel/ocorrencia/3-pontos.png";
    }

    function obterFiltroBotao(botao) {
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
            tituloPaginaOcorrencias.textContent = "Todas as Ocorrências";
        }

        if (caixaTituloPagina && !caixaTituloPagina.querySelector(".selo-admin")) {
            caixaTituloPagina.insertAdjacentHTML(
                "beforeend",
                `<span class="selo-admin">${ICONES.escudo}Prefeitura</span>`
            );
        }

        if (descricaoPaginaOcorrencias) {
            descricaoPaginaOcorrencias.textContent =
                "Analise as ocorrências registradas pelos cidadãos, aceite as válidas e acompanhe cada uma até a resolução.";
        }

        if (btnNovaOcorrencia) {
            btnNovaOcorrencia.hidden = true;
        }

        if (campoPesquisa) {
            campoPesquisa.placeholder = "Buscar por título, local, cidadão ou categoria...";
        }

        if (textoPerfilUsuario) {
            textoPerfilUsuario.textContent = "Administrador";
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
    }


    /*====================================================================================================

    LISTAGEM

    ====================================================================================================*/

    function construirUrlListagem({
        pagina = estado.pagina,
        limite = LIMITE_POR_PAGINA,
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

        const totalPaginas = Math.max(1, Math.ceil(filtradas.length / LIMITE_POR_PAGINA));
        const pagina = Math.min(Math.max(1, estado.pagina), totalPaginas);

        return {
            ocorrencias: filtradas.slice(
                (pagina - 1) * LIMITE_POR_PAGINA,
                pagina * LIMITE_POR_PAGINA
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

        containerCards.innerHTML = `
            <div class="estado-lista-ocorrencias">
                <div class="spinner-ocorrencias"></div>
                <strong>Carregando ocorrências...</strong>
                <span>Buscando as solicitações atualizadas.</span>
            </div>
        `;
    }

    function renderizarErroLista(mensagem) {
        if (!containerCards) {
            return;
        }

        containerCards.innerHTML = `
            <div class="estado-lista-ocorrencias estado-erro-ocorrencias">
                <strong>Não foi possível carregar as ocorrências.</strong>
                <span>${escaparHtml(mensagem)}</span>
                <button class="btn-tentar-novamente-ocorrencias" data-acao-lista="tentar-novamente" type="button">
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
            ? "Nenhuma ocorrência encontrada."
            : ehAdministrador()
                ? "Nenhuma ocorrência registrada ainda."
                : "Você ainda não possui ocorrências registradas.";

        const texto = existeFiltro
            ? "Altere os filtros ou a busca para visualizar outros resultados."
            : ehAdministrador()
                ? "Quando um cidadão registrar uma ocorrência, ela aparece aqui."
                : "Registre uma nova ocorrência para acompanhar o atendimento por aqui.";

        const botao = !existeFiltro && !ehAdministrador()
            ? `
                <button class="btn-tentar-novamente-ocorrencias" data-acao-lista="primeira-ocorrencia" type="button">
                    Registrar nova ocorrência
                </button>
            `
            : "";

        containerCards.innerHTML = `
            <div class="estado-lista-ocorrencias">
                <div class="icone-estado-vazio-ocorrencias">
                    <img src="/assets/icons/global/aviso-previo.png" alt="">
                </div>
                <strong>${titulo}</strong>
                <span>${texto}</span>
                ${botao}
            </div>
        `;
    }

    function montarCard(ocorrencia) {
        const id = Number(ocorrencia.id) || 0;
        const config = obterConfigStatus(ocorrencia.status);
        const icone = obterIconeCategoria(ocorrencia.categoria);
        const codigo = formatarCodigo(ocorrencia);
        const data = formatarData(ocorrencia.data_criacao || ocorrencia.data_ocorrencia);
        const endereco = obterEndereco(ocorrencia);
        const admin = ehAdministrador();

        const cidadao = admin && ocorrencia.usuario_nome
            ? `
                <div class="item-info">
                    <div class="icone-info">
                        <div class="icone-mascara img-icone-pequeno"
                            style="-webkit-mask-image: url('/assets/icons/global/do-utilizador.png'); mask-image: url('/assets/icons/global/do-utilizador.png');">
                        </div>
                    </div>
                    <span>${escaparHtml(ocorrencia.usuario_nome)}</span>
                </div>
            `
            : "";

        const lixeira = admin && podeCancelar(config.chave)
            ? `
                <button class="btn-lixeira-card" type="button" data-cancelar-id="${id}"
                    title="Cancelar ocorrência" aria-label="Cancelar ocorrência ${codigo}">
                    ${ICONES.lixeira}
                </button>
            `
            : "";

        return `
            <div class="card-ocorrencias card-ocorrencia-dinamico ${config.chave === "cancelado" ? "card-cancelado" : ""}" data-id="${id}">

                <div class="topo-card">
                    <div class="caixa-icone ${config.classeIcone}">
                        <div class="icone-mascara img-icone-grande"
                            style="-webkit-mask-image: url('${icone}'); mask-image: url('${icone}');">
                        </div>
                    </div>

                    <div class="etiqueta-status ${config.classe}">
                        ${escaparHtml(config.nome)}
                    </div>
                </div>

                <h3 class="titulo-card">
                    ${escaparHtml(ocorrencia.titulo || "Ocorrência")}
                </h3>

                <div class="lista-infos">
                    <div class="item-info">
                        <div class="icone-info">
                            <div class="icone-mascara img-icone-pequeno"
                                style="-webkit-mask-image: url('/assets/icons/global/painel-de-controle.png'); mask-image: url('/assets/icons/global/painel-de-controle.png');">
                            </div>
                        </div>
                        <span>${escaparHtml(ocorrencia.categoria || "Sem categoria")}</span>
                    </div>

                    <div class="item-info">
                        <div class="icone-info">
                            <div class="icone-mascara img-icone-pequeno"
                                style="-webkit-mask-image: url('/assets/icons/painel/nova-ocorrencias/pin-de-localizacao.png'); mask-image: url('/assets/icons/painel/nova-ocorrencias/pin-de-localizacao.png');">
                            </div>
                        </div>
                        <span>${escaparHtml(endereco)}</span>
                    </div>

                    ${cidadao}
                </div>

                <div class="rodape-card">
                    <div class="dados-registro">
                        <span class="codigo">${codigo}</span>
                        <span class="data">${data}</span>
                    </div>

                    <div class="acoes-card">
                        ${lixeira}
                        <button class="btn-detalhes" type="button" data-detalhes-id="${id}">
                            Detalhes
                        </button>
                    </div>
                </div>

            </div>
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
            estado.ocorrencias.map(montarCard).join("") +
            `<div class="paginacao-ocorrencias">${montarPaginacao()}</div>`;
    }

    function montarPaginacao() {
        const pagina = estado.pagina;
        const totalPaginas = estado.totalPaginas;

        const inicio = estado.total === 0
            ? 0
            : ((pagina - 1) * LIMITE_POR_PAGINA) + 1;

        const fim = Math.min(pagina * LIMITE_POR_PAGINA, estado.total);

        return `
            <div class="paginacao-informacao">
                Exibindo ${inicio}-${fim} de ${estado.total}
            </div>

            <div class="paginacao-botoes">
                <button class="btn-paginacao" data-acao-lista="pagina-anterior" type="button"
                    aria-label="Página anterior" ${pagina <= 1 ? "disabled" : ""}>
                    &larr;
                </button>

                <span class="pagina-atual-ocorrencias">
                    Página ${pagina} de ${totalPaginas}
                </span>

                <button class="btn-paginacao" data-acao-lista="proxima-pagina" type="button"
                    aria-label="Próxima página" ${pagina >= totalPaginas ? "disabled" : ""}>
                    &rarr;
                </button>
            </div>
        `;
    }

    function rolarParaLista() {
        document
            .querySelector(".container-filtro-ocorrencias")
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

        containerCards.addEventListener("dblclick", (event) => {
            const card = event.target.closest(".card-ocorrencia-dinamico");

            if (card && !event.target.closest("button")) {
                abrirDetalhes(Number(card.dataset.id));
            }
        });
    }


    /*====================================================================================================

    FILTROS E BUSCA

    ====================================================================================================*/

    function registrarFiltros() {
        botoesFiltro.forEach((botao) => {
            botao.addEventListener("click", () => {
                botoesFiltro.forEach((item) => item.classList.remove("ativo"));
                botao.classList.add("ativo");

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
        clearTimeout(elemento._timerFechar);
        elemento.hidden = false;

        requestAnimationFrame(() => {
            elemento.classList.add("visivel");
        });
    }

    function esconderOverlay(elemento) {
        elemento.classList.remove("visivel");

        elemento._timerFechar = setTimeout(() => {
            elemento.hidden = true;
        }, 220);
    }

    function atualizarTravaDeRolagem() {
        document.body.classList.toggle("dialogo-ocorrencia-aberto", estado.dialogo.aberto);
    }


    /*====================================================================================================

    TELA DE DETALHES

    Igual era antes: a lista some e os detalhes aparecem no lugar.
    O botão "Voltar para a lista" (ou a tecla Esc) faz o caminho de volta.

    ====================================================================================================*/

    const SETA_VOLTAR = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="#566987" stroke-width="2.5" stroke-linecap="round"
            stroke-linejoin="round" aria-hidden="true">
            <path d="M19 12H5"></path>
            <path d="M12 19l-7-7 7-7"></path>
        </svg>
    `;

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
            <div class="cabecalho-detalhes">
                <button class="btn-voltar" type="button" data-acao="voltar-lista">
                    ${SETA_VOLTAR}
                    Voltar para a lista
                </button>
            </div>
        `;
    }

    function renderCarregandoDetalhes() {
        return `
            ${renderBarraVoltar()}

            <div class="detalhes-ocorrencia-estado">
                <div class="spinner-ocorrencias" aria-hidden="true"></div>
                <strong>Carregando ocorrência</strong>
                <span>Buscando descrição, localização e histórico.</span>
            </div>
        `;
    }

    function renderErroDetalhes(mensagem) {
        return `
            ${renderBarraVoltar()}

            <div class="detalhes-ocorrencia-estado">
                <div class="detalhes-ocorrencia-estado-icone">${ICONES.alerta}</div>
                <strong>Não foi possível abrir a ocorrência</strong>
                <span>${escaparHtml(mensagem)}</span>
                <button type="button" class="btn-tentar-novamente-ocorrencias" data-acao="tentar-novamente">Tentar novamente</button>
            </div>
        `;
    }

    function renderizarDetalhes(ocorrencia) {
        destruirMapa();

        const admin = ehAdministrador();
        const config = obterConfigStatus(ocorrencia.status);
        const icone = obterIconeCategoria(ocorrencia.categoria);
        const fotos = obterFotos(ocorrencia);

        const blocoCidadao = admin
            ? `
                <section class="cartao-detalhe">
                    <h3 class="titulo-sessao">Registrada por</h3>
                    ${renderCidadao(ocorrencia)}
                </section>
            `
            : "";

        telaDetalhes.innerHTML = `
            ${renderBarraVoltar()}

            <header class="detalhes-ocorrencia-cabecalho">
                <div class="detalhes-ocorrencia-identidade">
                    <div class="caixa-icone ${config.classeIcone}">
                        <div class="icone-mascara img-icone-grande"
                            style="-webkit-mask-image: url('${icone}'); mask-image: url('${icone}');">
                        </div>
                    </div>

                    <div class="detalhes-ocorrencia-titulos">
                        <span class="detalhes-ocorrencia-codigo">${formatarCodigo(ocorrencia)}</span>
                        <h2>${escaparHtml(ocorrencia.titulo || "Ocorrência")}</h2>
                    </div>
                </div>

                <div class="etiqueta-status ${config.classe}">${escaparHtml(config.nome)}</div>
            </header>

            ${renderProgresso(ocorrencia, config.chave)}

            <div class="detalhes-ocorrencia-grade">
                <div class="detalhes-ocorrencia-coluna">
                    <section class="cartao-detalhe">
                        <div class="caixa-descricao">
                            <h4 class="titulo-sessao-pequeno">Descrição do problema</h4>
                            <p class="texto-descricao">${escaparHtml(ocorrencia.descricao || "O cidadão não informou uma descrição.")}</p>
                        </div>

                        <div class="metadados-ocorrencia">
                            <div>
                                <span>Categoria</span>
                                <strong>${escaparHtml(ocorrencia.categoria || "Sem categoria")}</strong>
                            </div>
                            <div>
                                <span>Registrada em</span>
                                <strong>${formatarData(ocorrencia.data_criacao || ocorrencia.data_ocorrencia, true)}</strong>
                            </div>
                            <div>
                                <span>Última atualização</span>
                                <strong>${formatarData(ocorrencia.data_atualizacao || ocorrencia.data_criacao || ocorrencia.data_ocorrencia, true)}</strong>
                            </div>
                            <div>
                                <span>Fotos anexadas</span>
                                <strong>${fotos.length}</strong>
                            </div>
                        </div>
                    </section>

                    <section class="cartao-detalhe">
                        <h3 class="titulo-sessao">Histórico da solicitação</h3>
                        ${renderHistorico(ocorrencia)}
                    </section>
                </div>

                <div class="detalhes-ocorrencia-coluna">
                    ${blocoCidadao}

                    <section class="cartao-detalhe">
                        <h3 class="titulo-sessao">Localização</h3>
                        <div class="caixa-endereco">${escaparHtml(obterEndereco(ocorrencia))}</div>
                        ${renderMapa(ocorrencia)}
                    </section>

                    <section class="cartao-detalhe">
                        <h3 class="titulo-sessao">Evidências</h3>
                        ${renderFotos(fotos)}
                    </section>
                </div>
            </div>

            ${admin ? renderPainelAcoes(config.chave) : ""}
        `;

        iniciarMapa(ocorrencia);
    }

    function renderProgresso(ocorrencia, chaveAtual) {
        if (chaveAtual === "cancelado") {
            const motivo = obterMotivoCancelamento(ocorrencia);

            return `
                <div class="progresso-status-ocorrencia">
                    <div class="status-cancelado-progresso">
                        <strong>Ocorrência cancelada</strong>
                        <span>${escaparHtml(motivo)}</span>
                    </div>
                </div>
            `;
        }

        const indiceAtual = FLUXO.indexOf(chaveAtual);

        const etapas = FLUXO.map((chave, indice) => {
            const concluida = indice <= indiceAtual;
            const atual = indice === indiceAtual;
            const conteudo = indice < indiceAtual ? ICONES.checkPequeno : indice + 1;

            const etapa = `
                <div class="etapa-status ${concluida ? "concluida" : ""} ${atual ? "atual" : ""}" ${atual ? 'aria-current="step"' : ""}>
                    <div class="bolinha-status">${conteudo}</div>
                    <span>${STATUS[chave].nome}</span>
                </div>
            `;

            const linha = indice < FLUXO.length - 1
                ? `<div class="linha-status ${indice < indiceAtual ? "concluida" : ""}"></div>`
                : "";

            return etapa + linha;
        }).join("");

        return `<div class="progresso-status-ocorrencia">${etapas}</div>`;
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
                data: formatarData(ocorrencia.data_criacao || ocorrencia.data_ocorrencia, true),
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
                data: formatarData(item.data_alteracao, true),
                responsavel: item.usuario_responsavel_nome || (registro ? "Sistema" : "Prefeitura")
            };
        });
    }

    function renderHistorico(ocorrencia) {
        // Mais recente primeiro: dá para ver logo o que aconteceu por último.
        const itens = montarItensHistorico(ocorrencia)
            .reverse()
            .map((item) => `
                <li class="historico-ocorrencia-item" data-status="${item.chave}">
                    <span class="historico-ocorrencia-marcador" aria-hidden="true"></span>
                    <div class="historico-ocorrencia-cartao">
                        <div class="historico-ocorrencia-topo">
                            <strong>${escaparHtml(item.titulo)}</strong>
                            <time>${escaparHtml(item.data)}</time>
                        </div>
                        <p>${escaparHtml(item.descricao)}</p>
                        <span class="responsavel-historico">${escaparHtml(item.responsavel)}</span>
                    </div>
                </li>
            `)
            .join("");

        return `<ol class="historico-ocorrencia">${itens}</ol>`;
    }

    function renderCidadao(ocorrencia) {
        if (!ocorrencia.usuario_nome) {
            return '<p class="aviso-status-final">Os dados de quem registrou não foram informados.</p>';
        }

        return `
            <div class="caixa-dados-cidadao">
                <strong>${escaparHtml(ocorrencia.usuario_nome)}</strong>
                ${ocorrencia.usuario_email ? `<span>${escaparHtml(ocorrencia.usuario_email)}</span>` : ""}
            </div>
        `;
    }

    function renderMapa(ocorrencia) {
        if (!temCoordenadas(ocorrencia)) {
            return `
                <div class="caixa-mapa">
                    <span class="mapa-sem-gps">A localização por GPS não foi registrada.</span>
                </div>
            `;
        }

        if (typeof window.L === "undefined") {
            return `
                <div class="caixa-mapa" title="${Number(ocorrencia.latitude)}, ${Number(ocorrencia.longitude)}">
                    <div class="ponto-mapa"></div>
                </div>
            `;
        }

        return '<div class="caixa-mapa caixa-mapa-real" data-mapa-ocorrencia></div>';
    }

    function obterFotos(ocorrencia) {
        return Array.isArray(ocorrencia.imagens)
            ? ocorrencia.imagens.filter((imagem) => Boolean(imagem?.url))
            : [];
    }

    function renderFotos(fotos) {
        if (fotos.length === 0) {
            return `
                <div class="caixa-foto-vazia">
                    <span class="texto-foto-vazia">Nenhuma foto anexada</span>
                </div>
            `;
        }

        const itens = fotos.map((foto, indice) => `
            <button type="button" class="foto-evidencia" data-acao="ver-foto"
                data-src="${escaparHtml(foto.url)}" aria-label="Ampliar foto ${indice + 1}">
                <img src="${escaparHtml(foto.url)}" alt="Foto ${indice + 1} da ocorrência" loading="lazy">
            </button>
        `).join("");

        return `<div class="galeria-evidencias">${itens}</div>`;
    }

    function renderPainelAcoes(chaveAtual) {
        if (chaveAtual === "resolvido") {
            return `
                <section class="cartao-detalhe painel-admin-status painel-admin-final">
                    <h3 class="titulo-sessao">Status final</h3>
                    <p class="aviso-status-final">Esta ocorrência foi resolvida. O status não pode mais ser alterado.</p>
                </section>
            `;
        }

        if (chaveAtual === "cancelado") {
            return `
                <section class="cartao-detalhe painel-admin-status painel-admin-final">
                    <h3 class="titulo-sessao">Status final</h3>
                    <p class="aviso-status-final">Esta ocorrência foi cancelada. Ela só aparece para o cidadão que a registrou.</p>
                </section>
            `;
        }

        const proxima = PROXIMA_ETAPA[chaveAtual] || PROXIMA_ETAPA.recebido;
        const atual = STATUS[chaveAtual] || STATUS.recebido;
        const destino = STATUS[proxima.status];

        return `
            <section class="cartao-detalhe painel-admin-status">
                <div class="painel-admin-cabecalho">
                    <h3 class="titulo-sessao">Próximo passo</h3>

                    <div class="transicao-status">
                        <span class="etiqueta-status ${atual.classe}">${atual.nome}</span>
                        <span class="seta-transicao" aria-hidden="true">${ICONES.seta}</span>
                        <span class="etiqueta-status ${destino.classe}">${destino.nome}</span>
                    </div>
                </div>

                <p class="texto-admin-status">
                    ${proxima.ajuda} Se a mensagem ficar em branco, o cidadão recebe o texto de exemplo do campo.
                </p>

                <div class="painel-admin-linha">
                    <div class="grupo-admin-status">
                        <label for="admin-mensagem">Mensagem para o cidadão (opcional)</label>
                        <textarea id="admin-mensagem" maxlength="1000" placeholder="${escaparHtml(proxima.mensagemPadrao)}"></textarea>
                        <span class="contador-caracteres" data-contador="admin-mensagem">0/1000</span>
                    </div>

                    <div class="painel-admin-botoes">
                        <button type="button" class="btn-atualizar-status" data-acao="avancar">
                            ${ICONES.check}<span>${proxima.botao}</span>
                        </button>

                        <button type="button" class="btn-cancelar-ocorrencia" data-acao="cancelar">
                            ${ICONES.lixeira}<span>Cancelar ocorrência</span>
                        </button>
                    </div>
                </div>

                <div class="mensagem-admin-status erro" role="alert" hidden></div>
            </section>
        `;
    }

    function iniciarMapa(ocorrencia) {
        const elemento = telaDetalhes.querySelector("[data-mapa-ocorrencia]");

        if (!elemento || typeof window.L === "undefined" || !temCoordenadas(ocorrencia)) {
            return;
        }

        const posicao = [Number(ocorrencia.latitude), Number(ocorrencia.longitude)];

        estado.detalhes.mapa = window.L.map(elemento, {
            zoomControl: true,
            scrollWheelZoom: false
        }).setView(posicao, 17);

        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap"
        }).addTo(estado.detalhes.mapa);

        window.L.marker(posicao)
            .addTo(estado.detalhes.mapa)
            .bindPopup(escaparHtml(ocorrencia.titulo || "Ocorrência"));

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
        overlay.className = "visualizador-foto-ocorrencia";
        overlay.innerHTML = `
            <button class="fechar-visualizador-foto" type="button" aria-label="Fechar foto">&times;</button>
            <img src="${escaparHtml(url)}" alt="Evidência da ocorrência">
        `;

        overlay.addEventListener("click", (event) => {
            if (event.target === overlay || event.target.closest(".fechar-visualizador-foto")) {
                overlay.remove();
            }
        });

        document.body.appendChild(overlay);
        overlay.querySelector(".fechar-visualizador-foto").focus();
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
            botao.innerHTML = `<span class="spinner-botao" aria-hidden="true"></span><span>${escaparHtml(texto)}</span>`;
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
            <label class="opcao-motivo">
                <input type="radio" name="motivo-cancelamento" value="${valor}">
                <span>${rotulo}</span>
            </label>
        `).join("");

        dialogoEl = document.createElement("div");
        dialogoEl.className = "dialogo-cancelamento-overlay";
        dialogoEl.hidden = true;
        dialogoEl.innerHTML = `
            <div class="dialogo-cancelamento" role="alertdialog" aria-modal="true"
                aria-labelledby="dialogo-cancelamento-titulo" aria-describedby="dialogo-cancelamento-texto">

                <div class="dialogo-cancelamento-icone">${ICONES.lixeiraGrande}</div>

                <h3 id="dialogo-cancelamento-titulo">Cancelar a ocorrência <span data-dialogo-codigo></span>?</h3>

                <p id="dialogo-cancelamento-texto">
                    Ela deixa de aparecer para os outros cidadãos. Quem registrou continua vendo a ocorrência,
                    com o status Cancelado e o motivo que você escolher abaixo.
                </p>

                <fieldset class="motivos-cancelamento">
                    <legend>Motivo do cancelamento</legend>
                    <div class="lista-motivos">${opcoesMotivo}</div>
                </fieldset>

                <div class="grupo-admin-status">
                    <label for="justificativa-cancelamento" data-rotulo-justificativa>Justificativa para o cidadão (opcional)</label>
                    <textarea id="justificativa-cancelamento" maxlength="300"
                        placeholder="Ex: Já existe uma ocorrência aberta para este mesmo problema."></textarea>
                    <span class="contador-caracteres" data-contador="justificativa">0/300</span>
                </div>

                <div class="dialogo-cancelamento-erro" role="alert" hidden></div>

                <div class="dialogo-cancelamento-botoes">
                    <button type="button" class="btn-dialogo-voltar" data-acao="voltar">Voltar</button>
                    <button type="button" class="btn-dialogo-confirmar" data-acao="confirmar">Cancelar ocorrência</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialogoEl);

        dialogoEl.addEventListener("click", (event) => {
            if (event.target === dialogoEl) {
                if (!estado.dialogo.ocupado) {
                    fecharDialogo();
                }
                return;
            }

            const acao = event.target.closest("[data-acao]")?.dataset.acao;

            if (acao === "voltar" && !estado.dialogo.ocupado) {
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
        areaToast = document.createElement("div");
        areaToast.className = "toast-ocorrencia-area";
        areaToast.setAttribute("aria-live", "polite");
        document.body.appendChild(areaToast);
    }

    function mostrarToast(titulo, texto) {
        const toast = document.createElement("div");
        toast.className = "toast-ocorrencia";
        toast.innerHTML = `
            <div class="toast-ocorrencia-icone">${ICONES.checkPequeno}</div>
            <div class="toast-ocorrencia-textos">
                <strong>${escaparHtml(titulo)}</strong>
                <span>${escaparHtml(texto)}</span>
            </div>
        `;

        areaToast.appendChild(toast);

        setTimeout(() => {
            toast.classList.add("saindo");
            setTimeout(() => toast.remove(), 220);
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

            const visualizador = document.querySelector(".visualizador-foto-ocorrencia");

            if (visualizador) {
                visualizador.remove();
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

    async function inicializar() {
        if (!telaOcorrencias || !containerCards) {
            return;
        }

        registrarEventosDetalhes();
        criarDialogo();
        criarAreaToast();

        registrarEventosLista();
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