const fs = require("fs/promises");

async function assinaturaImagemValida(
    caminho,
    mimeType
) {
    const arquivo = await fs.open(
        caminho,
        "r"
    );

    try {
        const buffer = Buffer.alloc(12);

        const {
            bytesRead
        } = await arquivo.read(
            buffer,
            0,
            12,
            0
        );

        if (bytesRead < 12) {
            return false;
        }

        if (mimeType === "image/jpeg") {
            return (
                buffer[0] === 0xff &&
                buffer[1] === 0xd8 &&
                buffer[2] === 0xff
            );
        }

        if (mimeType === "image/png") {
            const assinaturaPng = Buffer.from([
                0x89,
                0x50,
                0x4e,
                0x47,
                0x0d,
                0x0a,
                0x1a,
                0x0a
            ]);

            return buffer
                .subarray(0, 8)
                .equals(assinaturaPng);
        }

        if (mimeType === "image/webp") {
            return (
                buffer
                    .subarray(0, 4)
                    .toString("ascii") === "RIFF" &&
                buffer
                    .subarray(8, 12)
                    .toString("ascii") === "WEBP"
            );
        }

        return false;
    } finally {
        await arquivo.close();
    }
}

async function removerArquivoSilenciosamente(
    caminho
) {
    if (!caminho) {
        return;
    }

    try {
        await fs.unlink(caminho);
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.error(
                "Não foi possível remover arquivo:",
                error
            );
        }
    }
}

async function removerArquivosSilenciosamente(
    arquivos = []
) {
    await Promise.all(
        arquivos.map((arquivo) =>
            removerArquivoSilenciosamente(
                typeof arquivo === "string"
                    ? arquivo
                    : arquivo?.path
            )
        )
    );
}

module.exports = {
    assinaturaImagemValida,
    removerArquivoSilenciosamente,
    removerArquivosSilenciosamente
};