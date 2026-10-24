const PreferenciasModel =
    require("../models/preferenciasModel");


/*========================================================================================================

RESPOSTA DE ERRO

Banco ainda sem a migração 008: o front continua usando só a cópia do navegador.

=========================================================================================================*/

function responderErro(
    res,
    error,
    mensagemPadrao
) {
    if (error?.code === "ER_BAD_FIELD_ERROR") {
        return res
            .status(503)
            .json({
                sucesso: false,
                codigo: "PREFERENCIAS_INDISPONIVEIS",
                mensagem:
                    "As preferências da conta ainda não foram configuradas no banco de dados."
            });
    }

    console.error(
        mensagemPadrao,
        error
    );

    return res
        .status(500)
        .json({
            sucesso: false,
            mensagem: mensagemPadrao
        });
}


const PreferenciasController = {

    async buscar(
        req,
        res
    ) {
        try {
            const preferencias =
                await PreferenciasModel.buscar(
                    req.usuario.id
                );

            return res
                .status(200)
                .json({
                    sucesso: true,

                    // null = nunca salvou; o front envia o que tem no navegador
                    preferencias
                });

        } catch (error) {
            return responderErro(
                res,
                error,
                "Não foi possível carregar as preferências."
            );
        }
    },


    async salvar(
        req,
        res
    ) {
        try {
            const novas =
                PreferenciasModel.somenteConhecidas(
                    req.body
                );

            if (Object.keys(novas).length === 0) {
                return res
                    .status(400)
                    .json({
                        sucesso: false,
                        mensagem:
                            "Envie ao menos uma preferência válida (verdadeiro ou falso)."
                    });
            }

            const preferencias =
                await PreferenciasModel.salvar(
                    req.usuario.id,
                    novas
                );

            return res
                .status(200)
                .json({
                    sucesso: true,
                    preferencias
                });

        } catch (error) {
            return responderErro(
                res,
                error,
                "Não foi possível salvar as preferências."
            );
        }
    }
};

module.exports =
    PreferenciasController;
