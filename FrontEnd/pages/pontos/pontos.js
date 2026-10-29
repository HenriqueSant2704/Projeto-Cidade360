/*===================================================================

 MEUS PONTOS

 Saldo do cidadão, título atual, trilha dos 8 títulos e histórico
 de pontos por ocorrência. Os dados vêm de GET /api/pontos.

 Os títulos e os valores de cada etapa vêm do servidor
 (BackEnd/src/utils/titulosCidadao.js e pontosModel.js), então
 mudar uma regra lá já muda esta tela.

===================================================================*/

(() => {

    "use strict";

    const API_PONTOS = "/api/pontos";
    const PAGINA_OCORRENCIAS = "/FrontEnd/pages/ocorrencia/ocorrencia.html";

    const C = window.Cidade360;

    const NOMES_MOTIVO = {
        registro: "Registro",
        em_analise: "Em análise",
        em_andamento: "Em andamento",
        resolvido: "Resolvido",
        cancelamento: "Cancelada",
        reabertura: "Reaberta"
    };

    // Histórico paginado: 7 por página no computador/notebook e 5 no
    // celular/tablet. Mesmo ponto de corte do menu lateral (global.css).
    const TELA_COMPUTADOR = window.matchMedia("(min-width: 1025px)");
    const POR_PAGINA_COMPUTADOR = 7;
    const POR_PAGINA_CELULAR = 5;

    const FILTROS = [
        { chave: "todas", nome: "Todas" },
        { chave: "com_pontos", nome: "Com pontos" },
        { chave: "canceladas", nome: "Canceladas" }
    ];

    const elementos = {
        pagina: document.getElementById("paginaPontos"),
        resumo: document.getElementById("resumoPontos"),
        grade: document.querySelector(".pontos-grade"),
        filtros: document.getElementById("filtrosPontos"),
        lista: document.getElementById("listaHistoricoPontos"),
        trilha: document.getElementById("trilhaTitulos"),
        regras: document.getElementById("regrasPontos")
    };

    const estado = {
        dados: null,
        filtro: "todas",
        pagina: 1
    };

    function limitePorPagina() {
        return TELA_COMPUTADOR.matches ? POR_PAGINA_COMPUTADOR : POR_PAGINA_CELULAR;
    }


    /*---------------------------------------------------------------
      UTILITÁRIOS
    ---------------------------------------------------------------*/

    function escaparHtml(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function obterToken() {
        return (
            localStorage.getItem("cidade360_token") ||
            sessionStorage.getItem("cidade360_token")
        );
    }

    function obterUsuario() {
        const valor =
            localStorage.getItem("cidade360_usuario") ||
            sessionStorage.getItem("cidade360_usuario");

        try {
            return window.usuarioLogado || (valor ? JSON.parse(valor) : null);
        } catch (error) {
            return null;
        }
    }

    function ehAdministrador() {
        return String(obterUsuario()?.tipo_usuario || "").trim().toUpperCase() === "ADMIN";
    }

    function textoPontos(valor) {
        const pontos = Math.abs(Number(valor) || 0);
        return `${pontos.toLocaleString("pt-BR")} ${pontos === 1 ? "ponto" : "pontos"}`;
    }

    function comSinal(valor) {
        const pontos = Number(valor) || 0;
        return pontos > 0 ? `+${pontos}` : String(pontos);
    }

    function dataCurta(valor) {
        const data = new Date(valor);

        if (Number.isNaN(data.getTime())) {
            return "";
        }

        return data
            .toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })
            .replace(/\./g, "");
    }

    function ehCancelada(ocorrencia) {
        return C.chaveStatus(ocorrencia.status) === "cancelado";
    }


    /*---------------------------------------------------------------
      CARREGAR
    ---------------------------------------------------------------*/

    async function carregar() {
        const token = obterToken();

        if (!token) {
            return;
        }

        try {
            const resposta = await fetch(API_PONTOS, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store"
            });

            const dados = await resposta.json().catch(() => null);

            if (resposta.status === 503) {
                mostrarIndisponivel();
                return;
            }

            if (!resposta.ok || !dados?.sucesso) {
                throw new Error(dados?.mensagem || "Erro ao carregar os pontos.");
            }

            estado.dados = dados;
            renderizarTudo();

        } catch (error) {
            mostrarErro();

        } finally {
            elementos.pagina.setAttribute("aria-busy", "false");
        }
    }


    /*---------------------------------------------------------------
      RESUMO (saldo, título atual e barra até o próximo)
    ---------------------------------------------------------------*/

    function renderizarResumo() {
        const { saldo, titulo, proximo_titulo: proximo, titulos } = estado.dados;

        const inicioFaixa = titulo ? titulo.pontos : 0;
        const fimFaixa = proximo ? proximo.pontos : inicioFaixa;
        const progresso = proximo
            ? Math.min(100, Math.round(((saldo - inicioFaixa) / (fimFaixa - inicioFaixa)) * 100))
            : 100;

        const conquistados = titulos.filter((item) => saldo >= item.pontos).length;

        let textoProgresso;

        if (!proximo) {
            textoProgresso = "Você conquistou todos os títulos! Seus pontos continuam somando.";
        } else {
            const faltam = proximo.pontos - saldo;
            textoProgresso = `Faltam <b>${textoPontos(faltam)}</b> para <b>${escaparHtml(proximo.nome)}</b>`;
        }

        elementos.resumo.innerHTML = `
            <div class="resumo-saldo">
                <span class="rotulo">Seu saldo</span>
                <strong class="numero-saldo">${Number(saldo).toLocaleString("pt-BR")}</strong>
                <span class="unidade">${saldo === 1 ? "ponto" : "pontos"}</span>
            </div>

            <div class="resumo-titulo">
                <div class="medalha-atual ${titulo ? "" : "vazia"}" aria-hidden="true">
                    ${C.icone("medalha", 30)}
                    ${titulo ? `<span>${titulo.nivel}</span>` : ""}
                </div>

                <div class="dados-titulo">
                    <span class="rotulo">${titulo ? "Seu título" : "Ainda sem título"}</span>
                    <strong>${titulo ? escaparHtml(titulo.nome) : "Rumo ao primeiro título"}</strong>
                    <small>${titulo ? escaparHtml(titulo.descricao) : "Registre ocorrências e acompanhe a prefeitura resolvendo."}</small>
                </div>
            </div>

            <div class="resumo-progresso">
                <div class="linha-progresso">
                    <span>${textoProgresso}</span>
                    <span class="contagem-titulos">${conquistados} de ${titulos.length} títulos</span>
                </div>

                <div class="barra-progresso" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progresso}" aria-label="Progresso até o próximo título">
                    <span style="width: ${progresso}%"></span>
                </div>
            </div>
        `;
    }


    /*---------------------------------------------------------------
      TRILHA DOS TÍTULOS
    ---------------------------------------------------------------*/

    function renderizarTrilha() {
        const { saldo, titulo, titulos } = estado.dados;

        elementos.trilha.innerHTML = titulos.map((item) => {
            const conquistado = saldo >= item.pontos;
            const atual = titulo?.nivel === item.nivel;

            const classes = [
                "titulo-trilha",
                conquistado ? "conquistado" : "bloqueado",
                atual ? "atual" : ""
            ].join(" ");

            return `
                <li class="${classes}">
                    <span class="icone-trilha" aria-hidden="true">
                        ${conquistado ? C.icone("medalha", 18) : C.icone("cadeado", 16)}
                    </span>

                    <div class="texto-trilha">
                        <strong>${escaparHtml(item.nome)}</strong>
                        <small>${item.pontos.toLocaleString("pt-BR")} pontos</small>
                    </div>

                    ${atual ? '<em class="selo-atual">Seu título</em>' : ""}
                    <span class="sr">${conquistado ? "Conquistado" : "Bloqueado"}</span>
                </li>
            `;
        }).join("");
    }


    /*---------------------------------------------------------------
      COMO GANHAR PONTOS
    ---------------------------------------------------------------*/

    function renderizarRegras() {
        const regras = estado.dados.regras || {};

        const linhas = [
            ["registro", "Registrar uma ocorrência", "entrada"],
            ["em_analise", "Ela chegar em Em análise", "lupa"],
            ["em_andamento", "Ela chegar em Em andamento", "andamento"],
            ["resolvido", "Ela ser resolvida", "checkCirculo"]
        ];

        elementos.regras.innerHTML = `
            ${linhas.map(([chave, texto, icone]) => `
                <li>
                    <span class="icone-regra st" data-st="${chave === "registro" ? "recebido" : chave}">${C.icone(icone, 16)}</span>
                    <span>${texto}</span>
                    <b>+${Number(regras[chave]) || 0}</b>
                </li>
            `).join("")}
            <li class="regra-cancelada">
                <span class="icone-regra st" data-st="cancelado">${C.icone("bloqueio", 16)}</span>
                <span>Cancelada pela prefeitura (trote ou falsa): os pontos dela saem do saldo</span>
                <b>0</b>
            </li>
        `;
    }


    /*---------------------------------------------------------------
      FILTROS E HISTÓRICO
    ---------------------------------------------------------------*/

    function contarPorFiltro(chave) {
        const ocorrencias = estado.dados.ocorrencias;

        if (chave === "com_pontos") return ocorrencias.filter((item) => item.total > 0).length;
        if (chave === "canceladas") return ocorrencias.filter(ehCancelada).length;

        return ocorrencias.length;
    }

    function renderizarFiltros() {
        elementos.filtros.innerHTML = FILTROS.map((filtro) => `
            <button type="button" class="filtro-pontos" data-filtro="${filtro.chave}" aria-pressed="${estado.filtro === filtro.chave}">
                ${filtro.nome}
                <span>${contarPorFiltro(filtro.chave)}</span>
            </button>
        `).join("");
    }

    function ocorrenciasFiltradas() {
        const ocorrencias = estado.dados.ocorrencias;

        if (estado.filtro === "com_pontos") return ocorrencias.filter((item) => item.total > 0);
        if (estado.filtro === "canceladas") return ocorrencias.filter(ehCancelada);

        return ocorrencias;
    }

    function chipsMovimentos(ocorrencia) {
        const etapas = ocorrencia.movimentos.filter((movimento) => movimento.pontos > 0 && movimento.motivo !== "reabertura");

        if (etapas.length === 0) {
            return '<p class="sem-movimento">Nenhum ponto registrado nesta ocorrência.</p>';
        }

        return `
            <ul class="chips-etapas" aria-label="Pontos por etapa">
                ${etapas.map((movimento) => `
                    <li class="chip-etapa" title="${escaparHtml(dataCurta(movimento.data))}">
                        ${escaparHtml(NOMES_MOTIVO[movimento.motivo] || movimento.motivo)}
                        <b>${comSinal(movimento.pontos)}</b>
                    </li>
                `).join("")}
            </ul>
        `;
    }

    function cartaoOcorrencia(ocorrencia) {
        const chave = C.chaveStatus(ocorrencia.status) || "recebido";
        const cancelada = chave === "cancelado";
        const link = `${PAGINA_OCORRENCIAS}?ocorrencia=${Number(ocorrencia.id) || 0}`;

        const detalhes = [
            ocorrencia.categoria,
            ocorrencia.bairro,
            dataCurta(ocorrencia.data_criacao)
        ].filter(Boolean).map(escaparHtml).join(" · ");

        const totalHtml = cancelada
            ? `
                <div class="total-ocorrencia cancelada">
                    ${ocorrencia.ganhos > 0 ? `<s>${comSinal(ocorrencia.ganhos)}</s>` : ""}
                    <strong>0</strong>
                    <small>sem pontos</small>
                </div>
            `
            : `
                <div class="total-ocorrencia ${ocorrencia.total > 0 ? "positivo" : ""}">
                    <strong>${comSinal(ocorrencia.total)}</strong>
                    <small>${ocorrencia.total === 1 || ocorrencia.total === -1 ? "ponto" : "pontos"}</small>
                </div>
            `;

        return `
            <article class="cartao-ocorrencia-pontos ${cancelada ? "eh-cancelada" : ""}">
                <span class="icone-categoria st" data-st="${chave}" aria-hidden="true">${C.iconeCategoria(ocorrencia.categoria, 20)}</span>

                <div class="corpo-ocorrencia">
                    <div class="linha-titulo">
                        <a href="${link}">${escaparHtml(ocorrencia.titulo)}</a>
                        ${C.pilula(chave)}
                    </div>

                    <p class="detalhes">${detalhes}</p>

                    ${chipsMovimentos(ocorrencia)}

                    ${cancelada ? `<p class="aviso-cancelada">Cancelada pela prefeitura. ${ocorrencia.ganhos > 0 ? `Os ${textoPontos(ocorrencia.ganhos)} desta ocorrência saíram do seu saldo.` : "Ela não conta pontos."}</p>` : ""}
                </div>

                ${totalHtml}
            </article>
        `;
    }

    function renderizarHistorico() {
        const ocorrencias = ocorrenciasFiltradas();

        if (estado.dados.ocorrencias.length === 0) {
            elementos.lista.innerHTML = `
                <div class="estado-vazio">
                    ${C.icone("estrela", 34)}
                    <strong>Você ainda não tem pontos</strong>
                    <p>Cada ocorrência registrada ajuda a cidade e rende pontos para você.</p>
                    <a class="botao-primario" href="${PAGINA_OCORRENCIAS}?nova=1">${C.icone("mais", 16)} Registrar ocorrência</a>
                </div>
            `;
            return;
        }

        if (ocorrencias.length === 0) {
            elementos.lista.innerHTML = `
                <div class="estado-vazio pequeno">
                    <strong>${estado.filtro === "canceladas" ? "Nenhuma ocorrência cancelada" : "Nenhuma ocorrência com pontos ainda"}</strong>
                    <p>${estado.filtro === "canceladas" ? "Ótimo! Todas as suas ocorrências estão valendo." : "Os pontos aparecem assim que a prefeitura receber sua ocorrência."}</p>
                </div>
            `;
            return;
        }

        // A API já manda as ocorrências mais novas primeiro.
        const limite = limitePorPagina();
        const totalPaginas = Math.max(1, Math.ceil(ocorrencias.length / limite));

        estado.pagina = Math.min(Math.max(1, estado.pagina), totalPaginas);

        const inicio = (estado.pagina - 1) * limite;
        const daPagina = ocorrencias.slice(inicio, inicio + limite);

        elementos.lista.innerHTML =
            daPagina.map(cartaoOcorrencia).join("") +
            (totalPaginas > 1 ? montarPaginacao(inicio, daPagina.length, ocorrencias.length, totalPaginas) : "");
    }

    function montarPaginacao(inicio, quantidade, total, totalPaginas) {
        const pagina = estado.pagina;

        return `
            <nav class="paginacao-pontos" aria-label="Páginas do histórico">
                <span class="paginacao-informacao">
                    Exibindo ${inicio + 1}-${inicio + quantidade} de ${total}
                </span>

                <div class="paginacao-botoes">
                    <button class="btn-icone" data-pagina="anterior" type="button"
                        aria-label="Página anterior" ${pagina <= 1 ? "disabled" : ""}>
                        ${C.icone("voltar", 16)}
                    </button>

                    <span>Página ${pagina} de ${totalPaginas}</span>

                    <button class="btn-icone" data-pagina="proxima" type="button"
                        aria-label="Próxima página" ${pagina >= totalPaginas ? "disabled" : ""}>
                        ${C.icone("direita", 16)}
                    </button>
                </div>
            </nav>
        `;
    }

    function irParaPagina(pagina) {
        estado.pagina = pagina;
        renderizarHistorico();

        // Volta para o começo do histórico, senão a pessoa fica no fim da página.
        elementos.lista.closest(".pontos-historico")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function renderizarTudo() {
        elementos.grade.style.display = "";

        renderizarResumo();
        renderizarTrilha();
        renderizarRegras();
        renderizarFiltros();
        renderizarHistorico();
    }


    /*---------------------------------------------------------------
      ESTADOS DE ERRO
    ---------------------------------------------------------------*/

    function mostrarMensagemGeral(titulo, texto) {
        elementos.resumo.innerHTML = `
            <div class="estado-vazio no-resumo">
                ${C.icone("alerta", 30)}
                <strong>${titulo}</strong>
                <p>${texto}</p>
            </div>
        `;

        // Sem dados: some com o histórico e os títulos, fica só a mensagem.
        elementos.grade.style.display = "none";

        elementos.lista.innerHTML = "";
        elementos.filtros.innerHTML = "";
        elementos.trilha.innerHTML = "";
        elementos.regras.innerHTML = "";
    }

    function mostrarIndisponivel() {
        mostrarMensagemGeral(
            "Os pontos ainda estão sendo preparados",
            "O histórico de pontos vai aparecer aqui assim que a atualização do sistema for concluída."
        );
    }

    function mostrarErro() {
        mostrarMensagemGeral(
            "Não foi possível carregar seus pontos",
            'Verifique sua conexão e <button type="button" class="link-tentar" data-acao="tentar">tente de novo</button>.'
        );
    }

    function mostrarAvisoAdmin() {
        mostrarMensagemGeral(
            "Pontos são só para cidadãos",
            `Administradores não acumulam pontos. <a href="${PAGINA_OCORRENCIAS}">Ver todas as ocorrências</a>.`
        );
        elementos.pagina.setAttribute("aria-busy", "false");
    }


    /*---------------------------------------------------------------
      EVENTOS
    ---------------------------------------------------------------*/

    elementos.filtros.addEventListener("click", (event) => {
        const botao = event.target.closest("[data-filtro]");

        if (!botao || !estado.dados) {
            return;
        }

        estado.filtro = botao.dataset.filtro;
        estado.pagina = 1;
        renderizarFiltros();
        renderizarHistorico();
    });

    elementos.lista.addEventListener("click", (event) => {
        const botao = event.target.closest("[data-pagina]");

        if (!botao || botao.disabled) {
            return;
        }

        irParaPagina(estado.pagina + (botao.dataset.pagina === "proxima" ? 1 : -1));
    });

    // Girou o celular ou mudou o tamanho da janela: troca 7 por 5 (ou o
    // contrário) mantendo na tela a ocorrência que estava primeiro.
    TELA_COMPUTADOR.addEventListener("change", (event) => {
        if (!estado.dados) {
            return;
        }

        const limiteAnterior = event.matches ? POR_PAGINA_CELULAR : POR_PAGINA_COMPUTADOR;
        const primeiroItem = (estado.pagina - 1) * limiteAnterior;

        estado.pagina = Math.floor(primeiroItem / limitePorPagina()) + 1;
        renderizarHistorico();
    });

    elementos.resumo.addEventListener("click", (event) => {
        if (event.target.closest('[data-acao="tentar"]')) {
            elementos.resumo.innerHTML = '<div class="esqueleto alto"></div>';
            carregar();
        }
    });


    /*---------------------------------------------------------------
      INÍCIO
    ---------------------------------------------------------------*/

    if (ehAdministrador()) {
        mostrarAvisoAdmin();
    } else {
        carregar();
    }

})();
