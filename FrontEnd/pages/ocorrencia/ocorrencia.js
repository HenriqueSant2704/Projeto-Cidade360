/*========================================================================================================

NOVA OCORRÊNCIA

- Abre e fecha o formulário
- Categorias (vindas do banco) em botões
- Mapa (Leaflet) com GPS ou toque no mapa
- Fotos (obrigatória pelo menos 1, até 5, JPG/PNG/WEBP até 5 MB)
- Envio para POST /api/ocorrencias

A listagem e os detalhes ficam no acompanhamentoOcorrencias.js.

=========================================================================================================*/

const telaOcorrencias = document.getElementById("tela-ocorrencias");
const telaFormulario = document.getElementById("tela-formulario");

const btnNovaOcorrencia = document.getElementById("btn-nova-ocorrencia");
const btnVoltar = document.getElementById("btn-voltar");
const btnCancelar = document.getElementById("btn-cancelar");

function abrirFormulario() {

    telaOcorrencias.classList.remove("animar-entrada");
    telaOcorrencias.classList.add("animar-saida");

    setTimeout(() => {

        telaOcorrencias.classList.add("oculto");
        telaOcorrencias.classList.remove("animar-saida");

        telaFormulario.classList.remove("oculto");
        telaFormulario.classList.add("animar-entrada");

        window.scrollTo({ top: 0, behavior: "smooth" });

    }, 250);

}

function voltarOcorrencias() {

    telaFormulario.classList.remove("animar-entrada");
    telaFormulario.classList.add("animar-saida");

    setTimeout(() => {

        telaFormulario.classList.add("oculto");
        telaFormulario.classList.remove("animar-saida");

        telaOcorrencias.classList.remove("oculto");
        telaOcorrencias.classList.add("animar-entrada");

    }, 250);

}

btnNovaOcorrencia.addEventListener("click", abrirFormulario);

btnVoltar.addEventListener("click", voltarOcorrencias);

btnCancelar.addEventListener("click", voltarOcorrencias);


/*========================================================================================================

INTEGRAÇÃO DE OCORRÊNCIAS

=========================================================================================================*/

const API_OCORRENCIAS = "/api/ocorrencias";
const LOGIN_PAGE_OCORRENCIAS = "/FrontEnd/pages/login/login.html";
const MAX_FOTOS = 5;
const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024;

const formOcorrencia = document.getElementById("form-ocorrencia");
const tituloOcorrenciaInput = document.getElementById("ocorrencia-titulo");
const categoriaOcorrenciaSelect = document.getElementById("ocorrencia-categoria");
const gradeCategoriasOcorrencia = document.getElementById("categorias-ocorrencia");
const descricaoOcorrenciaTextarea = document.getElementById("ocorrencia-descricao");
const enderecoOcorrenciaInput = document.getElementById("ocorrencia-endereco");
const latitudeOcorrenciaInput = document.getElementById("ocorrencia-latitude");
const longitudeOcorrenciaInput = document.getElementById("ocorrencia-longitude");
const precisaoOcorrenciaInput = document.getElementById("ocorrencia-precisao");
const btnGpsOcorrencia = document.getElementById("btn-gps");
const mapaPreviewOcorrencia = document.getElementById("mapa-ocorrencia");
const textoLocalizacaoOcorrencia = document.getElementById("texto-localizacao");
const fotosOcorrenciaInput = document.getElementById("fotos");
const areaUploadOcorrencia = document.getElementById("area-upload");
const textoUploadOcorrencia = document.getElementById("texto-upload");
const listaFotosOcorrencia = document.getElementById("lista-fotos");
const btnEnviarOcorrencia = document.getElementById("btn-enviar-ocorrencia");
const mensagemOcorrencia = document.getElementById("mensagem-ocorrencia");
const toastOcorrencias = document.getElementById("toastOcorrencias");

const etapaDetalhes = document.getElementById("etapa-detalhes");
const etapaLocalizacao = document.getElementById("etapa-localizacao");
const etapaFotos = document.getElementById("etapa-fotos");

