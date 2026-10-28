-- ========================================================================================
-- CIDADE360
-- CIDADE E ESTADO DO CIDADÃO
--
-- Execute DEPOIS da 009. Pode rodar de novo sem erro: as colunas só são criadas se
-- ainda não existirem, e o preenchimento só mexe em quem está sem cidade.
--
-- 1) usuarios ganha cidade (VARCHAR 120) e uf (CHAR 2), logo depois do telefone.
-- 2) Quem já tinha conta fica com Jaborandi/SP, a única cidade atendida até hoje.
--
-- O cadastro novo já grava a cidade escolhida. Antes desta migração ele continua
-- funcionando (só não grava a cidade), então a ordem "publicar código" e "rodar SQL"
-- não quebra nada.
-- ========================================================================================


-- ========================================================================================
-- 1) COLUNAS
-- ========================================================================================

SET @existe_cidade := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'usuarios'
      AND COLUMN_NAME = 'cidade'
);

SET @sql_cidade := IF(
    @existe_cidade = 0,
    'ALTER TABLE usuarios ADD COLUMN cidade VARCHAR(120) NULL AFTER telefone',
    'SELECT 1'
);

PREPARE etapa FROM @sql_cidade;
EXECUTE etapa;
DEALLOCATE PREPARE etapa;


SET @existe_uf := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'usuarios'
      AND COLUMN_NAME = 'uf'
);

SET @sql_uf := IF(
    @existe_uf = 0,
    'ALTER TABLE usuarios ADD COLUMN uf CHAR(2) NULL AFTER cidade',
    'SELECT 1'
);

PREPARE etapa FROM @sql_uf;
EXECUTE etapa;
DEALLOCATE PREPARE etapa;


-- ========================================================================================
-- 2) CONTAS QUE JÁ EXISTIAM
-- ========================================================================================

UPDATE usuarios
SET
    cidade = 'Jaborandi',
    uf = 'SP'
WHERE tipo_usuario = 'CIDADAO'
  AND (cidade IS NULL OR cidade = '');


-- Conferência: deve mostrar todos os cidadãos em Jaborandi/SP
SELECT cidade, uf, COUNT(*) AS total
FROM usuarios
GROUP BY cidade, uf;
