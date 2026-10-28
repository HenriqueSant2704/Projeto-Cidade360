const express =
    require("express");

const router =
    express.Router();

const authMiddleware =
    require("../middlewares/authMiddleware");

const permissaoMiddleware =
    require("../middlewares/permissaoMiddleware");

const limiteTentativas =
    require("../middlewares/limiteTentativas");

const AdministradorController =
    require("../controllers/administradorController");


// Área "Administradores": só administrador logado.
// A permissão é conferida aqui no servidor; esconder o item do menu não basta.
router.use(
    authMiddleware,
    permissaoMiddleware("equipe")
);

router.use((req, res, next) => {
    if (req.method === "POST") {
        if (!req.usuario.permissoes?.configurado) {
            return res.status(503).json({
                sucesso: false,
                codigo: "MIGRACAO_PENDENTE",
                mensagem: "As permissões da equipe ainda não foram configuradas no banco."
            });
        }
        return limiteTentativas.acaoAdmin(req, res, next);
    }
    next();
});

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
    "/:id/permissoes",
    AdministradorController.alterarPermissoes
);

router.post(
    "/:id/principal",
    AdministradorController.transferirPrincipal
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