// Contadores das abas (o "pendente" não existe mais: são "recebidos" e "em análise").
const numeroTotalOcorrencias = document.querySelector(".numero.total");
const numeroRecebidosOcorrencias = document.querySelector(".numero.recebidos");
const numeroEmAnaliseOcorrencias = document.querySelector(".numero.emanalise");
const numeroAndamentoOcorrencias = document.querySelector(".numero.andamento");
const numeroResolvidasOcorrencias = document.querySelector(".numero.resolvido");

const TIPOS_FOTO_PERMITIDOS = new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
]);

const estadoOcorrencia = {
    latitude: null,
    longitude: null,
    precisao: null,
    fotos: [],
    enviando: false
};

let mapaOcorrencia = null;
let marcadorOcorrencia = null;
let circuloPrecisaoOcorrencia = null;

const conteudoOriginalBotaoEnviarOcorrencia = btnEnviarOcorrencia.innerHTML;
const conteudoOriginalBotaoGps = btnGpsOcorrencia.innerHTML;

const iconeOcorrencia = (nome, tamanho) => window.Cidade360.icone(nome, tamanho);


/*========================================================================================================

AUTENTICAÇÃO E API

=========================================================================================================*/

function obterTokenOcorrencias() {
    return (
        localStorage.getItem("cidade360_token") ||
        sessionStorage.getItem("cidade360_token")
    );
}

function redirecionarParaLoginOcorrencias() {
    window.location.replace(LOGIN_PAGE_OCORRENCIAS);
}

async function lerRespostaOcorrencias(resposta) {
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

async function fetchAutenticadoOcorrencias(url, opcoes = {}) {
    const token = obterTokenOcorrencias();

    if (!token) {
        redirecionarParaLoginOcorrencias();
        throw new Error("Sessão não encontrada.");
    }

    const headers = new Headers(opcoes.headers || {});
    headers.set("Authorization", `Bearer ${token}`);

    const resposta = await fetch(url, {
        ...opcoes,
        headers
    });

    if (resposta.status === 401) {
        redirecionarParaLoginOcorrencias();
        throw new Error("Sua sessão expirou. Entre novamente.");
    }

    return resposta;
}


/*========================================================================================================

MENSAGENS

=========================================================================================================*/

function mostrarMensagemOcorrencia(mensagem, tipo = "erro") {
    mensagemOcorrencia.textContent = mensagem;
    mensagemOcorrencia.hidden = false;
    mensagemOcorrencia.className = `mensagem-ocorrencia ${tipo}`;
}

function limparMensagemOcorrencia() {
    mensagemOcorrencia.textContent = "";
    mensagemOcorrencia.hidden = true;
    mensagemOcorrencia.className = "mensagem-ocorrencia";

    document.querySelectorAll("#form-ocorrencia [data-erro-para]").forEach((erro) => {
        erro.hidden = true;
        erro.textContent = "";
    });
}

// Mostra o erro logo abaixo do campo com problema.
function mostrarErroCampoOcorrencia(campo, mensagem) {
    const erro = campo?.id
        ? document.querySelector(`#form-ocorrencia [data-erro-para="${campo.id}"]`)
        : null;

    if (!erro) {
        mostrarMensagemOcorrencia(mensagem);
        return;
    }

    erro.textContent = mensagem;
    erro.hidden = false;
}

// Aviso rápido no canto da tela (mesmo visual do resto do sistema).
function mostrarToastOcorrencia(titulo, texto = "") {
    if (!toastOcorrencias) {
        return;
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.innerHTML = `
        <span class="ok">${iconeOcorrencia("check", 14)}</span>
        <span><strong></strong>${texto ? "<small></small>" : ""}</span>
    `;

    toast.querySelector("strong").textContent = titulo;

    if (texto) {
        toast.querySelector("small").textContent = texto;
    }

    toastOcorrencias.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("saindo");
        toast.addEventListener("animationend", () => toast.remove(), { once: true });
    }, 4000);
}


/*========================================================================================================

CATEGORIAS

=========================================================================================================*/

