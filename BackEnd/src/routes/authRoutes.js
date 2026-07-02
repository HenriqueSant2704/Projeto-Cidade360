const express = require("express");
const router = express.Router();

const AuthController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

/*========================================================================================================

ROTAS DE AUTENTICAÇÃO

=========================================================================================================*/

router.post("/login", AuthController.login);

router.post("/cadastrar", AuthController.cadastrar);

router.get("/me", authMiddleware, AuthController.me);

/*========================================================================================================

ROTAS DE VERIFICAÇÃO DE EMAIL NO CADASTRO

=========================================================================================================*/

router.post(
    "/cadastro/email/enviar-codigo",
    AuthController.enviarCodigoVerificacaoEmailCadastro
);

router.post(
    "/cadastro/email/confirmar-codigo",
    AuthController.confirmarCodigoVerificacaoEmailCadastro
);

/*========================================================================================================

ROTAS DE RECUPERAÇÃO DE SENHA

=========================================================================================================*/

router.post(
    "/recuperar-senha/enviar-codigo",
    AuthController.enviarCodigoRecuperacaoSenha
);

router.post(
    "/recuperar-senha/redefinir",
    AuthController.redefinirSenha
);

module.exports = router;