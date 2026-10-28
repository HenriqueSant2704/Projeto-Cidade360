const express = require("express");
const router = express.Router();

const AuthController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");
const limiteTentativas = require("../middlewares/limiteTentativas");

/*========================================================================================================

ROTAS DE AUTENTICAÇÃO

=========================================================================================================*/

router.post("/login", limiteTentativas.login, AuthController.login);

router.post("/cadastrar", AuthController.cadastrar);

router.get("/me", authMiddleware, AuthController.me);

/*========================================================================================================

ROTAS DE VERIFICAÇÃO DE EMAIL NO CADASTRO

=========================================================================================================*/

router.post(
    "/cadastro/email/enviar-codigo",
    limiteTentativas.solicitarCodigo,
    AuthController.enviarCodigoVerificacaoEmailCadastro
);

router.post(
    "/cadastro/email/confirmar-codigo",
    limiteTentativas.confirmarCodigo,
    AuthController.confirmarCodigoVerificacaoEmailCadastro
);

/*========================================================================================================

ROTAS DE RECUPERAÇÃO DE SENHA

=========================================================================================================*/

router.post(
    "/recuperar-senha/enviar-codigo",
    limiteTentativas.solicitarCodigo,
    AuthController.enviarCodigoRecuperacaoSenha
);

router.post(
    "/recuperar-senha/redefinir",
    limiteTentativas.confirmarCodigo,
    AuthController.redefinirSenha
);

router.post(
    "/recuperar-senha/confirmar-codigo",
    limiteTentativas.confirmarCodigo,
    AuthController.confirmarCodigoRecuperacaoSenha
);

module.exports = router;
