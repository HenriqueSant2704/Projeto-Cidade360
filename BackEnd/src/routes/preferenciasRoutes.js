const express =
    require("express");

const router =
    express.Router();

const authMiddleware =
    require("../middlewares/authMiddleware");

const PreferenciasController =
    require("../controllers/preferenciasController");


// Cada usuário lê e salva só as próprias preferências (o id vem do token).
router.use(
    authMiddleware
);

router.get(
    "/",
    PreferenciasController.buscar
);

// JSON { "temaEscuro": true } (só as chaves enviadas mudam)
router.put(
    "/",
    PreferenciasController.salvar
);

module.exports =
    router;
