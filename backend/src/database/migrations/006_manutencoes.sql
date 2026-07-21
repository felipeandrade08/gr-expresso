-- =====================================================================
-- FELIPINHO LAUNCHER - Migration 006: Tabela de Manutenções
--
-- Registra cada serviço de oficina feito pelo motorista.
-- Só vale realizar manutenção nas filiais credenciadas:
--   • Catanduva - SP  (Filial SP)
--   • Guapó - GO      (Filial GO)
--
-- Se o motorista fizer manutenção fora dessas cidades →
-- o registro fica "pendente": motorista informa cidade/local,
-- sistema verifica automaticamente; se não for filial, vai para o admin.
-- =====================================================================

CREATE TABLE IF NOT EXISTS manutencoes (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  caminhao_id      INT NOT NULL,
  motorista_id     INT NULL,
  viagem_id        INT NULL,

  -- Localização onde ocorreu a manutenção
  cidade           VARCHAR(100)  DEFAULT NULL,
  local_servico    VARCHAR(150)  DEFAULT NULL   COMMENT 'Nome da oficina/filial',

  -- Dados do serviço (espelha a tela do ETS2)
  tipo             ENUM('reparar','substituir','misto') NOT NULL DEFAULT 'reparar',
  componentes      JSON          DEFAULT NULL   COMMENT 'Array: [{componente, desgaste, dano, acao, custo}]',
  custo_total      DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Controle de credenciamento
  status           ENUM('ok','pendente') NOT NULL DEFAULT 'ok',
  credenciada      BOOLEAN NOT NULL DEFAULT FALSE,
  origem           ENUM('launcher','manual') NOT NULL DEFAULT 'launcher',

  observacoes      TEXT          DEFAULT NULL,
  data_manutencao  DATETIME      NOT NULL,
  criado_em        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_man_caminhao  FOREIGN KEY (caminhao_id)  REFERENCES caminhoes(id)  ON DELETE CASCADE,
  CONSTRAINT fk_man_motorista FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE SET NULL,
  CONSTRAINT fk_man_viagem    FOREIGN KEY (viagem_id)    REFERENCES viagens(id)    ON DELETE SET NULL
) ENGINE=InnoDB;

-- Índices
SET @i1 = (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE table_schema=DATABASE() AND table_name='manutencoes' AND index_name='idx_man_motorista');
SET @s1 = IF(@i1=0,'CREATE INDEX idx_man_motorista ON manutencoes(motorista_id)','SELECT 1');
PREPARE st FROM @s1; EXECUTE st; DEALLOCATE PREPARE st;

SET @i2 = (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE table_schema=DATABASE() AND table_name='manutencoes' AND index_name='idx_man_status');
SET @s2 = IF(@i2=0,'CREATE INDEX idx_man_status ON manutencoes(status)','SELECT 1');
PREPARE st FROM @s2; EXECUTE st; DEALLOCATE PREPARE st;

SET @i3 = (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE table_schema=DATABASE() AND table_name='manutencoes' AND index_name='idx_man_data');
SET @s3 = IF(@i3=0,'CREATE INDEX idx_man_data ON manutencoes(data_manutencao)','SELECT 1');
PREPARE st FROM @s3; EXECUTE st; DEALLOCATE PREPARE st;
