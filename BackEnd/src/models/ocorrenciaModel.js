const db = require("../config/db");

let compatibilidadeSchema = null;


/*========================================================================================================

COMPATIBILIDADE DO BANCO

Permite que o backend continue funcionando mesmo quando o banco hospedado
ainda estiver em uma versão anterior do schema.

=========================================================================================================*/

async function carregarCompatibilidadeSchema(
    conexao = db
) {
    if (compatibilidadeSchema) {
        return compatibilidadeSchema;
    }

    const [colunasOcorrencias] =
        await conexao.query(
            "SHOW COLUMNS FROM ocorrencias"
        );

    const [colunasImagens] =
        await conexao.query(
            "SHOW COLUMNS FROM imagens_ocorrencia"
        );

    const [colunasCategorias] =
        await conexao.query(
            "SHOW COLUMNS FROM categorias_ocorrencia"
        );

    const [tabelaHistorico] =
        await conexao.query(
            "SHOW TABLES LIKE 'historico_ocorrencia'"
        );

    compatibilidadeSchema = {
        ocorrencias: new Set(
            colunasOcorrencias.map(
                (coluna) => coluna.Field
            )
        ),

        imagens: new Set(
            colunasImagens.map(
                (coluna) => coluna.Field
            )
        ),

        categorias: new Set(
            colunasCategorias.map(
                (coluna) => coluna.Field
            )
        ),

        historicoExiste:
            tabelaHistorico.length > 0
    };

    return compatibilidadeSchema;
}


/*========================================================================================================

CAMPOS DE LISTAGEM

=========================================================================================================*/

function camposListagem(schema) {
    const precisao =
        schema.ocorrencias.has(
            "precisao_localizacao_metros"
        )
            ? "o.precisao_localizacao_metros"
            : "NULL AS precisao_localizacao_metros";

    const endereco =
        schema.ocorrencias.has(
            "endereco"
        )
            ? "o.endereco"
            : "NULL AS endereco";

    const bairro =
        schema.ocorrencias.has(
            "bairro"
        )
            ? "o.bairro"
            : "NULL AS bairro";

    const cidade =
        schema.ocorrencias.has(
            "cidade"
        )
            ? "o.cidade"
            : "NULL AS cidade";

    let dataOcorrencia =
        "NULL AS data_ocorrencia";

    let dataCriacao =
        "NULL AS data_criacao";

    let dataAtualizacao =
        "NULL AS data_atualizacao";

    if (
        schema.ocorrencias.has(
            "data_ocorrencia"
        )
    ) {
        dataOcorrencia =
            "o.data_ocorrencia";
    }

    if (
        schema.ocorrencias.has(
            "data_criacao"
        )
    ) {
        dataCriacao =
            "o.data_criacao";
    }

    if (
        schema.ocorrencias.has(
            "data_atualizacao"
        )
    ) {
        dataAtualizacao =
            "o.data_atualizacao";
    }

    if (
        !schema.ocorrencias.has(
            "data_ocorrencia"
        ) &&
        schema.ocorrencias.has(
            "data_criacao"
        )
    ) {
        dataOcorrencia =
            "o.data_criacao AS data_ocorrencia";
    }

    if (
        !schema.ocorrencias.has(
            "data_criacao"
        ) &&
        schema.ocorrencias.has(
            "data_ocorrencia"
        )
    ) {
        dataCriacao =
            "o.data_ocorrencia AS data_criacao";
    }

    if (
        !schema.ocorrencias.has(
            "data_atualizacao"
        ) &&
        schema.ocorrencias.has(
            "data_criacao"
        )
    ) {
        dataAtualizacao =
            "o.data_criacao AS data_atualizacao";
    }

    if (
        !schema.ocorrencias.has(
            "data_atualizacao"
        ) &&
        !schema.ocorrencias.has(
            "data_criacao"
        ) &&
        schema.ocorrencias.has(
            "data_ocorrencia"
        )
    ) {
        dataAtualizacao =
            "o.data_ocorrencia AS data_atualizacao";
    }

    return `
        o.id,
        o.titulo,
        o.descricao,
        o.latitude,
        o.longitude,
        ${precisao},
        ${endereco},
        ${bairro},
        ${cidade},
        ${dataOcorrencia},
        ${dataCriacao},
        ${dataAtualizacao},
        c.id AS categoria_id,
        c.nome AS categoria,
        s.id AS status_id,
        s.nome AS status,
        (
            SELECT io.caminho_arquivo
            FROM imagens_ocorrencia io
            WHERE io.ocorrencia_id = o.id
            ORDER BY io.id ASC
            LIMIT 1
        ) AS foto_url
    `;
}


