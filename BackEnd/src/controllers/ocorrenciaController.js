const OcorrenciaModel =
    require("../models/ocorrenciaModel");

const {
    assinaturaImagemValida,
    removerArquivosSilenciosamente
} =
    require("../utils/imagemUtils");


/*========================================================================================================

NORMALIZA TEXTO CURTO

=========================================================================================================*/

function texto(
    valor,
    maximo
) {
    const normalizado =
        String(valor ?? "")
            .replace(/\0/g, "")
            .replace(/\s+/g, " ")
            .trim();

    if (!normalizado) {
        return "";
    }

    return normalizado.slice(
        0,
        maximo
    );
}


/*========================================================================================================

NORMALIZA TEXTO LONGO

=========================================================================================================*/

function textoLongo(
    valor,
    maximo
) {
    const normalizado =
        String(valor ?? "")
            .replace(/\0/g, "")
            .replace(/\r\n/g, "\n")
            .trim();

    if (!normalizado) {
        return "";
    }

    return normalizado.slice(
        0,
        maximo
    );
}


/*========================================================================================================

COORDENADAS

=========================================================================================================*/

function numeroCoordenada(
    valor
) {
    if (
        valor === undefined ||
        valor === null ||
        String(valor).trim() === ""
    ) {
        return null;
    }

    const numero =
        Number(valor);

    return Number.isFinite(numero)
        ? numero
        : null;
}


/*========================================================================================================

INTEIRO POSITIVO

=========================================================================================================*/

function inteiroPositivo(
    valor
) {
    const numero =
        Number(valor);

    return (
        Number.isInteger(numero) &&
        numero > 0
    )
        ? numero
        : null;
}


/*========================================================================================================

PAGINAÇÃO

=========================================================================================================*/

function obterPaginacao(
    req
) {
    const paginaSolicitada =
        Number(
            req.query.pagina || 1
        );

    const limiteSolicitado =
        Number(
            req.query.limite || 20
        );

    const pagina =
        Number.isInteger(
            paginaSolicitada
        ) &&
        paginaSolicitada > 0
            ? paginaSolicitada
            : 1;

    const limite =
        Number.isInteger(
            limiteSolicitado
        )
            ? Math.min(
                Math.max(
                    limiteSolicitado,
                    1
                ),
                50
            )
            : 20;

    return {
        pagina,
        limite
    };
}


/*========================================================================================================

RESPOSTA DE LISTAGEM

=========================================================================================================*/

function responderListagem(
    res,
    resultado,
    pagina,
    limite
) {
    return res
        .status(200)
        .json({
            sucesso: true,

            ocorrencias:
                resultado.itens,

            paginacao: {
                pagina,
                limite,

                total:
                    resultado.total,

                total_paginas:
                    Math.max(
                        1,
                        Math.ceil(
                            resultado.total /
                            limite
                        )
                    )
            }
        });
}


/*========================================================================================================

LIMPEZA DE UPLOAD EM CASO DE ERRO

=========================================================================================================*/

async function responderErroComLimpeza(
    req,
    res,
    status,
    mensagem
) {
    await removerArquivosSilenciosamente(
        req.files || []
    );

    return res
        .status(status)
        .json({
            sucesso: false,
            mensagem
        });
}


/*========================================================================================================

CONTROLLER

=========================================================================================================*/

