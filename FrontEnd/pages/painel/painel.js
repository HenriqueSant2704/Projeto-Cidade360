/*========================================================================================================

PAINEL PRINCIPAL

Responsável por:
- Resumo das ocorrências do cidadão
- Pontos e nível
- Ocorrências recentes
- Mapa com as próprias ocorrências
- Ocorrências próximas da localização atual
- Consulta de cada ocorrência diretamente pelo mapa
- Tratamento de carregamento e erros

=========================================================================================================*/

const API_URL_PAINEL = "/api";
const API_OCORRENCIAS_PROXIMAS = "/api/ocorrencias-proximas";
const API_ESTATISTICAS_PAINEL = "/api/estatisticas-painel";
const PAGINA_LOGIN_PAINEL = "/FrontEnd/pages/login/login.html";
const PAGINA_OCORRENCIAS_PAINEL = "/FrontEnd/pages/ocorrencia/ocorrencia.html";

const LIMITE_OCORRENCIAS_PAINEL = 50;
const LIMITE_RECENTES_PAINEL = 5;
const RAIO_OCORRENCIAS_PROXIMAS_KM = 5;


/*========================================================================================================

ESTADO

=========================================================================================================*/

const estadoPainel = {
    usuario: null,
    resumo: null,
    ocorrencias: [],
    ocorrenciasProximas: [],
    categoriasGerais: [],
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



const numeroTotalPainel =
    document.getElementById(
        "numeroTotalPainel"
    );

const numeroAndamentoPainel =
    document.getElementById(
        "numeroAndamentoPainel"
    );

const numeroResolvidasPainel =
    document.getElementById(
        "numeroResolvidasPainel"
    );

const numeroPontosPainel =
    document.getElementById(
        "numeroPontosPainel"
    );

const nivelPainel =
    document.getElementById(
        "nivelPainel"
    );

const listaOcorrenciasRecentesPainel =
    document.getElementById(
        "listaOcorrenciasRecentesPainel"
    );

const categoriasPainel =
    document.getElementById(
        "categoriasPainel"
    );


const btnVerTodasCategoriasPainel =
    document.getElementById(
        "btnVerTodasCategoriasPainel"
    );

const btnVerMapaPainel =
    document.getElementById(
        "btnVerMapaPainel"
    );

const btnVerTodasOcorrenciasPainel =
    document.getElementById(
        "btnVerTodasOcorrenciasPainel"
    );

const btnNivelPainel =
    document.getElementById(
        "btnNivelPainel"
    );

const acaoNovaOcorrenciaPainel =
    document.getElementById(
        "acaoNovaOcorrenciaPainel"
    );

const acaoMinhasOcorrenciasPainel =
    document.getElementById(
        "acaoMinhasOcorrenciasPainel"
    );

const btnConfiguracoesPainel =
    document.getElementById(
        "btnConfiguracoesPainel"
    );

const btnNotificacoesPainel =
    document.getElementById(
        "btnNotificacoesPainel"
    );

const perfilUsuarioPainel =
    document.getElementById(
        "perfilUsuarioPainel"
    );

const toastPainel =
    document.getElementById(
        "toastPainel"
    );


/*========================================================================================================

TOKEN

=========================================================================================================*/

function obterTokenPainel() {
    return (
        localStorage.getItem("cidade360_token") ||
        sessionStorage.getItem("cidade360_token")
    );
}


/*========================================================================================================

SESSÃO

=========================================================================================================*/

function limparSessaoPainel() {
    const chaves = [
        "cidade360_token",
        "cidade360_usuario",
        "cidade360_id"
    ];

    chaves.forEach((chave) => {
        localStorage.removeItem(
            chave
        );

        sessionStorage.removeItem(
            chave
        );
    });
}


function redirecionarParaLoginPainel() {
    limparSessaoPainel();

    window.location.replace(
        PAGINA_LOGIN_PAINEL
    );
}


/*========================================================================================================

FETCH AUTENTICADO

=========================================================================================================*/

async function fetchAutenticadoPainel(url, opcoes = {}) {
    const token =
        obterTokenPainel();

    if (!token) {
        redirecionarParaLoginPainel();

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

    const resposta = await fetch(url, {
        ...opcoes,
        headers,
        cache: "no-store"
    });

    if (
        resposta.status === 401 ||
        resposta.status === 403
    ) {
        redirecionarParaLoginPainel();

        throw new Error(
            "Sua sessão expirou."
        );
    }

    return resposta;
}


async function lerRespostaPainel(resposta) {
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


/*========================================================================================================

UTILITÁRIOS

=========================================================================================================*/

function numeroPainel(valor) {
    return Number(valor) || 0;
}


function formatarNumeroPainel(valor) {
    return numeroPainel(valor)
        .toLocaleString(
            "pt-BR"
        );
}


function formatarDataPainel(valor) {
    if (!valor) {
        return "--/--/----";
    }

    const data =
        new Date(valor);

    if (
        Number.isNaN(
            data.getTime()
        )
    ) {
        return "--/--/----";
    }

    return data.toLocaleDateString(
        "pt-BR"
    );
}


function escaparHtmlPainel(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function obterNivelPainel(pontos) {
    const total =
        numeroPainel(
            pontos
        );

    if (total >= 2000) {
        return "Cidadão Destaque";
    }

    if (total >= 500) {
        return "Cidadão Ativo";
    }

    if (total >= 100) {
        return "Cidadão Participativo";
    }

    return "Cidadão Iniciante";
}


function obterEnderecoOcorrenciaPainel(ocorrencia) {
    const partes = [
        ocorrencia?.endereco,
        ocorrencia?.bairro,
        ocorrencia?.cidade
    ]
        .map((item) =>
            String(item || "").trim()
        )
        .filter(Boolean);

    if (partes.length > 0) {
        return partes.join(", ");
    }

    return "Localização registrada";
}


function obterConfiguracaoStatusPainel(status) {
    const valor =
        String(status || "")
            .trim()
            .toLowerCase();

    if (valor === "recebido") {
        return {
            classeStatus: "status-recebido",
            classeIcone: "ocorrencia-azul",
            corMapa: "#1a73e8"
        };
    }

    if (valor === "em análise") {
        return {
            classeStatus: "status-analise",
            classeIcone: "ocorrencia-laranja",
            corMapa: "#fbbc04"
        };
    }

    if (
        valor === "em atendimento" ||
        valor === "em andamento"
    ) {
        return {
            classeStatus: "status-atendimento",
            classeIcone: "ocorrencia-verde",
            corMapa: "#34a853"
        };
    }

    if (valor === "resolvido") {
        return {
            classeStatus: "status-resolvido",
            classeIcone: "ocorrencia-verde",
            corMapa: "#9333ea"
        };
    }

    return {
        classeStatus: "status-recebido",
        classeIcone: "ocorrencia-azul",
        corMapa: "#1a73e8"
    };
}


function obterIconeCategoriaPainel(categoria) {
    const valor =
        String(categoria || "")
            .trim()
            .toLowerCase();

    if (
        valor.includes("buraco") ||
        valor.includes("via")
    ) {
        return "/assets/icons/painel/ocorrencia/estrada.png";
    }

    if (
        valor.includes("iluminação") ||
        valor.includes("iluminacao") ||
        valor.includes("poste")
    ) {
        return "/assets/icons/painel/ocorrencia/iluminacao-publica.png";
    }

    if (
        valor.includes("lixo") ||
        valor.includes("coleta")
    ) {
        return "/assets/icons/painel/ocorrencia/lixeira-de-reciclagem.png";
    }

    if (valor.includes("praga")) {
        return "/assets/icons/painel/ocorrencia/controle-de-pragas.png";
    }

    if (
        valor.includes("manutenção") ||
        valor.includes("manutencao")
    ) {
        return "/assets/icons/painel/ocorrencia/manutencao.png";
    }

    if (valor.includes("Árvore Caída") ||
        valor.includes("caída")){
        return "/assets/icons/painel/ocorrencia/arvore-caida.png";
        }

    return "/assets/icons/painel/ocorrencia/3-pontos.png";
}


/*========================================================================================================

MENSAGENS

=========================================================================================================*/

let timeoutToastPainel = null;


function mostrarMensagemPainel(mensagem, tipo = "info") {
    if (!toastPainel) {
        return;
    }

    if (timeoutToastPainel) {
        clearTimeout(
            timeoutToastPainel
        );
    }

    toastPainel.textContent =
        mensagem;

    toastPainel.className =
        `toast-painel ativo ${tipo}`;

    timeoutToastPainel = setTimeout(() => {
        toastPainel.className =
            "toast-painel";
    }, 3500);
}


/*========================================================================================================

USUÁRIO

=========================================================================================================*/

async function carregarUsuarioPainel() {
    if (window.usuarioLogado) {
        estadoPainel.usuario =
            window.usuarioLogado;

        renderizarUsuarioPainel();

        return window.usuarioLogado;
    }

    const resposta =
        await fetchAutenticadoPainel(
            `${API_URL_PAINEL}/me`,
            {
                method: "GET"
            }
        );

    const dados =
        await lerRespostaPainel(
            resposta
        );

    if (
        !resposta.ok ||
        !dados?.sucesso ||
        !dados?.usuario
    ) {
        throw new Error(
            dados?.mensagem ||
            "Não foi possível carregar o usuário."
        );
    }

    estadoPainel.usuario =
        dados.usuario;

    window.usuarioLogado =
        dados.usuario;

    renderizarUsuarioPainel();

    return dados.usuario;
}


function renderizarUsuarioPainel() {
    const usuario =
        estadoPainel.usuario || {};

    if (numeroPontosPainel) {
        numeroPontosPainel.textContent =
            formatarNumeroPainel(
                usuario.pontos
            );
    }

    if (nivelPainel) {
        nivelPainel.textContent =
            `Nível: ${obterNivelPainel(usuario.pontos)}`;
    }
}


/*========================================================================================================

RESUMO

=========================================================================================================*/

async function carregarResumoPainel() {
    const resposta =
        await fetchAutenticadoPainel(
            `${API_URL_PAINEL}/ocorrencias/resumo`,
            {
                method: "GET"
            }
        );

    const dados =
        await lerRespostaPainel(
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

    estadoPainel.resumo =
        dados.resumo;

    renderizarResumoPainel();

    return dados.resumo;
}


function renderizarResumoPainel() {
    const resumo =
        estadoPainel.resumo || {};

    if (numeroTotalPainel) {
        numeroTotalPainel.textContent =
            formatarNumeroPainel(
                resumo.total
            );
    }

    if (numeroAndamentoPainel) {
        numeroAndamentoPainel.textContent =
            formatarNumeroPainel(
                resumo.em_andamento
            );
    }

    if (numeroResolvidasPainel) {
        numeroResolvidasPainel.textContent =
            formatarNumeroPainel(
                resumo.resolvidas
            );
    }
}


/*========================================================================================================

MINHAS OCORRÊNCIAS

=========================================================================================================*/

async function carregarTodasOcorrenciasPainel() {
    const ocorrencias = [];

    let pagina = 1;
    let totalPaginas = 1;

    do {
        const parametros =
            new URLSearchParams({
                pagina: String(pagina),
                limite: String(LIMITE_OCORRENCIAS_PAINEL)
            });

        const resposta =
            await fetchAutenticadoPainel(
                `${API_URL_PAINEL}/ocorrencias?${parametros.toString()}`,
                {
                    method: "GET"
                }
            );

        const dados =
            await lerRespostaPainel(
                resposta
            );

        if (
            !resposta.ok ||
            !dados?.sucesso ||
            !Array.isArray(dados.ocorrencias)
        ) {
            throw new Error(
                dados?.mensagem ||
                "Não foi possível carregar as ocorrências."
            );
        }

        ocorrencias.push(
            ...dados.ocorrencias
        );

        totalPaginas =
            Math.max(
                1,
                Number(
                    dados?.paginacao?.total_paginas || 1
                )
            );

        pagina++;

    } while (
        pagina <= totalPaginas
    );

    estadoPainel.ocorrencias =
        ocorrencias;

    renderizarOcorrenciasRecentesPainel();
    renderizarMarcadoresMapaPainel();

    return ocorrencias;
}


/*========================================================================================================

OCORRÊNCIAS RECENTES

=========================================================================================================*/

function renderizarOcorrenciasRecentesPainel() {
    if (!listaOcorrenciasRecentesPainel) {
        return;
    }

    const recentes =
        estadoPainel.ocorrencias.slice(
            0,
            LIMITE_RECENTES_PAINEL
        );

    if (recentes.length === 0) {
        listaOcorrenciasRecentesPainel.innerHTML = `
            <div class="painel-vazio">
                <strong>Nenhuma ocorrência registrada.</strong>
                <span>Quando você registrar uma ocorrência, ela aparecerá aqui.</span>
            </div>
        `;

        return;
    }

    listaOcorrenciasRecentesPainel.innerHTML =
        recentes
            .map((ocorrencia) => {
                const configuracaoStatus =
                    obterConfiguracaoStatusPainel(
                        ocorrencia.status
                    );

                const titulo =
                    escaparHtmlPainel(
                        ocorrencia.titulo ||
                        `Ocorrência #${ocorrencia.id}`
                    );

                const endereco =
                    escaparHtmlPainel(
                        obterEnderecoOcorrenciaPainel(
                            ocorrencia
                        )
                    );

                const status =
                    escaparHtmlPainel(
                        ocorrencia.status ||
                        "Recebido"
                    );

                const icone =
                    obterIconeCategoriaPainel(
                        ocorrencia.categoria
                    );

                return `
                    <div class="item-ocorrencia item-ocorrencia-painel" data-ocorrencia-id="${Number(ocorrencia.id) || 0}">
                        <div class="icone-ocorrencia ${configuracaoStatus.classeIcone}">
                            <img src="${icone}" alt="">
                        </div>

                        <div class="info-ocorrencia">
                            <h3>${titulo}</h3>
                            <p>${endereco}</p>
                        </div>

                        <div class="status ${configuracaoStatus.classeStatus}">
                            ${status}
                        </div>

                        <div class="data-ocorrencia">
                            <span>${formatarDataPainel(ocorrencia.data_criacao || ocorrencia.data_ocorrencia)}</span>
                            <img src="/assets/icons/painel/ocorrencia/proximo.png" alt="">
                        </div>
                    </div>
                `;
            })
            .join("");

    listaOcorrenciasRecentesPainel
        .querySelectorAll(
            ".item-ocorrencia-painel"
        )
        .forEach((item) => {
            item.addEventListener(
                "click",
                () => {
                    const id =
                        Number(
                            item.dataset.ocorrenciaId
                        );

                    abrirMinhaOcorrenciaPainel(
                        id
                    );
                }
            );
        });
}


/*========================================================================================================

CATEGORIAS MAIS REGISTRADAS NA CIDADE

Os dados desta seção não são calculados apenas com as ocorrências
do usuário logado.

O ranking vem do backend e considera todas as ocorrências
registradas no Cidade360.

=========================================================================================================*/

async function carregarCategoriasGeraisPainel() {
    const resposta =
        await fetchAutenticadoPainel(
            `${API_ESTATISTICAS_PAINEL}/categorias?limite=50`,
            {
                method: "GET"
            }
        );


    const dados =
        await lerRespostaPainel(
            resposta
        );


    if (
        !resposta.ok ||
        !dados?.sucesso ||
        !Array.isArray(
            dados.categorias
        )
    ) {
        throw new Error(
            dados?.mensagem ||
            "Não foi possível carregar as categorias mais registradas."
        );
    }


    estadoPainel.categoriasGerais =
        dados.categorias;


    renderizarCategoriasPainel();


    return dados.categorias;
}


/*========================================================================================================

RENDERIZA CATEGORIAS NO PAINEL

No painel principal são exibidas apenas as 5 categorias
mais registradas em todo o Cidade360.

O botão "Ver todas" abre um card separado com o ranking completo.

=========================================================================================================*/

function renderizarCategoriasPainel() {
    if (!categoriasPainel) {
        return;
    }


    const categoriasDisponiveis =
        Array.isArray(
            estadoPainel.categoriasGerais
        )
            ? estadoPainel.categoriasGerais
            : [];


    if (categoriasDisponiveis.length === 0) {
        categoriasPainel.innerHTML = `
            <div class="painel-vazio painel-vazio-categorias">
                <strong>Nenhuma categoria registrada na cidade.</strong>
                <span>O ranking aparecerá assim que houver ocorrências registradas.</span>
            </div>
        `;


        if (btnVerTodasCategoriasPainel) {
            btnVerTodasCategoriasPainel.style.display =
                "none";
        }


        return;
    }


    const categorias =
        categoriasDisponiveis.slice(
            0,
            5
        );


    categoriasPainel.innerHTML =
        categorias
            .map((categoria) => `
                <div
                    class="card-categoria card-categoria-ranking"
                    title="${escaparHtmlPainel(categoria.percentual)}% das ocorrências registradas"
                >
                    <img src="${obterIconeCategoriaPainel(categoria.nome)}" alt="">

                    <p>
                        ${escaparHtmlPainel(categoria.nome)}
                    </p>

                    <span>
                        ${formatarNumeroPainel(categoria.total)}
                    </span>
                </div>
            `)
            .join("");


    if (btnVerTodasCategoriasPainel) {
        btnVerTodasCategoriasPainel.style.display =
            "inline-flex";

        btnVerTodasCategoriasPainel.textContent =
            "Ver todas";
    }
}


/*========================================================================================================

ABRE CARD COM TODAS AS CATEGORIAS

Exibe o ranking completo das categorias registradas
por todos os cidadãos do Cidade360.

=========================================================================================================*/

function abrirTodasCategoriasPainel() {
    const categorias =
        Array.isArray(
            estadoPainel.categoriasGerais
        )
            ? estadoPainel.categoriasGerais
            : [];


    if (categorias.length === 0) {
        mostrarMensagemPainel(
            "Ainda não existem categorias registradas.",
            "info"
        );

        return;
    }


    fecharTodasCategoriasPainel();


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "modalTodasCategoriasPainel";


    modal.className =
        "modal-categorias-painel";


    modal.innerHTML = `
        <div class="fundo-modal-categorias-painel"></div>

        <div class="card-todas-categorias-painel">

            <div class="cabecalho-todas-categorias-painel">

                <div>
                    <h2>Categorias mais registradas na cidade</h2>

                    <p>
                        Ranking considerando todas as ocorrências registradas no Cidade360.
                    </p>
                </div>


                <button
                    class="btn-fechar-categorias-painel"
                    id="btnFecharCategoriasPainel"
                    type="button"
                    aria-label="Fechar"
                >
                    ×
                </button>

            </div>


            <div class="resumo-categorias-painel">

                <span>
                    ${categorias.length}
                    ${categorias.length === 1 ? "categoria" : "categorias"}
                </span>

                <span>
                    ${formatarNumeroPainel(
                        categorias.reduce(
                            (total, categoria) => {
                                return (
                                    total +
                                    Number(
                                        categoria.total || 0
                                    )
                                );
                            },
                            0
                        )
                    )}
                    ocorrências contabilizadas
                </span>

            </div>


            <div class="lista-todas-categorias-painel">

                ${categorias
                    .map((categoria, indice) => `
                        <div class="item-ranking-categoria-painel">

                            <div class="posicao-ranking-categoria-painel">
                                ${indice + 1}
                            </div>


                            <div class="icone-ranking-categoria-painel">

                                <img
                                    src="${obterIconeCategoriaPainel(categoria.nome)}"
                                    alt=""
                                >

                            </div>


                            <div class="dados-ranking-categoria-painel">

                                <div class="linha-ranking-categoria-painel">

                                    <strong>
                                        ${escaparHtmlPainel(categoria.nome)}
                                    </strong>

                                    <span>
                                        ${formatarNumeroPainel(categoria.total)}
                                        ${Number(categoria.total) === 1 ? "ocorrência" : "ocorrências"}
                                    </span>

                                </div>


                                <div class="barra-ranking-categoria-painel">

                                    <div
                                        class="preenchimento-ranking-categoria-painel"
                                        style="width: ${Math.min(
                                            Number(categoria.percentual) || 0,
                                            100
                                        )}%"
                                    ></div>

                                </div>


                                <div class="percentual-ranking-categoria-painel">

                                    ${formatarPercentualCategoriaPainel(
                                        categoria.percentual
                                    )}
                                    do total de ocorrências

                                </div>

                            </div>

                        </div>
                    `)
                    .join("")}

            </div>

        </div>
    `;


    document.body.appendChild(
        modal
    );


    document.body.classList.add(
        "modal-aberto-painel"
    );


    document
        .getElementById(
            "btnFecharCategoriasPainel"
        )
        ?.addEventListener(
            "click",
            fecharTodasCategoriasPainel
        );


    modal
        .querySelector(
            ".fundo-modal-categorias-painel"
        )
        ?.addEventListener(
            "click",
            fecharTodasCategoriasPainel
        );
}


/*========================================================================================================

FORMATA PERCENTUAL DAS CATEGORIAS

=========================================================================================================*/

function formatarPercentualCategoriaPainel(valor) {
    const percentual =
        Number(
            valor
        );


    if (
        !Number.isFinite(
            percentual
        )
    ) {
        return "0%";
    }


    return `${percentual.toLocaleString(
        "pt-BR",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1
        }
    )}%`;
}


/*========================================================================================================

FECHA CARD DE TODAS AS CATEGORIAS

=========================================================================================================*/

function fecharTodasCategoriasPainel() {
    document
        .getElementById(
            "modalTodasCategoriasPainel"
        )
        ?.remove();


    document.body.classList.remove(
        "modal-aberto-painel"
    );
}


/*========================================================================================================

ERRO DAS CATEGORIAS

=========================================================================================================*/

function renderizarErroCategoriasPainel() {
    if (!categoriasPainel) {
        return;
    }


    categoriasPainel.innerHTML = `
        <div class="painel-vazio painel-vazio-categorias painel-erro">
            <strong>Não foi possível carregar o ranking de categorias.</strong>
            <span>Tente atualizar a página em alguns instantes.</span>
        </div>
    `;
}


/*========================================================================================================

MAPA

=========================================================================================================*/

function inicializarMapaPainel() {
    const elementoMapa =
        document.getElementById(
            "mapaPainel"
        );

    if (
        !elementoMapa ||
        typeof L === "undefined" ||
        estadoPainel.mapa
    ) {
        return;
    }

    estadoPainel.mapa =
        L.map(
            "mapaPainel",
            {
                zoomControl: true
            }
        )
            .setView([
                -20.6884,
                -48.4112
            ], 14);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap"
        }
    )
        .addTo(
            estadoPainel.mapa
        );

    estadoPainel.camadaMinhas =
        L.layerGroup()
            .addTo(
                estadoPainel.mapa
            );

    estadoPainel.camadaProximas =
        L.layerGroup()
            .addTo(
                estadoPainel.mapa
            );

    estadoPainel.camadaLocalizacao =
        L.layerGroup()
            .addTo(
                estadoPainel.mapa
            );

    estadoPainel.controleCamadas =
        L.control.layers(
            null,
            {
                "Minhas ocorrências": estadoPainel.camadaMinhas,
                "Ocorrências próximas": estadoPainel.camadaProximas,
                "Minha localização": estadoPainel.camadaLocalizacao
            },
            {
                collapsed: true
            }
        )
            .addTo(
                estadoPainel.mapa
            );

    setTimeout(() => {
        estadoPainel.mapa
            ?.invalidateSize();
    }, 200);
}


/*========================================================================================================

LOCALIZAÇÃO DO USUÁRIO

=========================================================================================================*/

function obterLocalizacaoUsuarioPainel() {
    return new Promise((resolve) => {
        if (
            !navigator.geolocation
        ) {
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (posicao) => {
                resolve({
                    latitude:
                        posicao.coords.latitude,
                    longitude:
                        posicao.coords.longitude,
                    precisao:
                        posicao.coords.accuracy
                });
            },
            () => {
                resolve(null);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    });
}


async function carregarOcorrenciasProximasPainel() {
    const localizacao =
        await obterLocalizacaoUsuarioPainel();

    if (!localizacao) {
        mostrarMensagemPainel(
            "Ative a localização do navegador para visualizar ocorrências perto de você.",
            "info"
        );

        return [];
    }

    estadoPainel.localizacaoUsuario =
        localizacao;

    renderizarLocalizacaoUsuarioPainel();

    const parametros =
        new URLSearchParams({
            latitude: String(localizacao.latitude),
            longitude: String(localizacao.longitude),
            raio: String(RAIO_OCORRENCIAS_PROXIMAS_KM),
            limite: "100"
        });

    const resposta =
        await fetchAutenticadoPainel(
            `${API_OCORRENCIAS_PROXIMAS}?${parametros.toString()}`,
            {
                method: "GET"
            }
        );

    const dados =
        await lerRespostaPainel(
            resposta
        );

    if (
        !resposta.ok ||
        !dados?.sucesso ||
        !Array.isArray(dados.ocorrencias)
    ) {
        throw new Error(
            dados?.mensagem ||
            "Não foi possível carregar as ocorrências próximas."
        );
    }

    estadoPainel.ocorrenciasProximas =
        dados.ocorrencias;

    renderizarMarcadoresMapaPainel();

    return dados.ocorrencias;
}


function renderizarLocalizacaoUsuarioPainel() {
    if (
        !estadoPainel.camadaLocalizacao ||
        !estadoPainel.localizacaoUsuario
    ) {
        return;
    }

    estadoPainel.camadaLocalizacao
        .clearLayers();

    const {
        latitude,
        longitude
    } =
        estadoPainel.localizacaoUsuario;

    const marcador =
        L.circleMarker([
            latitude,
            longitude
        ], {
            radius: 8,
            color: "#111827",
            fillColor: "#ffffff",
            fillOpacity: 1,
            weight: 3
        });

    marcador.bindTooltip(
        "Você está aqui",
        {
            direction: "top"
        }
    );

    marcador.addTo(
        estadoPainel.camadaLocalizacao
    );
}


/*========================================================================================================

MARCADORES

=========================================================================================================*/

function adicionarMarcadorOcorrenciaPainel(ocorrencia, tipo) {
    const latitude =
        Number(
            ocorrencia.latitude
        );

    const longitude =
        Number(
            ocorrencia.longitude
        );

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {
        return null;
    }

    const configuracaoStatus =
        obterConfiguracaoStatusPainel(
            ocorrencia.status
        );

    const ehMinha =
        tipo === "minha";

    const marcador =
        L.circleMarker([
            latitude,
            longitude
        ], {
            radius: ehMinha ? 9 : 7,
            color: ehMinha
                ? "#ffffff"
                : configuracaoStatus.corMapa,
            fillColor: configuracaoStatus.corMapa,
            fillOpacity: 0.9,
            weight: ehMinha ? 3 : 2
        });

    marcador.bindTooltip(
        escaparHtmlPainel(
            ocorrencia.titulo ||
            "Ocorrência"
        ),
        {
            direction: "top"
        }
    );

    marcador.on(
        "click",
        () => {
            abrirConsultaMapaPainel(
                ocorrencia,
                tipo
            );
        }
    );

    marcador.addTo(
        ehMinha
            ? estadoPainel.camadaMinhas
            : estadoPainel.camadaProximas
    );

    return [
        latitude,
        longitude
    ];
}


function renderizarMarcadoresMapaPainel() {
    if (
        !estadoPainel.mapa ||
        !estadoPainel.camadaMinhas ||
        !estadoPainel.camadaProximas
    ) {
        return;
    }

    estadoPainel.camadaMinhas
        .clearLayers();

    estadoPainel.camadaProximas
        .clearLayers();

    const limites = [];
    const idsMinhas =
        new Set();

    estadoPainel.ocorrencias.forEach((ocorrencia) => {
        idsMinhas.add(
            Number(ocorrencia.id)
        );

        const ponto =
            adicionarMarcadorOcorrenciaPainel(
                ocorrencia,
                "minha"
            );

        if (ponto) {
            limites.push(
                ponto
            );
        }
    });

    estadoPainel.ocorrenciasProximas.forEach((ocorrencia) => {
        if (
            idsMinhas.has(
                Number(ocorrencia.id)
            )
        ) {
            return;
        }

        const ponto =
            adicionarMarcadorOcorrenciaPainel(
                ocorrencia,
                "proxima"
            );

        if (ponto) {
            limites.push(
                ponto
            );
        }
    });

    if (
        estadoPainel.localizacaoUsuario
    ) {
        limites.push([
            estadoPainel.localizacaoUsuario.latitude,
            estadoPainel.localizacaoUsuario.longitude
        ]);
    }

    if (limites.length === 1) {
        estadoPainel.mapa.setView(
            limites[0],
            16
        );

    } else if (limites.length > 1) {
        estadoPainel.mapa.fitBounds(
            limites,
            {
                padding: [
                    35,
                    35
                ],
                maxZoom: 16
            }
        );
    }

    setTimeout(() => {
        estadoPainel.mapa
            ?.invalidateSize();
    }, 100);
}


/*========================================================================================================

CONSULTA DO MARCADOR

=========================================================================================================*/

function abrirConsultaMapaPainel(ocorrencia, tipo) {
    fecharConsultaMapaPainel();

    const distancia =
        Number(
            ocorrencia.distancia_km
        );

    const distanciaTexto =
        Number.isFinite(distancia)
            ? `${distancia.toFixed(2).replace(".", ",")} km de você`
            : "";

    const local =
        [
            ocorrencia.bairro,
            ocorrencia.cidade
        ]
            .filter(Boolean)
            .join(" - ") ||
            "Localização registrada";

    const modal =
        document.createElement(
            "div"
        );

    modal.className =
        "modal-consulta-mapa-painel";

    modal.id =
        "modalConsultaMapaPainel";

    modal.innerHTML = `
        <div class="fundo-modal-consulta-painel" data-fechar-consulta-painel></div>

        <div class="conteudo-modal-consulta-painel">
            <button class="fechar-modal-consulta-painel" type="button" data-fechar-consulta-painel>&times;</button>

            <span class="tipo-ocorrencia-mapa-painel">
                ${tipo === "minha" ? "Sua ocorrência" : "Ocorrência próxima"}
            </span>

            <h2>${escaparHtmlPainel(ocorrencia.titulo || "Ocorrência")}</h2>

            <div class="dados-consulta-mapa-painel">
                <div>
                    <strong>Categoria</strong>
                    <span>${escaparHtmlPainel(ocorrencia.categoria || "Não informada")}</span>
                </div>

                <div>
                    <strong>Status</strong>
                    <span>${escaparHtmlPainel(ocorrencia.status || "Recebido")}</span>
                </div>

                <div>
                    <strong>Registrada em</strong>
                    <span>${formatarDataPainel(ocorrencia.data_criacao || ocorrencia.data_ocorrencia)}</span>
                </div>

                <div>
                    <strong>Localização</strong>
                    <span>${escaparHtmlPainel(local)}</span>
                </div>

                ${distanciaTexto
                    ? `
                        <div>
                            <strong>Distância</strong>
                            <span>${distanciaTexto}</span>
                        </div>
                    `
                    : ""}
            </div>

            ${tipo === "minha"
                ? `
                    <button class="btn-consultar-ocorrencia-painel" id="btnAbrirOcorrenciaCompletaPainel" type="button">
                        Ver acompanhamento completo
                    </button>
                `
                : `
                    <p class="privacidade-consulta-painel">
                        Por privacidade, os dados pessoais do cidadão que registrou esta ocorrência não são exibidos.
                    </p>
                `}
        </div>
    `;

    document.body.appendChild(
        modal
    );

    modal
        .querySelectorAll(
            "[data-fechar-consulta-painel]"
        )
        .forEach((elemento) => {
            elemento.addEventListener(
                "click",
                fecharConsultaMapaPainel
            );
        });

    document
        .getElementById(
            "btnAbrirOcorrenciaCompletaPainel"
        )
        ?.addEventListener(
            "click",
            () => {
                abrirMinhaOcorrenciaPainel(
                    Number(ocorrencia.id)
                );
            }
        );
}


function fecharConsultaMapaPainel() {
    document
        .getElementById(
            "modalConsultaMapaPainel"
        )
        ?.remove();
}





/*========================================================================================================

NAVEGAÇÃO

=========================================================================================================*/

function irParaOcorrenciasPainel() {
    window.location.href =
        PAGINA_OCORRENCIAS_PAINEL;
}


function abrirMinhaOcorrenciaPainel(id) {
    if (
        Number.isInteger(id) &&
        id > 0
    ) {
        window.location.href =
            `${PAGINA_OCORRENCIAS_PAINEL}?ocorrencia=${id}`;

        return;
    }

    irParaOcorrenciasPainel();
}


/*========================================================================================================

MAPA COMPLETO

=========================================================================================================*/

async function abrirMapaCompletoPainel() {
    const mapa =
        document.getElementById(
            "mapaPainel"
        );

    if (!mapa) {
        return;
    }

    try {
        if (
            document.fullscreenEnabled &&
            typeof mapa.requestFullscreen === "function"
        ) {
            await mapa.requestFullscreen();

        } else {
            mapa.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }

    } catch (error) {
        mapa.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    setTimeout(() => {
        estadoPainel.mapa
            ?.invalidateSize();
    }, 300);
}


/*========================================================================================================

EVENTOS

=========================================================================================================*/

function registrarEventosPainel() {

    btnVerMapaPainel
        ?.addEventListener(
            "click",
            abrirMapaCompletoPainel
        );

    btnVerTodasOcorrenciasPainel
        ?.addEventListener(
            "click",
            irParaOcorrenciasPainel
        );


    /*
     * O botão "Ver todas" das categorias possui uma ação própria.
     *
     * Mesmo que uma versão antiga do index.html ainda possua
     * data-ir-ocorrencias nesse botão, removemos o atributo antes
     * de registrar os eventos genéricos de navegação.
     */
    if (btnVerTodasCategoriasPainel) {
        btnVerTodasCategoriasPainel.setAttribute(
            "href",
            "#"
        );

        btnVerTodasCategoriasPainel.removeAttribute(
            "data-ir-ocorrencias"
        );

        btnVerTodasCategoriasPainel.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();

                abrirTodasCategoriasPainel();
            }
        );
    }


    document
        .querySelectorAll(
            "[data-ir-ocorrencias]:not(#btnVerTodasCategoriasPainel)"
        )
        .forEach((elemento) => {
            elemento.addEventListener(
                "click",
                (event) => {
                    event.preventDefault();

                    irParaOcorrenciasPainel();
                }
            );
        });

    btnNivelPainel
        ?.addEventListener(
            "click",
            (event) => {
                event.preventDefault();

                const pontos =
                    numeroPainel(
                        estadoPainel.usuario?.pontos
                    );

                mostrarMensagemPainel(
                    `${obterNivelPainel(pontos)}: ${formatarNumeroPainel(pontos)} pontos acumulados.`,
                    "sucesso"
                );
            }
        );

    acaoNovaOcorrenciaPainel
        ?.addEventListener(
            "click",
            irParaOcorrenciasPainel
        );

    acaoMinhasOcorrenciasPainel
        ?.addEventListener(
            "click",
            irParaOcorrenciasPainel
        );

    document
        .querySelectorAll(
            "[data-comunicacao-painel]"
        )
        .forEach((elemento) => {
            elemento.addEventListener(
                "click",
                (event) => {
                    event.preventDefault();

                    const nome =
                        elemento.dataset.comunicacaoPainel ||
                        "Comunicação";

                    mostrarMensagemPainel(
                        `${nome}: este módulo será conectado na próxima etapa.`,
                        "info"
                    );
                }
            );
        });

    btnConfiguracoesPainel
        ?.addEventListener(
            "click",
            () => {
                mostrarMensagemPainel(
                    "Configurações do perfil serão conectadas na próxima etapa.",
                    "info"
                );
            }
        );

    btnNotificacoesPainel
        ?.addEventListener(
            "click",
            () => {
                mostrarMensagemPainel(
                    "Notificações serão conectadas na próxima etapa.",
                    "info"
                );
            }
        );

    perfilUsuarioPainel
        ?.addEventListener(
            "click",
            () => {
                if (
                    !estadoPainel.usuario
                ) {
                    return;
                }

                mostrarMensagemPainel(
                    `${estadoPainel.usuario.nome} • ${estadoPainel.usuario.email}`,
                    "info"
                );
            }
        );
}


document.addEventListener(
    "fullscreenchange",
    () => {
        setTimeout(() => {
            estadoPainel.mapa
                ?.invalidateSize();
        }, 150);
    }
);


/*========================================================================================================

INICIALIZAÇÃO

=========================================================================================================*/

async function inicializarPainel() {
    if (estadoPainel.carregando) {
        return;
    }

    estadoPainel.carregando =
        true;

    registrarEventosPainel();
    inicializarMapaPainel();

    const resultados =
        await Promise.allSettled([
            carregarUsuarioPainel(),
            carregarResumoPainel(),
            carregarTodasOcorrenciasPainel(),
            carregarCategoriasGeraisPainel()
        ]);

    resultados.forEach((resultado) => {
        if (
            resultado.status === "rejected"
        ) {
            console.error(
                "Erro ao carregar painel:",
                resultado.reason
            );
        }
    });


    if (
        resultados[3]?.status === "rejected"
    ) {
        renderizarErroCategoriasPainel();
    }


    try {
        await carregarOcorrenciasProximasPainel();

    } catch (error) {
        console.error(
            "Erro ao carregar ocorrências próximas:",
            error
        );

        mostrarMensagemPainel(
            "Suas ocorrências foram carregadas, mas não foi possível consultar as ocorrências próximas.",
            "info"
        );
    }

    estadoPainel.carregando =
        false;
}


/*========================================================================================================

FECHA O CARD DE CATEGORIAS COM ESC

=========================================================================================================*/

document.addEventListener(
    "keydown",
    (event) => {
        if (
            event.key === "Escape" &&
            document.getElementById(
                "modalTodasCategoriasPainel"
            )
        ) {
            fecharTodasCategoriasPainel();
        }
    }
);


if (
    document.readyState === "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        inicializarPainel
    );

} else {
    inicializarPainel();
}