/*========================================================================================================

CAMPO DE ORDENAÇÃO

=========================================================================================================*/

function campoOrdenacaoOcorrencias(schema) {
    if (
        schema.ocorrencias.has(
            "data_criacao"
        )
    ) {
        return "o.data_criacao";
    }

    if (
        schema.ocorrencias.has(
            "data_ocorrencia"
        )
    ) {
        return "o.data_ocorrencia";
    }

    return "o.id";
}


/*========================================================================================================

FILTRO DE STATUS

Aceita filtros amigáveis usados pelo FrontEnd.

=========================================================================================================*/

function adicionarFiltroStatus(
    condicoes,
    parametros,
    status
) {
    const valor =
        String(status || "")
            .trim()
            .toLowerCase();

    if (!valor) {
        return;
    }

    if (
        valor === "pendentes" ||
        valor === "pendente"
    ) {
        condicoes.push(
            "s.nome IN ('Recebido', 'Em análise')"
        );

        return;
    }

    if (
        valor === "em_andamento" ||
        valor === "em andamento" ||
        valor === "em atendimento"
    ) {
        condicoes.push(
            "s.nome = ?"
        );

        parametros.push(
            "Em atendimento"
        );

        return;
    }

    if (
        valor === "resolvidos" ||
        valor === "resolvido"
    ) {
        condicoes.push(
            "s.nome = ?"
        );

        parametros.push(
            "Resolvido"
        );

        return;
    }

    if (
        valor === "cancelados" ||
        valor === "cancelado"
    ) {
        condicoes.push(
            "s.nome = ?"
        );

        parametros.push(
            "Cancelado"
        );

        return;
    }

    condicoes.push(
        "LOWER(s.nome) = ?"
    );

    parametros.push(
        valor
    );
}


/*========================================================================================================

FILTRO DE BUSCA

=========================================================================================================*/

function adicionarFiltroBusca(
    schema,
    condicoes,
    parametros,
    busca,
    incluirCidadao = false
) {
    if (!busca) {
        return;
    }

    const termo =
        `%${busca}%`;

    const condicoesBusca = [
        "o.titulo LIKE ?",
        "c.nome LIKE ?"
    ];

    const parametrosBusca = [
        termo,
        termo
    ];

    if (
        schema.ocorrencias.has(
            "endereco"
        )
    ) {
        condicoesBusca.push(
            "o.endereco LIKE ?"
        );

        parametrosBusca.push(
            termo
        );
    }

    if (
        schema.ocorrencias.has(
            "bairro"
        )
    ) {
        condicoesBusca.push(
            "o.bairro LIKE ?"
        );

        parametrosBusca.push(
            termo
        );
    }

    if (
        schema.ocorrencias.has(
            "cidade"
        )
    ) {
        condicoesBusca.push(
            "o.cidade LIKE ?"
        );

        parametrosBusca.push(
            termo
        );
    }

    if (incluirCidadao) {
        condicoesBusca.push(
            "u.nome LIKE ?",
            "u.email LIKE ?"
        );

        parametrosBusca.push(
            termo,
            termo
        );
    }

    condicoes.push(
        `
        (
            ${condicoesBusca.join(" OR ")}
        )
        `
    );

    parametros.push(
        ...parametrosBusca
    );
}


/*========================================================================================================

PAGINAÇÃO

=========================================================================================================*/

function normalizarPaginacao(
    pagina,
    limite
) {
    const paginaSegura =
        Math.max(
            Number(pagina) || 1,
            1
        );

    const limiteSeguro =
        Math.min(
            Math.max(
                Number(limite) || 20,
                1
            ),
            50
        );

    const offset =
        (paginaSegura - 1) *
        limiteSeguro;

    return {
        paginaSegura,
        limiteSeguro,
        offset
    };
}


/*========================================================================================================

TRANSIÇÕES DE STATUS

=========================================================================================================*/

