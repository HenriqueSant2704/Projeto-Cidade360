/*========================================================================================================

CIDADES ATENDIDAS PELO CIDADE360

Fonte única da regra "o sistema só funciona dentro da cidade da prefeitura".
Hoje: somente Jaborandi-SP (decidido com o Miguel em 27/10/2026).

Usado em:
- Cadastro: a pessoa só cria conta se escolher uma cidade desta lista.
- Ocorrências: o local marcado precisa ficar dentro do limite de uma cidade desta lista.
- Front-end: GET /api/cidade-atendida entrega estes dados para travar os mapas.

Para atender outra cidade no futuro: acrescente um item aqui e o arquivo do limite
em src/data/limites/ (GeoJSON com o contorno do município).

=========================================================================================================*/

const CIDADES_ATENDIDAS = [
    {
        nome: "Jaborandi",
        uf: "SP",
        codigoIbge: "3524204",

        // Centro da cidade e zoom inicial dos mapas (os mesmos que o sistema já usava)
        centro: [
            -20.6884,
            -48.4112
        ],
        zoom: 14,

        arquivoLimite: "jaborandi-sp.json"
    }
];


// Margem aceita além da linha do limite.
// O contorno é simplificado, então um ponto colado na divisa pode cair alguns metros "fora".
const TOLERANCIA_LIMITE_METROS =
    150;


module.exports = {
    CIDADES_ATENDIDAS,
    TOLERANCIA_LIMITE_METROS
};
