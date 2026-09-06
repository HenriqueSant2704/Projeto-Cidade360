-- ========================================================================================
-- CIDADE360
-- BANCO DE DADOS MYSQL
-- SCHEMA ATUALIZADO
-- ========================================================================================


CREATE DATABASE IF NOT EXISTS cidade360
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;


USE cidade360;


-- ========================================================================================
-- USUÁRIOS
-- ========================================================================================


CREATE TABLE IF NOT EXISTS usuarios (
    id BIGINT NOT NULL AUTO_INCREMENT,

    nome VARCHAR(150) NOT NULL,

    cpf CHAR(11) NOT NULL,

    email VARCHAR(150) NOT NULL,

    telefone VARCHAR(20) NOT NULL,

    senha_hash VARCHAR(255) NOT NULL,

    tipo_usuario ENUM(
        'CIDADAO',
        'ADMIN'
    ) NOT NULL DEFAULT 'CIDADAO',

    pontos INT UNSIGNED NOT NULL DEFAULT 0,

    ativo TINYINT(1) NOT NULL DEFAULT 1,

    data_cadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uk_usuarios_email (email),

    UNIQUE KEY uk_usuarios_cpf (cpf),

    INDEX idx_usuarios_ativo (ativo),

    INDEX idx_usuarios_tipo_usuario (tipo_usuario)
) ENGINE=InnoDB;


-- ========================================================================================
-- VERIFICAÇÃO DE EMAIL PARA CADASTRO
-- ========================================================================================


CREATE TABLE IF NOT EXISTS email_verificacao_cadastro (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    email VARCHAR(254) NOT NULL,

    codigo_hash VARCHAR(255) NOT NULL,

    codigo_usado TINYINT(1) NOT NULL DEFAULT 0,

    verificado TINYINT(1) NOT NULL DEFAULT 0,

    token_hash VARCHAR(255) NULL,

    expira_em DATETIME NOT NULL,

    token_expira_em DATETIME NULL,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_email_verificacao_email (email),

    INDEX idx_email_verificacao_token (token_hash),

    INDEX idx_email_verificacao_expira (expira_em),

    INDEX idx_email_verificacao_verificado (verificado)
) ENGINE=InnoDB;


-- ========================================================================================
-- RECUPERAÇÃO DE SENHA
-- ========================================================================================


