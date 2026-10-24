/*========================================================================================================

PAINEL PRINCIPAL

Responsável por:
- Boas-vindas, nível e pontos do cidadão
- Resumo geral e taxa de resolução para o administrador
- Ocorrências recentes
- Mapa com as próprias ocorrências e as ocorrências próximas
- Consulta de cada ocorrência diretamente pelo mapa
- Prévia dos avisos da prefeitura
- Ranking das categorias mais registradas na cidade
- Tratamento de carregamento e erros

Os dados continuam vindo das mesmas rotas da API.
Os ícones e os status compartilhados ficam em /FrontEnd/pages/global/icones.js.

=========================================================================================================*/

const API_URL_PAINEL = "/api";
const API_OCORRENCIAS_PROXIMAS = "/api/ocorrencias-proximas";
const API_ESTATISTICAS_PAINEL = "/api/estatisticas-painel";
const API_AVISOS_PAINEL = "/api/avisos";
const PAGINA_LOGIN_PAINEL = "/FrontEnd/pages/login/login.html";
const PAGINA_OCORRENCIAS_PAINEL = "/FrontEnd/pages/ocorrencia/ocorrencia.html";
const PAGINA_AVISOS_PAINEL = "/FrontEnd/pages/avisos/avisos.html";

const LIMITE_OCORRENCIAS_PAINEL = 50;
const LIMITE_RECENTES_PAINEL = 5;
const LIMITE_AVISOS_PAINEL = 5;
const LIMITE_CATEGORIAS_PAINEL = 6;
const RAIO_OCORRENCIAS_PROXIMAS_KM = 5;

const { icone: iconePainel, iconeCategoria, chaveStatus, STATUS, pilula, PINO, tempoRelativo } =
    window.Cidade360;


/*========================================================================================================

ESTADO

=========================================================================================================*/

const estadoPainel = {
    usuario: null,
    resumo: null,
    ocorrencias: [],
    ocorrenciasProximas: [],
    categoriasGerais: [],
    avisos: [],
    localizacaoUsuario: null,
    mapa: null,
    camadaMinhas: null,
    camadaProximas: null,
    camadaLocalizacao: null,
    controleCamadas: null,
    carregando: false
};


/*========================================================================================================

ELEMENTOS

=========================================================================================================*/

const boasVindasPainel = document.getElementById("boasVindasPainel");
const kpisPainel = document.getElementById("kpisPainel");
const tituloMapaPainel = document.getElementById("tituloMapaPainel");
const legendaPainel = document.getElementById("legendaPainel");
const tituloRecentesPainel = document.getElementById("tituloRecentesPainel");
const listaOcorrenciasRecentesPainel = document.getElementById("listaOcorrenciasRecentesPainel");
const avisosPainel = document.getElementById("avisosPainel");
const acoesRapidasPainel = document.getElementById("acoesRapidasPainel");
const categoriasPainel = document.getElementById("categoriasPainel");
const btnVerTodasCategoriasPainel = document.getElementById("btnVerTodasCategoriasPainel");
const btnVerMapaPainel = document.getElementById("btnVerMapaPainel");
const btnVerTodasOcorrenciasPainel = document.getElementById("btnVerTodasOcorrenciasPainel");
const btnVerAvisosPainel = document.getElementById("btnVerAvisosPainel");
const subtituloAvisosPainel = document.getElementById("subtituloAvisosPainel");
const toastPainel = document.getElementById("toastPainel");


/*========================================================================================================

TOKEN E SESSÃO

=========================================================================================================*/

function obterTokenPainel() {
    return (
        localStorage.getItem("cidade360_token") ||
        sessionStorage.getItem("cidade360_token")
    );
}


function limparSessaoPainel() {
    ["cidade360_token", "cidade360_usuario", "cidade360_id"].forEach((chave) => {
        localStorage.removeItem(chave);
        sessionStorage.removeItem(chave);
    });
}


function redirecionarParaLoginPainel() {
    limparSessaoPainel();
    window.location.replace(PAGINA_LOGIN_PAINEL);
}


/*========================================================================================================

FETCH AUTENTICADO

=========================================================================================================*/

async function fetchAutenticadoPainel(url, opcoes = {}) {
    const token = obterTokenPainel();

    if (!token) {
        redirecionarParaLoginPainel();
        throw new Error("Sessão não encontrada.");
    }

    const headers = new Headers(opcoes.headers || {});
    headers.set("Authorization", `Bearer ${token}`);

    const resposta = await fetch(url, {
        ...opcoes,
        headers,
        cache: "no-store"
    });

    if (resposta.status === 401 || resposta.status === 403) {
        redirecionarParaLoginPainel();
        throw new Error("Sua sessão expirou.");
    }

    return resposta;
}


