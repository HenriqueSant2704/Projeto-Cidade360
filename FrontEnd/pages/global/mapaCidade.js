/*===================================================================

 MAPA TRAVADO NA CIDADE ATENDIDA (hoje: Jaborandi-SP)

 Usado pelos mapas do sistema (nova ocorrência, painel e detalhes).
 O contorno da cidade vem do servidor: GET /api/cidade-atendida.

 - travar(mapa, { pontoVisivel }): o mapa não sai da região, escurece o que está fora
   e desenha a divisa da cidade tracejada.
 - dentro(lat, lng): o ponto fica dentro da cidade?
 - sinalizarFora(mapa, lat, lng): mostra um "X" rápido no ponto recusado.

 O mapa continua sendo o OpenStreetMap de sempre (com as ruas).
 O servidor confere de novo ao salvar a ocorrência.

===================================================================*/

(() => {

    "use strict";

    const API_CIDADE_ATENDIDA = "/api/cidade-atendida";

    // Usado se o servidor não responder (o servidor confere de novo ao salvar).
    const CIDADE_PADRAO = {
        nome: "Jaborandi",
        uf: "SP",
        centro: [-20.6884, -48.4112],
        zoom: 14,
        limite: null
    };

    let cidades = [CIDADE_PADRAO];
    let toleranciaMetros = 150;
    let carregou = false;
    let carregando = null;


    /*===============================================================
     CARREGAR DO SERVIDOR (uma vez por página)
    ===============================================================*/

    function carregar() {
        if (carregou) {
            return Promise.resolve(cidades);
        }

        if (!carregando) {
            carregando = fetch(API_CIDADE_ATENDIDA)
                .then((resposta) => (resposta.ok ? resposta.json() : null))
                .then((dados) => {
                    if (dados?.sucesso && Array.isArray(dados.cidades) && dados.cidades.length) {
                        cidades = dados.cidades;

                        if (Number.isFinite(Number(dados.tolerancia_metros))) {
                            toleranciaMetros = Number(dados.tolerancia_metros);
                        }

                        carregou = true;
                    }

                    return cidades;
                })
                .catch((error) => {
                    console.warn("Não foi possível carregar o limite da cidade:", error);
                    return cidades;
                })
                .finally(() => {
                    carregando = null;
                });
        }

        return carregando;
    }

    function principal() {
        return cidades[0] || CIDADE_PADRAO;
    }

    function nomeCidade() {
        const cidade = principal();
        return `${cidade.nome}-${cidade.uf}`;
    }


    /*===============================================================
     GEOMETRIA (mesma regra do servidor: utils/cidadeAtendida.js)
     Coordenadas do GeoJSON: [longitude, latitude]
    ===============================================================*/

    function poligonosDa(cidade) {
        const limite = cidade?.limite;

        if (!limite) return [];

        return limite.type === "Polygon"
            ? [limite.coordinates]
            : limite.coordinates || [];
    }

    function dentroDoAnel(lat, lng, anel) {
        let dentro = false;

        for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
            const [lngI, latI] = anel[i];
            const [lngJ, latJ] = anel[j];

            if (
                (latI > lat) !== (latJ > lat) &&
                lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI
            ) {
                dentro = !dentro;
            }
        }

        return dentro;
    }

    function distanciaAteAnelMetros(lat, lng, anel) {
        const metrosLat = 111320;
        const metrosLng = 111320 * Math.cos((lat * Math.PI) / 180);

        let menor = Infinity;

        for (let i = 0; i < anel.length - 1; i++) {
            const ax = (anel[i][0] - lng) * metrosLng;
            const ay = (anel[i][1] - lat) * metrosLat;
            const dx = (anel[i + 1][0] - lng) * metrosLng - ax;
            const dy = (anel[i + 1][1] - lat) * metrosLat - ay;
            const tamanho = dx * dx + dy * dy;

            const t = tamanho === 0
                ? 0
                : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / tamanho));

            menor = Math.min(menor, Math.hypot(ax + t * dx, ay + t * dy));
        }

        return menor;
    }

    function pontoNaCidade(lat, lng, cidade) {
        const poligonos = poligonosDa(cidade);

        // Sem contorno carregado: a tela não bloqueia, o servidor decide.
        if (!poligonos.length) return true;

        const dentro = poligonos.some(([contorno, ...buracos]) =>
            dentroDoAnel(lat, lng, contorno) &&
            !buracos.some((buraco) => dentroDoAnel(lat, lng, buraco))
        );

        return dentro || poligonos.some(([contorno]) =>
            distanciaAteAnelMetros(lat, lng, contorno) <= toleranciaMetros
        );
    }

    function dentro(lat, lng) {
        const latitude = Number(lat);
        const longitude = Number(lng);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return false;
        }

        return cidades.some((cidade) => pontoNaCidade(latitude, longitude, cidade));
    }

    // Retângulo da cidade com folga (dá para ver um pouco das cidades vizinhas)
    function areaPermitida(cidade) {
        const pontos = poligonosDa(cidade).flatMap(([contorno]) => contorno);

        if (!pontos.length) {
            const [lat, lng] = cidade.centro;
            return L.latLngBounds([lat - 0.12, lng - 0.12], [lat + 0.12, lng + 0.12]);
        }

        const lats = pontos.map((p) => p[1]);
        const lngs = pontos.map((p) => p[0]);

        return L.latLngBounds(
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)]
        ).pad(0.35);
    }


    /*===============================================================
     ESTILO (máscara de fora, divisa tracejada e "X" de recusado)
    ===============================================================*/

    function prepararEstilo() {
        if (document.getElementById("cidade360-mapa-cidade")) return;

        const style = document.createElement("style");
        style.id = "cidade360-mapa-cidade";
        style.textContent = `
            .leaflet-pane path.fora-da-cidade {
                fill: #475569;
                fill-opacity: .32;
                stroke: none;
            }

            html[data-tema="escuro"] .leaflet-pane path.fora-da-cidade {
                fill: #000;
                fill-opacity: .5;
            }

            .leaflet-pane path.divisa-cidade {
                fill: none;
                stroke: var(--accent, #2563eb);
                stroke-width: 3;
                stroke-dasharray: 8 6;
                stroke-linecap: round;
            }

            .ponto-recusado {
                background: none;
                border: 0;
            }

            .ponto-recusado span {
                display: grid;
                place-items: center;
                width: 34px;
                height: 34px;
                border-radius: 50%;
                background: var(--danger, #dc2626);
                color: #fff;
                box-shadow: 0 0 0 6px color-mix(in srgb, var(--danger, #dc2626) 25%, transparent);
                animation: ponto-recusado 1.6s ease forwards;
            }

            @keyframes ponto-recusado {
                0% { transform: scale(.4); }
                15% { transform: scale(1); }
                75% { opacity: 1; }
                100% { opacity: 0; transform: scale(.9); }
            }

        `;

        document.head.appendChild(style);
    }


    /*===============================================================
     TRAVAR O MAPA
    ===============================================================*/

    async function travar(mapa, opcoes = {}) {
        if (!mapa || typeof L === "undefined") return;

        await carregar();

        // A tela pode ter fechado o mapa enquanto o limite carregava
        if (!mapa._container || !mapa._mapPane) return;

        prepararEstilo();

        const cidade = principal();
        const area = areaPermitida(cidade);

        // Mapa de detalhes de uma ocorrência antiga fora da área: não trava, para o pino continuar visível
        if (opcoes.pontoVisivel && !area.contains(opcoes.pontoVisivel)) {
            return;
        }

        mapa.setMaxBounds(area);
        mapa.options.maxBoundsViscosity = 1.0;
        mapa.setMinZoom(opcoes.zoomMinimo || 11);

        const poligonos = poligonosDa(cidade);

        if (poligonos.length && !mapa._cidade360Divisa) {
            const paraLatLng = (anel) => anel.map(([lng, lat]) => [lat, lng]);

            // O mundo inteiro com "buracos" no formato da cidade
            const mundo = [[-89, -179.9], [-89, 179.9], [89, 179.9], [89, -179.9]];

            mapa._cidade360Mascara = L.polygon(
                [mundo, ...poligonos.map(([contorno]) => paraLatLng(contorno))],
                { className: "fora-da-cidade", interactive: false }
            ).addTo(mapa);

            mapa._cidade360Divisa = L.polygon(
                poligonos.map(([contorno]) => paraLatLng(contorno)),
                { className: "divisa-cidade", interactive: false, fill: false }
            ).addTo(mapa);
        }

        // Se o mapa abriu fora da área (ex.: posição salva antiga), volta para a cidade
        if (!area.contains(mapa.getCenter())) {
            mapa.setView(cidade.centro, cidade.zoom || 14);
        }
    }

    function sinalizarFora(mapa, lat, lng) {
        if (!mapa || typeof L === "undefined") return;

        prepararEstilo();

        const marcador = L.marker([lat, lng], {
            interactive: false,
            keyboard: false,
            icon: L.divIcon({
                className: "ponto-recusado",
                html: '<span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></span>',
                iconSize: [34, 34],
                iconAnchor: [17, 17]
            })
        }).addTo(mapa);

        setTimeout(() => marcador.remove(), 1700);
    }


    window.MapaCidade360 = {
        carregar,
        travar,
        dentro,
        sinalizarFora,
        nomeCidade,
        centro: () => principal().centro.slice(),
        zoom: () => principal().zoom || 14
    };

})();
