IF DB_ID(N'Cidade360') IS NULL
BEGIN
    CREATE DATABASE Cidade360;
END;
GO

USE Cidade360;
GO

-- ============================================
-- USUARIOS
-- ============================================

CREATE TABLE dbo.usuarios (
    id BIGINT IDENTITY(1,1) NOT NULL,

    nome NVARCHAR(150) NOT NULL,

    email NVARCHAR(150) NOT NULL,

    telefone NVARCHAR(20) NOT NULL,

    senha_hash NVARCHAR(255) NOT NULL,

    tipo_usuario VARCHAR(20) NOT NULL
        CONSTRAINT DF_usuarios_tipo_usuario DEFAULT 'CIDADAO'
        CONSTRAINT CK_usuarios_tipo_usuario CHECK (tipo_usuario IN ('CIDADAO', 'ADMIN')),

    pontos INT NOT NULL
        CONSTRAINT DF_usuarios_pontos DEFAULT 0,

    ativo BIT NOT NULL
        CONSTRAINT DF_usuarios_ativo DEFAULT 1,

    data_cadastro DATETIME2(0) NOT NULL
        CONSTRAINT DF_usuarios_data_cadastro DEFAULT SYSDATETIME(),

    data_atualizacao DATETIME2(0) NOT NULL
        CONSTRAINT DF_usuarios_data_atualizacao DEFAULT SYSDATETIME(),

    CONSTRAINT PK_usuarios PRIMARY KEY (id),
    CONSTRAINT UQ_usuarios_email UNIQUE (email)
);
GO

CREATE TRIGGER dbo.trg_usuarios_data_atualizacao
ON dbo.usuarios
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE usuarios
    SET data_atualizacao = SYSDATETIME()
    FROM dbo.usuarios AS usuarios
    INNER JOIN inserted AS novos
        ON usuarios.id = novos.id;
END;
GO

-- ============================================
-- CATEGORIAS DE OCORRENCIAS
-- ============================================

CREATE TABLE dbo.categorias_ocorrencia (
    id INT IDENTITY(1,1) NOT NULL,

    nome NVARCHAR(100) NOT NULL,

    descricao NVARCHAR(MAX),

    CONSTRAINT PK_categorias_ocorrencia PRIMARY KEY (id),
    CONSTRAINT UQ_categorias_ocorrencia_nome UNIQUE (nome)
);
GO

-- ============================================
-- STATUS DAS OCORRENCIAS
-- ============================================

CREATE TABLE dbo.status_ocorrencia (
    id INT IDENTITY(1,1) NOT NULL,

    nome NVARCHAR(50) NOT NULL,

    CONSTRAINT PK_status_ocorrencia PRIMARY KEY (id),
    CONSTRAINT UQ_status_ocorrencia_nome UNIQUE (nome)
);
GO

INSERT INTO dbo.status_ocorrencia (nome)
VALUES
    (N'Recebido'),
    (N'Em análise'),
    (N'Em atendimento'),
    (N'Resolvido'),
    (N'Cancelado');
GO

-- ============================================
-- OCORRENCIAS
-- ============================================

CREATE TABLE dbo.ocorrencias (
    id BIGINT IDENTITY(1,1) NOT NULL,

    usuario_id BIGINT NOT NULL,

    categoria_id INT NOT NULL,

    status_id INT NOT NULL,

    titulo NVARCHAR(200) NOT NULL,

    descricao NVARCHAR(MAX) NOT NULL,

    latitude DECIMAL(10,8),

    longitude DECIMAL(11,8),

    endereco NVARCHAR(255),

    bairro NVARCHAR(120),

    cidade NVARCHAR(120),

    data_ocorrencia DATETIME2(0) NOT NULL,

    data_criacao DATETIME2(0) NOT NULL
        CONSTRAINT DF_ocorrencias_data_criacao DEFAULT SYSDATETIME(),

    CONSTRAINT PK_ocorrencias PRIMARY KEY (id),

    CONSTRAINT FK_ocorrencias_usuarios
        FOREIGN KEY (usuario_id)
        REFERENCES dbo.usuarios(id),

    CONSTRAINT FK_ocorrencias_categorias
        FOREIGN KEY (categoria_id)
        REFERENCES dbo.categorias_ocorrencia(id),

    CONSTRAINT FK_ocorrencias_status
        FOREIGN KEY (status_id)
        REFERENCES dbo.status_ocorrencia(id)
);
GO

-- ============================================
-- IMAGENS DAS OCORRENCIAS
-- ============================================

CREATE TABLE dbo.imagens_ocorrencia (
    id BIGINT IDENTITY(1,1) NOT NULL,

    ocorrencia_id BIGINT NOT NULL,

    nome_arquivo NVARCHAR(255) NOT NULL,

    caminho_arquivo NVARCHAR(500) NOT NULL,

    data_upload DATETIME2(0) NOT NULL
        CONSTRAINT DF_imagens_ocorrencia_data_upload DEFAULT SYSDATETIME(),

    CONSTRAINT PK_imagens_ocorrencia PRIMARY KEY (id),

    CONSTRAINT FK_imagens_ocorrencia_ocorrencias
        FOREIGN KEY (ocorrencia_id)
        REFERENCES dbo.ocorrencias(id)
        ON DELETE CASCADE
);
GO
