const crypto =
    require("crypto");

const fs =
    require("fs/promises");

const path =
    require("path");


/*========================================================================================================

ARMAZENAMENTO DAS FOTOS NO CLOUDINARY

As fotos são enviadas pelo backend com autenticação assinada.
As credenciais ficam somente nas variáveis de ambiente do servidor.
Utiliza o fetch nativo do Node.js, sem instalar novas dependências.

=========================================================================================================*/

function erroArmazenamento(
    mensagem
) {
    const error =
        new Error(
            mensagem
        );

    error.codigoAplicacao =
        "FOTOS_NUVEM_INDISPONIVEIS";

    return error;
}


function obterConfiguracaoCloudinary() {
    const cloudName =
        String(
            process.env.CLOUDINARY_CLOUD_NAME || ""
        ).trim();

    const apiKey =
        String(
            process.env.CLOUDINARY_API_KEY || ""
        ).trim();

    const apiSecret =
        String(
            process.env.CLOUDINARY_API_SECRET || ""
        ).trim();

    if (
        !cloudName ||
        !apiKey ||
        !apiSecret
    ) {
        throw erroArmazenamento(
            "Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no backend."
        );
    }

    if (
        !/^[a-zA-Z0-9_-]+$/.test(
            cloudName
        )
    ) {
        throw erroArmazenamento(
            "CLOUDINARY_CLOUD_NAME inválido."
        );
    }

    return {
        cloudName,
        apiKey,
        apiSecret
    };
}


function assinarParametrosCloudinary(
    parametros,
    apiSecret
) {
    const conteudo =
        Object.keys(
            parametros
        )
            .sort()
            .map((chave) =>
                `${chave}=${parametros[chave]}`
            )
            .join("&");

    return crypto
        .createHash(
            "sha256"
        )
        .update(
            conteudo + apiSecret
        )
        .digest(
            "hex"
        );
}


async function solicitarCloudinary(
    acao,
    parametros,
    arquivo = null
) {
    const configuracao =
        obterConfiguracaoCloudinary();

    const campos = {
        ...parametros,

        timestamp:
            String(
                Math.floor(
                    Date.now() / 1000
                )
            )
    };

    const formulario =
        new FormData();

    Object.entries(
        campos
    ).forEach(([chave, valor]) => {
        formulario.append(
            chave,
            String(valor)
        );
    });

    formulario.append(
        "api_key",
        configuracao.apiKey
    );

    formulario.append(
        "signature",
        assinarParametrosCloudinary(
            campos,
            configuracao.apiSecret
        )
    );

    if (arquivo) {
        const conteudo =
            await fs.readFile(
                arquivo.path
            );

        formulario.append(
            "file",
            new Blob([
                conteudo
            ], {
                type:
                    arquivo.mimetype
            }),
            arquivo.filename
        );
    }

    const resposta =
        await fetch(
            `https://api.cloudinary.com/v1_1/${configuracao.cloudName}/image/${acao}`,
            {
                method: "POST",
                body: formulario,
                signal: AbortSignal.timeout(60000)
            }
        );

    const dados =
        await resposta.json();

    if (
        !resposta.ok ||
        dados?.error
    ) {
        throw erroArmazenamento(
            `Cloudinary não concluiu a operação ${acao}. HTTP ${resposta.status}.`
        );
    }

    return dados;
}


/*========================================================================================================

REMOVE APENAS OS UPLOADS DA TENTATIVA QUE FALHOU

As fotos de ocorrências já gravadas no banco não são removidas aqui.

=========================================================================================================*/

async function removerFotosCloudinary(
    fotos = []
) {
    for (const foto of fotos) {
        if (!foto?.publicId) {
            continue;
        }

        try {
            const dados =
                await solicitarCloudinary(
                    "destroy",
                    {
                        public_id:
                            foto.publicId,

                        invalidate:
                            "true"
                    }
                );

            if (
                dados?.result !== "ok" &&
                dados?.result !== "not found"
            ) {
                throw new Error(
                    "A remoção não foi confirmada pelo Cloudinary."
                );
            }

        } catch (error) {
            console.error(
                "Não foi possível limpar foto de uma tentativa que falhou:",
                foto.publicId,
                error.message
            );
        }
    }
}


/*========================================================================================================

ENVIA AS FOTOS VALIDADAS

Cada foto possui um identificador aleatório, sem nome ou email do cidadão.
Se algum envio falhar, tenta limpar os uploads desta mesma tentativa.

=========================================================================================================*/

async function enviarFotosCloudinary(
    arquivos = []
) {
    obterConfiguracaoCloudinary();

    const fotos = [];
    const tentativas = [];

    try {
        for (const arquivo of arquivos) {
            const publicId =
                `cidade360/ocorrencias/${crypto.randomUUID()}`;

            tentativas.push({
                publicId
            });

            const dados =
                await solicitarCloudinary(
                    "upload",
                    {
                        public_id:
                            publicId,

                        overwrite:
                            "false"
                    },
                    arquivo
                );

            const url =
                new URL(
                    dados.secure_url
                );

            if (
                dados.public_id !== publicId ||
                url.protocol !== "https:" ||
                url.hostname !== "res.cloudinary.com" ||
                dados.secure_url.length > 500
            ) {
                throw erroArmazenamento(
                    "Cloudinary retornou dados inválidos para a foto."
                );
            }

            fotos.push({
                nomeArquivo:
                    path.basename(
                        arquivo.filename
                    ),

                nomeOriginal:
                    arquivo.originalname,

                caminhoPublico:
                    dados.secure_url,

                mimeType:
                    arquivo.mimetype,

                tamanhoBytes:
                    arquivo.size,

                publicId
            });
        }

        return fotos;

    } catch (error) {
        await removerFotosCloudinary(
            tentativas
        );

        console.error(
            "Erro ao enviar fotos para o Cloudinary:",
            error.message
        );

        throw erroArmazenamento(
            "Não foi possível armazenar as fotos no Cloudinary."
        );
    }
}


module.exports = {
    enviarFotosCloudinary,
    removerFotosCloudinary
};