async function lerRespostaPainel(resposta) {
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


/*========================================================================================================

UTILITÁRIOS

=========================================================================================================*/

function numeroPainel(valor) {
    return Number(valor) || 0;
}


function formatarNumeroPainel(valor) {
    return numeroPainel(valor).toLocaleString("pt-BR");
}


function formatarPercentualCategoriaPainel(valor) {
    const percentual = Number(valor);

    if (!Number.isFinite(percentual)) {
        return "0%";
    }

    return `${percentual.toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
    })}%`;
}


function escaparHtmlPainel(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function plural(quantidade, singular, varios) {
    return `${formatarNumeroPainel(quantidade)} ${quantidade === 1 ? singular : varios}`;
}


function saudacaoPainel() {
    const hora = new Date().getHours();

    if (hora < 12) return "Bom dia";
    if (hora < 18) return "Boa tarde";
    return "Boa noite";
}


function primeiroNomePainel() {
    return String(estadoPainel.usuario?.nome || "").trim().split(/\s+/)[0] || "";
}


// Mesmo formato usado na página de Ocorrências: OC-2026-0007
function codigoOcorrenciaPainel(ocorrencia) {
    const data = new Date(ocorrencia?.data_criacao || ocorrencia?.data_ocorrencia || Date.now());
    const ano = Number.isNaN(data.getTime()) ? new Date().getFullYear() : data.getFullYear();

    return `OC-${ano}-${String(Number(ocorrencia?.id) || 0).padStart(4, "0")}`;
}


function chaveStatusPainel(status) {
    return chaveStatus(status) || "recebido";
}


function linkOcorrenciasPainel(parametros = {}) {
    const busca = new URLSearchParams(parametros).toString();
    return busca ? `${PAGINA_OCORRENCIAS_PAINEL}?${busca}` : PAGINA_OCORRENCIAS_PAINEL;
}


/*========================================================================================================

NÍVEL DO CIDADÃO

=========================================================================================================*/

const NIVEIS_PAINEL = [
    { minimo: 0, nome: "Cidadão Iniciante" },
    { minimo: 100, nome: "Cidadão Participativo" },
    { minimo: 500, nome: "Cidadão Ativo" },
    { minimo: 2000, nome: "Cidadão Destaque" }
];


function obterNivelPainel(pontos) {
    const total = numeroPainel(pontos);

    let indice = NIVEIS_PAINEL.length - 1;

    while (indice > 0 && total < NIVEIS_PAINEL[indice].minimo) {
        indice--;
    }

    const atual = NIVEIS_PAINEL[indice];
    const proximo = NIVEIS_PAINEL[indice + 1] || null;

    return {
        nome: atual.nome,
        proximo,
        faltam: proximo ? proximo.minimo - total : 0,
        percentual: proximo
            ? Math.min(100, ((total - atual.minimo) / (proximo.minimo - atual.minimo)) * 100)
            : 100
    };
}


/*========================================================================================================

MENSAGENS (toast)

=========================================================================================================*/

function mostrarMensagemPainel(mensagem, tipo = "info") {
    if (!toastPainel) {
        return;
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.innerHTML = `
        <span class="ok${tipo === "sucesso" ? "" : " info"}">${iconePainel(tipo === "sucesso" ? "check" : "alerta", 14)}</span>
        <span>${escaparHtmlPainel(mensagem)}</span>
    `;

    toastPainel.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("saindo");
        toast.addEventListener("animationend", () => toast.remove(), { once: true });
    }, 3800);
}


/*========================================================================================================

USUÁRIO

=========================================================================================================*/

async function carregarUsuarioPainel() {
    if (window.usuarioLogado) {
        estadoPainel.usuario = window.usuarioLogado;
        return window.usuarioLogado;
    }

    const resposta = await fetchAutenticadoPainel(`${API_URL_PAINEL}/me`, { method: "GET" });
    const dados = await lerRespostaPainel(resposta);

    if (!resposta.ok || !dados?.sucesso || !dados?.usuario) {
        throw new Error(dados?.mensagem || "Não foi possível carregar o usuário.");
    }

    estadoPainel.usuario = dados.usuario;
    window.usuarioLogado = dados.usuario;

    return dados.usuario;
}


/*
 * O perfil é confirmado pelo backend antes de escolher as consultas.
 */
function ehAdministradorPainel() {
    return String(estadoPainel.usuario?.tipo_usuario || "").trim().toUpperCase() === "ADMIN";
}


/*
 * Textos fixos da página que mudam para a prefeitura.
 */
function ajustarTextosPainel() {
    const admin = ehAdministradorPainel();

    if (tituloMapaPainel) {
        tituloMapaPainel.textContent = admin
            ? "Mapa de ocorrências do município"
            : "Ocorrências perto de você";
    }

    if (tituloRecentesPainel) {
        tituloRecentesPainel.textContent = admin
            ? "Ocorrências recentes"
            : "Minhas ocorrências recentes";
    }

    // Ícones dos links e do botão de tela cheia
    [btnVerTodasOcorrenciasPainel, btnVerAvisosPainel, btnVerTodasCategoriasPainel].forEach((link) => {
        link?.insertAdjacentHTML("beforeend", ` ${iconePainel("direita", 15)}`);
    });

    if (btnVerMapaPainel) {
        btnVerMapaPainel.innerHTML = iconePainel("expandir", 18);
    }

    renderizarLegendaPainel();
}


/*========================================================================================================

RESUMO

=========================================================================================================*/

async function carregarResumoPainel() {
    const resposta = await fetchAutenticadoPainel(
        ehAdministradorPainel()
            ? `${API_URL_PAINEL}/ocorrencias/admin/resumo`
            : `${API_URL_PAINEL}/ocorrencias/resumo`,
        { method: "GET" }
    );

    const dados = await lerRespostaPainel(resposta);

    if (!resposta.ok || !dados?.sucesso || !dados?.resumo) {
        throw new Error(dados?.mensagem || "Não foi possível carregar o resumo.");
    }

    estadoPainel.resumo = dados.resumo;

    renderizarBoasVindasPainel();
    renderizarKpisPainel();
    renderizarAcoesRapidasPainel();

    return dados.resumo;
}


/*========================================================================================================

BOAS-VINDAS

=========================================================================================================*/

function renderizarBoasVindasPainel() {
    if (!boasVindasPainel) {
        return;
    }

    const resumo = estadoPainel.resumo || {};
    const hoje = new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long"
    });

    if (ehAdministradorPainel()) {
        const pendentes = numeroPainel(resumo.pendentes);
        const andamento = numeroPainel(resumo.em_andamento);
        const validas = numeroPainel(resumo.total) - numeroPainel(resumo.canceladas);
        const resolvidas = numeroPainel(resumo.resolvidas);
        const taxa = validas > 0 ? Math.round((resolvidas / validas) * 100) : 0;

        const texto = pendentes
            ? `${plural(pendentes, "ocorrência aguarda", "ocorrências aguardam")} análise e ${formatarNumeroPainel(andamento)} ${andamento === 1 ? "está" : "estão"} em atendimento.`
            : "Nenhuma ocorrência aguardando análise. Bom trabalho!";

        boasVindasPainel.innerHTML = `
            <div class="textos">
                <small>${escaparHtmlPainel(hoje)}</small>
                <h2>${saudacaoPainel()}, ${escaparHtmlPainel(primeiroNomePainel())}</h2>
                <p>${escaparHtmlPainel(texto)}</p>
                <div class="acoes-hero">
                    <a class="btn-claro" href="${linkOcorrenciasPainel({ status: "recebido" })}">${iconePainel("lupa", 18)}Analisar recebidas</a>
                    <a class="btn-vidro" href="${PAGINA_AVISOS_PAINEL}">${iconePainel("megafone", 18)}Publicar aviso</a>
                </div>
            </div>

            <div class="nivel nivel-admin">
                <div class="nivel-topo">
                    <span class="nivel-medalha">${iconePainel("grafico", 22)}</span>
                    <div><strong>Taxa de resolução</strong><span>Ocorrências válidas</span></div>
                </div>
                <div class="hero-numero"><b>${taxa}%</b><span>resolvidas</span></div>
                <div class="barra-nivel"><i style="width:${taxa}%"></i></div>
                <span>${plural(resolvidas, "resolvida", "resolvidas")} de ${plural(validas, "ocorrência válida", "ocorrências válidas")}</span>
            </div>
        `;

        return;
    }

    const pontos = numeroPainel(estadoPainel.usuario?.pontos);
    const nivel = obterNivelPainel(pontos);
    const emAberto = estadoPainel.ocorrencias.filter((ocorrencia) => {
        const chave = chaveStatusPainel(ocorrencia.status);
        return chave !== "resolvido" && chave !== "cancelado";
    }).length;

    const texto = emAberto
        ? `Você tem ${plural(emAberto, "ocorrência em aberto", "ocorrências em aberto")}. Obrigado por ajudar a cuidar da cidade.`
        : "Nenhuma ocorrência em aberto agora. Obrigado por ajudar a cuidar da cidade.";

    boasVindasPainel.innerHTML = `
        <div class="textos">
            <small>${escaparHtmlPainel(hoje)}</small>
            <h2>${saudacaoPainel()}, ${escaparHtmlPainel(primeiroNomePainel())} 👋</h2>
            <p>${escaparHtmlPainel(texto)}</p>
            <div class="acoes-hero">
                <a class="btn-claro" href="${linkOcorrenciasPainel({ nova: 1 })}">${iconePainel("mais", 18)}Nova ocorrência</a>
                <a class="btn-vidro" href="${PAGINA_OCORRENCIAS_PAINEL}">${iconePainel("lista", 18)}Minhas ocorrências</a>
            </div>
        </div>

        <div class="nivel">
            <div class="nivel-topo">
                <span class="nivel-medalha">${iconePainel("medalha", 22)}</span>
                <div><strong>${escaparHtmlPainel(nivel.nome)}</strong><span>Seu nível no Cidade360</span></div>
            </div>
            <div class="hero-numero"><b>${formatarNumeroPainel(pontos)}</b><span>pontos</span></div>
            <div class="barra-nivel"><i style="width:${nivel.percentual}%"></i></div>
            <span>${nivel.proximo
                ? `Faltam ${formatarNumeroPainel(nivel.faltam)} pts para ${escaparHtmlPainel(nivel.proximo.nome)}`
                : "Você chegou ao nível máximo!"}</span>
        </div>
    `;
}


