-- ========================================================================================
-- CIDADE360
-- E-MAILS DE ATUALIZAÇÃO DAS OCORRÊNCIAS
-- Execute uma única vez, antes de publicar o código novo do backend.
-- A migração 004 e a tabela historico_ocorrencia devem existir no banco.
-- ========================================================================================


-- ========================================================================================
-- CONTROLE DOS ENVIOS
-- O padrão inicial ignora o histórico antigo para evitar e-mails retroativos.
-- ========================================================================================

ALTER TABLE historico_ocorrencia
    ADD COLUMN email_situacao
        ENUM('ignorado', 'pendente', 'processando', 'enviado')
        NOT NULL DEFAULT 'ignorado',

    ADD COLUMN email_tentativas
        INT UNSIGNED NOT NULL DEFAULT 0,

    ADD COLUMN email_proxima_tentativa
        DATETIME NULL,

    ADD COLUMN email_bloqueado_ate
        DATETIME NULL,

    ADD COLUMN email_token
        VARCHAR(36) NULL,

    ADD COLUMN email_enviado_em
        DATETIME NULL,

    ADD COLUMN email_message_id
        VARCHAR(255) NULL,

    ADD COLUMN email_ultimo_erro
        VARCHAR(1000) NULL,

    ADD INDEX idx_historico_email_fila (
        email_situacao,
        email_proxima_tentativa,
        email_bloqueado_ate
    );


-- ========================================================================================
-- NOVAS ALTERAÇÕES GERAM AVISOS PENDENTES
-- O cadastro inicial, sem status anterior, é ignorado pelo serviço de e-mail.
-- ========================================================================================

ALTER TABLE historico_ocorrencia
    ALTER COLUMN email_situacao
        SET DEFAULT 'pendente';


SELECT
    'E-mails das ocorrências configurados.' AS resultado;