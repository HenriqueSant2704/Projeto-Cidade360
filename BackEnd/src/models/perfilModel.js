/*========================================================================================================

PERFIL DO USUÁRIO LOGADO

Consultas usadas pela página "Meu perfil" (perfilController.js).

As colunas cidade/uf chegam com a migração 010. Enquanto ela não roda no banco,
o perfil continua funcionando sem a cidade (mesma ideia do cadastro).

=========================================================================================================*/

const db =
    require("../config/db");


function faltaColunaCidade(error) {
    return error?.code === "ER_BAD_FIELD_ERROR";
}


const PerfilModel = {


    async buscarPorId(
        id
    ) {

        const camposBase = `
            id,
            nome,
            email,
            telefone,
            cpf,
            tipo_usuario,
            pontos,
            data_cadastro
        `;

        try {
            const [usuarios] =
                await db.execute(
                    `
                    SELECT ${camposBase}, cidade, uf
                    FROM usuarios
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [id]
                );

            return usuarios[0];

        } catch (error) {
            if (!faltaColunaCidade(error)) {
                throw error;
            }

            const [usuarios] =
                await db.execute(
                    `
                    SELECT ${camposBase}, NULL AS cidade, NULL AS uf
                    FROM usuarios
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [id]
                );

            return usuarios[0];
        }
    },


    async buscarSenhaHash(
        id
    ) {

        const [usuarios] =
            await db.execute(
                `
                SELECT senha_hash
                FROM usuarios
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );

        return usuarios[0]?.senha_hash || null;
    },


    // Retorna false quando a cidade não pôde ser gravada (migração 010 pendente).
    async atualizarDados(
        id,
        { nome, telefone, cidade, uf }
    ) {

        if (cidade === undefined) {
            await db.execute(
                `
                UPDATE usuarios
                SET nome = ?, telefone = ?
                WHERE id = ?
                `,
                [nome, telefone, id]
            );

            return true;
        }

        try {
            await db.execute(
                `
                UPDATE usuarios
                SET nome = ?, telefone = ?, cidade = ?, uf = ?
                WHERE id = ?
                `,
                [nome, telefone, cidade, uf, id]
            );

            return true;

        } catch (error) {
            if (!faltaColunaCidade(error)) {
                throw error;
            }

            await db.execute(
                `
                UPDATE usuarios
                SET nome = ?, telefone = ?
                WHERE id = ?
                `,
                [nome, telefone, id]
            );

            return false;
        }
    },


    async atualizarEmail(
        id,
        email
    ) {

        await db.execute(
            `
            UPDATE usuarios
            SET email = ?
            WHERE id = ?
            `,
            [email, id]
        );
    },


    async atualizarSenha(
        id,
        senhaHash
    ) {

        await db.execute(
            `
            UPDATE usuarios
            SET senha_hash = ?
            WHERE id = ?
            `,
            [senhaHash, id]
        );
    },


    // O código da troca de e-mail usa a mesma tabela do código do cadastro.
    // Depois de usado ele não serve para mais nada (nem para criar conta).
    async consumirCodigoEmail(
        id
    ) {

        await db.execute(
            `
            UPDATE email_verificacao_cadastro
            SET
                codigo_usado = 1,
                verificado = 1,
                token_expira_em = NOW()
            WHERE id = ?
            `,
            [id]
        );
    }
};


module.exports = PerfilModel;
