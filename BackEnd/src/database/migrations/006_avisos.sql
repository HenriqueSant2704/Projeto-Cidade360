-- ========================================================================================
-- CIDADE360
-- AVISOS DA PREFEITURA E REAÇÕES DOS CIDADÃOS
-- Execute uma única vez, antes de publicar o código novo do backend.
-- ========================================================================================


-- ========================================================================================
-- AVISOS
-- Publicados por administradores e visíveis para todos os usuários logados.
-- A exclusão é lógica (ativo = 0) para permitir "Desfazer" e manter o histórico.
-- ========================================================================================

CREATE TABLE IF NOT EXISTS avisos (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    categoria ENUM(
        'evento',
        'inauguracao',
        'obras',
        'saude',
        'servicos'
    ) NOT NULL,

    titulo VARCHAR(90) NOT NULL,
    texto TEXT NOT NULL,

    data_evento DATETIME NULL,
    local_evento VARCHAR(150) NULL,

    foto_url VARCHAR(500) NULL,
    foto_public_id VARCHAR(255) NULL,

    fixado TINYINT(1) NOT NULL DEFAULT 0,
    ativo TINYINT(1) NOT NULL DEFAULT 1,

    criado_por BIGINT NOT NULL,
    atualizado_por BIGINT NULL,
    removido_por BIGINT NULL,

    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    data_remocao DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_avisos_listagem (ativo, fixado, data_criacao),
    INDEX idx_avisos_categoria (categoria),

    CONSTRAINT fk_avisos_criado_por
        FOREIGN KEY (criado_por)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE,

    CONSTRAINT fk_avisos_atualizado_por
        FOREIGN KEY (atualizado_por)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_avisos_removido_por
        FOREIGN KEY (removido_por)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ========================================================================================
-- REAÇÕES DOS AVISOS
-- A chave primária (aviso + usuário) garante uma reação por pessoa em cada aviso.
-- A API devolve apenas as quantidades: quem reagiu nunca aparece para ninguém.
-- ========================================================================================

CREATE TABLE IF NOT EXISTS reacoes_aviso (
    aviso_id BIGINT UNSIGNED NOT NULL,
    usuario_id BIGINT NOT NULL,

    reacao ENUM(
        'palmas',
        'amei',
        'comemorar',
        'feliz',
        'uau',
        'obrigado'
    ) NOT NULL,

    data_reacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (aviso_id, usuario_id),

    INDEX idx_reacoes_aviso_contagem (aviso_id, reacao),

    CONSTRAINT fk_reacoes_aviso
        FOREIGN KEY (aviso_id)
        REFERENCES avisos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_reacoes_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;


SELECT
    'Avisos e reações configurados.' AS resultado;
