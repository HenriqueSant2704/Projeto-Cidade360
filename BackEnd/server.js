const path = require("path");
const fs = require("fs");


require("dotenv").config({
    path: path.resolve(
        __dirname,
        ".env"
    )
});


const express =
    require("express");


const cors =
    require("cors");


const db =
    require("./src/config/db");


const authRoutes =
    require("./src/routes/authRoutes");


const ocorrenciaRoutes =
    require("./src/routes/ocorrenciaRoutes");

const estatisticasPainelRoutes =
    require("./src/routes/estatisticasPainelRoutes");

const proximasOcorrenciasRoutes =
    require("./src/routes/proximasOcorrenciasRoutes");


const app =
    express();


const PORT =
    Number(process.env.PORT) || 3000;


// ============================================================
// CAMINHOS
// ============================================================

const caminhoProjeto =
    path.resolve(
        __dirname,
        ".."
    );


const caminhoFrontEnd =
    path.join(
        caminhoProjeto,
        "FrontEnd"
    );


const caminhoAssets =
    path.join(
        caminhoProjeto,
        "assets"
    );


const caminhoUploads =
    path.join(
        __dirname,
        "uploads"
    );


const caminhoHome =
    path.join(
        caminhoProjeto,
        "index.html"
    );


const caminhoLogin =
    path.join(
        caminhoFrontEnd,
        "pages/login/login.html"
    );


// ============================================================
// CORS
// ============================================================

const origensPermitidas =
    String(
        process.env.CORS_ORIGINS ||
        "http://localhost:3000,http://127.0.0.1:3000"
    )
        .split(",")
        .map(
            origem =>
                origem.trim()
        )
        .filter(Boolean);


app.disable(
    "x-powered-by"
);


app.use(
    cors({

        origin(
            origin,
            callback
        ) {

            // Requisições sem Origin:
            // Postman, curl, mesmo servidor etc.
            if (
                !origin ||
                origensPermitidas.includes(
                    origin
                )
            ) {

                return callback(
                    null,
                    true
                );
            }


            return callback(
                new Error(
                    "Origem não permitida pelo CORS."
                )
            );
        },


        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],


        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]
    })
);


// ============================================================
// BODY
// ============================================================

app.use(
    express.json({
        limit: "1mb"
    })
);


app.use(
    express.urlencoded({
        extended: true,
        limit: "1mb"
    })
);


// ============================================================
// ARQUIVOS ESTÁTICOS
// ============================================================

app.use(
    express.static(
        caminhoProjeto
    )
);


app.use(
    "/FrontEnd",

    express.static(
        caminhoFrontEnd
    )
);


app.use(
    "/assets",

    express.static(
        caminhoAssets
    )
);


// Fotos das ocorrências
app.use(
    "/uploads",

    express.static(
        caminhoUploads,
        {
            dotfiles: "deny",
            index: false,
            maxAge: "1h"
        }
    )
);


// ============================================================
// HOME
// ============================================================

app.get(
    "/",

    (req, res) => {

        if (
            fs.existsSync(
                caminhoHome
            )
        ) {

            return res.sendFile(
                caminhoHome
            );
        }


        return res
            .status(404)
            .send(
                "Home não encontrada."
            );
    }
);


// ============================================================
// LOGIN
// ============================================================

app.get(
    "/login",

    (req, res) => {

        if (
            fs.existsSync(
                caminhoLogin
            )
        ) {

            return res.sendFile(
                caminhoLogin
            );
        }


        return res
            .status(404)
            .send(
                "Login não encontrado."
            );
    }
);


// ============================================================
// TESTE
// ============================================================

app.get(
    "/api/teste",

    async (req, res) => {

        try {

            await db.execute(
                "SELECT 1"
            );


            return res
                .status(200)
                .json({

                    sucesso: true,

                    mensagem:
                        "API e banco conectados com sucesso."
                });


        } catch (error) {

            console.error(
                "Erro ao testar banco:",
                error
            );


            // Não envia error.message
            // para o navegador
            return res
                .status(500)
                .json({

                    sucesso: false,

                    mensagem:
                        "A API está ativa, mas não conseguiu acessar o banco de dados."
                });
        }
    }
);


// ============================================================
// ROTAS
// ============================================================

app.use(
    "/api",
    authRoutes
);


app.use(
    "/api/ocorrencias",
    ocorrenciaRoutes
);

app.use(
    "/api/estatisticas-painel",
    estatisticasPainelRoutes
);

app.use(
    "/api/ocorrencias-proximas",
    proximasOcorrenciasRoutes
);


// ============================================================
// API NÃO ENCONTRADA
// ============================================================

app.use(
    "/api",

    (req, res) => {

        return res
            .status(404)
            .json({

                sucesso: false,

                mensagem:
                    "Rota da API não encontrada."
            });
    }
);


// ============================================================
// FRONTEND
// ============================================================

app.get(
    "*",

    (req, res) => {

        if (
            fs.existsSync(
                caminhoHome
            )
        ) {

            return res.sendFile(
                caminhoHome
            );
        }


        return res
            .status(404)
            .send(
                "Página não encontrada."
            );
    }
);


// ============================================================
// ERROR HANDLER
// ============================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            "Erro não tratado:",
            error
        );


        return res
            .status(500)
            .json({

                sucesso: false,

                mensagem:
                    "Ocorreu um erro interno no servidor."
            });
    }
);


// ============================================================
// START
// ============================================================

async function iniciarServidor() {

    try {

        await db.execute(
            "SELECT 1"
        );


        console.log(
            "Banco MySQL conectado."
        );


      app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Cidade360 rodando na porta ${PORT}`
        );

        console.log(
            `API disponível em /api`
        );
    }
);


    } catch (error) {

        console.error(
            "Não foi possível iniciar o Cidade360 porque o MySQL não respondeu:",
            error.message
        );


        process.exit(1);
    }
}


iniciarServidor();