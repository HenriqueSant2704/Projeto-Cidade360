/*========================================================================================================

ACOMPANHAMENTO DE OCORRÊNCIAS

Implementa o entregável do Mês 4:

- Listagem real das ocorrências registradas
- Filtros por status
- Busca por título, categoria ou localização
- Paginação
- Tela de detalhes
- Status atual
- Linha do tempo com histórico
- Fotos da ocorrência
- Localização no mapa
- Atualização de status para administrador
- Atualização automática da listagem após novo registro

=========================================================================================================*/

(() => {

    const API_OCORRENCIAS_ACOMPANHAMENTO =
        "/api/ocorrencias";

    const API_USUARIO_ACOMPANHAMENTO =
        "/api/me";

    const LOGIN_PAGE_ACOMPANHAMENTO =
        "/FrontEnd/pages/login/login.html";

    const LIMITE_POR_PAGINA =
        6;

    const TEMPO_BUSCA =
        350;


    /*====================================================================================================

    ELEMENTOS DA TELA

    ====================================================================================================*/

    const telaOcorrencias =
        document.getElementById(
            "tela-ocorrencias"
        );

    const telaFormulario =
        document.getElementById(
            "tela-formulario"
        );

    const telaDetalhes =
        document.getElementById(
            "tela-detalhes"
        );

    const containerCards =
        document.querySelector(
            ".container-cards-ocorrencia"
        );

    const botoesFiltro =
        document.querySelectorAll(
            ".filtro-ocorrencia button"
        );

    const campoPesquisa =
        document.querySelector(
            ".campo-pesquisa input"
        );

    const numeroTotal =
        document.querySelector(
            ".numero.total"
        );

    const numeroPendentes =
        document.querySelector(
            ".numero.pendente"
        );

    const numeroAndamento =
        document.querySelector(
            ".numero.andamento"
        );

    const numeroResolvidas =
        document.querySelector(
            ".numero.resolvido"
        );

    const tituloPaginaOcorrencias =
        document.querySelector(
            ".caixa-titulo .titulo h2"
        );

    const descricaoPaginaOcorrencias =
        document.querySelector(
            ".caixa-titulo > p"
        );

    const btnNovaOcorrencia =
        document.getElementById(
            "btn-nova-ocorrencia"
        );


    /*====================================================================================================

    ESTADO

    ====================================================================================================*/

    const estado = {
        usuario:
            null,

        statusDisponiveis:
            [],

        ocorrencias:
            [],

        pagina:
            1,

        totalPaginas:
            1,

        total:
            0,

        filtroStatus:
            "",

        busca:
            "",

        carregandoLista:
            false,

        carregandoDetalhes:
            false,

        atualizandoStatus:
            false,

        mapaDetalhes:
            null,

        marcadorDetalhes:
            null,

        debounceBusca:
            null
    };


    /*====================================================================================================

    TOKEN E AUTENTICAÇÃO

    ====================================================================================================*/

    function obterToken() {
        return (
            localStorage.getItem(
                "cidade360_token"
            ) ||
            sessionStorage.getItem(
                "cidade360_token"
            )
        );
    }


    function limparSessao() {
        localStorage.removeItem(
            "cidade360_token"
        );

        localStorage.removeItem(
            "cidade360_usuario"
        );

        localStorage.removeItem(
            "cidade360_id"
        );

        sessionStorage.removeItem(
            "cidade360_token"
        );

        sessionStorage.removeItem(
            "cidade360_usuario"
        );

        sessionStorage.removeItem(
            "cidade360_id"
        );
    }


    function redirecionarParaLogin() {
        limparSessao();

        window.location.replace(
            LOGIN_PAGE_ACOMPANHAMENTO
        );
    }


    async function fetchAutenticado(
        url,
        opcoes = {}
    ) {
        const token =
            obterToken();

        if (!token) {
            redirecionarParaLogin();

            throw new Error(
                "Sessão não encontrada."
            );
        }

        const headers =
            new Headers(
                opcoes.headers || {}
            );

        headers.set(
            "Authorization",
            `Bearer ${token}`
        );

        const resposta =
            await fetch(
                url,
                {
                    ...opcoes,
                    headers,
                    cache:
                        "no-store"
                }
            );

        if (
            resposta.status === 401
        ) {
            redirecionarParaLogin();

            throw new Error(
                "Sua sessão expirou."
            );
        }

        return resposta;
    }


    async function lerResposta(
        resposta
    ) {
        const corpo =
            await resposta.text();

        if (!corpo) {
            return null;
        }

        try {
            return JSON.parse(
                corpo
            );

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

    function escaparHtml(
        valor
    ) {
        return String(
            valor ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }


    function formatarData(
        valor,
        incluirHora = false
    ) {
        if (!valor) {
            return "--/--/----";
        }

        const data =
            new Date(
                valor
            );

        if (
            Number.isNaN(
                data.getTime()
            )
        ) {
            return "--/--/----";
        }

        if (incluirHora) {
            return data.toLocaleString(
                "pt-BR",
                {
                    dateStyle:
                        "short",

                    timeStyle:
                        "short"
                }
            );
        }

        return data.toLocaleDateString(
            "pt-BR"
        );
    }


    function formatarCodigo(
        ocorrencia
    ) {
        const id =
            Number(
                ocorrencia?.id
            ) || 0;

        const data =
            new Date(
                ocorrencia?.data_criacao ||
                ocorrencia?.data_ocorrencia ||
                Date.now()
            );

        const ano =
            Number.isNaN(
                data.getTime()
            )
                ? new Date().getFullYear()
                : data.getFullYear();

        return `OC-${ano}-${String(id).padStart(4, "0")}`;
    }


    function obterEndereco(
        ocorrencia
    ) {
        const partes = [
            ocorrencia?.endereco,
            ocorrencia?.bairro,
            ocorrencia?.cidade
        ]
            .map((item) =>
                String(
                    item || ""
                ).trim()
            )
            .filter(Boolean);

        if (
            partes.length > 0
        ) {
            return partes.join(
                " - "
            );
        }

        if (
            Number.isFinite(
                Number(
                    ocorrencia?.latitude
                )
            ) &&
            Number.isFinite(
                Number(
                    ocorrencia?.longitude
                )
            )
        ) {
            return `Localização: ${Number(ocorrencia.latitude).toFixed(5)}, ${Number(ocorrencia.longitude).toFixed(5)}`;
        }

        return "Localização não informada";
    }


    function ehAdministrador() {
        return (
            String(
                estado.usuario?.tipo_usuario || ""
            )
                .trim()
                .toUpperCase() ===
            "ADMIN"
        );
    }


    /*====================================================================================================

    STATUS

    ====================================================================================================*/

    function obterConfigStatus(
        status
    ) {
        const valor =
            String(
                status || ""
            )
                .trim()
                .toLowerCase();

        if (
            valor === "recebido"
        ) {
            return {
                classe:
                    "status-pendente",

                classeIcone:
                    "icone-pendente",

                nome:
                    "Recebido",

                cor:
                    "#2563EB"
            };
        }

        if (
            valor === "em análise"
        ) {
            return {
                classe:
                    "status-pendente",

                classeIcone:
                    "icone-pendente",

                nome:
                    "Em análise",

                cor:
                    "#d48806"
            };
        }

        if (
            valor === "em atendimento" ||
            valor === "em andamento"
        ) {
            return {
                classe:
                    "status-andamento",

                classeIcone:
                    "icone-andamento",

                nome:
                    "Em atendimento",

                cor:
                    "#047857"
            };
        }

        if (
            valor === "resolvido"
        ) {
            return {
                classe:
                    "status-resolvido",

                classeIcone:
                    "icone-resolvido",

                nome:
                    "Resolvido",

                cor:
                    "#9333EA"
            };
        }

        if (
            valor === "cancelado"
        ) {
            return {
                classe:
                    "status-cancelado-acompanhamento",

                classeIcone:
                    "icone-cancelado-acompanhamento",

                nome:
                    "Cancelado",

                cor:
                    "#64748B"
            };
        }

        return {
            classe:
                "status-pendente",

            classeIcone:
                "icone-pendente",

            nome:
                status || "Recebido",

            cor:
                "#2563EB"
        };
    }


    function obterIconeCategoria(
        categoria
    ) {
        const valor =
            String(
                categoria || ""
            )
                .trim()
                .toLowerCase();

        if (
            valor.includes(
                "buraco"
            ) ||
            valor.includes(
                "via"
            )
        ) {
            return "/assets/icons/painel/ocorrencia/estrada.png";
        }

        if (
            valor.includes(
                "iluminação"
            ) ||
            valor.includes(
                "iluminacao"
            ) ||
            valor.includes(
                "poste"
            )
        ) {
            return "/assets/icons/painel/ocorrencia/iluminacao-publica.png";
        }

        if (
            valor.includes(
                "lixo"
            ) ||
            valor.includes(
                "coleta"
            )
        ) {
            return "/assets/icons/painel/ocorrencia/lixeira-de-reciclagem.png";
        }

        if (
            valor.includes(
                "praga"
            )
        ) {
            return "/assets/icons/painel/ocorrencia/controle-de-pragas.png";
        }

        if (
            valor.includes(
                "manutenção"
            ) ||
            valor.includes(
                "manutencao"
            )
        ) {
            return "/assets/icons/painel/ocorrencia/manutencao.png";
        }

        if (valor.includes("Árvore Caída") ||
        valor.includes("caída")){
        return "/assets/icons/painel/ocorrencia/arvore-caida.png";
        }

        return "/assets/icons/painel/ocorrencia/3-pontos.png";
    }


    function obterFiltroBotao(
        botao
    ) {
        const texto =
            String(
                botao?.textContent || ""
            )
                .trim()
                .toLowerCase();

        if (
            texto === "pendentes"
        ) {
            return "pendentes";
        }

        if (
            texto === "em andamento"
        ) {
            return "em_andamento";
        }

        if (
            texto === "resolvidos"
        ) {
            return "resolvidos";
        }

        if (
            texto === "cancelados"
        ) {
            return "cancelados";
        }

        return "";
    }


    /*====================================================================================================

    USUÁRIO

    ====================================================================================================*/

    function obterUsuarioArmazenado() {
        const valor =
            localStorage.getItem(
                "cidade360_usuario"
            ) ||
            sessionStorage.getItem(
                "cidade360_usuario"
            );

        if (!valor) {
            return null;
        }

        try {
            return JSON.parse(
                valor
            );

        } catch (error) {
            return null;
        }
    }


    async function carregarUsuario() {
        const usuarioArmazenado =
            obterUsuarioArmazenado();

        if (
            usuarioArmazenado?.tipo_usuario
        ) {
            estado.usuario =
                usuarioArmazenado;

            configurarInterfacePorPerfil();

            return;
        }

        const resposta =
            await fetchAutenticado(
                API_USUARIO_ACOMPANHAMENTO,
                {
                    method:
                        "GET"
                }
            );

        const dados =
            await lerResposta(
                resposta
            );

        if (
            !resposta.ok ||
            !dados?.sucesso ||
            !dados?.usuario
        ) {
            throw new Error(
                dados?.mensagem ||
                "Não foi possível identificar o usuário."
            );
        }

        estado.usuario =
            dados.usuario;

        configurarInterfacePorPerfil();
    }


    function configurarInterfacePorPerfil() {
        if (
            !ehAdministrador()
        ) {
            return;
        }

        if (
            tituloPaginaOcorrencias
        ) {
            tituloPaginaOcorrencias.textContent =
                "Gestão de Ocorrências";
        }

        if (
            descricaoPaginaOcorrencias
        ) {
            descricaoPaginaOcorrencias.textContent =
                "Visualize as solicitações dos cidadãos, acompanhe o histórico e atualize o andamento de cada atendimento.";
        }

        if (
            btnNovaOcorrencia
        ) {
            btnNovaOcorrencia.hidden =
                true;
        }

        if (
            campoPesquisa
        ) {
            campoPesquisa.placeholder =
                "Buscar por título, local, cidadão ou categoria...";
        }
    }


    /*====================================================================================================

    STATUS DISPONÍVEIS

    ====================================================================================================*/

    async function carregarStatusDisponiveis() {
        const resposta =
            await fetchAutenticado(
                `${API_OCORRENCIAS_ACOMPANHAMENTO}/status`,
                {
                    method:
                        "GET"
                }
            );

        const dados =
            await lerResposta(
                resposta
            );

        if (
            !resposta.ok ||
            !dados?.sucesso ||
            !Array.isArray(
                dados.status
            )
        ) {
            throw new Error(
                dados?.mensagem ||
                "Não foi possível carregar os status."
            );
        }

        estado.statusDisponiveis =
            dados.status;
    }


    /*====================================================================================================

    RESUMO

    ====================================================================================================*/

    async function carregarResumo() {
        const url =
            ehAdministrador()
                ? `${API_OCORRENCIAS_ACOMPANHAMENTO}/admin/resumo`
                : `${API_OCORRENCIAS_ACOMPANHAMENTO}/resumo`;

        const resposta =
            await fetchAutenticado(
                url,
                {
                    method:
                        "GET"
                }
            );

        const dados =
            await lerResposta(
                resposta
            );

        if (
            !resposta.ok ||
            !dados?.sucesso ||
            !dados?.resumo
        ) {
            throw new Error(
                dados?.mensagem ||
                "Não foi possível carregar o resumo."
            );
        }

        if (
            numeroTotal
        ) {
            numeroTotal.textContent =
                String(
                    Number(
                        dados.resumo.total
                    ) || 0
                );
        }

        if (
            numeroPendentes
        ) {
            numeroPendentes.textContent =
                String(
                    Number(
                        dados.resumo.pendentes
                    ) || 0
                );
        }

        if (
            numeroAndamento
        ) {
            numeroAndamento.textContent =
                String(
                    Number(
                        dados.resumo.em_andamento
                    ) || 0
                );
        }

        if (
            numeroResolvidas
        ) {
            numeroResolvidas.textContent =
                String(
                    Number(
                        dados.resumo.resolvidas
                    ) || 0
                );
        }
    }


    /*====================================================================================================

    CARREGAMENTO DA LISTA

    ====================================================================================================*/

    function construirUrlListagem() {
        const base =
            ehAdministrador()
                ? `${API_OCORRENCIAS_ACOMPANHAMENTO}/admin`
                : API_OCORRENCIAS_ACOMPANHAMENTO;

        const parametros =
            new URLSearchParams();

        parametros.set(
            "pagina",
            String(
                estado.pagina
            )
        );

        parametros.set(
            "limite",
            String(
                LIMITE_POR_PAGINA
            )
        );

        if (
            estado.filtroStatus
        ) {
            parametros.set(
                "status",
                estado.filtroStatus
            );
        }

        if (
            estado.busca
        ) {
            parametros.set(
                "busca",
                estado.busca
            );
        }

        return `${base}?${parametros.toString()}`;
    }


    async function carregarLista() {
        if (
            estado.carregandoLista
        ) {
            return;
        }

        estado.carregandoLista =
            true;

        renderizarCarregando();

        try {
            const resposta =
                await fetchAutenticado(
                    construirUrlListagem(),
                    {
                        method:
                            "GET"
                    }
                );

            const dados =
                await lerResposta(
                    resposta
                );

            if (
                !resposta.ok ||
                !dados?.sucesso ||
                !Array.isArray(
                    dados.ocorrencias
                )
            ) {
                throw new Error(
                    dados?.mensagem ||
                    "Não foi possível carregar as ocorrências."
                );
            }

            estado.ocorrencias =
                dados.ocorrencias;

            estado.pagina =
                Number(
                    dados.paginacao?.pagina
                ) || 1;

            estado.totalPaginas =
                Number(
                    dados.paginacao?.total_paginas
                ) || 1;

            estado.total =
                Number(
                    dados.paginacao?.total
                ) || 0;

            renderizarLista();

        } catch (error) {
            console.error(
                "Erro ao carregar ocorrências:",
                error
            );

            renderizarErroLista(
                error.message ||
                "Não foi possível carregar as ocorrências."
            );

        } finally {
            estado.carregandoLista =
                false;
        }
    }


    /*====================================================================================================

    ESTADO DE CARREGAMENTO

    ====================================================================================================*/

    function renderizarCarregando() {
        if (
            !containerCards
        ) {
            return;
        }

        containerCards.innerHTML = `
            <div class="estado-lista-ocorrencias">
                <div class="spinner-ocorrencias"></div>
                <strong>Carregando ocorrências...</strong>
                <span>Buscando suas solicitações atualizadas.</span>
            </div>
        `;
    }


    /*====================================================================================================

    ESTADO DE ERRO

    ====================================================================================================*/

    function renderizarErroLista(
        mensagem
    ) {
        if (
            !containerCards
        ) {
            return;
        }

        containerCards.innerHTML = `
            <div class="estado-lista-ocorrencias estado-erro-ocorrencias">
                <strong>Não foi possível carregar as ocorrências.</strong>
                <span>${escaparHtml(mensagem)}</span>
                <button class="btn-tentar-novamente-ocorrencias" id="btn-tentar-lista-ocorrencias" type="button">
                    Tentar novamente
                </button>
            </div>
        `;

        document
            .getElementById(
                "btn-tentar-lista-ocorrencias"
            )
            ?.addEventListener(
                "click",
                carregarLista
            );
    }


    /*====================================================================================================

    LISTA VAZIA

    ====================================================================================================*/

    function renderizarListaVazia() {
        if (
            !containerCards
        ) {
            return;
        }

        const existeFiltro =
            Boolean(
                estado.filtroStatus ||
                estado.busca
            );

        containerCards.innerHTML = `
            <div class="estado-lista-ocorrencias">
                <div class="icone-estado-vazio-ocorrencias">
                    <img src="/assets/icons/global/aviso-previo.png" alt="">
                </div>

                <strong>
                    ${existeFiltro
                        ? "Nenhuma ocorrência encontrada."
                        : "Você ainda não possui ocorrências registradas."}
                </strong>

                <span>
                    ${existeFiltro
                        ? "Altere os filtros ou a busca para visualizar outros resultados."
                        : "Registre uma nova ocorrência para acompanhar o atendimento por aqui."}
                </span>

                ${!existeFiltro && !ehAdministrador()
                    ? `
                        <button class="btn-tentar-novamente-ocorrencias" id="btn-primeira-ocorrencia" type="button">
                            Registrar nova ocorrência
                        </button>
                    `
                    : ""}
            </div>
        `;

        document
            .getElementById(
                "btn-primeira-ocorrencia"
            )
            ?.addEventListener(
                "click",
                () => {
                    btnNovaOcorrencia
                        ?.click();
                }
            );
    }


    /*====================================================================================================

    CARD

    ====================================================================================================*/

    function montarCard(
        ocorrencia
    ) {
        const configStatus =
            obterConfigStatus(
                ocorrencia.status
            );

        const icone =
            obterIconeCategoria(
                ocorrencia.categoria
            );

        const codigo =
            formatarCodigo(
                ocorrencia
            );

        const data =
            formatarData(
                ocorrencia.data_criacao ||
                ocorrencia.data_ocorrencia
            );

        const endereco =
            obterEndereco(
                ocorrencia
            );

        const usuarioAdmin =
            ehAdministrador() &&
            ocorrencia.usuario_nome
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

        return `
            <div class="card-ocorrencias card-ocorrencia-dinamico" data-id="${Number(ocorrencia.id) || 0}">

                <div class="topo-card">

                    <div class="caixa-icone ${configStatus.classeIcone}">
                        <div class="icone-mascara img-icone-grande"
                            style="-webkit-mask-image: url('${icone}'); mask-image: url('${icone}');">
                        </div>
                    </div>

                    <div class="etiqueta-status ${configStatus.classe}">
                        ${escaparHtml(configStatus.nome)}
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

                    ${usuarioAdmin}

                </div>

                <div class="rodape-card">

                    <div class="dados-registro">
                        <span class="codigo">${codigo}</span>
                        <span class="data">${data}</span>
                    </div>

                    <button class="btn-detalhes" type="button" data-detalhes-id="${Number(ocorrencia.id) || 0}">
                        Detalhes
                    </button>

                </div>

            </div>
        `;
    }


    /*====================================================================================================

    RENDERIZA LISTA

    ====================================================================================================*/

    function renderizarLista() {
        if (
            !containerCards
        ) {
            return;
        }

        if (
            estado.ocorrencias.length === 0
        ) {
            renderizarListaVazia();

            return;
        }

        containerCards.innerHTML =
            estado.ocorrencias
                .map(
                    montarCard
                )
                .join("");

        const paginacao =
            document.createElement(
                "div"
            );

        paginacao.className =
            "paginacao-ocorrencias";

        paginacao.innerHTML =
            montarPaginacao();

        containerCards.appendChild(
            paginacao
        );

        registrarEventosCards();

        registrarEventosPaginacao();
    }


    /*====================================================================================================

    PAGINAÇÃO

    ====================================================================================================*/

    function montarPaginacao() {
        const pagina =
            estado.pagina;

        const totalPaginas =
            estado.totalPaginas;

        const inicio =
            estado.total === 0
                ? 0
                : (
                    (pagina - 1) *
                    LIMITE_POR_PAGINA
                ) + 1;

        const fim =
            Math.min(
                pagina *
                LIMITE_POR_PAGINA,
                estado.total
            );

        return `
            <div class="paginacao-informacao">
                Exibindo ${inicio}-${fim} de ${estado.total}
            </div>

            <div class="paginacao-botoes">

                <button
                    class="btn-paginacao"
                    id="btn-pagina-anterior"
                    type="button"
                    ${pagina <= 1 ? "disabled" : ""}
                >
                    &larr;
                </button>

                <span class="pagina-atual-ocorrencias">
                    Página ${pagina} de ${totalPaginas}
                </span>

                <button
                    class="btn-paginacao"
                    id="btn-proxima-pagina"
                    type="button"
                    ${pagina >= totalPaginas ? "disabled" : ""}
                >
                    &rarr;
                </button>

            </div>
        `;
    }


    function registrarEventosPaginacao() {
        document
            .getElementById(
                "btn-pagina-anterior"
            )
            ?.addEventListener(
                "click",
                () => {
                    if (
                        estado.pagina <= 1
                    ) {
                        return;
                    }

                    estado.pagina--;

                    carregarLista();

                    rolarParaLista();
                }
            );

        document
            .getElementById(
                "btn-proxima-pagina"
            )
            ?.addEventListener(
                "click",
                () => {
                    if (
                        estado.pagina >=
                        estado.totalPaginas
                    ) {
                        return;
                    }

                    estado.pagina++;

                    carregarLista();

                    rolarParaLista();
                }
            );
    }


    function rolarParaLista() {
        document
            .querySelector(
                ".container-filtro-ocorrencias"
            )
            ?.scrollIntoView({
                behavior:
                    "smooth",

                block:
                    "start"
            });
    }


    /*====================================================================================================

    EVENTOS DOS CARDS

    ====================================================================================================*/

    function registrarEventosCards() {
        document
            .querySelectorAll(
                "[data-detalhes-id]"
            )
            .forEach((botao) => {
                botao.addEventListener(
                    "click",
                    (event) => {
                        event.stopPropagation();

                        abrirDetalhes(
                            Number(
                                botao.dataset.detalhesId
                            )
                        );
                    }
                );
            });

        document
            .querySelectorAll(
                ".card-ocorrencia-dinamico"
            )
            .forEach((card) => {
                card.addEventListener(
                    "dblclick",
                    () => {
                        abrirDetalhes(
                            Number(
                                card.dataset.id
                            )
                        );
                    }
                );
            });
    }


    /*====================================================================================================

    FILTROS

    ====================================================================================================*/

    function registrarFiltros() {
        botoesFiltro
            .forEach((botao) => {
                botao.addEventListener(
                    "click",
                    () => {
                        botoesFiltro
                            .forEach((item) => {
                                item.classList.remove(
                                    "ativo"
                                );
                            });

                        botao.classList.add(
                            "ativo"
                        );

                        estado.filtroStatus =
                            obterFiltroBotao(
                                botao
                            );

                        estado.pagina =
                            1;

                        carregarLista();
                    }
                );
            });

        campoPesquisa
            ?.addEventListener(
                "input",
                () => {
                    if (
                        estado.debounceBusca
                    ) {
                        clearTimeout(
                            estado.debounceBusca
                        );
                    }

                    estado.debounceBusca =
                        setTimeout(
                            () => {
                                estado.busca =
                                    String(
                                        campoPesquisa.value || ""
                                    )
                                        .trim()
                                        .slice(
                                            0,
                                            100
                                        );

                                estado.pagina =
                                    1;

                                carregarLista();

                            },
                            TEMPO_BUSCA
                        );
                }
            );
    }


    /*====================================================================================================

    DETALHES

    ====================================================================================================*/

    async function abrirDetalhes(
        id
    ) {
        if (
            !Number.isInteger(id) ||
            id <= 0 ||
            estado.carregandoDetalhes
        ) {
            return;
        }

        estado.carregandoDetalhes =
            true;

        mostrarTelaDetalhesCarregando();

        try {
            const resposta =
                await fetchAutenticado(
                    `${API_OCORRENCIAS_ACOMPANHAMENTO}/${id}`,
                    {
                        method:
                            "GET"
                    }
                );

            const dados =
                await lerResposta(
                    resposta
                );

            if (
                !resposta.ok ||
                !dados?.sucesso ||
                !dados?.ocorrencia
            ) {
                throw new Error(
                    dados?.mensagem ||
                    "Não foi possível carregar os detalhes."
                );
            }

            renderizarDetalhes(
                dados.ocorrencia
            );

        } catch (error) {
            console.error(
                "Erro ao abrir detalhes:",
                error
            );

            renderizarErroDetalhes(
                error.message ||
                "Não foi possível carregar os detalhes."
            );

        } finally {
            estado.carregandoDetalhes =
                false;
        }
    }


    function mostrarTelaDetalhesCarregando() {
        destruirMapaDetalhes();

        telaOcorrencias
            ?.classList.add(
                "oculto"
            );

        telaFormulario
            ?.classList.add(
                "oculto"
            );

        telaDetalhes
            ?.classList.remove(
                "oculto"
            );

        if (
            telaDetalhes
        ) {
            telaDetalhes.innerHTML = `
                <div class="estado-detalhes-ocorrencia">
                    <div class="spinner-ocorrencias"></div>
                    <strong>Carregando detalhes...</strong>
                    <span>Buscando o histórico atualizado da solicitação.</span>
                </div>
            `;
        }

        window.scrollTo({
            top:
                0,

            behavior:
                "smooth"
        });
    }


    function renderizarErroDetalhes(
        mensagem
    ) {
        if (
            !telaDetalhes
        ) {
            return;
        }

        telaDetalhes.innerHTML = `
            <div class="estado-detalhes-ocorrencia estado-erro-ocorrencias">

                <strong>Não foi possível abrir a ocorrência.</strong>

                <span>${escaparHtml(mensagem)}</span>

                <button class="btn-tentar-novamente-ocorrencias" id="btn-voltar-erro-detalhes" type="button">
                    Voltar para lista
                </button>

            </div>
        `;

        document
            .getElementById(
                "btn-voltar-erro-detalhes"
            )
            ?.addEventListener(
                "click",
                voltarParaLista
            );
    }


    function renderizarDetalhes(
        ocorrencia
    ) {
        if (
            !telaDetalhes
        ) {
            return;
        }

        destruirMapaDetalhes();

        const configStatus =
            obterConfigStatus(
                ocorrencia.status
            );

        const icone =
            obterIconeCategoria(
                ocorrencia.categoria
            );

        const codigo =
            formatarCodigo(
                ocorrencia
            );

        const endereco =
            obterEndereco(
                ocorrencia
            );

        const historico =
            montarHistorico(
                ocorrencia
            );

        const progresso =
            montarProgressoStatus(
                ocorrencia.status
            );

        const fotos =
            montarFotos(
                ocorrencia.imagens
            );

        const blocoAdmin =
            ehAdministrador()
                ? montarBlocoAdministrador(
                    ocorrencia
                )
                : "";

        const blocoCidadao =
            ehAdministrador() &&
            ocorrencia.usuario_nome
                ? `
                    <div class="cartao-detalhe">
                        <h3 class="titulo-sessao">Cidadão solicitante</h3>

                        <div class="caixa-dados-cidadao">
                            <strong>${escaparHtml(ocorrencia.usuario_nome)}</strong>
                            <span>${escaparHtml(ocorrencia.usuario_email || "")}</span>
                        </div>
                    </div>
                `
                : "";

        telaDetalhes.innerHTML = `
            <div class="cabecalho-detalhes">

                <button class="btn-voltar" id="btn-voltar-lista-detalhes" type="button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                        fill="none" stroke="#566987" stroke-width="2.5" stroke-linecap="round"
                        stroke-linejoin="round">
                        <path d="M19 12H5"></path>
                        <path d="M12 19l-7-7 7-7"></path>
                    </svg>

                    Voltar para Lista
                </button>

                <div class="info-topo-detalhes">
                    <span class="codigo-topo">${codigo}</span>

                    <div class="etiqueta-status ${configStatus.classe}">
                        ${escaparHtml(configStatus.nome)}
                    </div>
                </div>

            </div>


            <div class="progresso-status-ocorrencia">
                ${progresso}
            </div>


            <div class="conteudo-detalhes">

                <div class="coluna-esquerda">

                    <div class="cartao-detalhe">

                        <div class="info-principal">

                            <div class="caixa-icone ${configStatus.classeIcone}">
                                <div class="icone-mascara img-icone-grande"
                                    style="-webkit-mask-image: url('${icone}'); mask-image: url('${icone}');">
                                </div>
                            </div>

                            <div class="textos-principal">
                                <h2 class="titulo-grande">${escaparHtml(ocorrencia.titulo || "Ocorrência")}</h2>

                                <div class="categoria-detalhe">
                                    <div class="icone-mascara img-icone-pequeno"
                                        style="-webkit-mask-image: url('/assets/icons/global/painel-de-controle.png'); mask-image: url('/assets/icons/global/painel-de-controle.png');">
                                    </div>

                                    ${escaparHtml(ocorrencia.categoria || "Sem categoria")}
                                </div>
                            </div>

                        </div>

                        <div class="caixa-descricao">
                            <h4 class="titulo-sessao-pequeno">Descrição do Problema</h4>
                            <p class="texto-descricao">${escaparHtml(ocorrencia.descricao || "Sem descrição.")}</p>
                        </div>

                        <div class="metadados-ocorrencia">
                            <div>
                                <span>Registrada em</span>
                                <strong>${formatarData(ocorrencia.data_criacao || ocorrencia.data_ocorrencia, true)}</strong>
                            </div>

                            <div>
                                <span>Última atualização</span>
                                <strong>${formatarData(ocorrencia.data_atualizacao || ocorrencia.data_criacao || ocorrencia.data_ocorrencia, true)}</strong>
                            </div>
                        </div>

                    </div>


                    <div class="cartao-detalhe">

                        <h3 class="titulo-sessao">
                            Histórico da Solicitação
                        </h3>

                        <div class="linha-tempo linha-tempo-dinamica">
                            <div class="traco-vertical"></div>
                            ${historico}
                        </div>

                    </div>

                    ${blocoAdmin}

                </div>


                <div class="coluna-direita">

                    ${blocoCidadao}

                    <div class="cartao-detalhe">

                        <h3 class="titulo-sessao">
                            <div class="icone-mascara img-icone-pequeno color-azul"
                                style="-webkit-mask-image: url('/assets/icons/painel/nova-ocorrencias/pin-de-localizacao.png'); mask-image: url('/assets/icons/painel/nova-ocorrencias/pin-de-localizacao.png');">
                            </div>

                            Localização
                        </h3>

                        <div class="caixa-endereco">
                            ${escaparHtml(endereco)}
                        </div>

                        <div class="caixa-mapa caixa-mapa-real" id="mapa-detalhes-ocorrencia"></div>

                    </div>


                    <div class="cartao-detalhe">

                        <h3 class="titulo-sessao">
                            Evidências
                        </h3>

                        ${fotos}

                    </div>

                </div>

            </div>
        `;

        registrarEventosDetalhes(
            ocorrencia
        );

        inicializarMapaDetalhes(
            ocorrencia
        );
    }


    /*====================================================================================================

    PROGRESSO DO STATUS

    ====================================================================================================*/

    function montarProgressoStatus(
        statusAtual
    ) {
        const atual =
            String(
                statusAtual || ""
            )
                .trim()
                .toLowerCase();

        if (
            atual === "cancelado"
        ) {
            return `
                <div class="status-cancelado-progresso">
                    <strong>Solicitação cancelada</strong>
                    <span>Consulte o histórico abaixo para verificar o motivo e as atualizações registradas.</span>
                </div>
            `;
        }

        const etapas = [
            {
                nome:
                    "Recebido",

                chave:
                    "recebido"
            },
            {
                nome:
                    "Em análise",

                chave:
                    "em análise"
            },
            {
                nome:
                    "Em atendimento",

                chave:
                    "em atendimento"
            },
            {
                nome:
                    "Resolvido",

                chave:
                    "resolvido"
            }
        ];

        const indiceAtual =
            etapas.findIndex(
                (etapa) =>
                    etapa.chave ===
                    atual
            );

        return etapas
            .map(
                (etapa, indice) => {
                    const concluida =
                        indice <=
                        indiceAtual;

                    const atualEtapa =
                        indice ===
                        indiceAtual;

                    return `
                        <div class="etapa-status ${concluida ? "concluida" : ""} ${atualEtapa ? "atual" : ""}">

                            <div class="bolinha-status">
                                ${concluida ? "✓" : indice + 1}
                            </div>

                            <span>${etapa.nome}</span>

                        </div>

                        ${indice < etapas.length - 1
                            ? `<div class="linha-status ${indice < indiceAtual ? "concluida" : ""}"></div>`
                            : ""}
                    `;
                }
            )
            .join("");
    }


    /*====================================================================================================

    HISTÓRICO

    ====================================================================================================*/

    function montarHistorico(
        ocorrencia
    ) {
        const historico =
            Array.isArray(
                ocorrencia.historico
            )
                ? ocorrencia.historico
                : [];

        if (
            historico.length === 0
        ) {
            return `
                <div class="item-linha-tempo">
                    <div class="marcador-bolinha">
                        <div class="icone-mascara img-icone-pequeno"
                            style="-webkit-mask-image: url('/assets/icons/global/documento.png'); mask-image: url('/assets/icons/global/documento.png');">
                        </div>
                    </div>

                    <div class="cartao-historico">
                        <h4 class="titulo-historico">Ocorrência registrada</h4>
                        <span class="data-historico">${formatarData(ocorrencia.data_criacao || ocorrencia.data_ocorrencia, true)}</span>
                        <p class="texto-historico">Sua solicitação está registrada no sistema.</p>
                    </div>
                </div>
            `;
        }

        return historico
            .map(
                (item, indice) => {
                    const primeiro =
                        indice === 0;

                    const titulo =
                        primeiro &&
                        !item.status_anterior
                            ? "Ocorrência registrada"
                            : `Status alterado para ${item.status_novo}`;

                    const responsavel =
                        item.usuario_responsavel_nome
                            ? `<span class="responsavel-historico">Atualizado por ${escaparHtml(item.usuario_responsavel_nome)}</span>`
                            : "";

                    return `
                        <div class="item-linha-tempo item-historico-dinamico">

                            <div class="marcador-bolinha">
                                <div class="icone-mascara img-icone-pequeno"
                                    style="-webkit-mask-image: url('/assets/icons/global/documento.png'); mask-image: url('/assets/icons/global/documento.png');">
                                </div>
                            </div>

                            <div class="cartao-historico">

                                <h4 class="titulo-historico">
                                    ${escaparHtml(titulo)}
                                </h4>

                                <span class="data-historico">
                                    ${formatarData(item.data_alteracao, true)}
                                </span>

                                ${responsavel}

                                <p class="texto-historico">
                                    ${escaparHtml(
                                        item.observacao ||
                                        `A solicitação avançou para o status ${item.status_novo}.`
                                    )}
                                </p>

                            </div>

                        </div>
                    `;
                }
            )
            .join("");
    }


    /*====================================================================================================

    FOTOS

    ====================================================================================================*/

    function montarFotos(
        imagens
    ) {
        const fotos =
            Array.isArray(
                imagens
            )
                ? imagens.filter(
                    (imagem) =>
                        Boolean(
                            imagem?.url
                        )
                )
                : [];

        if (
            fotos.length === 0
        ) {
            return `
                <div class="caixa-foto-vazia">
                    <span class="texto-foto-vazia">Nenhuma foto disponível</span>
                </div>
            `;
        }

        return `
            <div class="galeria-evidencias">
                ${fotos
                    .map(
                        (foto, indice) => `
                            <button
                                class="foto-evidencia"
                                type="button"
                                data-foto-url="${escaparHtml(foto.url)}"
                                aria-label="Abrir foto ${indice + 1}"
                            >
                                <img
                                    src="${escaparHtml(foto.url)}"
                                    alt="Foto da ocorrência ${indice + 1}"
                                    loading="lazy"
                                >
                            </button>
                        `
                    )
                    .join("")}
            </div>
        `;
    }


    /*====================================================================================================

    ADMINISTRADOR

    ====================================================================================================*/

    const TRANSICOES_PERMITIDAS = {
        "Recebido": [
            "Em análise",
            "Cancelado"
        ],

        "Em análise": [
            "Em atendimento",
            "Cancelado"
        ],

        "Em atendimento": [
            "Em análise",
            "Resolvido",
            "Cancelado"
        ],

        "Resolvido": [
            "Em atendimento"
        ],

        "Cancelado": [
            "Recebido"
        ]
    };


    function montarBlocoAdministrador(
        ocorrencia
    ) {
        const permitidos =
            TRANSICOES_PERMITIDAS[
                ocorrencia.status
            ] || [];

        const opcoes =
            estado.statusDisponiveis
                .filter(
                    (status) =>
                        permitidos.includes(
                            status.nome
                        )
                )
                .map(
                    (status) => `
                        <option value="${Number(status.id) || 0}">
                            ${escaparHtml(status.nome)}
                        </option>
                    `
                )
                .join("");

        if (
            !opcoes
        ) {
            return `
                <div class="cartao-detalhe painel-admin-status">
                    <h3 class="titulo-sessao">Atualização de Status</h3>

                    <div class="aviso-status-final">
                        Não há uma transição disponível para este status.
                    </div>
                </div>
            `;
        }

        return `
            <div class="cartao-detalhe painel-admin-status">

                <h3 class="titulo-sessao">
                    Atualização de Status
                </h3>

                <p class="texto-admin-status">
                    Toda alteração fica registrada no histórico e será exibida ao cidadão.
                </p>

                <div class="grupo-admin-status">

                    <label for="novo-status-ocorrencia">
                        Novo status
                    </label>

                    <select id="novo-status-ocorrencia">
                        <option value="">Selecione o próximo status</option>
                        ${opcoes}
                    </select>

                </div>

                <div class="grupo-admin-status">

                    <label for="observacao-status-ocorrencia">
                        Observação para o cidadão
                    </label>

                    <textarea
                        id="observacao-status-ocorrencia"
                        maxlength="1000"
                        placeholder="Ex.: Equipe responsável acionada e atendimento programado."
                    ></textarea>

                </div>

                <div class="mensagem-admin-status" id="mensagem-admin-status" hidden></div>

                <button
                    class="btn-atualizar-status"
                    id="btn-atualizar-status"
                    type="button"
                    data-ocorrencia-id="${Number(ocorrencia.id) || 0}"
                >
                    Atualizar status
                </button>

            </div>
        `;
    }


    async function atualizarStatus(
        ocorrenciaId
    ) {
        if (
            estado.atualizandoStatus
        ) {
            return;
        }

        const select =
            document.getElementById(
                "novo-status-ocorrencia"
            );

        const textarea =
            document.getElementById(
                "observacao-status-ocorrencia"
            );

        const mensagem =
            document.getElementById(
                "mensagem-admin-status"
            );

        const statusId =
            Number(
                select?.value
            );

        const observacao =
            String(
                textarea?.value || ""
            )
                .trim()
                .slice(
                    0,
                    1000
                );

        if (
            !Number.isInteger(
                statusId
            ) ||
            statusId <= 0
        ) {
            mostrarMensagemAdmin(
                mensagem,
                "Selecione um novo status.",
                "erro"
            );

            return;
        }

        estado.atualizandoStatus =
            true;

        const botao =
            document.getElementById(
                "btn-atualizar-status"
            );

        if (
            botao
        ) {
            botao.disabled =
                true;

            botao.textContent =
                "Atualizando...";
        }

        try {
            const resposta =
                await fetchAutenticado(
                    `${API_OCORRENCIAS_ACOMPANHAMENTO}/${ocorrenciaId}/status`,
                    {
                        method:
                            "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                status_id:
                                    statusId,

                                observacao
                            })
                    }
                );

            const dados =
                await lerResposta(
                    resposta
                );

            if (
                !resposta.ok ||
                !dados?.sucesso
            ) {
                throw new Error(
                    dados?.mensagem ||
                    "Não foi possível atualizar o status."
                );
            }

            mostrarMensagemAdmin(
                mensagem,
                dados.mensagem ||
                "Status atualizado com sucesso.",
                "sucesso"
            );

            await Promise.allSettled([
                carregarResumo(),
                carregarLista()
            ]);

            setTimeout(
                () => {
                    abrirDetalhes(
                        ocorrenciaId
                    );
                },
                600
            );

        } catch (error) {
            console.error(
                "Erro ao atualizar status:",
                error
            );

            mostrarMensagemAdmin(
                mensagem,
                error.message ||
                "Não foi possível atualizar o status.",
                "erro"
            );

        } finally {
            estado.atualizandoStatus =
                false;

            if (
                botao
            ) {
                botao.disabled =
                    false;

                botao.textContent =
                    "Atualizar status";
            }
        }
    }


    function mostrarMensagemAdmin(
        elemento,
        texto,
        tipo
    ) {
        if (
            !elemento
        ) {
            return;
        }

        elemento.hidden =
            false;

        elemento.className =
            `mensagem-admin-status ${tipo}`;

        elemento.textContent =
            texto;
    }


    /*====================================================================================================

    EVENTOS DOS DETALHES

    ====================================================================================================*/

    function registrarEventosDetalhes(
        ocorrencia
    ) {
        document
            .getElementById(
                "btn-voltar-lista-detalhes"
            )
            ?.addEventListener(
                "click",
                voltarParaLista
            );

        document
            .getElementById(
                "btn-atualizar-status"
            )
            ?.addEventListener(
                "click",
                () => {
                    atualizarStatus(
                        Number(
                            ocorrencia.id
                        )
                    );
                }
            );

        document
            .querySelectorAll(
                "[data-foto-url]"
            )
            .forEach((botao) => {
                botao.addEventListener(
                    "click",
                    () => {
                        abrirFoto(
                            botao.dataset.fotoUrl
                        );
                    }
                );
            });
    }


    function voltarParaLista() {
        destruirMapaDetalhes();

        telaDetalhes
            ?.classList.add(
                "oculto"
            );

        telaFormulario
            ?.classList.add(
                "oculto"
            );

        telaOcorrencias
            ?.classList.remove(
                "oculto"
            );

        window.scrollTo({
            top:
                0,

            behavior:
                "smooth"
        });
    }


    /*====================================================================================================

    VISUALIZAÇÃO DE FOTO

    ====================================================================================================*/

    function abrirFoto(
        url
    ) {
        if (!url) {
            return;
        }

        const overlay =
            document.createElement(
                "div"
            );

        overlay.className =
            "visualizador-foto-ocorrencia";

        overlay.innerHTML = `
            <button class="fechar-visualizador-foto" type="button" aria-label="Fechar">
                &times;
            </button>

            <img src="${escaparHtml(url)}" alt="Evidência da ocorrência">
        `;

        document.body.appendChild(
            overlay
        );

        function fechar() {
            overlay.remove();
        }

        overlay.addEventListener(
            "click",
            (event) => {
                if (
                    event.target ===
                    overlay
                ) {
                    fechar();
                }
            }
        );

        overlay
            .querySelector(
                ".fechar-visualizador-foto"
            )
            ?.addEventListener(
                "click",
                fechar
            );

        document.addEventListener(
            "keydown",
            function fecharEsc(
                event
            ) {
                if (
                    event.key !==
                    "Escape"
                ) {
                    return;
                }

                fechar();

                document.removeEventListener(
                    "keydown",
                    fecharEsc
                );
            }
        );
    }


    /*====================================================================================================

    MAPA DOS DETALHES

    ====================================================================================================*/

    function destruirMapaDetalhes() {
        if (
            estado.mapaDetalhes
        ) {
            estado.mapaDetalhes.remove();

            estado.mapaDetalhes =
                null;

            estado.marcadorDetalhes =
                null;
        }
    }


    function inicializarMapaDetalhes(
        ocorrencia
    ) {
        const elemento =
            document.getElementById(
                "mapa-detalhes-ocorrencia"
            );

        if (
            !elemento
        ) {
            return;
        }

        const latitude =
            Number(
                ocorrencia.latitude
            );

        const longitude =
            Number(
                ocorrencia.longitude
            );

        if (
            typeof L === "undefined" ||
            !Number.isFinite(
                latitude
            ) ||
            !Number.isFinite(
                longitude
            )
        ) {
            elemento.innerHTML = `
                <div class="mapa-detalhes-indisponivel">
                    Localização no mapa indisponível.
                </div>
            `;

            return;
        }

        estado.mapaDetalhes =
            L.map(
                elemento,
                {
                    zoomControl:
                        true
                }
            )
                .setView(
                    [
                        latitude,
                        longitude
                    ],
                    17
                );

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                maxZoom:
                    19,

                attribution:
                    "&copy; OpenStreetMap"
            }
        )
            .addTo(
                estado.mapaDetalhes
            );

        estado.marcadorDetalhes =
            L.marker([
                latitude,
                longitude
            ])
                .addTo(
                    estado.mapaDetalhes
                );

        estado.marcadorDetalhes
            .bindPopup(
                escaparHtml(
                    ocorrencia.titulo ||
                    "Ocorrência"
                )
            );

        setTimeout(
            () => {
                estado.mapaDetalhes
                    ?.invalidateSize();
            },
            150
        );
    }


    /*====================================================================================================

    ATUALIZAÇÃO APÓS REGISTRAR NOVA OCORRÊNCIA

    O arquivo de cadastro já controla a abertura e o retorno do formulário.

    Este observer detecta quando o formulário volta a ser ocultado
    e atualiza a listagem e os indicadores automaticamente.

    ====================================================================================================*/

    function observarFormulario() {
        if (
            !telaFormulario
        ) {
            return;
        }

        let estavaVisivel =
            !telaFormulario.classList.contains(
                "oculto"
            );

        const observer =
            new MutationObserver(
                () => {
                    const estaVisivel =
                        !telaFormulario.classList.contains(
                            "oculto"
                        );

                    if (
                        estavaVisivel &&
                        !estaVisivel
                    ) {
                        estado.pagina =
                            1;

                        Promise.allSettled([
                            carregarResumo(),
                            carregarLista()
                        ]);
                    }

                    estavaVisivel =
                        estaVisivel;
                }
            );

        observer.observe(
            telaFormulario,
            {
                attributes:
                    true,

                attributeFilter: [
                    "class"
                ]
            }
        );
    }


    /*====================================================================================================

    INICIALIZAÇÃO

    ====================================================================================================*/

    async function inicializar() {
        if (
            !telaOcorrencias ||
            !containerCards
        ) {
            return;
        }

        registrarFiltros();

        observarFormulario();

        try {
            await carregarUsuario();

            if (
                ehAdministrador()
            ) {
                await carregarStatusDisponiveis();
            }

            await Promise.allSettled([
                carregarResumo(),
                carregarLista()
            ]);

            /*
             * O ocorrencia.js original também carrega o resumo.
             *
             * Para administrador, fazemos uma última leitura do resumo geral
             * para garantir que os números exibidos sejam os administrativos.
             */
            if (
                ehAdministrador()
            ) {
                await carregarResumo();
            }

        } catch (error) {
            console.error(
                "Erro ao inicializar acompanhamento:",
                error
            );

            renderizarErroLista(
                error.message ||
                "Não foi possível iniciar o acompanhamento das ocorrências."
            );
        }
    }


    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            inicializar
        );

    } else {
        inicializar();
    }

})();
