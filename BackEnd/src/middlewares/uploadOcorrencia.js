const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const pastaUpload = path.resolve(
    __dirname,
    "../../uploads/ocorrencias"
);

const MAX_FOTOS = 5;
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
        files: MAX_FOTOS,
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

async function removerArquivosParciais(arquivos = []) {
    await Promise.allSettled(
        arquivos.map((arquivo) =>
            fs.promises.unlink(arquivo.path)
        )
    );
}

function uploadFotoOcorrencia(req, res, next) {
    upload.array("fotos", MAX_FOTOS)(req, res, async (error) => {
        if (!error) {
            return next();
        }

        await removerArquivosParciais(req.files || []);

        if (error instanceof multer.MulterError) {
            let mensagem =
                error.mensagemPublica ||
                "Não foi possível processar as fotos enviadas.";

            if (error.code === "LIMIT_FILE_SIZE") {
                mensagem =
                    "Cada foto deve ter no máximo 5 MB.";
            } else if (
                error.code === "LIMIT_FILE_COUNT" ||
                error.code === "LIMIT_UNEXPECTED_FILE"
            ) {
                mensagem =
                    "Envie no máximo 5 fotos por ocorrência.";
            }

            return res.status(400).json({
                sucesso: false,
                mensagem
            });
        }

        console.error(
            "Erro no upload da ocorrência:",
            error
        );

        return res.status(500).json({
            sucesso: false,
            mensagem:
                "Não foi possível processar as fotos da ocorrência."
        });
    });
}

module.exports = uploadFotoOcorrencia;