async function carregarCategoriasOcorrencia() {
    categoriaOcorrenciaSelect.disabled = true;
    categoriaOcorrenciaSelect.innerHTML = '<option value="">Carregando categorias...</option>';

    try {
        const resposta = await fetchAutenticadoOcorrencias(
            `${API_OCORRENCIAS}/categorias`,
            {
                method: "GET"
            }
        );

        const dados = await lerRespostaOcorrencias(resposta);

        if (
            !resposta.ok ||
            !dados?.sucesso ||
            !Array.isArray(dados.categorias)
        ) {
            throw new Error(
                dados?.mensagem ||
                "Não foi possível carregar as categorias."
            );
        }

        categoriaOcorrenciaSelect.innerHTML = '<option value="">Selecione uma categoria</option>';

        dados.categorias.forEach((categoria) => {
            const option = document.createElement("option");
            option.value = String(categoria.id);
            option.textContent = categoria.nome;
            categoriaOcorrenciaSelect.appendChild(option);
        });

        categoriaOcorrenciaSelect.disabled = false;

        renderizarBotoesCategoria(dados.categorias);
    } catch (error) {
        categoriaOcorrenciaSelect.innerHTML = '<option value="">Não foi possível carregar as categorias</option>';
        gradeCategoriasOcorrencia.innerHTML = '<p class="vazio-mini">Não foi possível carregar as categorias.</p>';

        mostrarMensagemOcorrencia(
            error.message ||
            "Não foi possível carregar as categorias."
        );
    }
}

// Um botão por categoria. O valor escolhido vai para o <select> escondido,
// que continua sendo o campo lido na validação e no envio.
function renderizarBotoesCategoria(categorias) {
    gradeCategoriasOcorrencia.innerHTML = "";

    categorias.forEach((categoria) => {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "cat-op";
        botao.setAttribute("role", "radio");
        botao.setAttribute("aria-checked", "false");
        botao.dataset.categoriaId = String(categoria.id);
        botao.innerHTML = window.Cidade360.iconeCategoria(categoria.nome, 18);
        botao.append(categoria.nome);

        gradeCategoriasOcorrencia.appendChild(botao);
    });

    sincronizarBotoesCategoria();
}

function sincronizarBotoesCategoria() {
    gradeCategoriasOcorrencia.querySelectorAll(".cat-op").forEach((botao) => {
        botao.setAttribute(
            "aria-checked",
            String(botao.dataset.categoriaId === categoriaOcorrenciaSelect.value)
        );
    });
}

gradeCategoriasOcorrencia.addEventListener("click", (event) => {
    const botao = event.target.closest(".cat-op");

    if (!botao) {
        return;
    }

    categoriaOcorrenciaSelect.value = botao.dataset.categoriaId;
    categoriaOcorrenciaSelect.dispatchEvent(new Event("change", { bubbles: true }));
});

categoriaOcorrenciaSelect.addEventListener("change", () => {
    sincronizarBotoesCategoria();
    atualizarEtapasOcorrencia();
});


/*========================================================================================================

MAPA E LOCALIZAÇÃO

=========================================================================================================*/

function inicializarMapaOcorrencia() {
    if (mapaOcorrencia) {
        mapaOcorrencia.invalidateSize();
        return;
    }

    if (typeof L === "undefined") {
        mostrarMensagemOcorrencia(
            "Não foi possível carregar o mapa. Verifique sua conexão e tente novamente."
        );
        return;
    }

    mapaOcorrencia = L.map(mapaPreviewOcorrencia, {
        zoomControl: true
    }).setView([
        -20.6884,
        -48.4112
    ], 14);

    L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }
    ).addTo(mapaOcorrencia);

    mapaOcorrencia.on("click", (event) => {
        atualizarLocalizacaoOcorrencia(
            event.latlng.lat,
            event.latlng.lng,
            null,
            false
        );
    });
}