const TRANSICOES_STATUS = {
    "Recebido": [
        "Em análise",
        "Cancelado"
    ],

    "Em análise": [
        "Em atendimento",
        "Cancelado"
    ],

    "Em atendimento": [
        "Em análise",
        "Resolvido",
        "Cancelado"
    ],

    "Resolvido": [
        "Em atendimento"
    ],

    "Cancelado": [
        "Recebido"
    ]
};


function transicaoStatusPermitida(
    statusAtual,
    statusNovo
) {
    const permitidos =
        TRANSICOES_STATUS[
            statusAtual
        ] || [];

    return permitidos.includes(
        statusNovo
    );
}


/*========================================================================================================

MODEL

=========================================================================================================*/

const OcorrenciaModel = {
    async buscarCategoriaAtivaPorId(
        categoriaId,
        conexao = db
    ) {
        const schema =
            await carregarCompatibilidadeSchema(
                conexao
            );

        const filtroAtivo =
            schema.categorias.has("ativo")
                ? "AND ativo = 1"
                : "";

        const [linhas] =
            await conexao.execute(
                `
                SELECT
                    id,
                    nome
                FROM categorias_ocorrencia
                WHERE id = ?
                ${filtroAtivo}
                LIMIT 1
                `,
                [categoriaId]
            );

        return linhas[0] || null;
    },


    async buscarStatusPorNome(
        nome,
        conexao = db
    ) {
        const [linhas] =
            await conexao.execute(
                `
                SELECT
                    id,
                    nome
                FROM status_ocorrencia
                WHERE nome = ?
                LIMIT 1
                `,
                [nome]
            );

        return linhas[0] || null;
    },


    async buscarStatusPorId(
        id,
        conexao = db
    ) {
        const [linhas] =
            await conexao.execute(
                `
                SELECT
                    id,
                    nome
                FROM status_ocorrencia
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );

        return linhas[0] || null;
    },


    async listarStatus() {
        const [linhas] =
            await db.execute(
                `
                SELECT
                    id,
                    nome
                FROM status_ocorrencia
                ORDER BY
                    CASE nome
                        WHEN 'Recebido' THEN 1
                        WHEN 'Em análise' THEN 2
                        WHEN 'Em atendimento' THEN 3
                        WHEN 'Resolvido' THEN 4
                        WHEN 'Cancelado' THEN 5
                        ELSE 99
                    END,
                    id ASC
                `
            );

        return linhas;
    },


    async criarComFotos({
        usuarioId,
        categoriaId,
        titulo,
        descricao,
        latitude,
        longitude,
        precisaoLocalizacaoMetros,
        endereco,
        bairro,
        cidade,
        fotos
    }) {
        const conexao =
            await db.getConnection();

        try {
            await conexao.beginTransaction();

            const schema =
                await carregarCompatibilidadeSchema(
                    conexao
                );

            const categoria =
                await this.buscarCategoriaAtivaPorId(
                    categoriaId,
                    conexao
                );

            if (!categoria) {
                const error =
                    new Error(
                        "Categoria inválida."
                    );

                error.codigoAplicacao =
                    "CATEGORIA_INVALIDA";

                throw error;
            }

            const statusRecebido =
                await this.buscarStatusPorNome(
                    "Recebido",
                    conexao
                );

            if (!statusRecebido) {
                const error =
                    new Error(
                        "Status inicial não cadastrado."
                    );

                error.codigoAplicacao =
                    "STATUS_INICIAL_AUSENTE";

                throw error;
            }

            const colunasOcorrencia = [
                "usuario_id",
                "categoria_id",
                "status_id",
                "titulo",
                "descricao",
                "latitude",
                "longitude"
            ];

            const valoresOcorrencia = [
                usuarioId,
                categoriaId,
                statusRecebido.id,
                titulo,
                descricao,
                latitude,
                longitude
            ];

            if (
                schema.ocorrencias.has(
                    "precisao_localizacao_metros"
                )
            ) {
                colunasOcorrencia.push(
                    "precisao_localizacao_metros"
                );

                valoresOcorrencia.push(
                    precisaoLocalizacaoMetros ?? null
                );
            }

            if (
                schema.ocorrencias.has(
                    "endereco"
                )
            ) {
                colunasOcorrencia.push(
                    "endereco"
                );

                valoresOcorrencia.push(
                    endereco || null
                );
            }

            if (
                schema.ocorrencias.has(
                    "bairro"
                )
            ) {
                colunasOcorrencia.push(
                    "bairro"
                );

                valoresOcorrencia.push(
                    bairro || null
                );
            }

            if (
                schema.ocorrencias.has(
                    "cidade"
                )
            ) {
                colunasOcorrencia.push(
                    "cidade"
                );

                valoresOcorrencia.push(
                    cidade || null
                );
            }

            const placeholders =
                colunasOcorrencia
                    .map(() => "?")
                    .join(", ");

            let colunaData = "";
            let valorData = "";

            if (
                schema.ocorrencias.has(
                    "data_ocorrencia"
                )
            ) {
                colunaData =
                    ",\n                        data_ocorrencia";

                valorData =
                    ",\n                        CURRENT_TIMESTAMP";
            }

            const [resultado] =
                await conexao.execute(
                    `
                    INSERT INTO ocorrencias
                    (
                        ${colunasOcorrencia.join(",\n                        ")}
                        ${colunaData}
                    )
                    VALUES
                    (
                        ${placeholders}
                        ${valorData}
                    )
                    `,
                    valoresOcorrencia
                );

            const ocorrenciaId =
                resultado.insertId;

            for (const foto of fotos) {
                const colunasImagem = [
                    "ocorrencia_id",
                    "nome_arquivo",
                    "caminho_arquivo"
                ];

                const valoresImagem = [
                    ocorrenciaId,
                    foto.nomeArquivo,
                    foto.caminhoPublico
                ];

                if (
                    schema.imagens.has(
                        "nome_original"
                    )
                ) {
                    colunasImagem.push(
                        "nome_original"
                    );

                    valoresImagem.push(
                        foto.nomeOriginal
                    );
                }

                if (
                    schema.imagens.has(
                        "mime_type"
                    )
                ) {
                    colunasImagem.push(
                        "mime_type"
                    );

                    valoresImagem.push(
                        foto.mimeType
                    );
                }

                if (
                    schema.imagens.has(
                        "tamanho_bytes"
                    )
                ) {
                    colunasImagem.push(
                        "tamanho_bytes"
                    );

                    valoresImagem.push(
                        foto.tamanhoBytes
                    );
                }

                const placeholdersImagem =
                    colunasImagem
                        .map(() => "?")
                        .join(", ");

                await conexao.execute(
                    `
                    INSERT INTO imagens_ocorrencia
                    (
                        ${colunasImagem.join(",\n                        ")}
                    )
                    VALUES
                    (
                        ${placeholdersImagem}
                    )
                    `,
                    valoresImagem
                );
            }

            if (
                schema.historicoExiste
            ) {
                await conexao.execute(
                    `
                    INSERT INTO historico_ocorrencia
                    (
                        ocorrencia_id,
                        status_anterior,
                        status_novo,
                        usuario_responsavel,
                        observacao
                    )
                    VALUES
                    (
                        ?,
                        NULL,
                        ?,
                        ?,
                        ?
                    )
                    `,
                    [
                        ocorrenciaId,
                        statusRecebido.id,
                        usuarioId,
                        "Ocorrência registrada pelo cidadão."
                    ]
                );
            }

            await conexao.commit();

            return ocorrenciaId;

        } catch (error) {
            await conexao.rollback();

            throw error;

        } finally {
            conexao.release();
        }
    },


    async listarCategorias() {
        const schema =
            await carregarCompatibilidadeSchema();

        const filtroAtivo =
            schema.categorias.has("ativo")
                ? "WHERE ativo = 1"
                : "";

        const [linhas] =
            await db.execute(
                `
                SELECT
                    id,
                    nome,
                    descricao
                FROM categorias_ocorrencia
                ${filtroAtivo}
                ORDER BY nome ASC
                `
            );

        return linhas;
    },


    async listarDoUsuario({
        usuarioId,
        status,
        busca,
        pagina,
        limite
    }) {
        const schema =
            await carregarCompatibilidadeSchema();

        const condicoes = [
            "o.usuario_id = ?"
        ];

        const parametros = [
            usuarioId
        ];

        adicionarFiltroStatus(
            condicoes,
            parametros,
            status
        );

        adicionarFiltroBusca(
            schema,
            condicoes,
            parametros,
            busca
        );

        const {
            limiteSeguro,
            offset
        } =
            normalizarPaginacao(
                pagina,
                limite
            );

        const campoOrdenacao =
            campoOrdenacaoOcorrencias(
                schema
            );

        const [totalLinhas] =
            await db.execute(
                `
                SELECT
                    COUNT(*) AS total
                FROM ocorrencias o
                INNER JOIN categorias_ocorrencia c
                    ON c.id = o.categoria_id
                INNER JOIN status_ocorrencia s
                    ON s.id = o.status_id
                WHERE
                    ${condicoes.join(" AND ")}
                `,
                parametros
            );

        const [linhas] =
            await db.execute(
                `
                SELECT
                    ${camposListagem(schema)}
                FROM ocorrencias o
                INNER JOIN categorias_ocorrencia c
                    ON c.id = o.categoria_id
                INNER JOIN status_ocorrencia s
                    ON s.id = o.status_id
                WHERE
                    ${condicoes.join(" AND ")}
                ORDER BY
                    ${campoOrdenacao} DESC,
                    o.id DESC
                LIMIT ${limiteSeguro}
                OFFSET ${offset}
                `,
                parametros
            );

        return {
            itens:
                linhas,

            total:
                Number(
                    totalLinhas[0]?.total || 0
                )
        };
    },


    async listarTodasAdmin({
        status,
        busca,
        pagina,
        limite
    }) {
        const schema =
            await carregarCompatibilidadeSchema();

        const condicoes = [
            "1 = 1"
        ];

        const parametros = [];

        adicionarFiltroStatus(
            condicoes,
            parametros,
            status
        );

        adicionarFiltroBusca(
            schema,
            condicoes,
            parametros,
            busca,
            true
        );

        const {
            limiteSeguro,
            offset
        } =
            normalizarPaginacao(
                pagina,
                limite
            );

        const campoOrdenacao =
            campoOrdenacaoOcorrencias(
                schema
            );

        const [totalLinhas] =
            await db.execute(
                `
                SELECT
                    COUNT(*) AS total
                FROM ocorrencias o
                INNER JOIN usuarios u
                    ON u.id = o.usuario_id
                INNER JOIN categorias_ocorrencia c
                    ON c.id = o.categoria_id
                INNER JOIN status_ocorrencia s
                    ON s.id = o.status_id
                WHERE
                    ${condicoes.join(" AND ")}
                `,
                parametros
            );

        const [linhas] =
            await db.execute(
                `
                SELECT
                    ${camposListagem(schema)},
                    o.usuario_id,
                    u.nome AS usuario_nome,
                    u.email AS usuario_email
                FROM ocorrencias o
                INNER JOIN usuarios u
                    ON u.id = o.usuario_id
                INNER JOIN categorias_ocorrencia c
                    ON c.id = o.categoria_id
                INNER JOIN status_ocorrencia s
                    ON s.id = o.status_id
                WHERE
                    ${condicoes.join(" AND ")}
                ORDER BY
                    ${campoOrdenacao} DESC,
                    o.id DESC
                LIMIT ${limiteSeguro}
                OFFSET ${offset}
                `,
                parametros
            );

        return {
            itens:
                linhas,

            total:
                Number(
                    totalLinhas[0]?.total || 0
                )
        };
    },


    async buscarPorId(
        id,
        usuario
    ) {
        const schema =
            await carregarCompatibilidadeSchema();

        const parametros = [
            id
        ];

        let filtroUsuario = "";

        if (
            usuario.tipo_usuario !== "ADMIN"
        ) {
            filtroUsuario =
                "AND o.usuario_id = ?";

            parametros.push(
                usuario.id
            );
        }

        const [linhas] =
            await db.execute(
                `
                SELECT
                    ${camposListagem(schema)},
                    o.usuario_id,
                    u.nome AS usuario_nome,
                    u.email AS usuario_email
                FROM ocorrencias o
                INNER JOIN usuarios u
                    ON u.id = o.usuario_id
                INNER JOIN categorias_ocorrencia c
                    ON c.id = o.categoria_id
                INNER JOIN status_ocorrencia s
                    ON s.id = o.status_id
                WHERE
                    o.id = ?
                    ${filtroUsuario}
                LIMIT 1
                `,
                parametros
            );

        const ocorrencia =
            linhas[0];

        if (!ocorrencia) {
            return null;
        }

        const camposImagem = [
            "id",
            "caminho_arquivo AS url",
            "data_upload"
        ];

        if (
            schema.imagens.has(
                "nome_original"
            )
        ) {
            camposImagem.push(
                "nome_original"
            );
        } else {
            camposImagem.push(
                "NULL AS nome_original"
            );
        }

        if (
            schema.imagens.has(
                "mime_type"
            )
        ) {
            camposImagem.push(
                "mime_type"
            );
        } else {
            camposImagem.push(
                "NULL AS mime_type"
            );
        }

        if (
            schema.imagens.has(
                "tamanho_bytes"
            )
        ) {
            camposImagem.push(
                "tamanho_bytes"
            );
        } else {
            camposImagem.push(
                "NULL AS tamanho_bytes"
            );
        }

        const [imagens] =
            await db.execute(
                `
                SELECT
                    ${camposImagem.join(",\n                    ")}
                FROM imagens_ocorrencia
                WHERE ocorrencia_id = ?
                ORDER BY id ASC
                `,
                [id]
            );

        let historico = [];

        if (
            schema.historicoExiste
        ) {
            const [linhasHistorico] =
                await db.execute(
                    `
                    SELECT
                        h.id,
                        sa.nome AS status_anterior,
                        sn.nome AS status_novo,
                        h.observacao,
                        h.data_alteracao,
                        h.usuario_responsavel,
                        ur.nome AS usuario_responsavel_nome
                    FROM historico_ocorrencia h
                    LEFT JOIN status_ocorrencia sa
                        ON sa.id = h.status_anterior
                    INNER JOIN status_ocorrencia sn
                        ON sn.id = h.status_novo
                    LEFT JOIN usuarios ur
                        ON ur.id = h.usuario_responsavel
                    WHERE
                        h.ocorrencia_id = ?
                    ORDER BY
                        h.data_alteracao ASC,
                        h.id ASC
                    `,
                    [id]
                );

            historico =
                linhasHistorico;
        }

        return {
            ...ocorrencia,
            imagens,
            historico
        };
    },


    async resumoDoUsuario(
        usuarioId
    ) {
        const [linhas] =
            await db.execute(
                `
                SELECT
                    COUNT(*) AS total,
                    SUM(
                        CASE
                            WHEN s.nome IN
                            (
                                'Recebido',
                                'Em análise'
                            )
                            THEN 1
                            ELSE 0
                        END
                    ) AS pendentes,
                    SUM(
                        CASE
                            WHEN s.nome = 'Em atendimento'
                            THEN 1
                            ELSE 0
                        END
                    ) AS em_andamento,
                    SUM(
                        CASE
                            WHEN s.nome = 'Resolvido'
                            THEN 1
                            ELSE 0
                        END
                    ) AS resolvidas,
                    SUM(
                        CASE
                            WHEN s.nome = 'Cancelado'
                            THEN 1
                            ELSE 0
                        END
                    ) AS canceladas
                FROM ocorrencias o
                INNER JOIN status_ocorrencia s
                    ON s.id = o.status_id
                WHERE
                    o.usuario_id = ?
                `,
                [usuarioId]
            );

        const resumo =
            linhas[0] || {};

        return {
            total:
                Number(
                    resumo.total || 0
                ),

            pendentes:
                Number(
                    resumo.pendentes || 0
                ),

            em_andamento:
                Number(
                    resumo.em_andamento || 0
                ),

            resolvidas:
                Number(
                    resumo.resolvidas || 0
                ),

            canceladas:
                Number(
                    resumo.canceladas || 0
                )
        };
    },


    async resumoGeral() {
        const [linhas] =
            await db.execute(
                `
                SELECT
                    COUNT(*) AS total,
                    SUM(
                        CASE
                            WHEN s.nome IN
                            (
                                'Recebido',
                                'Em análise'
                            )
                            THEN 1
                            ELSE 0
                        END
                    ) AS pendentes,
                    SUM(
                        CASE
                            WHEN s.nome = 'Em atendimento'
                            THEN 1
                            ELSE 0
                        END
                    ) AS em_andamento,
                    SUM(
                        CASE
                            WHEN s.nome = 'Resolvido'
                            THEN 1
                            ELSE 0
                        END
                    ) AS resolvidas,
                    SUM(
                        CASE
                            WHEN s.nome = 'Cancelado'
                            THEN 1
                            ELSE 0
                        END
                    ) AS canceladas
                FROM ocorrencias o
                INNER JOIN status_ocorrencia s
                    ON s.id = o.status_id
                `
            );

        const resumo =
            linhas[0] || {};

        return {
            total:
                Number(
                    resumo.total || 0
                ),

            pendentes:
                Number(
                    resumo.pendentes || 0
                ),

            em_andamento:
                Number(
                    resumo.em_andamento || 0
                ),

            resolvidas:
                Number(
                    resumo.resolvidas || 0
                ),

            canceladas:
                Number(
                    resumo.canceladas || 0
                )
        };
    },


    async atualizarStatus({
        ocorrenciaId,
        statusNovoId,
        usuarioResponsavelId,
        observacao
    }) {
        const conexao =
            await db.getConnection();

        try {
            await conexao.beginTransaction();

            const schema =
                await carregarCompatibilidadeSchema(
                    conexao
                );

            if (
                !schema.historicoExiste
            ) {
                const error =
                    new Error(
                        "Tabela de histórico ausente."
                    );

                error.codigoAplicacao =
                    "HISTORICO_INDISPONIVEL";

                throw error;
            }

            const [ocorrencias] =
                await conexao.execute(
                    `
                    SELECT
                        o.id,
                        o.status_id,
                        s.nome AS status_atual
                    FROM ocorrencias o
                    INNER JOIN status_ocorrencia s
                        ON s.id = o.status_id
                    WHERE
                        o.id = ?
                    LIMIT 1
                    FOR UPDATE
                    `,
                    [ocorrenciaId]
                );

            const ocorrencia =
                ocorrencias[0];

            if (!ocorrencia) {
                const error =
                    new Error(
                        "Ocorrência não encontrada."
                    );

                error.codigoAplicacao =
                    "OCORRENCIA_NAO_ENCONTRADA";

                throw error;
            }

            const statusNovo =
                await this.buscarStatusPorId(
                    statusNovoId,
                    conexao
                );

            if (!statusNovo) {
                const error =
                    new Error(
                        "Status inválido."
                    );

                error.codigoAplicacao =
                    "STATUS_INVALIDO";

                throw error;
            }

            if (
                Number(ocorrencia.status_id) ===
                Number(statusNovo.id)
            ) {
                const error =
                    new Error(
                        "A ocorrência já está neste status."
                    );

                error.codigoAplicacao =
                    "STATUS_IGUAL";

                throw error;
            }

            if (
                !transicaoStatusPermitida(
                    ocorrencia.status_atual,
                    statusNovo.nome
                )
            ) {
                const error =
                    new Error(
                        `Não é permitido alterar de "${ocorrencia.status_atual}" para "${statusNovo.nome}".`
                    );

                error.codigoAplicacao =
                    "TRANSICAO_INVALIDA";

                throw error;
            }

            await conexao.execute(
                `
                UPDATE ocorrencias
                SET
                    status_id = ?
                WHERE
                    id = ?
                `,
                [
                    statusNovo.id,
                    ocorrenciaId
                ]
            );

            await conexao.execute(
                `
                INSERT INTO historico_ocorrencia
                (
                    ocorrencia_id,
                    status_anterior,
                    status_novo,
                    usuario_responsavel,
                    observacao
                )
                VALUES
                (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                )
                `,
                [
                    ocorrenciaId,
                    ocorrencia.status_id,
                    statusNovo.id,
                    usuarioResponsavelId,
                    observacao || null
                ]
            );

            await conexao.commit();

            return {
                status_anterior:
                    ocorrencia.status_atual,

                status_novo:
                    statusNovo.nome
            };

        } catch (error) {
            await conexao.rollback();

            throw error;

        } finally {
            conexao.release();
        }
    }
};

module.exports =
    OcorrenciaModel;
