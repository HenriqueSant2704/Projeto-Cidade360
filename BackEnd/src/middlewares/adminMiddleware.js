/*========================================================================================================

MIDDLEWARE DE ADMINISTRADOR

Deve ser utilizado depois do authMiddleware.

=========================================================================================================*/

function adminMiddleware(
    req,
    res,
    next
) {
    const tipoUsuario =
        String(
            req.usuario?.tipo_usuario || ""
        )
            .trim()
            .toUpperCase();

    if (
        tipoUsuario !== "ADMIN"
    ) {
        return res
            .status(403)
            .json({
                sucesso: false,
                mensagem:
                    "Acesso permitido apenas para administradores."
            });
    }

    next();
}

module.exports =
    adminMiddleware;
