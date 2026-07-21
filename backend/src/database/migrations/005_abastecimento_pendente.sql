-- =====================================================================
-- FELIPINHO LAUNCHER - Migration 005: Abastecimento Pendente
--
-- Quando o Launcher manda cidade vazia/"Desconhecida" E não manda
-- nome do posto, o abastecimento fica com status "pendente".
-- O motorista é obrigado a preencher posto e cidade antes de continuar.
-- O admin então regulariza: confirma como credenciado ou aplica penalidade.
--
-- Seguro para rodar em produção: usa IF NOT EXISTS em tudo.
-- =====================================================================

-- Coluna status: 'ok' (normal) | 'pendente' (aguarda revisão)
SET @col1 = (
  SELECT COUNT(1) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE table_schema = DATABASE()
    AND table_name   = 'abastecimentos'
    AND column_name  = 'status'
);
SET @sql1 = IF(@col1 = 0,
  "ALTER TABLE abastecimentos ADD COLUMN status ENUM('ok','pendente') NOT NULL DEFAULT 'ok' AFTER observacoes",
  'SELECT 1'
);
PREPARE stmt FROM @sql1; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Coluna cidade: cidade onde ocorreu o abastecimento (vinda do Launcher ou preenchida pelo motorista)
SET @col2 = (
  SELECT COUNT(1) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE table_schema = DATABASE()
    AND table_name   = 'abastecimentos'
    AND column_name  = 'cidade'
);
SET @sql2 = IF(@col2 = 0,
  'ALTER TABLE abastecimentos ADD COLUMN cidade VARCHAR(100) DEFAULT NULL AFTER posto',
  'SELECT 1'
);
PREPARE stmt FROM @sql2; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Índice para facilitar listagem de pendentes pelo admin
SET @idx = (
  SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE table_schema = DATABASE()
    AND table_name   = 'abastecimentos'
    AND index_name   = 'idx_abastecimentos_status'
);
SET @sql3 = IF(@idx = 0,
  'CREATE INDEX idx_abastecimentos_status ON abastecimentos(status)',
  'SELECT 1'
);
PREPARE stmt FROM @sql3; EXECUTE stmt; DEALLOCATE PREPARE stmt;
