const db =
    require("../config/db");


const UsuarioModel = {


    async buscarPorEmail(
        email
    ) {

        const [usuarios] =
            await db.execute(
                `
                SELECT

                    id,

                    nome,

                    email,

                    telefone,

                    cpf,

                    senha_hash,

                    tipo_usuario,

                    pontos,

                    ativo,

                    data_cadastro

                FROM usuarios

                WHERE email = ?

                LIMIT 1
                `,
                [email]
            );


        return usuarios[0];
    },


    async buscarPorCpf(
        cpf
    ) {

        const [usuarios] =
            await db.execute(
                `
                SELECT

                    id,

                    nome,

                    email,

                    telefone,

                    cpf,

                    tipo_usuario,

                    pontos,

                    ativo,

                    data_cadastro

                FROM usuarios

                WHERE cpf = ?

                LIMIT 1
                `,
                [cpf]
            );


        return usuarios[0];
    },


    async buscarPorId(
        id
    ) {

        const [usuarios] =
            await db.execute(
                `
                SELECT

                    id,

                    nome,

                    email,

                    telefone,

                    cpf,

                    tipo_usuario,

                    pontos,

                    ativo,

                    data_cadastro

                FROM usuarios

                WHERE id = ?

                LIMIT 1
                `,
                [id]
            );


        return usuarios[0];
    },


    async cadastrar({

        nome,

        email,

        telefone,

        cpf,

        senhaHash

    }) {

        const [resultado] =
            await db.execute(
                `
                INSERT INTO usuarios
                (
                    nome,

                    email,

                    telefone,

                    cpf,

                    senha_hash,

                    tipo_usuario
                )

                VALUES
                (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    'CIDADAO'
                )
                `,
                [
                    nome,

                    email,

                    telefone,

                    cpf,

                    senhaHash
                ]
            );


        return resultado.insertId;
    }
};


module.exports =
    UsuarioModel;