const { rateLimit } = require("express-rate-limit");

function criarLimite(tentativas) {
    return rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: tentativas,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        handler(req, res) {
            return res.status(429).json({
                sucesso: false,
                mensagem: "Muitas tentativas. Aguarde alguns minutos e tente novamente."
            });
        }
    });
}

module.exports = {
    login: criarLimite(30),
    solicitarCodigo: criarLimite(20),
    confirmarCodigo: criarLimite(30),
    acaoAdmin: criarLimite(30)
};
