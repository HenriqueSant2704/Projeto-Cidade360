const AvisoModel =
    require("../models/avisoModel");

const {
    assinaturaImagemValida,
    removerArquivoSilenciosamente
} =
    require("../utils/imagemUtils");

const {
    enviarFotosCloudinary,
    removerFotosCloudinary
} =
    require("../utils/fotosCloudinary");


/*========================================================================================================

VALORES ACEITOS

Precisam ser os mesmos do ENUM na migração 006_avisos.sql e do avisos.js do front.

=========================================================================================================*/

const CATEGORIAS =
    new Set([
        "evento",
        "inauguracao",
        "obras",
        "saude",
        "servicos"
    ]);

const REACOES =
    new Set([
        "palmas",
        "amei",
        "comemorar",
        "feliz",
        "uau",
        "obrigado"
    ]);

const PASTA_CLOUDINARY_AVISOS =
    "cidade360/avisos";


/*========================================================================================================

NORMALIZAÇÃO DOS CAMPOS

=========================================================================================================*/

function textoCurto(
    valor,
    maximo
) {
    return String(valor ?? "")
        .replace(/\0/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maximo);
}


// Mantém as quebras de linha do texto do aviso.
function textoLongo(
    valor,
    maximo
) {
    return String(valor ?? "")
        .replace(/\0/g, "")
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, maximo);
}


function idValido(valor) {
    const numero =
        Number(valor);

    return Number.isInteger(numero) && numero > 0
        ? numero
        : null;
}


function booleano(valor) {
    return valor === true ||
        valor === 1 ||
        ["1", "true", "on", "sim"].includes(
            String(valor ?? "").toLowerCase()
        );
}


// Aceita "2026-10-31T09:00" ou "2026-10-31 09:00" e devolve no formato do MySQL.
function dataEventoValida(valor) {
    const textoData =
        String(valor ?? "").trim();

    if (!textoData) {
        return {
            valor: null
        };
    }

    const partes =
        textoData.match(
            /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/
        );

    if (!partes) {
        return {
            erro: "Data do evento inválida."
        };
    }

    const [, ano, mes, dia, hora = "09", minuto = "00"] =
        partes;

    const data =
        new Date(
            Number(ano),
            Number(mes) - 1,
            Number(dia),
            Number(hora),
            Number(minuto)
        );

    if (
        data.getFullYear() !== Number(ano) ||
        data.getMonth() !== Number(mes) - 1 ||
        data.getDate() !== Number(dia) ||
        Number(hora) > 23 ||
        Number(minuto) > 59
    ) {
        return {
            erro: "Data do evento inválida."
        };
    }

    return {
        valor: `${ano}-${mes}-${dia} ${hora}:${minuto}:00`
    };
}


function lerCamposAviso(body) {
    const categoria =
        textoCurto(body.categoria, 20).toLowerCase();

    const titulo =
        textoCurto(body.titulo, 90);

    const texto =
        textoLongo(body.texto, 1200);

    const localEvento =
        textoCurto(body.local_evento, 150) || null;

    const dataEvento =
        dataEventoValida(body.data_evento);

    if (!CATEGORIAS.has(categoria)) {
        return {
            erro: "Selecione uma categoria válida."
        };
    }

    if (titulo.length < 5) {
        return {
            erro: "O título deve ter pelo menos 5 caracteres."
        };
    }

    if (texto.length < 10) {
        return {
            erro: "O texto do aviso deve ter pelo menos 10 caracteres."
        };
    }

    if (dataEvento.erro) {
        return {
            erro: dataEvento.erro
        };
    }

    return {
        campos: {
            categoria,
            titulo,
            texto,
            dataEvento:
                dataEvento.valor,
            localEvento,
            fixado:
                booleano(body.fixado)
        }
    };
}


/*========================================================================================================

FOTO DO AVISO

Valida a assinatura real do arquivo e envia para o Cloudinary.
O arquivo temporário é apagado em qualquer caso.

=========================================================================================================*/

async function enviarFotoAviso(arquivo) {
    if (!arquivo) {
        return null;
    }

    try {
        const imagemValida =
            await assinaturaImagemValida(
                arquivo.path,
                arquivo.mimetype
            );

        if (!imagemValida) {
            const erro =
                new Error("A foto enviada não é uma imagem JPG, PNG ou WEBP válida.");

            erro.status = 400;

            throw erro;
        }

        const [foto] =
            await enviarFotosCloudinary(
                [arquivo],
                {
                    pasta: PASTA_CLOUDINARY_AVISOS
                }
            );

        return {
            url:
                foto.caminhoPublico,

            publicId:
                foto.publicId
        };

    } finally {
        await removerArquivoSilenciosamente(
            arquivo.path
        );
    }
}


