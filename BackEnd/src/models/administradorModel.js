const db =
    require("../config/db");


/*========================================================================================================

ADMINISTRADORES

Ser administrador continua sendo usuarios.tipo_usuario = 'ADMIN'.
As tabelas convites_admin e historico_administradores chegam com a migração 011.
Enquanto ela não roda, a lista e o promover/remover continuam funcionando
(só sem histórico); os convites ficam indisponíveis.

=========================================================================================================*/

function tabelaFaltando(error) {
    return error?.code === "ER_NO_SUCH_TABLE";
}


const AdministradorModel = {

    tabelaFaltando,


    /*----------------------------------------------------------------------------------------------------
      LISTAGEM
    ----------------------------------------------------------------------------------------------------*/

    // Administradores ativos, com a última vez que ganharam o acesso (se estiver no histórico).
    async listarAdministradores() {
        try {
            const [linhas] =
                await db.execute(
                    `
                    SELECT
                        u.id,
                        u.nome,
                        u.email,
                        u.data_cadastro,
                        h.acao AS origem,
                        h.data_acao AS admin_desde,
                        h.nome_feito_por AS adicionado_por
                    FROM usuarios u
                    LEFT JOIN historico_administradores h
                        ON h.id = (
                            SELECT h2.id
                            FROM historico_administradores h2
                            WHERE h2.usuario_id = u.id
                              AND h2.acao IN ('PROMOVIDO', 'CONVITE_ACEITO')
                            ORDER BY h2.id DESC
                            LIMIT 1
                        )
                    WHERE u.tipo_usuario = 'ADMIN'
                      AND u.ativo = 1
                    ORDER BY u.nome
                    `
                );

            return linhas;

        } catch (error) {
            if (!tabelaFaltando(error)) {
                throw error;
            }

            const [linhas] =
                await db.execute(
                    `
                    SELECT
                        id,
                        nome,
                        email,
                        data_cadastro
                    FROM usuarios
                    WHERE tipo_usuario = 'ADMIN'
                      AND ativo = 1
                    ORDER BY nome
                    `
                );

            return linhas;
        }
    },


    async contarAdministradores() {
        const [linhas] =
            await db.execute(
                `
                SELECT COUNT(*) AS total
                FROM usuarios
                WHERE tipo_usuario = 'ADMIN'
                  AND ativo = 1
                `
            );

        return Number(linhas[0]?.total || 0);
    },


    // Convites que ainda não foram aceitos nem cancelados (os vencidos também, para reenviar).
    async listarConvitesPendentes() {
        const [linhas] =
            await db.execute(
                `
                SELECT
                    c.id,
                    c.nome,
                    c.email,
                    c.expira_em,
                    c.data_criacao,
                    (c.expira_em <= NOW()) AS expirado,
                    u.nome AS convidado_por_nome
                FROM convites_admin c
                LEFT JOIN usuarios u
                    ON u.id = c.convidado_por
                WHERE c.status = 'PENDENTE'
                ORDER BY c.data_criacao DESC
                `
            );

        return linhas;
    },


    async listarHistorico(limite = 15) {
        const quantidade =
            Math.min(50, Math.max(1, Number(limite) || 15));

        const [linhas] =
            await db.query(
                `
                SELECT
                    id,
                    acao,
                    nome_usuario,
                    email_usuario,
                    nome_feito_por,
                    data_acao
                FROM historico_administradores
                ORDER BY id DESC
                LIMIT ?
                `,
                [quantidade]
            );

        return linhas;
    },


    /*----------------------------------------------------------------------------------------------------
      BUSCA DE CIDADÃOS (para promover)
      Nome ou e-mail por trecho; CPF só com os 11 números (não dá para "varrer" CPFs).
    ----------------------------------------------------------------------------------------------------*/

    async buscarCidadaos(termo, cpfCompleto) {
        const trecho =
            `%${String(termo).replace(/[\\%_]/g, "\\$&")}%`;

        const [linhas] =
            await db.execute(
                `
                SELECT
                    u.id,
                    u.nome,
                    u.email,
                    u.cpf,
                    u.data_cadastro,
                    (
                        SELECT COUNT(*)
                        FROM ocorrencias o
                        WHERE o.usuario_id = u.id
                    ) AS total_ocorrencias
                FROM usuarios u
                WHERE u.tipo_usuario = 'CIDADAO'
                  AND u.ativo = 1
                  AND (
                        u.nome LIKE ?
                     OR u.email LIKE ?
                     OR u.cpf = ?
                  )
                ORDER BY u.nome
                LIMIT 8
                `,
                [
                    trecho,
                    trecho,
                    cpfCompleto || "-"
                ]
            );

        return linhas;
    },


    /*----------------------------------------------------------------------------------------------------
      USUÁRIOS
    ----------------------------------------------------------------------------------------------------*/

    async buscarUsuario(id) {
        const [linhas] =
            await db.execute(
                `
                SELECT
                    id,
                    nome,
                    email,
                    tipo_usuario,
                    ativo
                FROM usuarios
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );

        return linhas[0];
    },


    async buscarSenhaHash(id) {
        const [linhas] =
            await db.execute(
                `
                SELECT senha_hash
                FROM usuarios
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );

        return linhas[0]?.senha_hash || null;
    },


    async buscarPorEmailOuCpf(email, cpf) {
        const [linhas] =
            await db.execute(
                `
                SELECT
                    id,
                    nome,
                    email,
                    cpf,
                    tipo_usuario
                FROM usuarios
                WHERE email = ?
                   OR cpf = ?
                LIMIT 2
                `,
                [
                    email,
                    cpf || "-"
                ]
            );

        return linhas;
    },


    // A mudança de papel e seu histórico são confirmados juntos.
    async trocarTipoComHistorico({
        usuarioId,
        tipoAtual,
        tipoNovo,
        usuario,
        feitoPor
    }) {
        const conexao = await db.getConnection();

        try {
            await conexao.beginTransaction();

            // Serializa mudanças de papel e confirma que o responsável ainda é admin.
            const [administradores] = await conexao.execute(
                `SELECT id FROM usuarios
                 WHERE tipo_usuario = 'ADMIN' AND ativo = 1
                 ORDER BY id FOR UPDATE`
            );

            if (!administradores.some((admin) => Number(admin.id) === Number(feitoPor.id))) {
                const error = new Error("O acesso de administrador foi removido.");
                error.codigoAplicacao = "ADMIN_NAO_AUTORIZADO";
                throw error;
            }

            if (tipoNovo === "CIDADAO" && administradores.length <= 1) {
                const error = new Error("O último administrador não pode ser removido.");
                error.codigoAplicacao = "ULTIMO_ADMIN";
                throw error;
            }

            const [resultado] = await conexao.execute(
                `UPDATE usuarios SET tipo_usuario = ?
                 WHERE id = ? AND tipo_usuario = ? AND ativo = 1`,
                [tipoNovo, usuarioId, tipoAtual]
            );

            if (resultado.affectedRows !== 1) {
                await conexao.rollback();
                return false;
            }

            await this.registrarHistorico({
                acao: tipoNovo === "ADMIN" ? "PROMOVIDO" : "REMOVIDO",
                usuarioId,
                nomeUsuario: usuario.nome,
                emailUsuario: usuario.email,
                feitoPor: feitoPor.id,
                nomeFeitoPor: feitoPor.nome
            }, conexao);

            await conexao.commit();
            return true;

        } catch (error) {
            await conexao.rollback();
            throw error;
        } finally {
            conexao.release();
        }
    },


    /*----------------------------------------------------------------------------------------------------
      HISTÓRICO
      Antes da migração 011 a ação continua valendo; só não fica registrada.
    ----------------------------------------------------------------------------------------------------*/

    async registrarHistorico(
        {
            acao,
            usuarioId = null,
            nomeUsuario,
            emailUsuario,
            feitoPor = null,
            nomeFeitoPor = null
        },
        conexao = db
    ) {
        try {
            await conexao.execute(
                `
                INSERT INTO historico_administradores
                (
                    acao,
                    usuario_id,
                    nome_usuario,
                    email_usuario,
                    feito_por,
                    nome_feito_por
                )
                VALUES (?, ?, ?, ?, ?, ?)
                `,
                [
                    acao,
                    usuarioId,
                    nomeUsuario,
                    emailUsuario,
                    feitoPor,
                    nomeFeitoPor
                ]
            );

        } catch (error) {
            // Em uma transação a ausência da tabela precisa desfazer a ação.
            if (!tabelaFaltando(error) || conexao !== db) {
                throw error;
            }

            console.warn(
                "Tabela historico_administradores ainda não existe (rode a migração 011). Ação feita sem histórico."
            );
        }
    },


    /*----------------------------------------------------------------------------------------------------
      CONVITES
    ----------------------------------------------------------------------------------------------------*/

    async buscarConvitePendentePorEmail(email) {
        const [linhas] =
            await db.execute(
                `
                SELECT id, nome, email
                FROM convites_admin
                WHERE email = ?
                  AND status = 'PENDENTE'
                LIMIT 1
                `,
                [email]
            );

        return linhas[0];
    },


    async buscarConvitePorId(id) {
        const [linhas] =
            await db.execute(
                `
                SELECT id, nome, email, status
                FROM convites_admin
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );

        return linhas[0];
    },


    async buscarConvitePorToken(tokenHash) {
        const [linhas] =
            await db.execute(
                `
                SELECT
                    c.id,
                    c.nome,
                    c.email,
                    c.status,
                    c.expira_em,
                    (c.expira_em <= NOW()) AS expirado,
                    c.convidado_por,
                    u.nome AS convidado_por_nome
                FROM convites_admin c
                LEFT JOIN usuarios u
                    ON u.id = c.convidado_por
                WHERE c.token_hash = ?
                LIMIT 1
                `,
                [tokenHash]
            );

        return linhas[0];
    },


    async criarConvite({ nome, email, tokenHash, convidadoPor, diasValidade }) {
        const [resultado] =
            await db.execute(
                `
                INSERT INTO convites_admin
                (
                    nome,
                    email,
                    token_hash,
                    convidado_por,
                    expira_em
                )
                VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))
                `,
                [
                    nome,
                    email,
                    tokenHash,
                    convidadoPor,
                    diasValidade
                ]
            );

        return resultado.insertId;
    },


    // Reenviar troca o link: o anterior para de funcionar.
    async renovarConvite(id, tokenHash, diasValidade) {
        const [resultado] =
            await db.execute(
                `
                UPDATE convites_admin
                SET
                    token_hash = ?,
                    expira_em = DATE_ADD(NOW(), INTERVAL ? DAY)
                WHERE id = ?
                  AND status = 'PENDENTE'
                `,
                [
                    tokenHash,
                    diasValidade,
                    id
                ]
            );

        return resultado.affectedRows === 1;
    },


    async cancelarConvite(id) {
        const [resultado] =
            await db.execute(
                `
                UPDATE convites_admin
                SET
                    status = 'CANCELADO',
                    data_resposta = NOW()
                WHERE id = ?
                  AND status = 'PENDENTE'
                `,
                [id]
            );

        return resultado.affectedRows === 1;
    },


    // Cria a conta já como ADMIN e fecha o convite, tudo junto (transação).
    async aceitarConvite(convite, dados) {
        const conexao =
            await db.getConnection();

        try {
            await conexao.beginTransaction();

            // Trava o convite: dois cliques ao mesmo tempo não criam duas contas.
            const [travado] =
                await conexao.execute(
                    `
                    SELECT status
                    FROM convites_admin
                    WHERE id = ?
                    FOR UPDATE
                    `,
                    [convite.id]
                );

            if (travado[0]?.status !== "PENDENTE") {
                await conexao.rollback();
                return null;
            }

            const [resultado] =
                await conexao.execute(
                    `
                    INSERT INTO usuarios
                    (
                        nome,
                        email,
                        telefone,
                        cpf,
                        cidade,
                        uf,
                        senha_hash,
                        tipo_usuario
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'ADMIN')
                    `,
                    [
                        convite.nome,
                        convite.email,
                        dados.telefone,
                        dados.cpf,
                        dados.cidade,
                        dados.uf,
                        dados.senhaHash
                    ]
                );

            const usuarioId =
                resultado.insertId;

            await conexao.execute(
                `
                UPDATE convites_admin
                SET
                    status = 'ACEITO',
                    usuario_id = ?,
                    data_resposta = NOW()
                WHERE id = ?
                `,
                [
                    usuarioId,
                    convite.id
                ]
            );

            await AdministradorModel.registrarHistorico(
                {
                    acao: "CONVITE_ACEITO",
                    usuarioId,
                    nomeUsuario: convite.nome,
                    emailUsuario: convite.email,
                    feitoPor: convite.convidado_por,
                    nomeFeitoPor: convite.convidado_por_nome
                },
                conexao
            );

            await conexao.commit();

            return usuarioId;

        } catch (error) {
            await conexao.rollback();
            throw error;

        } finally {
            conexao.release();
        }
    }
};


module.exports =
    AdministradorModel;
