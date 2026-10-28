const express =
    require("express");

const router =
    express.Router();

const {
    MENSAGEM_CIDADE_INDISPONIVEL,
    TOLERANCIA_LIMITE_METROS,
    dadosPublicosCidades
} =
    require("../utils/cidadeAtendida");


// Rota pública (o cadastro usa antes do login).
// Entrega as cidades atendidas e o contorno de cada uma para travar os mapas.
router.get(
    "/",

    (req, res) => {

        try {

            res.set(
                "Cache-Control",
                "public, max-age=3600"
            );

            return res
                .status(200)
                .json({
                    sucesso: true,
                    cidades:
                        dadosPublicosCidades(),
                    tolerancia_metros:
                        TOLERANCIA_LIMITE_METROS,
                    mensagem_indisponivel:
                        MENSAGEM_CIDADE_INDISPONIVEL
                });

        } catch (error) {

            console.error(
                "Erro ao carregar cidades atendidas:",
                error
            );

            return res
                .status(500)
                .json({
                    sucesso: false,
                    mensagem:
                        "Não foi possível carregar a cidade atendida."
                });
        }
    }
);

module.exports =
    router;
