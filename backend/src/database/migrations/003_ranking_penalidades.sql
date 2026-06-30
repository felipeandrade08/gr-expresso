-- =====================================================================
-- GR EXPRESSO - Migration 003: Sistema de Penalidades e Bônus no Ranking
-- Cria a tabela multas_viagem (caso ainda não exista) e adiciona a
-- coluna sequencia_viagens_limpas na tabela motoristas.
--
-- Seguro para rodar em produção: usa IF NOT EXISTS / IF NOT EXISTS em tudo.
--
-- Uso:
--   mysql -u SEU_USUARIO -p SEU_BANCO < src/database/migrations/003_ranking_penalidades.sql
-- ou via npm:
--   npm run db:migrate
-- =====================================================================

-- ---------------------------------------------------------------------
-- TABELA: multas_viagem
-- Registra cada infração detectada pelo Launcher ou lançada pelo admin.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS multas_viagem (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  viagem_id         INT NOT NULL,
  motorista_id      INT NOT NULL,
  tipo              ENUM('velocidade','falta_combustivel','manutencao_fora_base','acidente','cancelamento','dano','manual') NOT NULL,
  velocidade_kmh    DECIMAL(6,1)   DEFAULT NULL  COMMENT 'Velocidade no momento da infração (velocidade)',
  duracao_segundos  INT            DEFAULT NULL  COMMENT 'Duração acima do limite (velocidade)',
  descricao         VARCHAR(255)   DEFAULT NULL,
  valor_brl         DECIMAL(10,2)  NOT NULL DEFAULT 0,
  pontos_perdidos   DECIMAL(8,2)   NOT NULL DEFAULT 0,
  origem            ENUM('launcher','admin') NOT NULL DEFAULT 'launcher',
  criado_em         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_multa_viagem    FOREIGN KEY (viagem_id)    REFERENCES viagens(id)    ON DELETE CASCADE,
  CONSTRAINT fk_multa_motorista FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABELA: ranking_eventos
-- Log de todos os eventos de pontuação (ganhos e perdas).
-- Permite auditar cada alteração de pontos do motorista.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ranking_eventos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  motorista_id  INT NOT NULL,
  viagem_id     INT DEFAULT NULL,
  tipo          ENUM('bonus_viagem','bonus_sequencia','penalidade_multa','penalidade_velocidade',
                     'penalidade_cancelamento','penalidade_dano','penalidade_manual') NOT NULL,
  pontos        DECIMAL(10,2) NOT NULL COMMENT 'Positivo = ganho, negativo = perda',
  descricao     VARCHAR(255),
  criado_em     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_evento_motorista FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE CASCADE,
  CONSTRAINT fk_evento_viagem    FOREIGN KEY (viagem_id)    REFERENCES viagens(id)    ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Adiciona coluna sequencia_viagens_limpas na tabela motoristas
-- (conta as viagens consecutivas sem dano, multa, atraso ou cancelamento)
-- ---------------------------------------------------------------------
SET @col_existe = (
  SELECT COUNT(1) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE table_schema = DATABASE()
    AND table_name = 'motoristas'
    AND column_name = 'sequencia_viagens_limpas'
);
SET @sql_col = IF(@col_existe = 0,
  'ALTER TABLE motoristas ADD COLUMN sequencia_viagens_limpas INT NOT NULL DEFAULT 0 AFTER pontuacao_ranking',
  'SELECT 1');
PREPARE stmt FROM @sql_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Índices
SET @idx = (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'multas_viagem' AND index_name = 'idx_multas_motorista');
SET @sql = IF(@idx = 0, 'CREATE INDEX idx_multas_motorista ON multas_viagem(motorista_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'multas_viagem' AND index_name = 'idx_multas_viagem');
SET @sql = IF(@idx = 0, 'CREATE INDEX idx_multas_viagem ON multas_viagem(viagem_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'ranking_eventos' AND index_name = 'idx_eventos_motorista');
SET @sql = IF(@idx = 0, 'CREATE INDEX idx_eventos_motorista ON ranking_eventos(motorista_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
