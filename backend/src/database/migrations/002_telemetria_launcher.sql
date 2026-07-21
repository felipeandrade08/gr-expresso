-- =====================================================================
-- FELIPINHO LAUNCHER - Migration 002: Telemetria do Launcher (ETS2)
-- Cria as tabelas usadas pela integração real com o Launcher FELIPINHO LAUNCHER
-- (telemetria_status e alertas_manutencao). Seguro para rodar em bancos
-- que já existem em produção: usa "IF NOT EXISTS" em tudo.
--
-- Uso:
--   mysql -u SEU_USUARIO -p SEU_BANCO < src/database/migrations/002_telemetria_launcher.sql
-- ou, via npm:
--   npm run db:migrate
-- =====================================================================

CREATE TABLE IF NOT EXISTS telemetria_status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  motorista_id INT NOT NULL UNIQUE,
  caminhao_id INT NULL,
  viagem_id INT NULL,
  online BOOLEAN NOT NULL DEFAULT FALSE,
  perfil_jogo VARCHAR(120),
  cidade_atual VARCHAR(120),
  velocidade_kmh DECIMAL(6,1) DEFAULT 0,
  rpm DECIMAL(8,1) DEFAULT 0,
  marcha INT DEFAULT 0,
  nivel_combustivel DECIMAL(5,4) DEFAULT 0 COMMENT '0.0 a 1.0',
  odometro DECIMAL(12,1) DEFAULT 0,
  em_viagem BOOLEAN NOT NULL DEFAULT FALSE,
  ultimo_heartbeat DATETIME NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_telemetria_motorista FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE CASCADE,
  CONSTRAINT fk_telemetria_caminhao FOREIGN KEY (caminhao_id) REFERENCES caminhoes(id) ON DELETE SET NULL,
  CONSTRAINT fk_telemetria_viagem FOREIGN KEY (viagem_id) REFERENCES viagens(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alertas_manutencao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  caminhao_id INT NOT NULL,
  motorista_id INT NULL,
  viagem_id INT NULL,
  componente ENUM('engine', 'chassis', 'cabin', 'wheels') NOT NULL,
  nivel_severidade DECIMAL(4,3) NOT NULL COMMENT '0.05, 0.10, 0.20, 0.50...',
  dano_atual DECIMAL(5,4) NOT NULL,
  mensagem VARCHAR(255),
  resolvido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_alerta_caminhao FOREIGN KEY (caminhao_id) REFERENCES caminhoes(id) ON DELETE CASCADE,
  CONSTRAINT fk_alerta_motorista FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE SET NULL,
  CONSTRAINT fk_alerta_viagem FOREIGN KEY (viagem_id) REFERENCES viagens(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Índices (o MySQL não tem "CREATE INDEX IF NOT EXISTS", então cada um
-- é protegido por um pequeno bloco que verifica se já existe antes de criar).
SET @idx_existe = (
  SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'telemetria_status' AND index_name = 'idx_telemetria_caminhao'
);
SET @sql_idx = IF(@idx_existe = 0,
  'CREATE INDEX idx_telemetria_caminhao ON telemetria_status(caminhao_id)',
  'SELECT 1');
PREPARE stmt FROM @sql_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_existe = (
  SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'alertas_manutencao' AND index_name = 'idx_alertas_caminhao'
);
SET @sql_idx = IF(@idx_existe = 0,
  'CREATE INDEX idx_alertas_caminhao ON alertas_manutencao(caminhao_id)',
  'SELECT 1');
PREPARE stmt FROM @sql_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_existe = (
  SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'alertas_manutencao' AND index_name = 'idx_alertas_resolvido'
);
SET @sql_idx = IF(@idx_existe = 0,
  'CREATE INDEX idx_alertas_resolvido ON alertas_manutencao(resolvido)',
  'SELECT 1');
PREPARE stmt FROM @sql_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
