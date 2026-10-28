const db = require("../config/db");


/*========================================================================================================

NOTIFICAÇÕES DO SININHO

Uma linha por destinatário. Notificações de avisos excluídos (ativo = 0) somem da lista
e voltam se o aviso for restaurado pelo "Desfazer".

=========================================================================================================*/

const LIMITE_PADRAO = 30;
const LIMITE_MAXIMO = 100;


function formatarNotificacao(linha) {
    return {
        id:
            Number(linha.id),

        tipo:
            linha.tipo,

        status:
            linha.status_chave || null,

        titulo:
            linha.titulo,

        texto:
            linha.texto,

        ocorrencia_id:
            linha.ocorrencia_id
                ? Number(linha.ocorrencia_id)
                : null,

        aviso_id:
            linha.aviso_id
                ? Number(linha.aviso_id)
                : null,

        pontos:
            Number(linha.pontos || 0),

        lida:
            Boolean(linha.lida),

        data_criacao:
            linha.data_criacao
    };
}


function cortar(valor, maximo) {
    const texto =
        String(valor ?? "")
            .replace(/\s+/g, " ")
            .trim();

    return texto.length > maximo
        ? `${texto.slice(0, maximo - 1).trimEnd()}…`
        : texto;
}


const NotificacaoModel = {

    async listar({
        usuarioId,
        limite = LIMITE_PADRAO
    }) {
        const quantidade =
            Math.min(
                Math.max(Number(limite) || LIMITE_PADRAO, 1),
                LIMITE_MAXIMO
            );

        const [linhas] =
            await db.query(
                `SELECT n.*
                 FROM notificacoes n
                 LEFT JOIN avisos a
                    ON a.id = n.aviso_id
                 WHERE n.usuario_id = ?
                   AND (n.aviso_id IS NULL OR a.ativo = 1)
                 ORDER BY n.data_criacao DESC, n.id DESC
                 LIMIT ?`,
                [
                    usuarioId,
                    quantidade
                ]
            );

        const [[contagem]] =
            await db.query(
                `SELECT COUNT(*) AS total
                 FROM notificacoes n
                 LEFT JOIN avisos a
                    ON a.id = n.aviso_id
                 WHERE n.usuario_id = ?
                   AND n.lida = 0
                   AND (n.aviso_id IS NULL OR a.ativo = 1)`,
                [usuarioId]
            );

        return {
            notificacoes:
                linhas.map(formatarNotificacao),

            naoLidas:
                Number(contagem.total)
        };
    },


    async marcarComoLida({
        id,
        usuarioId
    }) {
        // O usuario_id no WHERE impede marcar a notificação de outra pessoa.
        const [resultado] =
            await db.query(
                `UPDATE notificacoes
                 SET lida = 1,
                     data_leitura = COALESCE(data_leitura, NOW())
                 WHERE id = ?
                   AND usuario_id = ?`,
                [
                    id,
                    usuarioId
                ]
            );

        return resultado.affectedRows > 0;
    },


    async marcarTodasComoLidas(usuarioId) {
        const [resultado] =
            await db.query(
                `UPDATE notificacoes
                 SET lida = 1,
                     data_leitura = NOW()
                 WHERE usuario_id = ?
                   AND lida = 0`,
                [usuarioId]
            );

        return resultado.affectedRows;
    },


    // Lixeirinha do sininho: apaga de vez do banco.
    // O usuario_id no WHERE impede apagar a notificação de outra pessoa.
    // Os pontos não mudam: o saldo vem de pontos_historico, não das notificações.
    async excluir({
        id,
        usuarioId
    }) {
        const [resultado] =
            await db.query(
                `DELETE FROM notificacoes
                 WHERE id = ?
                   AND usuario_id = ?`,
                [
                    id,
                    usuarioId
                ]
            );

        return resultado.affectedRows > 0;
    },


    /*----------------------------------------------------------------------------------------------------
      AVISOS NOVOS
      Um aviso é "Novo" para o usuário enquanto a notificação dele não foi lida.
      Abrir a página de Avisos marca essas notificações como lidas.
    ----------------------------------------------------------------------------------------------------*/

    async avisosNaoLidos(usuarioId) {
        const [linhas] =
            await db.query(
                `SELECT DISTINCT aviso_id
                 FROM notificacoes
                 WHERE usuario_id = ?
                   AND tipo = 'aviso_novo'
                   AND lida = 0`,
                [usuarioId]
            );

        return new Set(
            linhas.map((linha) => Number(linha.aviso_id))
        );
    },


    async marcarAvisosComoLidos(usuarioId) {
        const [resultado] =
            await db.query(
                `UPDATE notificacoes
                 SET lida = 1,
                     data_leitura = NOW()
                 WHERE usuario_id = ?
                   AND tipo = 'aviso_novo'
                   AND lida = 0`,
                [usuarioId]
            );

        return resultado.affectedRows;
    },


    /*----------------------------------------------------------------------------------------------------
      CRIAÇÃO
    ----------------------------------------------------------------------------------------------------*/

    async criarParaUsuario({
        usuarioId,
        tipo,
        status = null,
        titulo,
        texto,
        ocorrenciaId = null,
        avisoId = null,
        pontos = 0
    }, conexao = db) {
        await conexao.query(
            `INSERT INTO notificacoes
                (usuario_id, tipo, status_chave, titulo, texto, ocorrencia_id, aviso_id, pontos)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                usuarioId,
                tipo,
                status,
                cortar(titulo, 120),
                cortar(texto, 500),
                ocorrenciaId,
                avisoId,
                pontos
            ]
        );
    },


    // Um único INSERT ... SELECT, em vez de um INSERT por pessoa.
    async criarParaGrupo({
        tipoUsuario = null,
        exceto = null,
        tipo,
        status = null,
        titulo,
        texto,
        ocorrenciaId = null,
        avisoId = null
    }, conexao = db) {
        const filtros = ["u.ativo = 1"];
        const parametros = [
            tipo,
            status,
            cortar(titulo, 120),
            cortar(texto, 500),
            ocorrenciaId,
            avisoId
        ];

        if (tipoUsuario) {
            filtros.push("u.tipo_usuario = ?");
            parametros.push(tipoUsuario);
        }

        if (exceto) {
            filtros.push("u.id <> ?");
            parametros.push(exceto);
        }

        const [resultado] =
            await conexao.query(
                `INSERT INTO notificacoes
                    (usuario_id, tipo, status_chave, titulo, texto, ocorrencia_id, aviso_id)
                 SELECT u.id, ?, ?, ?, ?, ?, ?
                 FROM usuarios u
                 WHERE ${filtros.join(" AND ")}`,
                parametros
            );

        return resultado.affectedRows;
    },

    async criarParaAdminsComPermissao({ permissao, exceto = [], tipo, titulo, texto, ocorrenciaId = null }) {
        if (!["ocorrencias", "equipe"].includes(permissao)) {
            throw new Error("Permissão de notificação inválida.");
        }
        const ignorados = (Array.isArray(exceto) ? exceto : [exceto]).filter(Boolean);
        const [resultado] = await db.query(
            `INSERT INTO notificacoes (usuario_id, tipo, titulo, texto, ocorrencia_id)
             SELECT u.id, ?, ?, ?, ? FROM usuarios u
             INNER JOIN permissoes_admin p ON p.usuario_id = u.id
             WHERE u.ativo = 1 AND u.tipo_usuario = 'ADMIN'
               AND (p.principal = 1 OR p.${permissao} = 1)
               ${ignorados.length ? `AND u.id NOT IN (${ignorados.map(() => "?").join(",")})` : ""}`,
            [tipo, cortar(titulo, 120), cortar(texto, 500), ocorrenciaId, ...ignorados]
        );
        return resultado.affectedRows;
    }
};

module.exports =
    NotificacaoModel;