/*========================================================================================================

NÚMEROS (KPIs)

=========================================================================================================*/

function htmlKpiPainel({ cor, icone, valor, titulo, sub, status }) {
    const link = status !== undefined;
    const tag = link ? "a" : "div";
    const href = link ? ` href="${linkOcorrenciasPainel(status ? { status } : {})}"` : "";

    return `
        <${tag} class="kpi" data-k="${cor}"${href}>
            <div class="kpi-topo">
                <span class="kpi-icone">${iconePainel(icone, 22)}</span>
                ${link ? `<span class="kpi-tendencia">${iconePainel("direita", 16)}</span>` : ""}
            </div>
            <b>${valor}</b>
            <p>${titulo}</p>
            <span class="sub">${sub}</span>
        </${tag}>
    `;
}


function renderizarKpisPainel(falhou = false) {
    if (!kpisPainel) {
        return;
    }

    const resumo = estadoPainel.resumo || {};
    const valor = (campo) => (falhou ? "—" : formatarNumeroPainel(resumo[campo]));

    if (ehAdministradorPainel()) {
        kpisPainel.innerHTML = [
            { cor: "azul", icone: "lista", valor: valor("total"), titulo: "Total de ocorrências", sub: "Registradas no município", status: "" },
            { cor: "laranja", icone: "entrada", valor: valor("pendentes"), titulo: "Aguardando análise", sub: "Recebidas e em análise", status: "recebido" },
            { cor: "verde", icone: "andamento", valor: valor("em_andamento"), titulo: "Em andamento", sub: "Equipes em atendimento", status: "em_andamento" },
            { cor: "roxo", icone: "checkCirculo", valor: valor("resolvidas"), titulo: "Resolvidas", sub: "Concluídas pela prefeitura", status: "resolvido" }
        ].map(htmlKpiPainel).join("");

        return;
    }

    const pontos = numeroPainel(estadoPainel.usuario?.pontos);

    kpisPainel.innerHTML = [
        { cor: "azul", icone: "lista", valor: valor("total"), titulo: "Minhas ocorrências", sub: "Total registradas", status: "" },
        { cor: "verde", icone: "andamento", valor: valor("em_andamento"), titulo: "Em andamento", sub: "Sendo atendidas agora", status: "em_andamento" },
        { cor: "roxo", icone: "checkCirculo", valor: valor("resolvidas"), titulo: "Resolvidas", sub: "Ocorrências concluídas", status: "resolvido" },
        { cor: "laranja", icone: "estrela", valor: formatarNumeroPainel(pontos), titulo: "Pontos acumulados", sub: escaparHtmlPainel(obterNivelPainel(pontos).nome) }
    ].map(htmlKpiPainel).join("");
}


/*========================================================================================================

OCORRÊNCIAS (todas as páginas da API)

=========================================================================================================*/

