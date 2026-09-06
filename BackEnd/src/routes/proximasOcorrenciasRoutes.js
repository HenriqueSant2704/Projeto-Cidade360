const express =
    require("express");


const router =
    express.Router();


const authMiddleware =
    require("../middlewares/authMiddleware");


const ProximasOcorrenciasController =
    require("../controllers/proximasOcorrenciasController");


// Todas as rotas exigem usuário autenticado
router.use(
    authMiddleware
);


// Ocorrências próximas da localização atual do cidadão
router.get(
    "/",
    ProximasOcorrenciasController.listar
);


module.exports =
    router;