/*========================================================================================================

RESPOSTA DE ERRO

=========================================================================================================*/

function responderErro(
    res,
    error,
    mensagemPadrao
) {
    // Banco ainda sem a migração 006: o front entra no modo demonstração.
    if (
        error?.code === "ER_NO_SUCH_TABLE"
    ) {
        return res
            .status(503)
            .json({
                sucesso: false,
                codigo: "AVISOS_INDISPONIVEL",
                mensagem:
                    "Os avisos ainda não foram configurados no banco de dados."
            });
    }

    if (error?.status === 400) {
        return res
            .status(400)
            .json({
                sucesso: false,
                mensagem: error.message
            });
    }

    if (
        error?.codigoAplicacao ===
        "FOTOS_NUVEM_INDISPONIVEIS"
    ) {
        return res
            .status(503)
            .json({
                sucesso: false,
                mensagem:
                    "Não foi possível armazenar a foto agora. Tente novamente em instantes."
            });
    }

    console.error(
        mensagemPadrao,
        error
    );

    return res
        .status(500)
        .json({
            sucesso: false,
            mensagem: mensagemPadrao
        });
}


/*========================================================================================================

CONTROLLER

=========================================================================================================*/

const AvisoController = {

    async listar(
        req,
        res
    ) {
        try {
            const avisos =
                await AvisoModel.listar({
                    usuarioId:
                        req.usuario.id
                });

            return res
                .status(200)
                .json({
                    sucesso: true,
                    avisos
                });

        } catch (error) {
            return responderErro(
                res,
                error,
                "Não foi possível carregar os avisos."
            );
        }
    },


    async criar(
        req,
        res
    ) {
        let foto = null;

        try {
            const {
                campos,
                erro
            } =
                lerCamposAviso(req.body);

            if (erro) {
                await removerArquivoSilenciosamente(
                    req.file?.path
                );

                return res
                    .status(400)
                    .json({
                        sucesso: false,
                        mensagem: erro
                    });
            }

            foto =
                await enviarFotoAviso(req.file);

            const id =
                await AvisoModel.criar({
                    ...campos,

                    fotoUrl:
                        foto?.url || null,

                    fotoPublicId:
                        foto?.publicId || null,

                    usuarioId:
                        req.usuario.id
                });

            const aviso =
                await AvisoModel.buscarCompletoPorId(
                    id,
                    req.usuario.id
                );

            return res
                .status(201)
                .json({
                    sucesso: true,
                    mensagem:
                        "Aviso publicado com sucesso.",
                    aviso
                });

        } catch (error) {
            if (foto?.publicId) {
                await removerFotosCloudinary([
                    {
                        publicId: foto.publicId
                    }
                ]);
            }

            return responderErro(
                res,
                error,
                "Não foi possível publicar o aviso."
            );
        }
    },


    async atualizar(
        req,
        res
    ) {
        let fotoNova = null;

        try {
            const id =
                idValido(req.params.id);

            const {
                campos,
                erro
            } =
                lerCamposAviso(req.body);

            if (!id || erro) {
                await removerArquivoSilenciosamente(
                    req.file?.path
                );

                return res
                    .status(400)
                    .json({
                        sucesso: false,
                        mensagem:
                            erro || "Aviso inválido."
                    });
            }

            const atual =
                await AvisoModel.buscarPorId(id);

            if (!atual) {
                await removerArquivoSilenciosamente(
                    req.file?.path
                );

                return res
                    .status(404)
                    .json({
                        sucesso: false,
                        mensagem:
                            "Aviso não encontrado."
                    });
            }

            fotoNova =
                await enviarFotoAviso(req.file);

            const removerFoto =
                booleano(req.body.remover_foto);

            let fotoUrl =
                atual.foto_url;

            let fotoPublicId =
                atual.foto_public_id;

            if (fotoNova) {
                fotoUrl = fotoNova.url;
                fotoPublicId = fotoNova.publicId;
            } else if (removerFoto) {
                fotoUrl = null;
                fotoPublicId = null;
            }

            await AvisoModel.atualizar(
                id,
                {
                    ...campos,
                    fotoUrl,
                    fotoPublicId,
                    usuarioId:
                        req.usuario.id
                }
            );

            // A foto antiga só sai do Cloudinary depois que o banco foi atualizado.
            if (
                atual.foto_public_id &&
                atual.foto_public_id !== fotoPublicId
            ) {
                await removerFotosCloudinary([
                    {
                        publicId: atual.foto_public_id
                    }
                ]);
            }

            const aviso =
                await AvisoModel.buscarCompletoPorId(
                    id,
                    req.usuario.id
                );

            return res
                .status(200)
                .json({
                    sucesso: true,
                    mensagem:
                        "Aviso atualizado com sucesso.",
                    aviso
                });

        } catch (error) {
            if (fotoNova?.publicId) {
                await removerFotosCloudinary([
                    {
                        publicId: fotoNova.publicId
                    }
                ]);
            }

            return responderErro(
                res,
                error,
                "Não foi possível atualizar o aviso."
            );
        }
    },


    async fixar(
        req,
        res
    ) {
        try {
            const id =
                idValido(req.params.id);

            if (!id) {
                return res
                    .status(400)
                    .json({
                        sucesso: false,
                        mensagem: "Aviso inválido."
                    });
            }

            const alterado =
                await AvisoModel.definirFixado(
                    id,
                    booleano(req.body?.fixado),
                    req.usuario.id
                );

            if (!alterado) {
                return res
                    .status(404)
                    .json({
                        sucesso: false,
                        mensagem: "Aviso não encontrado."
                    });
            }

            const aviso =
                await AvisoModel.buscarCompletoPorId(
                    id,
                    req.usuario.id
                );

            return res
                .status(200)
                .json({
                    sucesso: true,
                    aviso
                });

        } catch (error) {
            return responderErro(
                res,
                error,
                "Não foi possível fixar o aviso."
            );
        }
    },


    async remover(
        req,
        res
    ) {
        try {
            const id =
                idValido(req.params.id);

            const removido =
                id &&
                await AvisoModel.remover(
                    id,
                    req.usuario.id
                );

            if (!removido) {
                return res
                    .status(404)
                    .json({
                        sucesso: false,
                        mensagem: "Aviso não encontrado."
                    });
            }

            return res
                .status(200)
                .json({
                    sucesso: true,
                    mensagem: "Aviso excluído."
                });

        } catch (error) {
            return responderErro(
                res,
                error,
                "Não foi possível excluir o aviso."
            );
        }
    },


    async restaurar(
        req,
        res
    ) {
        try {
            const id =
                idValido(req.params.id);

            const restaurado =
                id &&
                await AvisoModel.restaurar(
                    id,
                    req.usuario.id
                );

            if (!restaurado) {
                return res
                    .status(404)
                    .json({
                        sucesso: false,
                        mensagem: "Aviso não encontrado entre os excluídos."
                    });
            }

            const aviso =
                await AvisoModel.buscarCompletoPorId(
                    id,
                    req.usuario.id
                );

            return res
                .status(200)
                .json({
                    sucesso: true,
                    aviso
                });

        } catch (error) {
            return responderErro(
                res,
                error,
                "Não foi possível restaurar o aviso."
            );
        }
    },


    async reagir(
        req,
        res
    ) {
        try {
            const id =
                idValido(req.params.id);

            const reacao =
                textoCurto(req.body?.reacao, 20);

            if (!id || !REACOES.has(reacao)) {
                return res
                    .status(400)
                    .json({
                        sucesso: false,
                        mensagem: "Reação inválida."
                    });
            }

            const existe =
                await AvisoModel.buscarPorId(id);

            if (!existe) {
                return res
                    .status(404)
                    .json({
                        sucesso: false,
                        mensagem: "Aviso não encontrado."
                    });
            }

            await AvisoModel.definirReacao(
                id,
                req.usuario.id,
                reacao
            );

            const aviso =
                await AvisoModel.buscarCompletoPorId(
                    id,
                    req.usuario.id
                );

            return res
                .status(200)
                .json({
                    sucesso: true,
                    reacoes: aviso.reacoes,
                    minha_reacao: aviso.minha_reacao
                });

        } catch (error) {
            return responderErro(
                res,
                error,
                "Não foi possível registrar a reação."
            );
        }
    },


    async removerReacao(
        req,
        res
    ) {
        try {
            const id =
                idValido(req.params.id);

            if (!id) {
                return res
                    .status(400)
                    .json({
                        sucesso: false,
                        mensagem: "Aviso inválido."
                    });
            }

            await AvisoModel.removerReacao(
                id,
                req.usuario.id
            );

            const aviso =
                await AvisoModel.buscarCompletoPorId(
                    id,
                    req.usuario.id
                );

            return res
                .status(200)
                .json({
                    sucesso: true,
                    reacoes: aviso?.reacoes || {},
                    minha_reacao: null
                });

        } catch (error) {
            return responderErro(
                res,
                error,
                "Não foi possível remover a reação."
            );
        }
    }
};


module.exports =
    AvisoController;
