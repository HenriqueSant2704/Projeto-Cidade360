-- ========================================================================================
-- CIDADE360
-- ADMINISTRADORES: PROMOVER CIDADÃO E CONVIDAR POR E-MAIL
--
-- Execute DEPOIS da 010. Pode rodar de novo sem erro (CREATE TABLE IF NOT EXISTS).
--
-- 1) convites_admin: convites para quem ainda não tem conta.
-- 2) historico_administradores: quem deu ou tirou o acesso de quem, e quando.
--
-- Nada muda na tabela usuarios: ser administrador continua sendo tipo_usuario = 'ADMIN'.
-- Antes desta migração, promover e remover já funcionam (só não ficam no histórico);
-- convidar por e-mail fica indisponível até ela rodar.
-- ========================================================================================


-- ========================================================================================
-- CONVITES DE ADMINISTRADOR
-- Um administrador convida alguém que ainda não tem conta. A pessoa recebe um link
-- por e-mail, cria a própria senha e a conta já nasce como ADMIN.
-- Só o hash do link fica salvo (o link em si só existe no e-mail).
-- ========================================================================================

CREATE TABLE IF NOT EXISTS convites_admin (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,

    token_hash CHAR(64) NOT NULL,

    status ENUM(
        'PENDENTE',
        'ACEITO',
        'CANCELADO'
    ) NOT NULL DEFAULT 'PENDENTE',

    convidado_por BIGINT NULL,

    -- Conta criada quando a pessoa aceita
    usuario_id BIGINT NULL,

    expira_em DATETIME NOT NULL,

    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_resposta DATETIME NULL,

    PRIMARY KEY (id),

    UNIQUE KEY uk_convites_admin_token (token_hash),

    INDEX idx_convites_admin_email (email, status),

    CONSTRAINT fk_convites_admin_convidado_por
        FOREIGN KEY (convidado_por)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_convites_admin_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ========================================================================================
-- HISTÓRICO DE ADMINISTRADORES
-- Quem deu ou tirou o acesso de administrador, de quem e quando.
-- Nome e e-mail ficam copiados para o registro continuar legível mesmo se a conta mudar.
-- ========================================================================================

CREATE TABLE IF NOT EXISTS historico_administradores (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    acao ENUM(
        'PROMOVIDO',
        'REMOVIDO',
        'CONVITE_ENVIADO',
        'CONVITE_REENVIADO',
        'CONVITE_CANCELADO',
        'CONVITE_ACEITO'
    ) NOT NULL,

    usuario_id BIGINT NULL,
    nome_usuario VARCHAR(150) NOT NULL,
    email_usuario VARCHAR(150) NOT NULL,

    feito_por BIGINT NULL,
    nome_feito_por VARCHAR(150) NULL,

    data_acao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_historico_admin_data (data_acao),
    INDEX idx_historico_admin_usuario (usuario_id, acao),

    CONSTRAINT fk_historico_admin_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_historico_admin_feito_por
        FOREIGN KEY (feito_por)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- Conferência: as duas tabelas devem aparecer
SHOW TABLES LIKE '%admin%';