function atualizarMarcadorOcorrencia(latitude, longitude) {
    if (!mapaOcorrencia) {
        return;
    }

    if (!marcadorOcorrencia) {
        marcadorOcorrencia = L.marker([
            latitude,
            longitude
        ], {
            draggable: true,
            autoPan: true,
            icon: L.divIcon({
                className: "pino-mapa",
                html: `<span class="pino st" data-st="recebido">${window.Cidade360.PINO}</span>`,
                iconSize: [30, 38],
                iconAnchor: [15, 38],
                popupAnchor: [0, -34]
            })
        }).addTo(mapaOcorrencia);

        marcadorOcorrencia.on("dragend", () => {
            const posicao = marcadorOcorrencia.getLatLng();

            atualizarLocalizacaoOcorrencia(
                posicao.lat,
                posicao.lng,
                null,
                false
            );
        });
    } else {
        marcadorOcorrencia.setLatLng([
            latitude,
            longitude
        ]);
    }

    const textoPrecisao =
        estadoOcorrencia.precisao !== null
            ? `Precisão aproximada: ${Math.round(estadoOcorrencia.precisao)} m`
            : "Posição ajustada manualmente";

    marcadorOcorrencia
        .bindPopup(
            `<div class="balao"><strong>Local da ocorrência</strong><span class="sub">${textoPrecisao}</span><span class="sub">Arraste o pino para ajustar.</span></div>`,
            { className: "balao-mapa" }
        )
        .openPopup();

    if (textoLocalizacaoOcorrencia) {
        textoLocalizacaoOcorrencia.textContent = "Local marcado. Toque de novo ou arraste o pino para ajustar.";
    }
}

function atualizarCirculoPrecisaoOcorrencia(latitude, longitude, precisao) {
    if (circuloPrecisaoOcorrencia && mapaOcorrencia) {
        mapaOcorrencia.removeLayer(circuloPrecisaoOcorrencia);
        circuloPrecisaoOcorrencia = null;
    }

    if (
        !mapaOcorrencia ||
        !Number.isFinite(precisao) ||
        precisao <= 0
    ) {
        return;
    }

    circuloPrecisaoOcorrencia = L.circle([
        latitude,
        longitude
    ], {
        radius: precisao,
        weight: 1,
        color: "#2563eb",
        fillOpacity: 0.12
    }).addTo(mapaOcorrencia);
}

function atualizarLocalizacaoOcorrencia(
    latitude,
    longitude,
    precisao = null,
    centralizar = true
) {
    const latitudeNumero = Number(latitude);
    const longitudeNumero = Number(longitude);
    const precisaoNumero = precisao === null ? null : Number(precisao);

    if (
        !Number.isFinite(latitudeNumero) ||
        latitudeNumero < -90 ||
        latitudeNumero > 90 ||
        !Number.isFinite(longitudeNumero) ||
        longitudeNumero < -180 ||
        longitudeNumero > 180
    ) {
        return;
    }

    estadoOcorrencia.latitude = latitudeNumero;
    estadoOcorrencia.longitude = longitudeNumero;
    estadoOcorrencia.precisao =
        Number.isFinite(precisaoNumero) &&
        precisaoNumero >= 0
            ? precisaoNumero
            : null;

    latitudeOcorrenciaInput.value = latitudeNumero.toFixed(8);
    longitudeOcorrenciaInput.value = longitudeNumero.toFixed(8);
    precisaoOcorrenciaInput.value =
        estadoOcorrencia.precisao !== null
            ? estadoOcorrencia.precisao.toFixed(2)
            : "";

    atualizarMarcadorOcorrencia(
        latitudeNumero,
        longitudeNumero
    );

    atualizarCirculoPrecisaoOcorrencia(
        latitudeNumero,
        longitudeNumero,
        estadoOcorrencia.precisao
    );

    if (centralizar && mapaOcorrencia) {
        mapaOcorrencia.setView([
            latitudeNumero,
            longitudeNumero
        ], 18, {
            animate: true
        });
    }

    atualizarEtapasOcorrencia();
}

function mensagemErroGeolocalizacaoOcorrencias(error) {
    switch (error?.code) {
        case 1:
            return "O acesso à localização foi negado. Permita a localização no navegador e tente novamente.";

        case 2:
            return "Sua localização está indisponível neste momento.";

        case 3:
            return "A localização demorou para responder. Tente novamente.";

        default:
            return "Não foi possível obter sua localização.";
    }
}

function definirEstadoBotaoGps(carregando) {
    btnGpsOcorrencia.disabled = carregando;

    if (carregando) {
        btnGpsOcorrencia.innerHTML = '<span class="girando azul" aria-hidden="true"></span><span>Obtendo localização...</span>';
    } else {
        btnGpsOcorrencia.innerHTML = conteudoOriginalBotaoGps;
    }
}