async function carregarTodasOcorrenciasPainel() {
    const ocorrencias = [];

    let pagina = 1;
    let totalPaginas = 1;

    do {
        const parametros = new URLSearchParams({
            pagina: String(pagina),
            limite: String(LIMITE_OCORRENCIAS_PAINEL)
        });

        const resposta = await fetchAutenticadoPainel(
            ehAdministradorPainel()
                ? `${API_URL_PAINEL}/ocorrencias/admin?${parametros.toString()}`
                : `${API_URL_PAINEL}/ocorrencias?${parametros.toString()}`,
            { method: "GET" }
        );

        const dados = await lerRespostaPainel(resposta);

        if (!resposta.ok || !dados?.sucesso || !Array.isArray(dados.ocorrencias)) {
            throw new Error(dados?.mensagem || "Não foi possível carregar as ocorrências.");
        }

        ocorrencias.push(...dados.ocorrencias);

        totalPaginas = Math.max(1, Number(dados?.paginacao?.total_paginas || 1));
        pagina++;

    } while (pagina <= totalPaginas);

    estadoPainel.ocorrencias = ocorrencias;

    renderizarOcorrenciasRecentesPainel();
    renderizarMarcadoresMapaPainel();
    renderizarAcoesRapidasPainel();

    // A frase "você tem X em aberto" depende da lista
    if (estadoPainel.resumo) {
        renderizarBoasVindasPainel();
    }

    return ocorrencias;
}


/*========================================================================================================

OCORRÊNCIAS RECENTES

=========================================================================================================*/

function renderizarOcorrenciasRecentesPainel() {
    if (!listaOcorrenciasRecentesPainel) {
        return;
    }

    const recentes = estadoPainel.ocorrencias.slice(0, LIMITE_RECENTES_PAINEL);

    if (recentes.length === 0) {
        listaOcorrenciasRecentesPainel.innerHTML = `
            <li class="vazio-mini">${ehAdministradorPainel()
                ? "As ocorrências registradas no município aparecerão aqui."
                : "Você ainda não registrou ocorrências."}</li>
        `;

        return;
    }

    listaOcorrenciasRecentesPainel.innerHTML = recentes
        .map((ocorrencia) => {
            const chave = chaveStatusPainel(ocorrencia.status);
            const titulo = ocorrencia.titulo || `Ocorrência #${ocorrencia.id}`;
            const autor = ehAdministradorPainel() && ocorrencia.usuario_nome
                ? `${ocorrencia.usuario_nome} · `
                : "";

            return `
                <li>
                    <a class="item-compacto st" data-st="${chave}" href="${linkOcorrenciasPainel({ ocorrencia: Number(ocorrencia.id) || 0 })}" title="${escaparHtmlPainel(titulo)}">
                        <span class="ico">${iconeCategoria(ocorrencia.categoria, 20)}</span>
                        <span class="textos">
                            <strong>${escaparHtmlPainel(titulo)}</strong>
                            <span class="sub">${codigoOcorrenciaPainel(ocorrencia)} · ${escaparHtmlPainel(autor)}${tempoRelativo(ocorrencia.data_criacao || ocorrencia.data_ocorrencia)}</span>
                        </span>
                        ${pilula(chave)}
                    </a>
                </li>
            `;
        })
        .join("");
}


function renderizarErroOcorrenciasPainel() {
    if (listaOcorrenciasRecentesPainel) {
        listaOcorrenciasRecentesPainel.innerHTML = `
            <li class="vazio-mini">Não foi possível carregar as ocorrências. Atualize a página para tentar novamente.</li>
        `;
    }
}


/*========================================================================================================

AVISOS (prévia dos 3 mais importantes)

=========================================================================================================*/

const CATEGORIAS_AVISO_PAINEL = {
    evento: { nome: "Evento", icone: "calendario" },
    inauguracao: { nome: "Inauguração", icone: "fita" },
    obras: { nome: "Obras e trânsito", icone: "cone" },
    saude: { nome: "Saúde", icone: "saude" },
    servicos: { nome: "Serviços", icone: "predio" }
};


async function carregarAvisosPainel() {
    const resposta = await fetchAutenticadoPainel(API_AVISOS_PAINEL, { method: "GET" });
    const dados = await lerRespostaPainel(resposta);

    if (!resposta.ok || !dados?.sucesso || !Array.isArray(dados.avisos)) {
        const erro = new Error(dados?.mensagem || "Não foi possível carregar os avisos.");

        // 404 = servidor sem a rota; 503 AVISOS_INDISPONIVEL = banco sem a migração 006.
        erro.indisponivel =
            resposta.status === 404 ||
            dados?.codigo === "AVISOS_INDISPONIVEL";

        throw erro;
    }

    // Fixados primeiro, depois os mais novos
    estadoPainel.avisos = [...dados.avisos].sort((a, b) =>
        (Number(Boolean(b.fixado)) - Number(Boolean(a.fixado))) ||
        (new Date(b.data_criacao) - new Date(a.data_criacao))
    );

    renderizarAvisosPainel();
    renderizarAcoesRapidasPainel();

    return estadoPainel.avisos;
}


function linkAvisoPainel(id) {
    return `${PAGINA_AVISOS_PAINEL}?aviso=${Number(id) || 0}`;
}


function dataEventoAvisoPainel(valor) {
    // data_evento vem sem fuso ("2026-10-31T09:00:00"): é o horário digitado pela prefeitura.
    const data = valor ? new Date(valor) : null;

    if (!data || Number.isNaN(data.getTime())) {
        return "";
    }

    return data
        .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
        .replace(".", "");
}