CREATE TABLE IF NOT EXISTS recuperacao_senha (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    usuario_id BIGINT NOT NULL,

    codigo_hash VARCHAR(255) NOT NULL,

    usado TINYINT(1) NOT NULL DEFAULT 0,

    expira_em DATETIME NOT NULL,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_recuperacao_usuario (usuario_id),

    INDEX idx_recuperacao_expira (expira_em),

    INDEX idx_recuperacao_usado (usado),

    CONSTRAINT fk_recuperacao_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ========================================================================================
-- CATEGORIAS DE OCORRÊNCIA
-- ========================================================================================


CREATE TABLE IF NOT EXISTS categorias_ocorrencia (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    nome VARCHAR(100) NOT NULL,

    descricao VARCHAR(500) NULL,

    ativo TINYINT(1) NOT NULL DEFAULT 1,

    PRIMARY KEY (id),

    UNIQUE KEY uk_categoria_nome (nome),

    INDEX idx_categoria_ativo (ativo)
) ENGINE=InnoDB;


-- ========================================================================================
-- CATEGORIAS INICIAIS
-- ========================================================================================


INSERT IGNORE INTO categorias_ocorrencia (
    nome,
    descricao,
    ativo
)
VALUES
(
    'Buraco na Via',
    'Buracos, crateras ou danos no pavimento de vias públicas.',
    1
),
(
    'Iluminação Pública',
    'Postes apagados, lâmpadas queimadas ou problemas relacionados à iluminação pública.',
    1
),
(
    'Lixo Urbano',
    'Acúmulo de lixo, descarte irregular ou problemas relacionados à limpeza urbana.',
    1
),
(
    'Esgoto',
    'Vazamentos, esgoto exposto ou problemas relacionados à rede de esgoto.',
    1
),
(
    'Árvore Caída',
    'Árvores, galhos ou vegetação causando risco ou obstrução de espaços públicos.',
    1
),
(
    'Semáforo',
    'Semáforos apagados, danificados ou apresentando funcionamento irregular.',
    1
),
(
    'Vandalismo',
    'Depredação, dano ou vandalismo contra patrimônio público.',
    1
),
(
    'Manutenção Urbana',
    'Problemas relacionados à manutenção de espaços, vias e equipamentos urbanos.',
    1
),
(
    'Outros',
    'Ocorrências urbanas não classificadas nas demais categorias.',
    1
);


-- ========================================================================================
-- STATUS DAS OCORRÊNCIAS
-- ========================================================================================


CREATE TABLE IF NOT EXISTS status_ocorrencia (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    nome VARCHAR(50) NOT NULL,

    PRIMARY KEY (id),

    UNIQUE KEY uk_status_nome (nome)
) ENGINE=InnoDB;


-- ========================================================================================
-- STATUS INICIAIS
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
-- OCORRÊNCIAS
-- ========================================================================================


CREATE TABLE IF NOT EXISTS ocorrencias (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    usuario_id BIGINT NOT NULL,

    categoria_id INT UNSIGNED NOT NULL,

    status_id INT UNSIGNED NOT NULL,

    titulo VARCHAR(200) NOT NULL,

    descricao TEXT NOT NULL,

    latitude DECIMAL(10,8) NOT NULL,

    longitude DECIMAL(11,8) NOT NULL,

    precisao_localizacao_metros DECIMAL(10,2) NULL,

    endereco VARCHAR(255) NULL,

    bairro VARCHAR(120) NULL,

    cidade VARCHAR(120) NULL,

    data_ocorrencia DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_ocorrencia_usuario (usuario_id),

    INDEX idx_ocorrencia_categoria (categoria_id),

    INDEX idx_ocorrencia_status (status_id),

    INDEX idx_ocorrencia_data_criacao (data_criacao),

    INDEX idx_ocorrencia_data_ocorrencia (data_ocorrencia),

    CONSTRAINT fk_ocorrencia_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_ocorrencia_categoria
        FOREIGN KEY (categoria_id)
        REFERENCES categorias_ocorrencia(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_ocorrencia_status
        FOREIGN KEY (status_id)
        REFERENCES status_ocorrencia(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT chk_ocorrencia_latitude
        CHECK (
            latitude >= -90
            AND latitude <= 90
        ),

    CONSTRAINT chk_ocorrencia_longitude
        CHECK (
            longitude >= -180
            AND longitude <= 180
        ),

    CONSTRAINT chk_ocorrencia_precisao
        CHECK (
            precisao_localizacao_metros IS NULL
            OR precisao_localizacao_metros >= 0
        )
) ENGINE=InnoDB;


-- ========================================================================================
-- IMAGENS DAS OCORRÊNCIAS
-- ========================================================================================


CREATE TABLE IF NOT EXISTS imagens_ocorrencia (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    ocorrencia_id BIGINT UNSIGNED NOT NULL,

    nome_arquivo VARCHAR(255) NOT NULL,

    nome_original VARCHAR(255) NULL,

    caminho_arquivo VARCHAR(500) NOT NULL,

    mime_type VARCHAR(100) NOT NULL,

    tamanho_bytes BIGINT UNSIGNED NOT NULL,

    data_upload TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uk_imagem_nome_arquivo (nome_arquivo),

    INDEX idx_imagem_ocorrencia (ocorrencia_id),

    INDEX idx_imagem_data_upload (data_upload),

    CONSTRAINT fk_imagem_ocorrencia
        FOREIGN KEY (ocorrencia_id)
        REFERENCES ocorrencias(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;


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
-- VALIDAÇÃO DA ESTRUTURA
-- ========================================================================================


SELECT
    'Banco Cidade360 atualizado com sucesso.' AS resultado;


SELECT
    id,
    nome,
    ativo
FROM categorias_ocorrencia
ORDER BY id;


SELECT
    id,
    nome
FROM status_ocorrencia
ORDER BY id;


SHOW TABLES;