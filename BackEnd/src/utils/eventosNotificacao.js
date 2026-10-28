const db = require("../config/db");

const NotificacaoModel =
    require("../models/notificacaoModel");

const PontosModel =
    require("../models/pontosModel");

const {
    tituloDoSaldo
} =
    require("./titulosCidadao");


/*========================================================================================================

EVENTOS QUE GERAM NOTIFICAÇÃO (E PONTOS)

- Cidadão registra ocorrência  → todos os admins são avisados; o cidadão ganha pontos.
- Admin muda o status          → o dono da ocorrência é avisado; ganha (ou perde) pontos.
- Admin publica aviso          → todos os usuários ativos são avisados (menos quem publicou).
- Cidadão passa de 100, 200... → ganha um título novo e é avisado (abre "Meus pontos").

Tudo aqui é "melhor esforço": se der erro, a ação principal (registrar, mudar status,
publicar) já foi salva e continua valendo. O erro só vai para o log.
Se o banco ainda não tiver a migração 007, nada acontece e nada quebra.

=========================================================================================================*/

const NOMES_STATUS = {
    recebido: "Recebido",
    em_analise: "Em análise",
    em_andamento: "Em andamento",
    resolvido: "Resolvido",
    cancelado: "Cancelado"
};

const ORDEM_STATUS = [
    "recebido",
    "em_analise",
    "em_andamento",
    "resolvido"
];


// Mesma regra do front: "Em atendimento" do banco é "Em andamento" na tela.
function chaveStatus(nome) {
    const valor =
        String(nome || "")
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .trim()
            .toLowerCase();

    if (valor === "recebido") return "recebido";
    if (valor === "em analise" || valor === "pendente") return "em_analise";
    if (valor === "em andamento" || valor === "em atendimento") return "em_andamento";
    if (valor === "resolvido") return "resolvido";
    if (valor === "cancelado") return "cancelado";

    return null;
}


function textoPontos(pontos, reaberta = false) {
    if (pontos > 0 && reaberta) {
        return ` Os ${pontos} ${pontos === 1 ? "ponto" : "pontos"} dela voltaram para o seu saldo.`;
    }

    if (pontos > 0) {
        return ` Você ganhou +${pontos} ${pontos === 1 ? "ponto" : "pontos"}.`;
    }

    if (pontos < 0) {
        const perdidos = Math.abs(pontos);
        return ` Os ${perdidos} ${perdidos === 1 ? "ponto" : "pontos"} dela saíram do seu saldo.`;
    }

    return "";
}


function textoMensagemAdmin(observacao) {
    const mensagem =
        String(observacao || "")
            .replace(/\s+/g, " ")
            .trim();

    if (!mensagem) {
        return "";
    }

    return ` Mensagem da prefeitura: "${mensagem.length > 140 ? `${mensagem.slice(0, 139)}…` : mensagem}"`;
}


function tabelaAusente(error) {
    return error?.code === "ER_NO_SUCH_TABLE";
}


function registrarFalha(evento, error) {
    if (tabelaAusente(error)) {
        return;
    }

    console.error(
        `Não foi possível gerar as notificações/pontos (${evento}):`,
        error
    );
}


async function buscarOcorrencia(ocorrenciaId) {
    const [linhas] =
        await db.query(
            `SELECT
                o.id,
                o.titulo,
                o.usuario_id,
                u.nome AS usuario_nome,
                c.nome AS categoria_nome
             FROM ocorrencias o
             INNER JOIN usuarios u
                ON u.id = o.usuario_id
             LEFT JOIN categorias_ocorrencia c
                ON c.id = o.categoria_id
             WHERE o.id = ?
             LIMIT 1`,
            [ocorrenciaId]
        );

    return linhas[0] || null;
}


