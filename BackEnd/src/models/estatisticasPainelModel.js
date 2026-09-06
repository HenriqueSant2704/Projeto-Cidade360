const db =
    require("../config/db");


/*========================================================================================================

MODEL DE ESTATÍSTICAS DO PAINEL

Responsável por consultas agregadas do Cidade360.

Nenhuma consulta deste arquivo retorna dados pessoais dos cidadãos.

=========================================================================================================*/

const EstatisticasPainelModel = {

    /*====================================================================================================

    CATEGORIAS MAIS REGISTRADAS

    Conta todas as ocorrências registradas no sistema,
    independentemente do cidadão responsável pelo registro.

    =====================================================================================================*/

    async listarCategoriasMaisRegistradas(
        limite
    ) {
        const limiteSeguro =
            Math.min(
                Math.max(
                    Number(limite) || 5,
                    1
                ),
                50
            );


        const [totalLinhas] =
            await db.execute(
                `
                SELECT
                    COUNT(*) AS total
                FROM ocorrencias
                `
            );


        const totalOcorrencias =
            Number(
                totalLinhas[0]?.total || 0
            );


        const [linhas] =
            await db.execute(
                `
                SELECT
                    c.id,
                    c.nome,
                    COUNT(o.id) AS total
                FROM categorias_ocorrencia c
                INNER JOIN ocorrencias o
                    ON o.categoria_id = c.id
                GROUP BY
                    c.id,
                    c.nome
                ORDER BY
                    total DESC,
                    c.nome ASC
                LIMIT ${limiteSeguro}
                `
            );


        return linhas.map((linha, indice) => {
            const total =
                Number(
                    linha.total || 0
                );


            const percentual =
                totalOcorrencias > 0
                    ? Number(
                        (
                            (
                                total /
                                totalOcorrencias
                            ) * 100
                        ).toFixed(1)
                    )
                    : 0;


            return {
                id:
                    Number(
                        linha.id
                    ),

                nome:
                    linha.nome,

                total,

                percentual,

                posicao:
                    indice + 1
            };
        });
    }
};


module.exports =
    EstatisticasPainelModel;