function usarGpsOcorrencia() {
    limparMensagemOcorrencia();
    inicializarMapaOcorrencia();

    if (!navigator.geolocation) {
        mostrarMensagemOcorrencia(
            "Este navegador não oferece suporte à localização."
        );
        return;
    }

    if (
        !window.isSecureContext &&
        ![
            "localhost",
            "127.0.0.1"
        ].includes(window.location.hostname)
    ) {
        mostrarMensagemOcorrencia(
            "Para usar a localização, abra o Cidade360 por HTTPS."
        );
        return;
    }

    definirEstadoBotaoGps(true);

    navigator.geolocation.getCurrentPosition(
        (posicao) => {
            atualizarLocalizacaoOcorrencia(
                posicao.coords.latitude,
                posicao.coords.longitude,
                posicao.coords.accuracy,
                true
            );

            definirEstadoBotaoGps(false);
        },
        (error) => {
            definirEstadoBotaoGps(false);

            mostrarErroCampoOcorrencia(
                mapaPreviewOcorrencia,
                mensagemErroGeolocalizacaoOcorrencias(error)
            );
        },
        {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0
        }
    );
}

function limparLocalizacaoOcorrencia() {
    estadoOcorrencia.latitude = null;
    estadoOcorrencia.longitude = null;
    estadoOcorrencia.precisao = null;

    latitudeOcorrenciaInput.value = "";
    longitudeOcorrenciaInput.value = "";
    precisaoOcorrenciaInput.value = "";

    if (marcadorOcorrencia && mapaOcorrencia) {
        mapaOcorrencia.removeLayer(marcadorOcorrencia);
        marcadorOcorrencia = null;
    }

    if (circuloPrecisaoOcorrencia && mapaOcorrencia) {
        mapaOcorrencia.removeLayer(circuloPrecisaoOcorrencia);
        circuloPrecisaoOcorrencia = null;
    }

    if (textoLocalizacaoOcorrencia) {
        textoLocalizacaoOcorrencia.textContent = "Toque no mapa para marcar o local";
    }
}


/*========================================================================================================

FOTOS

=========================================================================================================*/

function validarArquivoFotoOcorrencias(arquivo) {
    if (!TIPOS_FOTO_PERMITIDOS.has(arquivo.type)) {
        return "A foto deve estar no formato JPG, PNG ou WEBP.";
    }

    if (arquivo.size <= 0) {
        return "A foto selecionada está vazia ou inválida.";
    }

    if (arquivo.size > TAMANHO_MAXIMO_FOTO) {
        return "Cada foto deve ter no máximo 5 MB.";
    }

    return null;
}

function criarIdFoto(arquivo) {
    return `${arquivo.name}-${arquivo.size}-${arquivo.lastModified}`;
}

function liberarFotosOcorrencia() {
    estadoOcorrencia.fotos.forEach((foto) => {
        URL.revokeObjectURL(foto.previewUrl);
    });

    estadoOcorrencia.fotos = [];
    renderizarFotosOcorrencia();
}

function removerFotoOcorrencia(id) {
    const indice = estadoOcorrencia.fotos.findIndex(
        (foto) => foto.id === id
    );

    if (indice === -1) {
        return;
    }

    URL.revokeObjectURL(
        estadoOcorrencia.fotos[indice].previewUrl
    );

    estadoOcorrencia.fotos.splice(indice, 1);
    renderizarFotosOcorrencia();
}

function renderizarFotosOcorrencia() {
    listaFotosOcorrencia.innerHTML = "";

    const quantidade = estadoOcorrencia.fotos.length;

    listaFotosOcorrencia.hidden = quantidade === 0;
    areaUploadOcorrencia.classList.toggle("compacta", quantidade > 0);
    areaUploadOcorrencia.hidden = quantidade >= MAX_FOTOS;

    if (textoUploadOcorrencia) {
        textoUploadOcorrencia.textContent = quantidade > 0
            ? `Adicionar outra foto (${quantidade}/${MAX_FOTOS})`
            : "Toque para tirar foto";
    }

    estadoOcorrencia.fotos.forEach((foto) => {
        const item = document.createElement("div");
        item.className = "f";

        const imagem = document.createElement("img");
        imagem.src = foto.previewUrl;
        imagem.alt = foto.arquivo.name;

        const remover = document.createElement("button");
        remover.type = "button";
        remover.setAttribute("aria-label", "Remover foto");
        remover.innerHTML = iconeOcorrencia("x", 14);

        remover.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            removerFotoOcorrencia(foto.id);
        });

        item.appendChild(imagem);
        item.appendChild(remover);
        listaFotosOcorrencia.appendChild(item);
    });

    atualizarEtapasOcorrencia();
}

