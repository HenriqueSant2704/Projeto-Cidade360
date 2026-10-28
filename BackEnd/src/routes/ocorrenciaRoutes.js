const express =
    require("express");

const router =
    express.Router();


const authMiddleware =
    require("../middlewares/authMiddleware");


const permissaoMiddleware =
    require("../middlewares/permissaoMiddleware");


const uploadFotoOcorrencia =
    require("../middlewares/uploadOcorrencia");


const OcorrenciaController =
    require("../controllers/ocorrenciaController");


// Todas as rotas abaixo exigem login
router.use(
    authMiddleware
);


// Categorias
router.get(
    "/categorias",
    OcorrenciaController.listarCategorias
);


// Status disponíveis
router.get(
    "/status",
    OcorrenciaController.listarStatus
);


// Resumo do cidadão
router.get(
    "/resumo",
    OcorrenciaController.resumo
);


// Resumo geral para administrador
router.get(
    "/admin/resumo",
    permissaoMiddleware("ocorrencias"),
    OcorrenciaController.resumoAdmin
);


// Todas as ocorrências para administrador
router.get(
    "/admin",
    permissaoMiddleware("ocorrencias"),
    OcorrenciaController.listarTodasAdmin
);


// Minhas ocorrências
router.get(
    "/",
    OcorrenciaController.listarMinhas
);


// Atualizar status
router.patch(
    "/:id/status",
    permissaoMiddleware("ocorrencias"),
    OcorrenciaController.atualizarStatus
);


// Detalhes
router.get(
    "/:id",
    OcorrenciaController.buscarPorId
);


// Registrar ocorrência
router.post(
    "/",
    uploadFotoOcorrencia,
    OcorrenciaController.criar
);


module.exports =
    router;
