-- ========================================================================================
-- CIDADE360
-- MIGRAÇÃO MÊS 4
-- VISUALIZAÇÃO E ACOMPANHAMENTO DE STATUS
-- ========================================================================================


-- ========================================================================================
-- STATUS PADRÃO
-- ========================================================================================

INSERT IGNORE INTO status_ocorrencia (
    nome
)
VALUES
(
    'Recebido'
),
(
    'Em análise'
),
(
    'Em atendimento'
),
(
    'Resolvido'
),
(
    'Cancelado'
);


-- ========================================================================================
-- HISTÓRICO DAS OCORRÊNCIAS
-- ========================================================================================

CREATE TABLE IF NOT EXISTS historico_ocorrencia (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    ocorrencia_id BIGINT UNSIGNED NOT NULL,

    status_anterior INT UNSIGNED NULL,

    status_novo INT UNSIGNED NOT NULL,

    usuario_responsavel BIGINT NULL,

    observacao TEXT NULL,

    data_alteracao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_historico_ocorrencia (ocorrencia_id),

    INDEX idx_historico_status_anterior (status_anterior),

    INDEX idx_historico_status_novo (status_novo),

    INDEX idx_historico_usuario_responsavel (usuario_responsavel),

    INDEX idx_historico_data_alteracao (data_alteracao),

    CONSTRAINT fk_historico_ocorrencia
        FOREIGN KEY (ocorrencia_id)
        REFERENCES ocorrencias(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_historico_status_anterior
        FOREIGN KEY (status_anterior)
        REFERENCES status_ocorrencia(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_historico_status_novo
        FOREIGN KEY (status_novo)
        REFERENCES status_ocorrencia(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_historico_usuario
        FOREIGN KEY (usuario_responsavel)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ========================================================================================
-- HISTÓRICO INICIAL PARA OCORRÊNCIAS ANTIGAS
--
-- Cria uma entrada apenas para ocorrências que ainda não possuem histórico.
-- Isso evita duplicidade caso o script seja executado mais de uma vez.
-- ========================================================================================

INSERT INTO historico_ocorrencia (
    ocorrencia_id,
    status_anterior,
    status_novo,
    usuario_responsavel,
    observacao
)
SELECT
    o.id,
    NULL,
    o.status_id,
    o.usuario_id,
    'Histórico inicial criado durante a implantação do acompanhamento de status.'
FROM ocorrencias o
WHERE NOT EXISTS (
    SELECT 1
    FROM historico_ocorrencia h
    WHERE h.ocorrencia_id = o.id
);


-- ========================================================================================
-- VALIDAÇÃO
-- ========================================================================================

SELECT
    id,
    nome
FROM status_ocorrencia
ORDER BY id;


SELECT
    COUNT(*) AS total_ocorrencias
FROM ocorrencias;


SELECT
    COUNT(*) AS total_registros_historico
FROM historico_ocorrencia;


SELECT
    'Migração do Mês 4 concluída.' AS resultado;
