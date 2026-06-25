// Importa o Router do Express
const express = require("express");

// Cria uma instância de rotas
const router = express.Router();

// Importa o controller de autenticação
const AuthController = require("../controllers/authController");

// Importa o middleware que protege rotas privadas
const authMiddleware = require("../middlewares/authMiddleware");

// Rota de login
router.post("/login", AuthController.login);

// Rota de cadastro
router.post("/cadastrar", AuthController.cadastrar);

// Rota para verificar usuário logado
router.get("/me", authMiddleware, AuthController.me);

// Exporta as rotas
module.exports = router;