/*
  erro = undefined → lista normal
  erro.indisponivel → o servidor ainda não tem os avisos (migração 006 pendente)
  outro erro → falha de conexão, com botão para tentar de novo
*/
function renderizarAvisosPainel(erro) {
    if (!avisosPainel) {
        return;
    }

    if (erro) {
        if (subtituloAvisosPainel) {
            subtituloAvisosPainel.textContent = "Publicados pela prefeitura";
        }

        avisosPainel.innerHTML = erro.indisponivel
            ? `
                <li class="vazio-mini vazio-avisos">
                    <span class="ico-vazio">${iconePainel("megafone", 22)}</span>
                    <strong>Os avisos chegam em breve</strong>
                    <span>Assim que o servidor for atualizado, os comunicados da prefeitura aparecem aqui.</span>
                </li>
            `
            : `
                <li class="vazio-mini vazio-avisos">
                    <strong>Não foi possível carregar os avisos</strong>
                    <span>Verifique sua conexão e tente de novo.</span>
                    <button type="button" class="btn-secundario btn-pequeno" data-recarregar-avisos>Tentar novamente</button>
                </li>
            `;

        avisosPainel.querySelector("[data-recarregar-avisos]")?.addEventListener("click", () => {
            avisosPainel.innerHTML = `<li class="vazio-mini">Carregando avisos...</li>`;
            carregarAvisosPainel().catch(renderizarAvisosPainel);
        });

        return;
    }

    const total = estadoPainel.avisos.length;

    if (subtituloAvisosPainel) {
        subtituloAvisosPainel.textContent = total > 0
            ? `${plural(total, "aviso publicado", "avisos publicados")} pela prefeitura`
            : "Publicados pela prefeitura";
    }

    const avisos = estadoPainel.avisos.slice(0, LIMITE_AVISOS_PAINEL);

    if (avisos.length === 0) {
        avisosPainel.innerHTML = `
            <li class="vazio-mini vazio-avisos">
                <span class="ico-vazio">${iconePainel("megafone", 22)}</span>
                <strong>Nenhum aviso publicado ainda</strong>
                <span>${ehAdministradorPainel()
                    ? "Use \"Publicar aviso\" para comunicar a população."
                    : "Quando a prefeitura publicar um comunicado, ele aparece aqui."}</span>
            </li>
        `;
        return;
    }

    avisosPainel.innerHTML = avisos
        .map((aviso) => {
            const chave = CATEGORIAS_AVISO_PAINEL[aviso.categoria] ? aviso.categoria : "servicos";
            const categoria = CATEGORIAS_AVISO_PAINEL[chave];
            const dataEvento = dataEventoAvisoPainel(aviso.data_evento);

            const detalhes = [
                aviso.fixado ? "Fixado" : "",
                dataEvento ? `Acontece em ${dataEvento}` : "",
                tempoRelativo(aviso.data_criacao)
            ].filter(Boolean).join(" · ");

            return `
                <li>
                    <a class="item-compacto item-aviso" data-cat="${chave}" href="${linkAvisoPainel(aviso.id)}" title="${escaparHtmlPainel(aviso.titulo)}">
                        <span class="ico">${aviso.foto_url
                            ? `<img src="${escaparHtmlPainel(aviso.foto_url)}" alt="" loading="lazy">`
                            : iconePainel(categoria.icone, 20)}</span>
                        <span class="textos">
                            <strong>${aviso.fixado ? `<span class="pino-fixado" aria-label="Fixado">${iconePainel("pino", 13)}</span>` : ""}${escaparHtmlPainel(aviso.titulo)}</strong>
                            <span class="sub">${escaparHtmlPainel(detalhes)}</span>
                        </span>
                        <span class="pilula pilula-categoria">${categoria.nome}</span>
                    </a>
                </li>
            `;
        })
        .join("");

    // Foto que não carregou volta para o ícone da categoria
    avisosPainel.querySelectorAll(".ico img").forEach((imagem) => {
        imagem.addEventListener("error", () => {
            const item = imagem.closest(".item-aviso");
            const categoria = CATEGORIAS_AVISO_PAINEL[item?.dataset.cat] || CATEGORIAS_AVISO_PAINEL.servicos;
            imagem.parentElement.innerHTML = iconePainel(categoria.icone, 20);
        }, { once: true });
    });
}


/*========================================================================================================

AÇÕES RÁPIDAS

=========================================================================================================*/

function renderizarAcoesRapidasPainel() {
    if (!acoesRapidasPainel || !estadoPainel.usuario) {
        return;
    }

    const resumo = estadoPainel.resumo || {};
    const total = estadoPainel.resumo ? numeroPainel(resumo.total) : estadoPainel.ocorrencias.length;

    const acoes = ehAdministradorPainel()
        ? [
            { cor: "laranja", icone: "lupa", titulo: "Analisar recebidas", sub: `${formatarNumeroPainel(resumo.pendentes)} aguardando`, href: linkOcorrenciasPainel({ status: "recebido" }) },
            { cor: "", icone: "megafone", titulo: "Publicar aviso", sub: "Comunicar a população", href: PAGINA_AVISOS_PAINEL },
            { cor: "verde", icone: "lista", titulo: "Todas as ocorrências", sub: `${formatarNumeroPainel(total)} no total`, href: PAGINA_OCORRENCIAS_PAINEL },
            { cor: "roxo", icone: "calendario", titulo: "Ver eventos", sub: "Em breve", breve: "Eventos" }
        ]
        : [
            { cor: "", icone: "mais", titulo: "Nova ocorrência", sub: "Registrar um problema", href: linkOcorrenciasPainel({ nova: 1 }) },
            { cor: "laranja", icone: "megafone", titulo: "Ver avisos", sub: plural(estadoPainel.avisos.length, "aviso", "avisos"), href: PAGINA_AVISOS_PAINEL },
            { cor: "verde", icone: "lista", titulo: "Minhas ocorrências", sub: `${formatarNumeroPainel(total)} ${total === 1 ? "registrada" : "registradas"}`, href: PAGINA_OCORRENCIAS_PAINEL },
            { cor: "roxo", icone: "calendario", titulo: "Ver eventos", sub: "Em breve", breve: "Eventos" }
        ];

    acoesRapidasPainel.innerHTML = acoes
        .map((acao) => {
            const cor = acao.cor ? ` data-k="${acao.cor}"` : "";
            const conteudo = `
                <span class="ico">${iconePainel(acao.icone, 20)}</span>
                <span>${acao.titulo}<br><small>${acao.sub}</small></span>
            `;

            return acao.breve
                ? `<button class="acao-rapida" type="button"${cor} data-em-breve-painel="${acao.breve}">${conteudo}</button>`
                : `<a class="acao-rapida"${cor} href="${acao.href}">${conteudo}</a>`;
        })
        .join("");
}


/*========================================================================================================

CATEGORIAS MAIS REGISTRADAS NA CIDADE

O ranking vem do backend e considera todas as ocorrências
registradas no Cidade360 (não só as do usuário logado).

=========================================================================================================*/

