-- =====================================================================
-- GR EXPRESSO - Migration 004: Cargos, Recrutamento e Progressão
-- =====================================================================

-- 1. Adiciona coluna "cargo" em usuarios (Diretoria, RH, Motorista Novato, Motorista)
ALTER TABLE usuarios
  MODIFY COLUMN tipo ENUM('admin','diretoria','rh','motorista') NOT NULL DEFAULT 'motorista';

-- 2. Adiciona coluna "nivel_motorista" em motoristas (novato → motorista)
ALTER TABLE motoristas
  ADD COLUMN IF NOT EXISTS nivel ENUM('novato','motorista') NOT NULL DEFAULT 'novato';

-- 3. Tabela de solicitações de recrutamento (pré-cadastro)
CREATE TABLE IF NOT EXISTS recrutamentos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(120) NOT NULL,
  apelido       VARCHAR(60),
  discord_user  VARCHAR(80)  NOT NULL,
  idade         TINYINT UNSIGNED,
  experiencia   TEXT,
  como_conheceu VARCHAR(200),
  status        ENUM('pendente','aprovado','rejeitado') NOT NULL DEFAULT 'pendente',
  observacoes   TEXT,
  criado_em     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- índices
CREATE INDEX IF NOT EXISTS idx_recrutamentos_status ON recrutamentos(status);
