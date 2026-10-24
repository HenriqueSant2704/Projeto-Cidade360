-- ========================================================================================
-- CIDADE360
-- MEUS PONTOS E TÍTULOS
--
-- Execute uma única vez, DEPOIS da 007. Pode rodar de novo sem duplicar nada:
-- as etapas usam chave_unica ("15:registro") e o acerto de cancelamento só entra
-- quando o saldo da ocorrência estiver diferente do esperado.
--
-- 1) Sininho ganha o tipo "titulo_novo" (cidadão conquistou um título).
-- 2 a 5) Pontos das ocorrências registradas antes da 007, com a mesma regra do pontosModel.js:
--   registro +1, Em análise +2, Em atendimento +3, Resolvido +5 (cada etapa 1x)
--   ocorrência cancelada fica com 0 pontos
-- As datas dos movimentos usam as datas reais do histórico da ocorrência.
-- ========================================================================================


-- ========================================================================================
-- 1) NOTIFICAÇÃO DE TÍTULO NOVO
-- ========================================================================================

ALTER TABLE notificacoes
    MODIFY tipo ENUM(
        'ocorrencia_registrada',
        'ocorrencia_nova',
        'ocorrencia_status',
        'aviso_novo',
        'titulo_novo'
    ) NOT NULL;


-- ========================================================================================
-- 2) REGISTRO: +1 para toda ocorrência
-- ========================================================================================

INSERT IGNORE INTO pontos_historico
    (usuario_id, ocorrencia_id, motivo, pontos, chave_unica, data_criacao)
SELECT
    o.usuario_id,
    o.id,
    'registro',
    1,
    CONCAT(o.id, ':registro'),
    o.data_criacao
FROM ocorrencias o;


-- ========================================================================================
-- 3) ETAPAS QUE A OCORRÊNCIA JÁ ALCANÇOU
-- Junta o histórico de status com o status atual (caso falte alguma linha no histórico).
-- ========================================================================================

INSERT IGNORE INTO pontos_historico
    (usuario_id, ocorrencia_id, motivo, pontos, chave_unica, data_criacao)
SELECT
    etapas.usuario_id,
    etapas.ocorrencia_id,
    etapas.etapa,
    CASE etapas.etapa
        WHEN 'em_analise' THEN 2
        WHEN 'em_andamento' THEN 3
        WHEN 'resolvido' THEN 5
    END,
    CONCAT(etapas.ocorrencia_id, ':', etapas.etapa),
    MIN(etapas.data_etapa)
FROM (
    SELECT
        o.usuario_id,
        o.id AS ocorrencia_id,
        CASE
            WHEN s.nome IN ('Em análise', 'Pendente') THEN 'em_analise'
            WHEN s.nome IN ('Em atendimento', 'Em andamento') THEN 'em_andamento'
            WHEN s.nome = 'Resolvido' THEN 'resolvido'
        END AS etapa,
        h.data_alteracao AS data_etapa
    FROM historico_ocorrencia h
    INNER JOIN ocorrencias o ON o.id = h.ocorrencia_id
    INNER JOIN status_ocorrencia s ON s.id = h.status_novo

    UNION ALL

    SELECT
        o.usuario_id,
        o.id,
        CASE
            WHEN s.nome IN ('Em análise', 'Pendente') THEN 'em_analise'
            WHEN s.nome IN ('Em atendimento', 'Em andamento') THEN 'em_andamento'
            WHEN s.nome = 'Resolvido' THEN 'resolvido'
        END,
        o.data_atualizacao
    FROM ocorrencias o
    INNER JOIN status_ocorrencia s ON s.id = o.status_id
) AS etapas
WHERE etapas.etapa IS NOT NULL
GROUP BY
    etapas.usuario_id,
    etapas.ocorrencia_id,
    etapas.etapa;


-- ========================================================================================
-- 4) ACERTO DAS CANCELADAS
-- Cancelada vale 0. Ativa vale tudo o que as etapas pagaram.
-- ========================================================================================

INSERT INTO pontos_historico
    (usuario_id, ocorrencia_id, motivo, pontos, chave_unica, data_criacao)
SELECT
    acerto.usuario_id,
    acerto.ocorrencia_id,
    CASE WHEN acerto.ajuste < 0 THEN 'cancelamento' ELSE 'reabertura' END,
    acerto.ajuste,
    NULL,
    acerto.data_acerto
FROM (
    SELECT
        o.usuario_id,
        o.id AS ocorrencia_id,
        o.data_atualizacao AS data_acerto,
        (
            CASE
                WHEN s.nome = 'Cancelado' THEN 0
                ELSE COALESCE(SUM(CASE WHEN p.chave_unica IS NOT NULL THEN p.pontos ELSE 0 END), 0)
            END
        ) - COALESCE(SUM(p.pontos), 0) AS ajuste
    FROM ocorrencias o
    INNER JOIN status_ocorrencia s ON s.id = o.status_id
    INNER JOIN pontos_historico p ON p.ocorrencia_id = o.id
    GROUP BY
        o.id,
        o.usuario_id,
        o.data_atualizacao,
        s.nome
) AS acerto
WHERE acerto.ajuste <> 0;


-- ========================================================================================
-- 5) SALDO DE CADA USUÁRIO = SOMA DO HISTÓRICO
-- ========================================================================================

UPDATE usuarios u
LEFT JOIN (
    SELECT
        usuario_id,
        SUM(pontos) AS total
    FROM pontos_historico
    GROUP BY usuario_id
) AS p ON p.usuario_id = u.id
SET u.pontos = GREATEST(COALESCE(p.total, 0), 0);


SELECT
    'Títulos e pontos das ocorrências antigas configurados.' AS resultado;
