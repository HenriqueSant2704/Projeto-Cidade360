const EstatisticasPainelModel =
    require("../models/estatisticasPainelModel");


/*========================================================================================================

CONTROLLER DE ESTATÍSTICAS DO PAINEL

=========================================================================================================*/

const EstatisticasPainelController = {

    /*====================================================================================================

    CATEGORIAS MAIS REGISTRADAS

    GET /api/estatisticas-painel/categorias

    =====================================================================================================*/

    async listarCategorias(
        req,
        res
    ) {
        try {
            const limiteSolicitado =
                Number(
                    req.query.limite
                );


            const limite =
                Math.min(
                    Math.max(
                        Number.isInteger(
                            limiteSolicitado
                        )
                            ? limiteSolicitado
                            : 5,
                        1
                    ),
                    50
                );


            const categorias =
                await EstatisticasPainelModel
                    .listarCategoriasMaisRegistradas(
                        limite
                    );


            const totalRegistros =
                categorias.reduce(
                    (acumulado, categoria) => {
                        return (
                            acumulado +
                            Number(
                                categoria.total || 0
                            )
                        );
                    },
                    0
                );


            return res
                .status(200)
                .json({
                    sucesso: true,

                    total_categorias:
                        categorias.length,

                    total_registros_retornados:
                        totalRegistros,

                    categorias
                });

        } catch (error) {
            console.error(
                "Erro ao carregar categorias mais registradas:",
                error
            );


            return res
                .status(500)
                .json({
                    sucesso: false,

                    mensagem:
                        "Não foi possível carregar as categorias mais registradas."
                });
        }
    }
};


module.exports =
    EstatisticasPainelController;
