const express =
    require("express");

const router =
    express.Router();

const AdministradorController =
    require("../controllers/administradorController");


// Rotas públicas do convite de administrador.
// Quem abre o link ainda não tem login: o token do e-mail é a autorização.
router.get(
    "/:token",
    AdministradorController.verConvite
);

router.post(
    "/:token/aceitar",
    AdministradorController.aceitarConvite
);

module.exports =
    router;
