const express =
    require("express");


const router =
    express.Router();


const authMiddleware =
    require("../middlewares/authMiddleware");


const EstatisticasPainelController =
    require("../controllers/estatisticasPainelController");


// Todas as estatísticas do painel exigem usuário autenticado
router.use(
    authMiddleware
);


// Ranking das categorias mais registradas por todos os cidadãos
router.get(
    "/categorias",
    EstatisticasPainelController.listarCategorias
);


module.exports =
    router;