function adicionarFotosOcorrencia(lista = fotosOcorrenciaInput.files) {
    limparMensagemOcorrencia();

    const arquivos = Array.from(
        lista || []
    );

    fotosOcorrenciaInput.value = "";

    if (arquivos.length === 0) {
        return;
    }

    for (const arquivo of arquivos) {
        if (estadoOcorrencia.fotos.length >= MAX_FOTOS) {
            mostrarErroCampoOcorrencia(
                areaUploadOcorrencia,
                `Você pode adicionar no máximo ${MAX_FOTOS} fotos por ocorrência.`
            );
            break;
        }

        const erroFoto = validarArquivoFotoOcorrencias(arquivo);

        if (erroFoto) {
            mostrarErroCampoOcorrencia(areaUploadOcorrencia, erroFoto);
            continue;
        }

        const id = criarIdFoto(arquivo);

        if (
            estadoOcorrencia.fotos.some(
                (foto) => foto.id === id
            )
        ) {
            continue;
        }

        estadoOcorrencia.fotos.push({
            id,
            arquivo,
            previewUrl: URL.createObjectURL(arquivo)
        });
    }

    renderizarFotosOcorrencia();
}


/*========================================================================================================

ETAPAS E CONTADORES

O número de cada etapa fica azul quando a etapa está completa.

=========================================================================================================*/

function atualizarEtapasOcorrencia() {
    const titulo = tituloOcorrenciaInput.value.trim();
    const descricao = descricaoOcorrenciaTextarea.value.trim();

    etapaDetalhes?.classList.toggle(
        "ok",
        titulo.length >= 5 &&
        Number(categoriaOcorrenciaSelect.value) > 0 &&
        descricao.length >= 15
    );

    etapaLocalizacao?.classList.toggle(
        "ok",
        Number.isFinite(estadoOcorrencia.latitude) &&
        Number.isFinite(estadoOcorrencia.longitude)
    );

    etapaFotos?.classList.toggle(
        "ok",
        estadoOcorrencia.fotos.length > 0
    );
}

function atualizarContadorOcorrencia(campo) {
    const contador = document.querySelector(`[data-contador="${campo.id}"]`);

    if (contador) {
        contador.textContent = `${campo.value.length}/${campo.maxLength}`;
    }
}

[tituloOcorrenciaInput, descricaoOcorrenciaTextarea].forEach((campo) => {
    campo.addEventListener("input", () => {
        atualizarContadorOcorrencia(campo);
        atualizarEtapasOcorrencia();

        const erro = document.querySelector(`[data-erro-para="${campo.id}"]`);

        if (erro) {
            erro.hidden = true;
        }
    });
});


/*========================================================================================================

VALIDAÇÃO

=========================================================================================================*/

function validarFormularioOcorrencia() {
    const titulo = tituloOcorrenciaInput.value.trim();
    const categoriaId = Number(categoriaOcorrenciaSelect.value);
    const descricao = descricaoOcorrenciaTextarea.value.trim();

    if (titulo.length < 5) {
        return {
            valido: false,
            mensagem: "Informe um título com pelo menos 5 caracteres.",
            campo: tituloOcorrenciaInput
        };
    }

    if (titulo.length > 200) {
        return {
            valido: false,
            mensagem: "O título deve ter no máximo 200 caracteres.",
            campo: tituloOcorrenciaInput
        };
    }

    if (
        !Number.isInteger(categoriaId) ||
        categoriaId <= 0
    ) {
        return {
            valido: false,
            mensagem: "Selecione uma categoria válida.",
            campo: categoriaOcorrenciaSelect
        };
    }

    if (descricao.length < 15) {
        return {
            valido: false,
            mensagem: "Descreva o problema com pelo menos 15 caracteres.",
            campo: descricaoOcorrenciaTextarea
        };
    }

    if (
        !Number.isFinite(estadoOcorrencia.latitude) ||
        !Number.isFinite(estadoOcorrencia.longitude)
    ) {
        return {
            valido: false,
            mensagem: "Use o GPS ou marque o local da ocorrência no mapa.",
            campo: mapaPreviewOcorrencia
        };
    }

    if (estadoOcorrencia.fotos.length === 0) {
        return {
            valido: false,
            mensagem: "Adicione pelo menos uma foto da ocorrência.",
            campo: areaUploadOcorrencia
        };
    }

    return {
        valido: true,
        dados: {
            titulo,
            categoriaId,
            descricao,
            endereco: enderecoOcorrenciaInput.value.trim()
        }
    };
}