async function carregarCategoriasGeraisPainel() {
    const resposta = await fetchAutenticadoPainel(
        `${API_ESTATISTICAS_PAINEL}/categorias?limite=50`,
        { method: "GET" }
    );

    const dados = await lerRespostaPainel(resposta);

    if (!resposta.ok || !dados?.sucesso || !Array.isArray(dados.categorias)) {
        throw new Error(dados?.mensagem || "Não foi possível carregar as categorias mais registradas.");
    }

    estadoPainel.categoriasGerais = dados.categorias;

    renderizarCategoriasPainel();

    return dados.categorias;
}


function htmlItemRankingPainel(categoria, indice, maior, comPosicao = false) {
    const total = numeroPainel(categoria.total);
    const largura = maior > 0 ? Math.max(4, (total / maior) * 100) : 0;

    return `
        <li style="--i:${indice}" title="${formatarPercentualCategoriaPainel(categoria.percentual)} das ocorrências registradas">
            ${comPosicao
                ? `<span class="posicao">${indice + 1}</span>`
                : `<span class="ico">${iconeCategoria(categoria.nome, 18)}</span>`}
            <div style="min-width:0">
                <div class="nome">
                    <span>${escaparHtmlPainel(categoria.nome)}</span>
                    ${comPosicao ? `<small>${formatarPercentualCategoriaPainel(categoria.percentual)}</small>` : ""}
                </div>
                <div class="trilho"><i style="width:${largura}%"></i></div>
            </div>
            <b>${formatarNumeroPainel(total)}</b>
        </li>
    `;
}


function renderizarCategoriasPainel() {
    if (!categoriasPainel) {
        return;
    }

    const categorias = Array.isArray(estadoPainel.categoriasGerais) ? estadoPainel.categoriasGerais : [];

    if (categorias.length === 0) {
        categoriasPainel.innerHTML = `
            <li class="vazio-mini">O ranking aparecerá assim que houver ocorrências registradas.</li>
        `;

        if (btnVerTodasCategoriasPainel) {
            btnVerTodasCategoriasPainel.hidden = true;
        }

        return;
    }

    const maior = Math.max(...categorias.map((categoria) => numeroPainel(categoria.total)));

    categoriasPainel.innerHTML = categorias
        .slice(0, LIMITE_CATEGORIAS_PAINEL)
        .map((categoria, indice) => htmlItemRankingPainel(categoria, indice, maior))
        .join("");

    if (btnVerTodasCategoriasPainel) {
        btnVerTodasCategoriasPainel.hidden = categorias.length <= LIMITE_CATEGORIAS_PAINEL;
    }
}


function renderizarErroCategoriasPainel() {
    if (categoriasPainel) {
        categoriasPainel.innerHTML = `
            <li class="vazio-mini">Não foi possível carregar o ranking de categorias. Tente atualizar a página em alguns instantes.</li>
        `;
    }
}


/*========================================================================================================

DIÁLOGO COM TODAS AS CATEGORIAS

=========================================================================================================*/

