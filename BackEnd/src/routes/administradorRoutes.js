const express =
    require("express");

const router =
    express.Router();

const authMiddleware =
    require("../middlewares/authMiddleware");

const adminMiddleware =
    require("../middlewares/adminMiddleware");

const AdministradorController =
    require("../controllers/administradorController");


// Área "Administradores": só administrador logado.
// A permissão é conferida aqui no servidor; esconder o item do menu não basta.
router.use(
    authMiddleware,
    adminMiddleware
);

// Equipe, convites pendentes e histórico
router.get(
    "/",
    AdministradorController.listar
);

// Busca de cidadãos para promover (?busca=nome, e-mail ou CPF completo)
router.get(
    "/cidadaos",
    AdministradorController.buscarCidadaos
);

router.post(
    "/promover",
    AdministradorController.promover
);

router.post(
    "/:id/remover",
    AdministradorController.remover
);

router.post(
    "/convites",
    AdministradorController.convidar
);

router.post(
    "/convites/:id/reenviar",
    AdministradorController.reenviarConvite
);

router.post(
    "/convites/:id/cancelar",
    AdministradorController.cancelarConvite
);

module.exports =
    router;