function focarCampoOcorrencias(campo) {
    if (!campo) {
        return;
    }

    // O select de categoria fica escondido: rola até os botões.
    const alvo = campo === categoriaOcorrenciaSelect
        ? gradeCategoriasOcorrencia.querySelector(".cat-op") || gradeCategoriasOcorrencia
        : campo;

    alvo.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    if (typeof alvo.focus === "function") {
        alvo.focus({
            preventScroll: true
        });
    }
}


/*========================================================================================================

RESUMO

=========================================================================================================*/

// Se o backend não mandar o campo, mostra "-" em vez de um número inventado.
function definirNumeroOcorrencias(elemento, valor) {
    if (!elemento) {
        return;
    }

    if (valor === undefined || valor === null) {
        elemento.textContent = "-";
        return;
    }

    elemento.textContent = String(
        Number(valor) || 0
    );
}

async function carregarResumoOcorrencias() {
    try {
        const resposta = await fetchAutenticadoOcorrencias(
            `${API_OCORRENCIAS}/resumo`,
            {
                method: "GET"
            }
        );

        const dados = await lerRespostaOcorrencias(resposta);

        if (
            !resposta.ok ||
            !dados?.sucesso ||
            !dados.resumo
        ) {
            return;
        }

        definirNumeroOcorrencias(
            numeroTotalOcorrencias,
            dados.resumo.total
        );

        definirNumeroOcorrencias(
            numeroRecebidosOcorrencias,
            dados.resumo.recebidos
        );

        // Enquanto o backend ainda devolver "pendentes", ele é usado como "em análise".
        definirNumeroOcorrencias(
            numeroEmAnaliseOcorrencias,
            dados.resumo.em_analise ?? dados.resumo.pendentes
        );

        definirNumeroOcorrencias(
            numeroAndamentoOcorrencias,
            dados.resumo.em_andamento
        );

        definirNumeroOcorrencias(
            numeroResolvidasOcorrencias,
            dados.resumo.resolvidas
        );
    } catch (error) {
        console.error(
            "Erro ao carregar resumo de ocorrências:",
            error
        );
    }
}


/*========================================================================================================

REGISTRO

=========================================================================================================*/

function definirEstadoEnvioOcorrencia(enviando) {
    estadoOcorrencia.enviando = enviando;
    btnEnviarOcorrencia.disabled = enviando;

    if (enviando) {
        btnEnviarOcorrencia.innerHTML = '<span class="girando" aria-hidden="true"></span><span>Registrando ocorrência...</span>';
    } else {
        btnEnviarOcorrencia.innerHTML = conteudoOriginalBotaoEnviarOcorrencia;
    }
}

function limparFormularioOcorrencia() {
    formOcorrencia.reset();
    liberarFotosOcorrencia();
    limparLocalizacaoOcorrencia();
    sincronizarBotoesCategoria();

    [tituloOcorrenciaInput, descricaoOcorrenciaTextarea].forEach(atualizarContadorOcorrencia);
    atualizarEtapasOcorrencia();
}

