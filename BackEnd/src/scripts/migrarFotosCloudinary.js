const path =
    require("path");

const fs =
    require("fs/promises");

const db =
    require("../config/db");

const {
    assinaturaImagemValida
} =
    require("../utils/imagemUtils");

const {
    enviarFotosCloudinary,
    removerFotosCloudinary
} =
    require("../utils/fotosCloudinary");


/*========================================================================================================

MIGRAÇÃO DAS FOTOS LOCAIS EXISTENTES

Sem argumentos: verifica os arquivos e não altera o banco nem envia fotos.
Com --aplicar: envia as fotos existentes e atualiza somente seus links.
Os arquivos originais do computador são preservados.

=========================================================================================================*/

const aplicar =
    process.argv.includes(
        "--aplicar"
    );

const pastaFotos =
    path.resolve(
        __dirname,
        "../../uploads/ocorrencias"
    );

const mimePorExtensao = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp"
};


async function migrarFotos() {
    const [imagens] =
        await db.execute(
            `
            SELECT
                id,
                caminho_arquivo
            FROM imagens_ocorrencia
            WHERE caminho_arquivo LIKE '/uploads/ocorrencias/%'
            ORDER BY id ASC
            `
        );

    const resumo = {
        encontradas: imagens.length,
        disponiveis: 0,
        migradas: 0,
        ausentes: 0,
        ignoradas: 0,
        erros: 0
    };

    console.log(
        aplicar
            ? "Modo de aplicação: fotos serão enviadas e links serão atualizados."
            : "Modo de verificação: nenhum arquivo será enviado e nenhum link será alterado."
    );

    for (const imagem of imagens) {
        let fotosEnviadas = [];
        let linkAtualizado = false;

        try {
            const caminhoOriginal =
                String(
                    imagem.caminho_arquivo || ""
                );

            const nomeArquivo =
                caminhoOriginal.slice(
                    "/uploads/ocorrencias/".length
                );

            if (
                !nomeArquivo ||
                nomeArquivo !== path.basename(nomeArquivo) ||
                nomeArquivo.includes("\\")
            ) {
                resumo.ignoradas++;

                console.log(
                    `Imagem ${imagem.id}: caminho local não reconhecido.`
                );

                continue;
            }

            const caminho =
                path.join(
                    pastaFotos,
                    nomeArquivo
                );

            const mimeType =
                mimePorExtensao[
                    path.extname(
                        nomeArquivo
                    ).toLowerCase()
                ];

            const informacoes =
                await fs.stat(
                    caminho
                );

            if (
                !informacoes.isFile() ||
                !mimeType ||
                informacoes.size > 5 * 1024 * 1024 ||
                !await assinaturaImagemValida(caminho, mimeType)
            ) {
                resumo.ignoradas++;

                console.log(
                    `Imagem ${imagem.id}: formato ou tamanho não permitido.`
                );

                continue;
            }

            resumo.disponiveis++;

            if (!aplicar) {
                console.log(
                    `Imagem ${imagem.id}: arquivo disponível para migração.`
                );

                continue;
            }

            fotosEnviadas =
                await enviarFotosCloudinary([
                    {
                        path: caminho,
                        filename: nomeArquivo,
                        originalname: nomeArquivo,
                        mimetype: mimeType,
                        size: informacoes.size
                    }
                ]);

            const [resultado] =
                await db.execute(
                    `
                    UPDATE imagens_ocorrencia
                    SET caminho_arquivo = ?
                    WHERE id = ?
                        AND caminho_arquivo = ?
                    `,
                    [
                        fotosEnviadas[0].caminhoPublico,
                        imagem.id,
                        caminhoOriginal
                    ]
                );

            if (
                resultado.affectedRows !== 1
            ) {
                throw new Error(
                    "O registro mudou durante a migração. Execute a verificação novamente."
                );
            }

            linkAtualizado =
                true;

            resumo.migradas++;

            console.log(
                `Imagem ${imagem.id}: migrada com sucesso.`
            );

        } catch (error) {
            if (!linkAtualizado) {
                await removerFotosCloudinary(
                    fotosEnviadas
                );
            }

            if (
                error.code === "ENOENT"
            ) {
                resumo.ausentes++;

                console.log(
                    `Imagem ${imagem.id}: arquivo não encontrado no computador.`
                );

            } else {
                resumo.erros++;

                console.error(
                    `Imagem ${imagem.id}: ${error.message}`
                );
            }
        }
    }

    console.log(
        "Resumo da migração:",
        resumo
    );

    if (
        resumo.erros > 0 ||
        resumo.ausentes > 0 ||
        resumo.ignoradas > 0
    ) {
        process.exitCode =
            1;
    }
}


migrarFotos()
    .catch((error) => {
        console.error(
            "Não foi possível executar a migração:",
            error.message
        );

        process.exitCode =
            1;
    })
    .finally(async () => {
        await db.end();
    });