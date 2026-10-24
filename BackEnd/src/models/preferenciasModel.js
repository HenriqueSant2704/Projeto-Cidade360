const db = require("../config/db");


/*========================================================================================================

PREFERÊNCIAS DO USUÁRIO

Guardadas em usuarios.preferencias (JSON, migração 008).
Só as chaves abaixo são aceitas, e todas são verdadeiro/falso.
"Menu recolhido" continua no navegador, porque depende do tamanho da tela de cada aparelho.

=========================================================================================================*/

const PREFERENCIAS_PADRAO = {
    temaEscuro: false,
    contadorNotificacoes: true,
    reduzirAnimacoes: false
};


// mysql2 devolve JSON já convertido no MySQL; no MariaDB vem como texto.
function lerJson(valor) {
    if (!valor) {
        return null;
    }

    if (typeof valor === "object") {
        return valor;
    }

    try {
        return JSON.parse(valor);
    } catch (error) {
        return null;
    }
}


function somenteConhecidas(preferencias) {
    const limpas = {};

    for (const chave of Object.keys(PREFERENCIAS_PADRAO)) {
        if (typeof preferencias?.[chave] === "boolean") {
            limpas[chave] = preferencias[chave];
        }
    }

    return limpas;
}


const PreferenciasModel = {

    PREFERENCIAS_PADRAO,

    somenteConhecidas,


    // null = o usuário nunca salvou nada
    async buscar(usuarioId) {
        const [linhas] =
            await db.query(
                "SELECT preferencias FROM usuarios WHERE id = ? LIMIT 1",
                [usuarioId]
            );

        const salvas =
            lerJson(linhas[0]?.preferencias);

        return salvas
            ? somenteConhecidas(salvas)
            : null;
    },


    // Junta com o que já estava salvo e devolve o resultado completo.
    async salvar(usuarioId, novas) {
        const atuais =
            await this.buscar(usuarioId) || {};

        const preferencias = {
            ...PREFERENCIAS_PADRAO,
            ...atuais,
            ...somenteConhecidas(novas)
        };

        await db.query(
            "UPDATE usuarios SET preferencias = ? WHERE id = ?",
            [
                JSON.stringify(preferencias),
                usuarioId
            ]
        );

        return preferencias;
    }
};

module.exports =
    PreferenciasModel;
