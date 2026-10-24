const PontosModel =
    require("../models/pontosModel");

const {
    TITULOS,
    tituloDoSaldo,
    proximoTitulo
} =
    require("../utils/titulosCidadao");


/*========================================================================================================

MEUS PONTOS

Cada usuário só vê os próprios pontos (o id vem do token).
Banco ainda sem a migração 007: responde 503 e a tela mostra um aviso amigável.

=========================================================================================================*/

function responderErro(
    res,
    error,
    mensagemPadrao
) {
    if (error?.code === "ER_NO_SUCH_TABLE") {
        return res
            .status(503)
            .json({
                sucesso: false,
                codigo: "PONTOS_INDISPONIVEIS",
                mensagem:
                    "O histórico de pontos ainda não foi configurado no banco de dados."
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


function montarResumo(saldo) {
    return {
        saldo,
        titulo: tituloDoSaldo(saldo),
        proximo_titulo: proximoTitulo(saldo)
    };
}


const PontosController = {

    // Saldo e título atual (usado no cartão do menu do perfil).
    async resumo(
        req,
        res
    ) {
        try {
            const saldo =
                await PontosModel.saldoDoUsuario(
                    req.usuario.id
                );

            return res
                .status(200)
                .json({
                    sucesso: true,
                    ...montarResumo(saldo)
                });

        } catch (error) {
            return responderErro(
                res,
                error,
                "Não foi possível carregar os seus pontos."
            );
        }
    },


    // Tela "Meus pontos": saldo, títulos e histórico por ocorrência.
    async meusPontos(
        req,
        res
    ) {
        try {
            const [saldo, ocorrencias] =
                await Promise.all([
                    PontosModel.saldoDoUsuario(req.usuario.id),
                    PontosModel.historicoDoUsuario(req.usuario.id)
                ]);

            return res
                .status(200)
                .json({
                    sucesso: true,
                    ...montarResumo(saldo),
                    titulos: TITULOS,
                    regras: PontosModel.PONTOS_POR_ETAPA,
                    ocorrencias
                });

        } catch (error) {
            return responderErro(
                res,
                error,
                "Não foi possível carregar os seus pontos."
            );
        }
    }
};

module.exports =
    PontosController;
