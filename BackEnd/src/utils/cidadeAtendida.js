/*========================================================================================================

CIDADE ATENDIDA: regras usadas pelo cadastro, pelas ocorrências e pela rota pública

- cidadeEhAtendida(nome, uf): a cidade escolhida no cadastro está disponível?
- cidadeDoPonto(latitude, longitude): em qual cidade atendida o ponto fica (ou null)?
- dadosPublicosCidades(): o que o front precisa para travar os mapas.

O teste "o ponto está dentro da cidade?" é o clássico ponto-dentro-do-polígono
(ray casting), com uma pequena tolerância perto da divisa.

=========================================================================================================*/

const path =
    require("path");

const fs =
    require("fs");

const {
    CIDADES_ATENDIDAS,
    TOLERANCIA_LIMITE_METROS
} =
    require("../config/cidadeAtendida");


const PASTA_LIMITES =
    path.join(
        __dirname,
        "..",
        "data",
        "limites"
    );

const MENSAGEM_CIDADE_INDISPONIVEL =
    "Essa cidade ainda não está disponível no Cidade360. No momento, atendemos somente " +
    CIDADES_ATENDIDAS
        .map((cidade) => `${cidade.nome}-${cidade.uf}`)
        .join(", ") +
    ".";


/*========================================================================================================
TEXTO
=========================================================================================================*/

function normalizarNomeCidade(nome) {
    return String(nome || "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function normalizarUf(uf) {
    return String(uf || "")
        .trim()
        .toUpperCase();
}


/*========================================================================================================
LIMITES (carregados uma vez, na primeira consulta)
=========================================================================================================*/

let cidadesComLimite =
    null;

function carregarCidades() {
    if (cidadesComLimite) {
        return cidadesComLimite;
    }

    cidadesComLimite =
        CIDADES_ATENDIDAS.map((cidade) => {
            const conteudo =
                fs.readFileSync(
                    path.join(
                        PASTA_LIMITES,
                        cidade.arquivoLimite
                    ),
                    "utf8"
                );

            const geojson =
                JSON.parse(conteudo);

            const geometria =
                geojson.type === "Feature"
                    ? geojson.geometry
                    : geojson;

            // Sempre trabalha com MultiPolygon: [ poligono [ anel [ [lng, lat] ] ] ]
            const poligonos =
                geometria.type === "Polygon"
                    ? [geometria.coordinates]
                    : geometria.coordinates;

            return {
                ...cidade,
                geometria: {
                    type: "MultiPolygon",
                    coordinates: poligonos
                },
                poligonos
            };
        });

    return cidadesComLimite;
}


/*========================================================================================================
GEOMETRIA
=========================================================================================================*/

function pontoDentroDoAnel(latitude, longitude, anel) {
    let dentro =
        false;

    for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
        const [lngI, latI] = anel[i];
        const [lngJ, latJ] = anel[j];

        const cruza =
            (latI > latitude) !== (latJ > latitude) &&
            longitude < ((lngJ - lngI) * (latitude - latI)) / (latJ - latI) + lngI;

        if (cruza) {
            dentro = !dentro;
        }
    }

    return dentro;
}

function pontoDentroDoPoligono(latitude, longitude, poligono) {
    const [contorno, ...buracos] =
        poligono;

    if (!pontoDentroDoAnel(latitude, longitude, contorno)) {
        return false;
    }

    return !buracos.some((buraco) =>
        pontoDentroDoAnel(latitude, longitude, buraco)
    );
}

// Distância aproximada (em metros) do ponto até a linha do anel.
// Para distâncias pequenas a projeção plana é suficiente.
function distanciaAteAnelMetros(latitude, longitude, anel) {
    const metrosPorGrauLat =
        111320;

    const metrosPorGrauLng =
        111320 * Math.cos((latitude * Math.PI) / 180);

    let menor =
        Infinity;

    for (let i = 0; i < anel.length - 1; i++) {
        const ax = (anel[i][0] - longitude) * metrosPorGrauLng;
        const ay = (anel[i][1] - latitude) * metrosPorGrauLat;
        const bx = (anel[i + 1][0] - longitude) * metrosPorGrauLng;
        const by = (anel[i + 1][1] - latitude) * metrosPorGrauLat;

        const dx = bx - ax;
        const dy = by - ay;
        const tamanho = dx * dx + dy * dy;

        const t =
            tamanho === 0
                ? 0
                : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / tamanho));

        const px = ax + t * dx;
        const py = ay + t * dy;

        menor =
            Math.min(menor, Math.sqrt(px * px + py * py));
    }

    return menor;
}

function pontoNaCidade(latitude, longitude, cidade) {
    const dentro =
        cidade.poligonos.some((poligono) =>
            pontoDentroDoPoligono(latitude, longitude, poligono)
        );

    if (dentro) {
        return true;
    }

    return cidade.poligonos.some((poligono) =>
        distanciaAteAnelMetros(latitude, longitude, poligono[0]) <= TOLERANCIA_LIMITE_METROS
    );
}


/*========================================================================================================
REGRAS
=========================================================================================================*/

function cidadeEhAtendida(nome, uf) {
    const nomeNormalizado =
        normalizarNomeCidade(nome);

    const ufNormalizada =
        normalizarUf(uf);

    return CIDADES_ATENDIDAS.find((cidade) =>
        normalizarNomeCidade(cidade.nome) === nomeNormalizado &&
        cidade.uf === ufNormalizada
    ) || null;
}

function cidadeDoPonto(latitude, longitude) {
    const lat =
        Number(latitude);

    const lng =
        Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
    }

    return carregarCidades().find((cidade) =>
        pontoNaCidade(lat, lng, cidade)
    ) || null;
}

function dadosPublicosCidades() {
    return carregarCidades().map((cidade) => ({
        nome: cidade.nome,
        uf: cidade.uf,
        codigoIbge: cidade.codigoIbge,
        centro: cidade.centro,
        zoom: cidade.zoom,
        limite: cidade.geometria
    }));
}


module.exports = {
    MENSAGEM_CIDADE_INDISPONIVEL,
    TOLERANCIA_LIMITE_METROS,
    normalizarNomeCidade,
    normalizarUf,
    cidadeEhAtendida,
    cidadeDoPonto,
    dadosPublicosCidades
};