const OcorrenciaController = {
    async criar(
        req,
        res
    ) {
        try {
            const categoriaId =
                inteiroPositivo(
                    req.body.categoria_id
                );

            const titulo =
                texto(
                    req.body.titulo,
                    200
                );

            const descricao =
                textoLongo(
                    req.body.descricao,
                    5000
                );

            const latitude =
                numeroCoordenada(
                    req.body.latitude
                );

            const longitude =
                numeroCoordenada(
                    req.body.longitude
                );

            const precisaoLocalizacaoMetros =
                numeroCoordenada(
                    req.body
                        .precisao_localizacao_metros
                );

            const endereco =
                texto(
                    req.body.endereco,
                    255
                );

            const bairro =
                texto(
                    req.body.bairro,
                    120
                );

            const cidade =
                texto(
                    req.body.cidade,
                    120
                );

            const arquivos =
                Array.isArray(req.files)
                    ? req.files
                    : [];

            if (!categoriaId) {
                return responderErroComLimpeza(
                    req,
                    res,
                    400,
                    "Selecione uma categoria válida."
                );
            }

            if (titulo.length < 5) {
                return responderErroComLimpeza(
                    req,
                    res,
                    400,
                    "O título deve ter pelo menos 5 caracteres."
                );
            }

            if (descricao.length < 15) {
                return responderErroComLimpeza(
                    req,
                    res,
                    400,
                    "Descreva o problema com pelo menos 15 caracteres."
                );
            }

            if (
                latitude === null ||
                latitude < -90 ||
                latitude > 90
            ) {
                return responderErroComLimpeza(
                    req,
                    res,
                    400,
                    "Latitude inválida. Use o GPS ou marque o local no mapa."
                );
            }

            if (
                longitude === null ||
                longitude < -180 ||
                longitude > 180
            ) {
                return responderErroComLimpeza(
                    req,
                    res,
                    400,
                    "Longitude inválida. Use o GPS ou marque o local no mapa."
                );
            }

            if (arquivos.length === 0) {
                return res
                    .status(400)
                    .json({
                        sucesso: false,
                        mensagem:
                            "Adicione pelo menos uma foto da ocorrência."
                    });
            }

            if (arquivos.length > 5) {
                return responderErroComLimpeza(
                    req,
                    res,
                    400,
                    "Envie no máximo 5 fotos por ocorrência."
                );
            }

            for (const arquivo of arquivos) {
                const imagemValida =
                    await assinaturaImagemValida(
                        arquivo.path,
                        arquivo.mimetype
                    );

                if (!imagemValida) {
                    return responderErroComLimpeza(
                        req,
                        res,
                        400,
                        "Uma das fotos enviadas não corresponde a uma imagem JPG, PNG ou WEBP válida."
                    );
                }
            }

            const fotos =
                arquivos.map((arquivo) => ({
                    nomeArquivo:
                        arquivo.filename,

                    nomeOriginal:
                        texto(
                            arquivo.originalname,
                            255
                        ) || "foto",

                    caminhoPublico:
                        `/uploads/ocorrencias/${arquivo.filename}`,

                    mimeType:
                        arquivo.mimetype,

                    tamanhoBytes:
                        arquivo.size
                }));

            const ocorrenciaId =
                await OcorrenciaModel.criarComFotos({
                    usuarioId:
                        req.usuario.id,

                    categoriaId,

                    titulo,

                    descricao,

                    latitude,

                    longitude,

                    precisaoLocalizacaoMetros:
                        precisaoLocalizacaoMetros !== null &&
                        precisaoLocalizacaoMetros >= 0
                            ? Math.min(
                                precisaoLocalizacaoMetros,
                                99999999.99
                            )
                            : null,

                    endereco,

                    bairro,

                    cidade,

                    fotos
                });

            return res
                .status(201)
                .json({
                    sucesso: true,

                    mensagem:
                        "Ocorrência registrada com sucesso.",

                    ocorrencia: {
                        id:
                            ocorrenciaId
                    }
                });

        } catch (error) {
            await removerArquivosSilenciosamente(
                req.files || []
            );

            if (
                error.codigoAplicacao ===
                "CATEGORIA_INVALIDA"
            ) {
                return res
                    .status(400)
                    .json({
                        sucesso: false,
                        mensagem:
                            "A categoria selecionada não existe ou está inativa."
                    });
            }

            if (
                error.codigoAplicacao ===
                "STATUS_INICIAL_AUSENTE"
            ) {
                console.error(
                    error
                );

                return res
                    .status(500)
                    .json({
                        sucesso: false,
                        mensagem:
                            "O sistema não está configurado para receber ocorrências no momento."
                    });
            }

            console.error(
                "Erro ao registrar ocorrência:",
                error
            );

            return res
                .status(500)
                .json({
                    sucesso: false,
                    mensagem:
                        "Não foi possível registrar a ocorrência. Tente novamente."
                });
        }
    },


    /*====================================================================================================

    CATEGORIAS

    ====================================================================================================*/

    async listarCategorias(
        req,
        res
    ) {
        try {
            const categorias =
                await OcorrenciaModel
                    .listarCategorias();

            return res
                .status(200)
                .json({
                    sucesso: true,
                    categorias
                });

        } catch (error) {
            console.error(
                "Erro ao listar categorias:",
                error
            );

            return res
                .status(500)
                .json({
                    sucesso: false,
                    mensagem:
                        "Não foi possível carregar as categorias."
                });
        }
    },


    /*====================================================================================================

    STATUS DISPONÍVEIS

    ====================================================================================================*/

    async listarStatus(
        req,
        res
    ) {
        try {
            const status =
                await OcorrenciaModel
                    .listarStatus();

            return res
                .status(200)
                .json({
                    sucesso: true,
                    status
                });

        } catch (error) {
            console.error(
                "Erro ao listar status:",
                error
            );

            return res
                .status(500)
                .json({
                    sucesso: false,
                    mensagem:
                        "Não foi possível carregar os status das ocorrências."
                });
        }
    },


    /*====================================================================================================

    MINHAS OCORRÊNCIAS

    ====================================================================================================*/

    async listarMinhas(
        req,
        res
    ) {
        try {
            const {
                pagina,
                limite
            } =
                obterPaginacao(
                    req
                );

            const status =
                texto(
                    req.query.status,
                    50
                );

            const busca =
                texto(
                    req.query.busca,
                    100
                );

            const resultado =
                await OcorrenciaModel
                    .listarDoUsuario({
                        usuarioId:
                            req.usuario.id,

                        status,

                        busca,

                        pagina,

                        limite
                    });

            return responderListagem(
                res,
                resultado,
                pagina,
                limite
            );

        } catch (error) {
            console.error(
                "Erro ao listar ocorrências:",
                error
            );

            return res
                .status(500)
                .json({
                    sucesso: false,
                    mensagem:
                        "Não foi possível carregar as ocorrências."
                });
        }
    },


    /*====================================================================================================

    TODAS AS OCORRÊNCIAS - ADMIN

    ====================================================================================================*/

    async listarTodasAdmin(
        req,
        res
    ) {
        try {
            const {
                pagina,
                limite
            } =
                obterPaginacao(
                    req
                );

            const status =
                texto(
                    req.query.status,
                    50
                );

            const busca =
                texto(
                    req.query.busca,
                    100
                );

            const resultado =
                await OcorrenciaModel
                    .listarTodasAdmin({
                        status,
                        busca,
                        pagina,
                        limite
                    });

            return responderListagem(
                res,
                resultado,
                pagina,
                limite
            );

        } catch (error) {
            console.error(
                "Erro ao listar ocorrências administrativas:",
                error
            );

            return res
                .status(500)
                .json({
                    sucesso: false,
                    mensagem:
                        "Não foi possível carregar as ocorrências."
                });
        }
    },


    /*====================================================================================================

    DETALHES

    ====================================================================================================*/

    async buscarPorId(
        req,
        res
    ) {
        try {
            const id =
                inteiroPositivo(
                    req.params.id
                );

            if (!id) {
                return res
                    .status(400)
                    .json({
                        sucesso: false,
                        mensagem:
                            "ID de ocorrência inválido."
                    });
            }

            const ocorrencia =
                await OcorrenciaModel.buscarPorId(
                    id,
                    req.usuario
                );

            if (!ocorrencia) {
                return res
                    .status(404)
                    .json({
                        sucesso: false,
                        mensagem:
                            "Ocorrência não encontrada."
                    });
            }

            return res
                .status(200)
                .json({
                    sucesso: true,
                    ocorrencia
                });

        } catch (error) {
            console.error(
                "Erro ao buscar ocorrência:",
                error
            );

            return res
                .status(500)
                .json({
                    sucesso: false,
                    mensagem:
                        "Não foi possível carregar a ocorrência."
                });
        }
    },


    /*====================================================================================================

    RESUMO DO CIDADÃO

    ====================================================================================================*/

    async resumo(
        req,
        res
    ) {
        try {
            const resumo =
                await OcorrenciaModel
                    .resumoDoUsuario(
                        req.usuario.id
                    );

            return res
                .status(200)
                .json({
                    sucesso: true,
                    resumo
                });

        } catch (error) {
            console.error(
                "Erro ao carregar resumo:",
                error
            );

            return res
                .status(500)
                .json({
                    sucesso: false,
                    mensagem:
                        "Não foi possível carregar o resumo das ocorrências."
                });
        }
    },


    /*====================================================================================================

    RESUMO GERAL - ADMIN

    ====================================================================================================*/

    async resumoAdmin(
        req,
        res
    ) {
        try {
            const resumo =
                await OcorrenciaModel
                    .resumoGeral();

            return res
                .status(200)
                .json({
                    sucesso: true,
                    resumo
                });

        } catch (error) {
            console.error(
                "Erro ao carregar resumo administrativo:",
                error
            );

            return res
                .status(500)
                .json({
                    sucesso: false,
                    mensagem:
                        "Não foi possível carregar o resumo das ocorrências."
                });
        }
    },


    /*====================================================================================================

    ALTERAÇÃO DE STATUS - ADMIN

    Toda alteração gera histórico para que o cidadão
    consiga acompanhar a evolução da solicitação.

    ====================================================================================================*/

    async atualizarStatus(
        req,
        res
    ) {
        try {
            const ocorrenciaId =
                inteiroPositivo(
                    req.params.id
                );

            const statusNovoId =
                inteiroPositivo(
                    req.body.status_id
                );

            const observacao =
                textoLongo(
                    req.body.observacao,
                    1000
                );

            if (!ocorrenciaId) {
                return res
                    .status(400)
                    .json({
                        sucesso: false,
                        mensagem:
                            "ID de ocorrência inválido."
                    });
            }

            if (!statusNovoId) {
                return res
                    .status(400)
                    .json({
                        sucesso: false,
                        mensagem:
                            "Selecione um status válido."
                    });
            }

            const resultado =
                await OcorrenciaModel
                    .atualizarStatus({
                        ocorrenciaId,

                        statusNovoId,

                        usuarioResponsavelId:
                            req.usuario.id,

                        observacao
                    });

            return res
                .status(200)
                .json({
                    sucesso: true,

                    mensagem:
                        `Status atualizado de "${resultado.status_anterior}" para "${resultado.status_novo}".`,

                    alteracao:
                        resultado
                });

        } catch (error) {
            if (
                error.codigoAplicacao ===
                "OCORRENCIA_NAO_ENCONTRADA"
            ) {
                return res
                    .status(404)
                    .json({
                        sucesso: false,
                        mensagem:
                            "Ocorrência não encontrada."
                    });
            }

            if (
                error.codigoAplicacao ===
                "STATUS_INVALIDO"
            ) {
                return res
                    .status(400)
                    .json({
                        sucesso: false,
                        mensagem:
                            "O status selecionado não existe."
                    });
            }

            if (
                error.codigoAplicacao ===
                "STATUS_IGUAL"
            ) {
                return res
                    .status(409)
                    .json({
                        sucesso: false,
                        mensagem:
                            "A ocorrência já está neste status."
                    });
            }

            if (
                error.codigoAplicacao ===
                "TRANSICAO_INVALIDA"
            ) {
                return res
                    .status(409)
                    .json({
                        sucesso: false,
                        mensagem:
                            error.message
                    });
            }

            if (
                error.codigoAplicacao ===
                "HISTORICO_INDISPONIVEL"
            ) {
                console.error(
                    "Tabela de histórico não encontrada:",
                    error
                );

                return res
                    .status(500)
                    .json({
                        sucesso: false,
                        mensagem:
                            "O histórico de ocorrências ainda não está configurado no banco."
                    });
            }

            console.error(
                "Erro ao atualizar status da ocorrência:",
                error
            );

            return res
                .status(500)
                .json({
                    sucesso: false,
                    mensagem:
                        "Não foi possível atualizar o status da ocorrência."
                });
        }
    }
};

module.exports =
    OcorrenciaController;
