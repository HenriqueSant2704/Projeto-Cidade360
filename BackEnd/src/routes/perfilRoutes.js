const express = require("express");
const router = express.Router();

const PerfilController = require("../controllers/perfilController");
const authMiddleware = require("../middlewares/authMiddleware");
const limiteTentativas = require("../middlewares/limiteTentativas");

/*========================================================================================================

ROTAS DO MEU PERFIL (qualquer usuário logado, só a própria conta)

=========================================================================================================*/

router.use(authMiddleware);

router.get("/", PerfilController.buscar);

router.put("/dados", PerfilController.atualizarDados);

router.post(
    "/email/enviar-codigo",
    limiteTentativas.solicitarCodigo,
    PerfilController.enviarCodigoEmail
);

router.post(
    "/email/confirmar",
    limiteTentativas.confirmarCodigo,
    PerfilController.confirmarEmail
);

router.put(
    "/senha",
    limiteTentativas.trocarSenha,
    PerfilController.atualizarSenha
);

module.exports = router;
