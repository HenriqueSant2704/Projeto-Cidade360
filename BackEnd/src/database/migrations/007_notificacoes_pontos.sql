-- ========================================================================================
-- CIDADE360
-- NOTIFICAÇÕES (SININHO) E HISTÓRICO DE PONTOS DO CIDADÃO
-- Execute uma única vez, antes de publicar o código novo do backend.
-- As migrações 004 e 006 (avisos) devem existir no banco.
-- ========================================================================================


-- ========================================================================================
-- NOTIFICAÇÕES
-- Uma linha por destinatário. Aviso novo gera uma linha para cada usuário ativo.
-- Ocorrências e avisos ficam ligados para o sininho abrir o lugar certo.
-- ========================================================================================

CREATE TABLE IF NOT EXISTS notificacoes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    usuario_id BIGINT NOT NULL,

    tipo ENUM(
        'ocorrencia_registrada',
        'ocorrencia_nova',
        'ocorrencia_status',
        'aviso_novo'
    ) NOT NULL,

    -- Chave do status da ocorrência (recebido, em_analise, em_andamento,
    -- resolvido, cancelado). Só define o ícone e a cor no sininho.
    status_chave VARCHAR(20) NULL,

    titulo VARCHAR(120) NOT NULL,
    texto VARCHAR(500) NOT NULL,

    ocorrencia_id BIGINT UNSIGNED NULL,
    aviso_id BIGINT UNSIGNED NULL,

    pontos INT NOT NULL DEFAULT 0,

    lida TINYINT(1) NOT NULL DEFAULT 0,
    data_leitura DATETIME NULL,

    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_notificacoes_usuario (usuario_id, data_criacao),
    INDEX idx_notificacoes_nao_lidas (usuario_id, lida),

    CONSTRAINT fk_notificacoes_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_notificacoes_ocorrencia
        FOREIGN KEY (ocorrencia_id)
        REFERENCES ocorrencias(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_notificacoes_aviso
        FOREIGN KEY (aviso_id)
        REFERENCES avisos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ========================================================================================
-- HISTÓRICO DE PONTOS
-- usuarios.pontos é o saldo; esta tabela explica de onde veio cada ponto.
-- chave_unica impede pagar duas vezes a mesma etapa da mesma ocorrência
-- ("15:registro", "15:em_analise"...). Ajustes de cancelamento e reabertura
-- ficam com chave_unica NULL, porque podem acontecer mais de uma vez.
-- ========================================================================================

CREATE TABLE IF NOT EXISTS pontos_historico (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    usuario_id BIGINT NOT NULL,
    ocorrencia_id BIGINT UNSIGNED NOT NULL,

    motivo ENUM(
        'registro',
        'em_analise',
        'em_andamento',
        'resolvido',
        'cancelamento',
        'reabertura'
    ) NOT NULL,

    pontos INT NOT NULL,

    chave_unica VARCHAR(60) NULL,

    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uk_pontos_etapa (chave_unica),

    INDEX idx_pontos_usuario (usuario_id, data_criacao),
    INDEX idx_pontos_ocorrencia (ocorrencia_id),

    CONSTRAINT fk_pontos_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_pontos_ocorrencia
        FOREIGN KEY (ocorrencia_id)
        REFERENCES ocorrencias(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;


SELECT
    'Notificações e histórico de pontos configurados.' AS resultado;