function textoDoStatus({
    anterior,
    novo,
    titulo
}) {
    const voltou =
        ORDEM_STATUS.indexOf(novo) >= 0 &&
        ORDEM_STATUS.indexOf(anterior) > ORDEM_STATUS.indexOf(novo);

    if (anterior === "cancelado" && novo === "recebido") {
        return {
            titulo: "Ocorrência reaberta",
            texto: `A prefeitura reabriu "${titulo}". Ela volta para a fila de análise.`
        };
    }

    if (voltou) {
        return {
            titulo: `Ocorrência voltou para ${NOMES_STATUS[novo]}`,
            texto: `"${titulo}" voltou para a etapa ${NOMES_STATUS[novo]}.`
        };
    }

    const modelos = {
        recebido: {
            titulo: "Ocorrência recebida",
            texto: `Recebemos "${titulo}". Ela aguarda a análise da prefeitura.`
        },
        em_analise: {
            titulo: "Ocorrência em análise",
            texto: `A prefeitura começou a analisar "${titulo}".`
        },
        em_andamento: {
            titulo: "Ocorrência em andamento",
            texto: `Uma equipe já está cuidando de "${titulo}".`
        },
        resolvido: {
            titulo: "Ocorrência resolvida",
            texto: `"${titulo}" foi resolvida. Obrigado por ajudar a cuidar da cidade!`
        },
        cancelado: {
            titulo: "Ocorrência cancelada",
            texto: `"${titulo}" foi cancelada pela prefeitura.`
        }
    };

    return modelos[novo] || {
        titulo: "Ocorrência atualizada",
        texto: `"${titulo}" foi atualizada pela prefeitura.`
    };
}


/*
  Depois de ganhar pontos: se o saldo passou de um título para o próximo, avisa no sininho.
  Fica separado da notificação da ocorrência para um erro aqui não apagar aquela.
  Se o título for perdido (cancelamento) e reconquistado, o aviso aparece de novo.
*/
async function avisarTituloNovo({
    usuarioId,
    pontos
}) {
    if (pontos <= 0) {
        return;
    }

    try {
        const saldo =
            await PontosModel.saldoDoUsuario(usuarioId);

        const tituloAtual =
            tituloDoSaldo(saldo);

        const tituloAnterior =
            tituloDoSaldo(saldo - pontos);

        if (!tituloAtual || tituloAtual.nivel === tituloAnterior?.nivel) {
            return;
        }

        await NotificacaoModel.criarParaUsuario({
            usuarioId,
            tipo: "titulo_novo",
            titulo: `Título novo: ${tituloAtual.nome}`,
            texto: `Você chegou a ${tituloAtual.pontos} pontos e conquistou o título "${tituloAtual.nome}". Veja os próximos em Meus pontos.`
        });

    } catch (error) {
        registrarFalha("título novo", error);
    }
}


/*========================================================================================================

EVENTOS

=========================================================================================================*/

async function aoRegistrarOcorrencia({
    ocorrenciaId
}) {
    try {
        const ocorrencia =
            await buscarOcorrencia(ocorrenciaId);

        if (!ocorrencia) {
            return;
        }

        const pontos =
            await PontosModel.aplicarEtapa({
                usuarioId: ocorrencia.usuario_id,
                ocorrenciaId,
                etapa: "registro"
            });

        await NotificacaoModel.criarParaUsuario({
            usuarioId: ocorrencia.usuario_id,
            tipo: "ocorrencia_registrada",
            status: "recebido",
            titulo: "Ocorrência registrada",
            texto: `Recebemos "${ocorrencia.titulo}". Ela aguarda a análise da prefeitura.${textoPontos(pontos)}`,
            ocorrenciaId,
            pontos
        });

        const textoAdmin = ocorrencia.categoria_nome
            ? `${ocorrencia.usuario_nome} registrou "${ocorrencia.titulo}" em ${ocorrencia.categoria_nome}.`
            : `${ocorrencia.usuario_nome} registrou "${ocorrencia.titulo}".`;
        try {
            await NotificacaoModel.criarParaAdminsComPermissao({
                permissao: "ocorrencias",
                exceto: [ocorrencia.usuario_id],
                tipo: "ocorrencia_nova",
                titulo: "Nova ocorrência para analisar",
                texto: textoAdmin,
                ocorrenciaId
            });
        } catch (error) {
            if (!tabelaAusente(error)) throw error;
            await NotificacaoModel.criarParaGrupo({
                tipoUsuario: "ADMIN", exceto: ocorrencia.usuario_id,
                tipo: "ocorrencia_nova", status: "recebido",
                titulo: "Nova ocorrência para analisar", texto: textoAdmin, ocorrenciaId
            });
        }

        await avisarTituloNovo({
            usuarioId: ocorrencia.usuario_id,
            pontos
        });

    } catch (error) {
        registrarFalha("ocorrência registrada", error);
    }
}


