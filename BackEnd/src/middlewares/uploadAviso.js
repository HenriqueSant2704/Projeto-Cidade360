const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const pastaUpload = path.resolve(
    __dirname,
    "../../uploads/avisos"
);

const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024;

fs.mkdirSync(pastaUpload, {
    recursive: true
});

const extensaoPorMime = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
};

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, pastaUpload);
    },

    filename: (req, file, callback) => {
        const extensao = extensaoPorMime[file.mimetype];
        const nomeArquivo = `${Date.now()}-${crypto.randomUUID()}${extensao || ""}`;

        callback(null, nomeArquivo);
    }
});

const upload = multer({
    storage,

    limits: {
        fileSize: TAMANHO_MAXIMO_FOTO,
        files: 1,
        fields: 20
    },

    fileFilter: (req, file, callback) => {
        if (!extensaoPorMime[file.mimetype]) {
            const error = new multer.MulterError(
                "LIMIT_UNEXPECTED_FILE",
                file.fieldname
            );

            error.mensagemPublica =
                "Formato de foto inválido. Envie JPG, PNG ou WEBP.";

            return callback(error);
        }

        callback(null, true);
    }
});

// Um aviso tem no máximo uma foto, enviada no campo "foto".
function uploadFotoAviso(req, res, next) {
    upload.single("foto")(req, res, async (error) => {
        if (!error) {
            return next();
        }

        if (req.file?.path) {
            await fs.promises.unlink(req.file.path).catch(() => {});
        }

        if (error instanceof multer.MulterError) {
            let mensagem =
                error.mensagemPublica ||
                "Não foi possível processar a foto enviada.";

            if (error.code === "LIMIT_FILE_SIZE") {
                mensagem =
                    "A foto deve ter no máximo 5 MB.";
            } else if (
                error.code === "LIMIT_FILE_COUNT" ||
                (error.code === "LIMIT_UNEXPECTED_FILE" && !error.mensagemPublica)
            ) {
                mensagem =
                    "Envie apenas uma foto por aviso.";
            }

            return res.status(400).json({
                sucesso: false,
                mensagem
            });
        }

        console.error(
            "Erro no upload do aviso:",
            error
        );

        return res.status(500).json({
            sucesso: false,
            mensagem:
                "Não foi possível processar a foto do aviso."
        });
    });
}

module.exports = uploadFotoAviso;
