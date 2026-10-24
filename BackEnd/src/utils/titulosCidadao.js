/*========================================================================================================

TÍTULOS DO CIDADÃO

Um título novo a cada 100 pontos, até 800. Depois disso os pontos continuam somando,
mas não existem mais títulos (combinado com o Miguel em 24/10/2026).

O título acompanha o saldo atual: se uma ocorrência for cancelada e o saldo cair,
o cidadão volta para o título anterior.

Para criar títulos novos no futuro, basta acrescentar na lista TITULOS.

=========================================================================================================*/

const TITULOS = [
    {
        nivel: 1,
        pontos: 100,
        nome: "Olhar Atento",
        descricao: "Começou a enxergar a cidade com outros olhos."
    },
    {
        nivel: 2,
        pontos: 200,
        nome: "Vizinho Presente",
        descricao: "Está sempre por perto quando o bairro precisa."
    },
    {
        nivel: 3,
        pontos: 300,
        nome: "Voz do Bairro",
        descricao: "Leva os problemas da rua até a prefeitura."
    },
    {
        nivel: 4,
        pontos: 400,
        nome: "Guardião da Rua",
        descricao: "Cuida das ruas como se fossem a própria casa."
    },
    {
        nivel: 5,
        pontos: 500,
        nome: "Sentinela Urbano",
        descricao: "Nada passa despercebido pelo seu olhar."
    },
    {
        nivel: 6,
        pontos: 600,
        nome: "Construtor da Cidade",
        descricao: "Ajuda a construir uma cidade melhor a cada ocorrência."
    },
    {
        nivel: 7,
        pontos: 700,
        nome: "Pilar da Comunidade",
        descricao: "Um exemplo para todos que vivem na cidade."
    },
    {
        nivel: 8,
        pontos: 800,
        nome: "Lenda 360",
        descricao: "Alcançou o título máximo do Cidade360."
    }
];


function tituloDoSaldo(saldo) {
    const pontos =
        Math.max(Number(saldo) || 0, 0);

    const conquistados =
        TITULOS.filter((titulo) => pontos >= titulo.pontos);

    return conquistados[conquistados.length - 1] || null;
}


function proximoTitulo(saldo) {
    const pontos =
        Math.max(Number(saldo) || 0, 0);

    return TITULOS.find((titulo) => pontos < titulo.pontos) || null;
}


module.exports = {
    TITULOS,
    tituloDoSaldo,
    proximoTitulo
};
