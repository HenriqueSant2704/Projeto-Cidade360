const express =
    require("express");

const router =
    express.Router();

const authMiddleware =
    require("../middlewares/authMiddleware");

const PontosController =
    require("../controllers/pontosController");


// Todas as rotas abaixo exigem login.
// Cada usuário só enxerga os próprios pontos (o id vem do token).
router.use(
    authMiddleware
);

// Tela "Meus pontos": saldo, títulos e histórico por ocorrência
router.get(
    "/",
    PontosController.meusPontos
);

// Só saldo e título atual (cartão do menu do perfil)
router.get(
    "/resumo",
    PontosController.resumo
);

module.exports =
    router;