async function registrarOcorrencia() {
    if (estadoOcorrencia.enviando) {
        return;
    }

    limparMensagemOcorrencia();

    const validacao = validarFormularioOcorrencia();

    if (!validacao.valido) {
        mostrarErroCampoOcorrencia(validacao.campo, validacao.mensagem);
        focarCampoOcorrencias(validacao.campo);
        return;
    }

    const formData = new FormData();

    formData.append(
        "titulo",
        validacao.dados.titulo
    );

    formData.append(
        "categoria_id",
        String(validacao.dados.categoriaId)
    );

    formData.append(
        "descricao",
        validacao.dados.descricao
    );

    formData.append(
        "latitude",
        estadoOcorrencia.latitude.toFixed(8)
    );

    formData.append(
        "longitude",
        estadoOcorrencia.longitude.toFixed(8)
    );

    if (estadoOcorrencia.precisao !== null) {
        formData.append(
            "precisao_localizacao_metros",
            estadoOcorrencia.precisao.toFixed(2)
        );
    }

    if (validacao.dados.endereco) {
        formData.append(
            "endereco",
            validacao.dados.endereco
        );
    }

    estadoOcorrencia.fotos.forEach((foto) => {
        formData.append(
            "fotos",
            foto.arquivo,
            foto.arquivo.name
        );
    });

    definirEstadoEnvioOcorrencia(true);

    try {
        const resposta = await fetchAutenticadoOcorrencias(
            API_OCORRENCIAS,
            {
                method: "POST",
                body: formData
            }
        );

        const dados = await lerRespostaOcorrencias(resposta);

        if (
            !resposta.ok ||
            !dados?.sucesso
        ) {
            throw new Error(
                dados?.mensagem ||
                `Não foi possível registrar a ocorrência. Erro ${resposta.status}.`
            );
        }

        const idOcorrencia = Number(
            dados.ocorrencia?.id
        );

        mostrarToastOcorrencia(
            "Ocorrência registrada",
            Number.isInteger(idOcorrencia) &&
            idOcorrencia > 0
                ? `OC-${new Date().getFullYear()}-${String(idOcorrencia).padStart(4, "0")} foi enviada para a prefeitura.`
                : "Ela foi enviada para a prefeitura."
        );

        limparFormularioOcorrencia();
        await carregarResumoOcorrencias();

        voltarOcorrencias();
    } catch (error) {
        console.error(
            "Erro ao registrar ocorrência:",
            error
        );

        if (error instanceof TypeError) {
            mostrarMensagemOcorrencia(
                "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."
            );
        } else {
            mostrarMensagemOcorrencia(
                error.message ||
                "Não foi possível registrar a ocorrência. Tente novamente."
            );
        }
    } finally {
        definirEstadoEnvioOcorrencia(false);
    }
}


/*========================================================================================================

EVENTOS

=========================================================================================================*/

btnNovaOcorrencia.addEventListener("click", () => {
    setTimeout(() => {
        inicializarMapaOcorrencia();
        mapaOcorrencia?.invalidateSize();
    }, 300);
});

btnGpsOcorrencia.addEventListener("click", (event) => {
    event.preventDefault();
    usarGpsOcorrencia();
});

fotosOcorrenciaInput.addEventListener("change", () => adicionarFotosOcorrencia());

// Arrastar fotos para a área (computador)
areaUploadOcorrencia.addEventListener("dragover", (event) => {
    event.preventDefault();
    areaUploadOcorrencia.classList.add("arrastando");
});

areaUploadOcorrencia.addEventListener("dragleave", () => {
    areaUploadOcorrencia.classList.remove("arrastando");
});

areaUploadOcorrencia.addEventListener("drop", (event) => {
    event.preventDefault();
    areaUploadOcorrencia.classList.remove("arrastando");
    adicionarFotosOcorrencia(event.dataTransfer?.files);
});

formOcorrencia.addEventListener("submit", (event) => {
    event.preventDefault();
    registrarOcorrencia();
});

btnCancelar.addEventListener("click", () => {
    limparMensagemOcorrencia();
});

window.addEventListener("beforeunload", () => {
    estadoOcorrencia.fotos.forEach((foto) => {
        URL.revokeObjectURL(foto.previewUrl);
    });
});


/*========================================================================================================

INICIALIZAÇÃO

=========================================================================================================*/

async function inicializarOcorrencias() {
    renderizarFotosOcorrencia();

    await Promise.allSettled([
        carregarCategoriasOcorrencia(),
        carregarResumoOcorrencias()
    ]);
}

inicializarOcorrencias();
