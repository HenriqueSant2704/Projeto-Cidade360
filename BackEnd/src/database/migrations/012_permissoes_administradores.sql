-- Atualiza bancos que já executaram a versão antiga da 011.
-- Faça backup antes. Execute depois da 011, uma vez; as alterações de estrutura
-- abaixo podem ser repetidas sem recriar dados ou redefinir permissões existentes.

SET @permissoes_ja_existiam := (
    SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permissoes_admin'
);

CREATE TABLE IF NOT EXISTS permissoes_admin (
    usuario_id BIGINT NOT NULL PRIMARY KEY,
    principal TINYINT(1) NOT NULL DEFAULT 0,
    ocorrencias TINYINT(1) NOT NULL DEFAULT 0,
    avisos TINYINT(1) NOT NULL DEFAULT 0,
    equipe TINYINT(1) NOT NULL DEFAULT 0,
    principal_unico TINYINT GENERATED ALWAYS AS (IF(principal = 1, 1, NULL)) STORED,
    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_permissoes_admin_principal (principal_unico),
    CONSTRAINT fk_permissoes_admin_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Convites antigos mantêm Ocorrências e Avisos. Equipe requer novo convite do principal.
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'convites_admin' AND COLUMN_NAME = 'perm_ocorrencias') = 0,
    'ALTER TABLE convites_admin ADD COLUMN perm_ocorrencias TINYINT(1) NOT NULL DEFAULT 1',
    'SELECT 1'
);
PREPARE migracao FROM @sql; EXECUTE migracao; DEALLOCATE PREPARE migracao;
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'convites_admin' AND COLUMN_NAME = 'perm_avisos') = 0,
    'ALTER TABLE convites_admin ADD COLUMN perm_avisos TINYINT(1) NOT NULL DEFAULT 1',
    'SELECT 1'
);
PREPARE migracao FROM @sql; EXECUTE migracao; DEALLOCATE PREPARE migracao;
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'convites_admin' AND COLUMN_NAME = 'perm_equipe') = 0,
    'ALTER TABLE convites_admin ADD COLUMN perm_equipe TINYINT(1) NOT NULL DEFAULT 0',
    'SELECT 1'
);
PREPARE migracao FROM @sql; EXECUTE migracao; DEALLOCATE PREPARE migracao;
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'historico_administradores' AND COLUMN_NAME = 'detalhe') = 0,
    'ALTER TABLE historico_administradores ADD COLUMN detalhe VARCHAR(255) NULL',
    'SELECT 1'
);
PREPARE migracao FROM @sql; EXECUTE migracao; DEALLOCATE PREPARE migracao;

ALTER TABLE historico_administradores MODIFY COLUMN acao ENUM(
    'PROMOVIDO', 'REMOVIDO', 'CONVITE_ENVIADO', 'CONVITE_REENVIADO',
    'CONVITE_CANCELADO', 'CONVITE_ACEITO', 'PERMISSOES_ALTERADAS',
    'PRINCIPAL_TRANSFERIDO'
) NOT NULL;

ALTER TABLE notificacoes MODIFY COLUMN tipo ENUM(
    'ocorrencia_registrada', 'ocorrencia_nova', 'ocorrencia_status',
    'aviso_novo', 'titulo_novo', 'admin_promovido', 'admin_removido',
    'admin_permissoes', 'admin_principal', 'admin_equipe'
) NOT NULL;

-- Só a primeira execução concede aos administradores atuais o acesso que já tinham.
INSERT IGNORE INTO permissoes_admin (usuario_id, ocorrencias, avisos, equipe)
SELECT id, 1, 1, 1 FROM usuarios
WHERE tipo_usuario = 'ADMIN' AND ativo = 1 AND @permissoes_ja_existiam = 0;

SET @principal_atual := (SELECT usuario_id FROM permissoes_admin WHERE principal = 1 LIMIT 1);
SET @principal_novo := (
    SELECT id FROM usuarios WHERE tipo_usuario = 'ADMIN' AND ativo = 1 ORDER BY id LIMIT 1
);
UPDATE permissoes_admin SET principal = 1
WHERE usuario_id = @principal_novo AND @principal_atual IS NULL AND @permissoes_ja_existiam = 0;

SELECT COUNT(*) AS total_principais FROM permissoes_admin WHERE principal = 1;
SELECT p.usuario_id, p.principal, p.ocorrencias, p.avisos, p.equipe
FROM permissoes_admin p INNER JOIN usuarios u ON u.id = p.usuario_id
WHERE u.tipo_usuario = 'ADMIN' AND u.ativo = 1 ORDER BY p.usuario_id;
