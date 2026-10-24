const express =
    require("express");


const router =
    express.Router();


const authMiddleware =
    require("../middlewares/authMiddleware");


const adminMiddleware =
    require("../middlewares/adminMiddleware");


const uploadFotoAviso =
    require("../middlewares/uploadAviso");


const AvisoController =
    require("../controllers/avisoController");


// Todas as rotas abaixo exigem login
router.use(
    authMiddleware
);


// Lista os avisos ativos, com a contagem de reações
router.get(
    "/",
    AvisoController.listar
);


// Reação do usuário logado (uma por aviso)
router.put(
    "/:id/reacao",
    AvisoController.reagir
);


router.delete(
    "/:id/reacao",
    AvisoController.removerReacao
);


// Publicar aviso
router.post(
    "/",
    adminMiddleware,
    uploadFotoAviso,
    AvisoController.criar
);


// Editar aviso
router.put(
    "/:id",
    adminMiddleware,
    uploadFotoAviso,
    AvisoController.atualizar
);


// Fixar ou desafixar no topo
router.patch(
    "/:id/fixar",
    adminMiddleware,
    AvisoController.fixar
);


// Restaurar aviso excluído (botão "Desfazer")
router.patch(
    "/:id/restaurar",
    adminMiddleware,
    AvisoController.restaurar
);


// Excluir aviso (exclusão lógica)
router.delete(
    "/:id",
    adminMiddleware,
    AvisoController.remover
);


module.exports =
    router;