function abrirTodasCategoriasPainel() {
    const categorias = Array.isArray(estadoPainel.categoriasGerais) ? estadoPainel.categoriasGerais : [];

    if (categorias.length === 0) {
        mostrarMensagemPainel("Ainda não existem categorias registradas.");
        return;
    }

    fecharTodasCategoriasPainel();

    const maior = Math.max(...categorias.map((categoria) => numeroPainel(categoria.total)));
    const soma = categorias.reduce((total, categoria) => total + numeroPainel(categoria.total), 0);

    const modal = document.createElement("div");
    modal.id = "modalTodasCategoriasPainel";
    modal.innerHTML = `
        <div class="fundo" data-fechar-categorias-painel></div>

        <div class="dialogo largo" role="dialog" aria-modal="true" aria-labelledby="tituloTodasCategoriasPainel">
            <button class="btn-icone fechar-dialogo" type="button" aria-label="Fechar" data-fechar-categorias-painel>${iconePainel("x", 18)}</button>

            <h3 id="tituloTodasCategoriasPainel">Categorias mais registradas na cidade</h3>
            <p>Ranking considerando todas as ocorrências registradas no Cidade360.</p>

            <div class="resumo-categorias">
                <span>${plural(categorias.length, "categoria", "categorias")}</span>
                <span>${plural(soma, "ocorrência contabilizada", "ocorrências contabilizadas")}</span>
            </div>

            <ul class="ranking">
                ${categorias.map((categoria, indice) => htmlItemRankingPainel(categoria, indice, maior, true)).join("")}
            </ul>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.classList.add("dialogo-aberto");

    modal.querySelectorAll("[data-fechar-categorias-painel]").forEach((elemento) => {
        elemento.addEventListener("click", fecharTodasCategoriasPainel);
    });

    modal.querySelector(".fechar-dialogo")?.focus();
}


function fecharTodasCategoriasPainel() {
    document.getElementById("modalTodasCategoriasPainel")?.remove();
    document.body.classList.remove("dialogo-aberto");
}


/*========================================================================================================

MAPA

=========================================================================================================*/

function inicializarMapaPainel() {
    const elementoMapa = document.getElementById("mapaPainel");

    if (!elementoMapa || typeof L === "undefined" || estadoPainel.mapa) {
        return;
    }

    estadoPainel.mapa = L.map("mapaPainel", { zoomControl: true })
        .setView([-20.6884, -48.4112], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap"
    }).addTo(estadoPainel.mapa);

    estadoPainel.camadaMinhas = L.layerGroup().addTo(estadoPainel.mapa);
    estadoPainel.camadaProximas = L.layerGroup().addTo(estadoPainel.mapa);
    estadoPainel.camadaLocalizacao = L.layerGroup().addTo(estadoPainel.mapa);

    estadoPainel.controleCamadas = L.control.layers(
        null,
        ehAdministradorPainel()
            ? { "Ocorrências do município": estadoPainel.camadaMinhas }
            : {
                "Minhas ocorrências": estadoPainel.camadaMinhas,
                "Ocorrências próximas": estadoPainel.camadaProximas,
                "Minha localização": estadoPainel.camadaLocalizacao
            },
        { collapsed: true }
    ).addTo(estadoPainel.mapa);

    setTimeout(() => estadoPainel.mapa?.invalidateSize(), 200);
}


function renderizarLegendaPainel() {
    if (!legendaPainel) {
        return;
    }

    const chaves = ["recebido", "em_analise", "em_andamento", "resolvido"];

    if (ehAdministradorPainel()) {
        chaves.push("cancelado");
    }

    legendaPainel.innerHTML =
        chaves.map((chave) => `<span class="st" data-st="${chave}"><i></i>${STATUS[chave].nome}</span>`).join("") +
        (ehAdministradorPainel() ? "" : `<span><i class="legenda-voce"></i>Você</span>`);
}


/*========================================================================================================

LOCALIZAÇÃO DO USUÁRIO

=========================================================================================================*/

function obterLocalizacaoUsuarioPainel() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (posicao) => {
                resolve({
                    latitude: posicao.coords.latitude,
                    longitude: posicao.coords.longitude,
                    precisao: posicao.coords.accuracy
                });
            },
            () => resolve(null),
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    });
}


async function carregarOcorrenciasProximasPainel() {
    const localizacao = await obterLocalizacaoUsuarioPainel();

    if (!localizacao) {
        mostrarMensagemPainel("Ative a localização do navegador para ver ocorrências perto de você.");
        return [];
    }

    estadoPainel.localizacaoUsuario = localizacao;

    renderizarLocalizacaoUsuarioPainel();

    const parametros = new URLSearchParams({
        latitude: String(localizacao.latitude),
        longitude: String(localizacao.longitude),
        raio: String(RAIO_OCORRENCIAS_PROXIMAS_KM),
        limite: "100"
    });

    const resposta = await fetchAutenticadoPainel(
        `${API_OCORRENCIAS_PROXIMAS}?${parametros.toString()}`,
        { method: "GET" }
    );

    const dados = await lerRespostaPainel(resposta);

    if (!resposta.ok || !dados?.sucesso || !Array.isArray(dados.ocorrencias)) {
        throw new Error(dados?.mensagem || "Não foi possível carregar as ocorrências próximas.");
    }

    estadoPainel.ocorrenciasProximas = dados.ocorrencias;

    renderizarMarcadoresMapaPainel();

    return dados.ocorrencias;
}


function renderizarLocalizacaoUsuarioPainel() {
    if (!estadoPainel.camadaLocalizacao || !estadoPainel.localizacaoUsuario) {
        return;
    }

    estadoPainel.camadaLocalizacao.clearLayers();

    const { latitude, longitude } = estadoPainel.localizacaoUsuario;

    L.marker([latitude, longitude], {
        icon: L.divIcon({
            className: "pino-mapa",
            html: '<span class="voce"></span>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        }),
        keyboard: false,
        zIndexOffset: -100
    })
        .bindTooltip("Você está aqui", { direction: "top", offset: [0, -8] })
        .addTo(estadoPainel.camadaLocalizacao);
}


/*========================================================================================================

MARCADORES (pino com a cor do status)

=========================================================================================================*/

function adicionarMarcadorOcorrenciaPainel(ocorrencia, tipo, indice = 0) {
    if (
        ocorrencia.latitude == null ||
        ocorrencia.longitude == null ||
        String(ocorrencia.latitude).trim() === "" ||
        String(ocorrencia.longitude).trim() === ""
    ) {
        return null;
    }

    const latitude = Number(ocorrencia.latitude);
    const longitude = Number(ocorrencia.longitude);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 ||
        Math.abs(longitude) > 180
    ) {
        return null;
    }

    const ehMinha = tipo === "minha";
    const chave = chaveStatusPainel(ocorrencia.status);
    const tamanho = ehMinha ? [30, 38] : [24, 30];

    const marcador = L.marker([latitude, longitude], {
        icon: L.divIcon({
            className: "pino-mapa",
            html: `<span class="pino st${ehMinha ? "" : " outra"}" data-st="${chave}" style="--i:${Math.min(indice, 12)}">${PINO}</span>`,
            iconSize: tamanho,
            iconAnchor: [tamanho[0] / 2, tamanho[1]],
            popupAnchor: [0, -tamanho[1] + 4]
        }),
        title: ocorrencia.titulo || "Ocorrência",
        riseOnHover: true
    });

    marcador.bindPopup(() => htmlBalaoPainel(ocorrencia, tipo), {
        className: "balao-mapa",
        maxWidth: 270,
        autoPanPadding: [24, 24]
    });

    marcador.on("popupopen", () => {
        marcador.getElement()?.querySelector(".pino")?.classList.add("aberto");
    });

    marcador.on("popupclose", () => {
        marcador.getElement()?.querySelector(".pino")?.classList.remove("aberto");
    });

    marcador.addTo(ehMinha ? estadoPainel.camadaMinhas : estadoPainel.camadaProximas);

    return [latitude, longitude];
}


/*
 * Balão do pino. Ocorrências de outros cidadãos não mostram
 * dados pessoais e não abrem o acompanhamento.
 */
function htmlBalaoPainel(ocorrencia, tipo) {
    const admin = ehAdministradorPainel();
    const ehMinha = tipo === "minha";
    const chave = chaveStatusPainel(ocorrencia.status);
    const distancia = Number(ocorrencia.distancia_km);

    const tipoTexto = admin
        ? "Ocorrência do município"
        : ehMinha ? "Sua ocorrência" : "Ocorrência próxima";

    const local = [ocorrencia.bairro, ocorrencia.cidade].filter(Boolean).join(" - ") || "Localização registrada";

    const detalhes = [
        codigoOcorrenciaPainel(ocorrencia),
        tempoRelativo(ocorrencia.data_criacao || ocorrencia.data_ocorrencia),
        !admin && Number.isFinite(distancia) ? `${distancia.toFixed(1).replace(".", ",")} km de você` : ""
    ].filter(Boolean).join(" · ");

    return `
        <div class="balao">
            <span class="tipo-balao">${tipoTexto}</span>
            ${pilula(chave)}
            <strong>${escaparHtmlPainel(ocorrencia.titulo || "Ocorrência")}</strong>
            <span class="sub">${escaparHtmlPainel(ocorrencia.categoria || "Categoria não informada")} · ${escaparHtmlPainel(local)}</span>
            <div class="linha-balao">
                <span class="sub">${escaparHtmlPainel(detalhes)}</span>
                ${ehMinha
                    ? `<a class="link-seta" href="${linkOcorrenciasPainel({ ocorrencia: Number(ocorrencia.id) || 0 })}">Ver ${iconePainel("direita", 14)}</a>`
                    : ""}
            </div>
            ${ehMinha ? "" : `<span class="privacidade">${iconePainel("cadeado", 12)} Por privacidade, os dados de quem registrou não são exibidos.</span>`}
        </div>
    `;
}


function renderizarMarcadoresMapaPainel() {
    if (!estadoPainel.mapa || !estadoPainel.camadaMinhas || !estadoPainel.camadaProximas) {
        return;
    }

    estadoPainel.camadaMinhas.clearLayers();
    estadoPainel.camadaProximas.clearLayers();

    const limites = [];
    const idsMinhas = new Set();

    estadoPainel.ocorrencias.forEach((ocorrencia, indice) => {
        idsMinhas.add(Number(ocorrencia.id));

        const ponto = adicionarMarcadorOcorrenciaPainel(ocorrencia, "minha", indice);

        if (ponto) {
            limites.push(ponto);
        }
    });

    estadoPainel.ocorrenciasProximas.forEach((ocorrencia, indice) => {
        if (idsMinhas.has(Number(ocorrencia.id))) {
            return;
        }

        const ponto = adicionarMarcadorOcorrenciaPainel(ocorrencia, "proxima", indice);

        if (ponto) {
            limites.push(ponto);
        }
    });

    if (estadoPainel.localizacaoUsuario) {
        limites.push([
            estadoPainel.localizacaoUsuario.latitude,
            estadoPainel.localizacaoUsuario.longitude
        ]);
    }

    if (limites.length === 1) {
        estadoPainel.mapa.setView(limites[0], 16);
    } else if (limites.length > 1) {
        estadoPainel.mapa.fitBounds(limites, {
            padding: [35, 35],
            maxZoom: 16
        });
    }

    setTimeout(() => estadoPainel.mapa?.invalidateSize(), 100);
}


/*========================================================================================================

MAPA EM TELA CHEIA

=========================================================================================================*/

async function abrirMapaCompletoPainel() {
    const mapa = document.getElementById("mapaPainel");

    if (!mapa) {
        return;
    }

    try {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
        } else if (document.fullscreenEnabled && typeof mapa.requestFullscreen === "function") {
            await mapa.requestFullscreen();
        } else {
            mapa.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    } catch (error) {
        mapa.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    setTimeout(() => estadoPainel.mapa?.invalidateSize(), 300);
}


document.addEventListener("fullscreenchange", () => {
    setTimeout(() => estadoPainel.mapa?.invalidateSize(), 150);
});


/*========================================================================================================

EVENTOS

Configurações, notificações e perfil do topo são controlados pelo global.js.

=========================================================================================================*/

function registrarEventosPainel() {
    btnVerMapaPainel?.addEventListener("click", abrirMapaCompletoPainel);

    btnVerTodasCategoriasPainel?.addEventListener("click", (event) => {
        event.preventDefault();
        abrirTodasCategoriasPainel();
    });

    // Itens que ainda não existem (Campanhas, Eventos)
    document.addEventListener("click", (event) => {
        const alvo = event.target.closest("[data-em-breve-painel], .menu-lista .item-breve");

        if (!alvo) {
            return;
        }

        event.preventDefault();

        const nome = alvo.dataset.emBrevePainel || alvo.querySelector("span")?.textContent || "Este módulo";

        mostrarMensagemPainel(`${nome.trim()}: em breve no Cidade360.`);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && document.getElementById("modalTodasCategoriasPainel")) {
            fecharTodasCategoriasPainel();
        }
    });

    // O mapa claro/escuro muda só via CSS; aqui só recalculamos o tamanho.
    window.addEventListener("cidade360:tema", () => {
        setTimeout(() => estadoPainel.mapa?.invalidateSize(), 100);
    });
}


/*========================================================================================================

INICIALIZAÇÃO

=========================================================================================================*/

async function inicializarPainel() {
    if (estadoPainel.carregando) {
        return;
    }

    estadoPainel.carregando = true;

    try {
        await carregarUsuarioPainel();

        ajustarTextosPainel();
        registrarEventosPainel();
        inicializarMapaPainel();
        renderizarAcoesRapidasPainel();

        const resultados = await Promise.allSettled([
            carregarResumoPainel(),
            carregarTodasOcorrenciasPainel(),
            carregarCategoriasGeraisPainel(),
            carregarAvisosPainel()
        ]);

        resultados.forEach((resultado) => {
            if (resultado.status === "rejected") {
                console.error("Erro ao carregar painel:", resultado.reason);
            }
        });

        if (resultados[0].status === "rejected") {
            renderizarBoasVindasPainel();
            renderizarKpisPainel(true);

            mostrarMensagemPainel("Não foi possível carregar o resumo. Atualize a página para tentar novamente.");
        }

        if (resultados[1].status === "rejected") {
            renderizarErroOcorrenciasPainel();

            mostrarMensagemPainel("Não foi possível carregar as ocorrências no mapa e na lista.");
        }

        if (resultados[2].status === "rejected") {
            renderizarErroCategoriasPainel();
        }

        if (resultados[3].status === "rejected") {
            renderizarAvisosPainel(resultados[3].reason);
        }

        if (ehAdministradorPainel()) {
            return;
        }

        try {
            await carregarOcorrenciasProximasPainel();
        } catch (error) {
            console.error("Erro ao carregar ocorrências próximas:", error);

            mostrarMensagemPainel("Suas ocorrências foram carregadas, mas não foi possível consultar as ocorrências próximas.");
        }

    } catch (error) {
        console.error("Erro ao iniciar painel:", error);

    } finally {
        estadoPainel.carregando = false;
    }
}


if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarPainel);
} else {
    inicializarPainel();
}
