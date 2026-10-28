const ProximasOcorrenciasModel =
    require("../models/proximasOcorrenciasModel");

const {
    CIDADES_ATENDIDAS
} =
    require("../config/cidadeAtendida");

const {
    cidadeDoPonto
} =
    require("../utils/cidadeAtendida");


/*========================================================================================================

NÚMERO

=========================================================================================================*/

function numero(valor) {
    const convertido =
        Number(valor);

    return Number.isFinite(
        convertido
    )
        ? convertido
        : null;
}


/*========================================================================================================

CONTROLLER

=========================================================================================================*/

const ProximasOcorrenciasController = {

    async listar(
        req,
        res
    ) {
        try {
            let latitude =
                numero(
                    req.query.latitude
                );

            let longitude =
                numero(
                    req.query.longitude
                );

            if (
                latitude === null ||
                latitude < -90 ||
                latitude > 90 ||
                longitude === null ||
                longitude < -180 ||
                longitude > 180
            ) {
                return res
                    .status(400)
                    .json({
                        sucesso: false,
                        mensagem:
                            "Latitude ou longitude inválida."
                    });
            }

            // Quem está fora da cidade (viajando, GPS impreciso) vê as
            // ocorrências a partir do centro da cidade atendida.
            const foraDaCidade =
                !cidadeDoPonto(
                    latitude,
                    longitude
                );

            if (foraDaCidade) {
                [latitude, longitude] =
                    CIDADES_ATENDIDAS[0].centro;
            }

            const raioSolicitado =
                numero(
                    req.query.raio
                );

            const raioKm =
                Math.min(
                    Math.max(
                        raioSolicitado || 5,
                        1
                    ),
                    20
                );

            const limiteSolicitado =
                Number(
                    req.query.limite
                );

            const limite =
                Math.min(
                    Math.max(
                        Number.isInteger(limiteSolicitado)
                            ? limiteSolicitado
                            : 100,
                        1
                    ),
                    100
                );

            const ocorrencias =
                await ProximasOcorrenciasModel
                    .listarProximas({
                        usuarioId:
                            req.usuario.id,
                        latitude,
                        longitude,
                        raioKm,
                        limite
                    });

            return res
                .status(200)
                .json({
                    sucesso: true,
                    raio_km:
                        raioKm,
                    fora_da_cidade:
                        foraDaCidade,
                    total:
                        ocorrencias.length,
                    ocorrencias
                });

        } catch (error) {
            console.error(
                "Erro ao carregar ocorrências próximas:",
                error
            );

            return res
                .status(500)
                .json({
                    sucesso: false,
                    mensagem:
                        "Não foi possível carregar as ocorrências próximas."
                });
        }
    }
};


module.exports =
    ProximasOcorrenciasController;
