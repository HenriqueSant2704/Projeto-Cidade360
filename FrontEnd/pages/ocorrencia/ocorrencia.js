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

    }, 350);

}

function voltarOcorrencias() {

    telaFormulario.classList.remove("animar-entrada");
    telaFormulario.classList.add("animar-saida");

    setTimeout(() => {

        telaFormulario.classList.add("oculto");
        telaFormulario.classList.remove("animar-saida");

        telaOcorrencias.classList.remove("oculto");
        telaOcorrencias.classList.add("animar-entrada");

    }, 350);

}

btnNovaOcorrencia.addEventListener("click", abrirFormulario);

btnVoltar.addEventListener("click", voltarOcorrencias);

btnCancelar.addEventListener("click", voltarOcorrencias);


/*========================================================================================================

INTEGRAÇÃO DE OCORRÊNCIAS

=========================================================================================================*/

const API_OCORRENCIAS = "/api/ocorrencias";
const LOGIN_PAGE_OCORRENCIAS = "../../../FrontEnd/pages/login/login.html";
const MAX_FOTOS = 5;
const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024;

const formOcorrencia = document.getElementById("form-ocorrencia");
const tituloOcorrenciaInput = document.getElementById("ocorrencia-titulo");
const categoriaOcorrenciaSelect = document.getElementById("ocorrencia-categoria");
const descricaoOcorrenciaTextarea = document.getElementById("ocorrencia-descricao");
const enderecoOcorrenciaInput = document.getElementById("ocorrencia-endereco");
const latitudeOcorrenciaInput = document.getElementById("ocorrencia-latitude");
const longitudeOcorrenciaInput = document.getElementById("ocorrencia-longitude");
const precisaoOcorrenciaInput = document.getElementById("ocorrencia-precisao");
const btnGpsOcorrencia = document.getElementById("btn-gps");
const mapaPreviewOcorrencia = document.getElementById("mapa-ocorrencia");
const fotosOcorrenciaInput = document.getElementById("fotos");
const areaUploadOcorrencia = document.getElementById("area-upload");
const listaFotosOcorrencia = document.getElementById("lista-fotos");
const btnEnviarOcorrencia = document.getElementById("btn-enviar-ocorrencia");
const mensagemOcorrencia = document.getElementById("mensagem-ocorrencia");

const numeroTotalOcorrencias = document.querySelector(".numero.total");
const numeroPendentesOcorrencias = document.querySelector(".numero.pendente");
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
    } catch (error) {
        categoriaOcorrenciaSelect.innerHTML = '<option value="">Não foi possível carregar as categorias</option>';

        mostrarMensagemOcorrencia(
            error.message ||
            "Não foi possível carregar as categorias."
        );
    }
}


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

    mapaPreviewOcorrencia.classList.add("mapa-ativo");

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
            autoPan: true
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
            `<strong>Local da ocorrência</strong><br>${textoPrecisao}<br>Arraste o alfinete para ajustar.`
        )
        .openPopup();
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
        btnGpsOcorrencia.innerHTML = conteudoOriginalBotaoGps.replace(
            "Usar GPS",
            "Obtendo localização..."
        );
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

            mostrarMensagemOcorrencia(
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

    if (estadoOcorrencia.fotos.length === 0) {
        areaUploadOcorrencia.classList.remove("com-fotos");
        return;
    }

    areaUploadOcorrencia.classList.add("com-fotos");

    estadoOcorrencia.fotos.forEach((foto) => {
        const item = document.createElement("div");
        item.className = "foto-preview-item";

        const imagem = document.createElement("img");
        imagem.src = foto.previewUrl;
        imagem.alt = foto.arquivo.name;

        const remover = document.createElement("button");
        remover.type = "button";
        remover.className = "btn-remover-foto";
        remover.setAttribute("aria-label", "Remover foto");
        remover.textContent = "×";

        remover.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            removerFotoOcorrencia(foto.id);
        });

        item.appendChild(imagem);
        item.appendChild(remover);
        listaFotosOcorrencia.appendChild(item);
    });

    if (estadoOcorrencia.fotos.length < MAX_FOTOS) {
        const adicionar = document.createElement("div");
        adicionar.className = "adicionar-foto-item";
        adicionar.innerHTML = `
            <strong>+</strong>
            <span>Adicionar foto</span>
        `;

        listaFotosOcorrencia.appendChild(adicionar);
    }
}

function adicionarFotosOcorrencia() {
    limparMensagemOcorrencia();

    const arquivos = Array.from(
        fotosOcorrenciaInput.files || []
    );

    fotosOcorrenciaInput.value = "";

    if (arquivos.length === 0) {
        return;
    }

    for (const arquivo of arquivos) {
        if (estadoOcorrencia.fotos.length >= MAX_FOTOS) {
            mostrarMensagemOcorrencia(
                `Você pode adicionar no máximo ${MAX_FOTOS} fotos por ocorrência.`
            );
            break;
        }

        const erroFoto = validarArquivoFotoOcorrencias(arquivo);

        if (erroFoto) {
            mostrarMensagemOcorrencia(erroFoto);
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

    campo.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    if (typeof campo.focus === "function") {
        campo.focus({
            preventScroll: true
        });
    }
}


/*========================================================================================================

RESUMO

=========================================================================================================*/

function definirNumeroOcorrencias(elemento, valor) {
    if (!elemento) {
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
            numeroPendentesOcorrencias,
            dados.resumo.pendentes
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
        btnEnviarOcorrencia.textContent = "Registrando ocorrência...";
    } else {
        btnEnviarOcorrencia.innerHTML = conteudoOriginalBotaoEnviarOcorrencia;
    }
}

function limparFormularioOcorrencia() {
    formOcorrencia.reset();
    liberarFotosOcorrencia();
    limparLocalizacaoOcorrencia();
}

async function registrarOcorrencia() {
    if (estadoOcorrencia.enviando) {
        return;
    }

    limparMensagemOcorrencia();

    const validacao = validarFormularioOcorrencia();

    if (!validacao.valido) {
        mostrarMensagemOcorrencia(validacao.mensagem);
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

        mostrarMensagemOcorrencia(
            Number.isInteger(idOcorrencia) &&
            idOcorrencia > 0
                ? `Ocorrência #${idOcorrencia} registrada com sucesso.`
                : "Ocorrência registrada com sucesso.",
            "sucesso"
        );

        limparFormularioOcorrencia();
        await carregarResumoOcorrencias();

        setTimeout(() => {
            voltarOcorrencias();
            limparMensagemOcorrencia();
        }, 900);
    } catch (error) {
        console.error(
            "Erro ao registrar ocorrência:",
            error
        );

        if (error instanceof TypeError) {
            mostrarMensagemOcorrencia(
                "Não foi possível conectar ao servidor. Verifique se o backend está em execução e tente novamente."
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
    }, 400);
});

btnGpsOcorrencia.addEventListener("click", (event) => {
    event.preventDefault();
    usarGpsOcorrencia();
});

fotosOcorrenciaInput.addEventListener("change", adicionarFotosOcorrencia);

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