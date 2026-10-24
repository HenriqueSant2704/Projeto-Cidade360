const express =
    require("express");

const router =
    express.Router();

const authMiddleware =
    require("../middlewares/authMiddleware");

const NotificacaoController =
    require("../controllers/notificacaoController");


// Todas as rotas abaixo exigem login.
// Cada usuário só enxerga e marca as próprias notificações (o id vem do token).
router.use(
    authMiddleware
);

// Lista as notificações do usuário logado
router.get(
    "/",
    NotificacaoController.listar
);

// Marcar todas como lidas
router.patch(
    "/lidas",
    NotificacaoController.marcarTodasComoLidas
);

// Marcar os avisos novos como vistos (ao abrir a página de Avisos)
router.patch(
    "/avisos/lidas",
    NotificacaoController.marcarAvisosComoLidos
);

// Marcar uma como lida
router.patch(
    "/:id/lida",
    NotificacaoController.marcarComoLida
);

// Excluir uma (lixeirinha do sininho)
router.delete(
    "/:id",
    NotificacaoController.excluir
);

module.exports =
    router;
