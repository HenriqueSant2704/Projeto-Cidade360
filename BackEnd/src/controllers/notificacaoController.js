const NotificacaoModel =
    require("../models/notificacaoModel");


/*========================================================================================================

RESPOSTA DE ERRO

Banco ainda sem a migração 007: o sininho do front volta para o modo antigo
(monta as notificações a partir das ocorrências).

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
                codigo: "NOTIFICACOES_INDISPONIVEIS",
                mensagem:
                    "As notificações ainda não foram configuradas no banco de dados."
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


const NotificacaoController = {

    async listar(
        req,
        res
    ) {
        try {
            const {
                notificacoes,
                naoLidas
            } =
                await NotificacaoModel.listar({
                    usuarioId:
                        req.usuario.id,

                    limite:
                        req.query.limite
                });

            return res
                .status(200)
                .json({
                    sucesso: true,
                    nao_lidas: naoLidas,
                    notificacoes
                });

        } catch (error) {
            return responderErro(
                res,
                error,
                "Não foi possível carregar as notificações."
            );
        }
    },


    async marcarComoLida(
        req,
        res
    ) {
        try {
            const id =
                Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                return res
                    .status(400)
                    .json({
                        sucesso: false,
                        mensagem: "Notificação inválida."
                    });
            }

            const encontrada =
                await NotificacaoModel.marcarComoLida({
                    id,
                    usuarioId:
                        req.usuario.id
                });

            if (!encontrada) {
                return res
                    .status(404)
                    .json({
                        sucesso: false,
                        mensagem: "Notificação não encontrada."
                    });
            }

            return res
                .status(200)
                .json({
                    sucesso: true
                });

        } catch (error) {
            return responderErro(
                res,
                error,
                "Não foi possível marcar a notificação como lida."
            );
        }
    },


    // Chamado ao abrir a página de Avisos: os avisos deixam de ser "Novo".
    async marcarAvisosComoLidos(
        req,
        res
    ) {
        try {
            const total =
                await NotificacaoModel.marcarAvisosComoLidos(
                    req.usuario.id
                );

            return res
                .status(200)
                .json({
                    sucesso: true,
                    marcadas: total
                });

        } catch (error) {
            return responderErro(
                res,
                error,
                "Não foi possível marcar os avisos como vistos."
            );
        }
    },


    async marcarTodasComoLidas(
        req,
        res
    ) {
        try {
            const total =
                await NotificacaoModel.marcarTodasComoLidas(
                    req.usuario.id
                );

            return res
                .status(200)
                .json({
                    sucesso: true,
                    marcadas: total
                });

        } catch (error) {
            return responderErro(
                res,
                error,
                "Não foi possível marcar as notificações como lidas."
            );
        }
    }
};

module.exports =
    NotificacaoController;
