const express =
    require("express");

const router =
    express.Router();

const AdministradorController =
    require("../controllers/administradorController");
const limiteTentativas = require("../middlewares/limiteTentativas");


// Rotas públicas do convite de administrador.
// Quem abre o link ainda não tem login: o token do e-mail é a autorização.
router.get(
    "/:token",
    AdministradorController.verConvite
);

router.post(
    "/:token/aceitar",
    limiteTentativas.confirmarCodigo,
    AdministradorController.aceitarConvite
);

module.exports =
    router;