async function aoMudarStatusOcorrencia({
    ocorrenciaId,
    statusAnterior,
    statusNovo,
    observacao
}) {
    try {
        const ocorrencia =
            await buscarOcorrencia(ocorrenciaId);

        if (!ocorrencia) {
            return;
        }

        const anterior = chaveStatus(statusAnterior);
        const novo = chaveStatus(statusNovo);

        const pontos =
            await PontosModel.aplicarEtapa({
                usuarioId: ocorrencia.usuario_id,
                ocorrenciaId,
                etapa: novo
            });

        const { titulo, texto } =
            textoDoStatus({
                anterior,
                novo,
                titulo: ocorrencia.titulo
            });

        await NotificacaoModel.criarParaUsuario({
            usuarioId: ocorrencia.usuario_id,
            tipo: "ocorrencia_status",
            status: novo,
            titulo,
            texto: `${texto}${textoPontos(pontos, anterior === "cancelado")}${textoMensagemAdmin(observacao)}`,
            ocorrenciaId,
            pontos
        });

        await avisarTituloNovo({
            usuarioId: ocorrencia.usuario_id,
            pontos
        });

    } catch (error) {
        registrarFalha("status da ocorrência", error);
    }
}


async function aoPublicarAviso({
    avisoId,
    titulo,
    autorId
}) {
    try {
        await NotificacaoModel.criarParaGrupo({
            exceto: autorId,
            tipo: "aviso_novo",
            titulo: "Novo aviso da prefeitura",
            texto: titulo,
            avisoId
        });

    } catch (error) {
        registrarFalha("aviso publicado", error);
    }
}

async function aoMudarEquipe({ tipo, usuarioId = null, atorId = null, nome, permissoes = [] }) {
    const lista = permissoes.length ? permissoes.join(", ") : "nenhuma";
    const modelos = {
        promovido: ["admin_promovido", "Acesso de administrador concedido", `Você recebeu acesso ao Cidade360. Permissões: ${lista}.`],
        removido: ["admin_removido", "Acesso de administrador removido", "Seu acesso administrativo foi removido. Sua conta continua ativa como cidadã."],
        permissoes: ["admin_permissoes", "Permissões atualizadas", `Suas permissões agora são: ${lista}.`],
        principal: ["admin_principal", "Você é o administrador principal", "O cargo de administrador principal foi transferido para você."],
        aceito: ["admin_promovido", "Acesso de administrador ativado", `Seu convite foi aceito. Permissões: ${lista}.`]
    };
    if (usuarioId && modelos[tipo]) {
        const [tipoAviso, titulo, texto] = modelos[tipo];
        try {
            await NotificacaoModel.criarParaUsuario({ usuarioId, tipo: tipoAviso, titulo, texto });
        } catch (error) {
            registrarFalha(`equipe: ${tipo} para usuário`, error);
        }
    }
    try {
        await NotificacaoModel.criarParaAdminsComPermissao({
            permissao: "equipe",
            exceto: [atorId, usuarioId],
            tipo: "admin_equipe",
            titulo: "Equipe de administradores atualizada",
            texto: `${nome || "Um administrador"}: ${tipo}.`
        });
    } catch (error) {
        registrarFalha(`equipe: ${tipo} para gestores`, error);
    }
}


module.exports = {
    aoRegistrarOcorrencia,
    aoMudarStatusOcorrencia,
    aoPublicarAviso,
    aoMudarEquipe
};
