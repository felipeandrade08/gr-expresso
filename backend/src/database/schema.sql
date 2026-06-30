-- =====================================================================
-- GR EXPRESSO - Schema do Banco de Dados (MySQL 8+)
-- Transportadora Virtual para Euro Truck Simulator 2
-- =====================================================================

CREATE DATABASE IF NOT EXISTS gr_expresso
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE gr_expresso;

-- ---------------------------------------------------------------------
-- TABELA: motoristas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS motoristas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  apelido VARCHAR(60),
  cnh VARCHAR(30),
  telefone VARCHAR(30),
  email VARCHAR(120),
  steam_id VARCHAR(60),
  data_admissao DATE,
  status ENUM('ativo', 'inativo', 'ferias', 'suspenso') NOT NULL DEFAULT 'ativo',
  foto_url VARCHAR(255),
  observacoes TEXT,
  total_km DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_viagens INT NOT NULL DEFAULT 0,
  total_faturado DECIMAL(14,2) NOT NULL DEFAULT 0,
  pontuacao_ranking DECIMAL(10,2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABELA: usuarios (autenticação e controle de acesso)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  tipo ENUM('admin', 'motorista') NOT NULL DEFAULT 'motorista',
  status ENUM('pendente', 'aprovado', 'rejeitado') NOT NULL DEFAULT 'pendente',
  motorista_id INT NULL,
  ultimo_login DATETIME NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuario_motorista FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABELA: caminhoes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS caminhoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  placa VARCHAR(20) NOT NULL UNIQUE,
  marca VARCHAR(60) NOT NULL,
  modelo VARCHAR(80) NOT NULL,
  ano YEAR,
  cor VARCHAR(40),
  km_atual DECIMAL(12,2) NOT NULL DEFAULT 0,
  capacidade_tanque DECIMAL(8,2) DEFAULT 0,
  consumo_medio DECIMAL(6,2) DEFAULT 0 COMMENT 'km/l',
  status ENUM('disponivel', 'em_viagem', 'manutencao', 'inativo') NOT NULL DEFAULT 'disponivel',
  motorista_atual_id INT NULL,
  valor_aquisicao DECIMAL(14,2) DEFAULT 0,
  foto_url VARCHAR(255),
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_caminhao_motorista FOREIGN KEY (motorista_atual_id) REFERENCES motoristas(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABELA: reboques
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reboques (
  id INT AUTO_INCREMENT PRIMARY KEY,
  placa VARCHAR(20) NOT NULL UNIQUE,
  tipo ENUM('bau', 'graneleiro', 'tanque', 'plataforma', 'frigorifico', 'cacamba', 'outro') NOT NULL DEFAULT 'outro',
  capacidade_carga DECIMAL(10,2) DEFAULT 0 COMMENT 'em toneladas',
  status ENUM('disponivel', 'em_uso', 'manutencao', 'inativo') NOT NULL DEFAULT 'disponivel',
  caminhao_atual_id INT NULL,
  valor_aquisicao DECIMAL(14,2) DEFAULT 0,
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reboque_caminhao FOREIGN KEY (caminhao_atual_id) REFERENCES caminhoes(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABELA: viagens
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS viagens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  motorista_id INT NOT NULL,
  caminhao_id INT NOT NULL,
  reboque_id INT NULL,
  origem VARCHAR(120) NOT NULL,
  destino VARCHAR(120) NOT NULL,
  origem_lat DECIMAL(10,6) NULL,
  origem_lng DECIMAL(10,6) NULL,
  destino_lat DECIMAL(10,6) NULL,
  destino_lng DECIMAL(10,6) NULL,
  carga VARCHAR(120),
  peso_carga DECIMAL(10,2) DEFAULT 0,
  distancia_km DECIMAL(10,2) NOT NULL DEFAULT 0,
  valor_frete DECIMAL(14,2) NOT NULL DEFAULT 0,
  data_saida DATETIME NOT NULL,
  data_chegada DATETIME NULL,
  status ENUM('agendada', 'em_andamento', 'concluida', 'cancelada') NOT NULL DEFAULT 'agendada',
  dificuldade ENUM('facil', 'media', 'dificil', 'extrema') DEFAULT 'media',
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_viagem_motorista FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE RESTRICT,
  CONSTRAINT fk_viagem_caminhao FOREIGN KEY (caminhao_id) REFERENCES caminhoes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_viagem_reboque FOREIGN KEY (reboque_id) REFERENCES reboques(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABELA: abastecimentos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS abastecimentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  caminhao_id INT NOT NULL,
  motorista_id INT NULL,
  viagem_id INT NULL,
  posto VARCHAR(120),
  litros DECIMAL(8,2) NOT NULL,
  valor_litro DECIMAL(8,3) NOT NULL,
  valor_total DECIMAL(12,2) NOT NULL,
  km_no_momento DECIMAL(12,2) DEFAULT 0,
  data_abastecimento DATETIME NOT NULL,
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_abastecimento_caminhao FOREIGN KEY (caminhao_id) REFERENCES caminhoes(id) ON DELETE CASCADE,
  CONSTRAINT fk_abastecimento_motorista FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE SET NULL,
  CONSTRAINT fk_abastecimento_viagem FOREIGN KEY (viagem_id) REFERENCES viagens(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABELA: despesas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS despesas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  categoria ENUM('manutencao', 'pneus', 'multa', 'pedagio', 'seguro', 'salario', 'administrativa', 'outra') NOT NULL DEFAULT 'outra',
  descricao VARCHAR(200) NOT NULL,
  caminhao_id INT NULL,
  reboque_id INT NULL,
  motorista_id INT NULL,
  viagem_id INT NULL,
  valor DECIMAL(14,2) NOT NULL,
  data_despesa DATE NOT NULL,
  forma_pagamento ENUM('dinheiro', 'transferencia', 'cartao', 'outro') DEFAULT 'outro',
  comprovante_url VARCHAR(255),
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_despesa_caminhao FOREIGN KEY (caminhao_id) REFERENCES caminhoes(id) ON DELETE SET NULL,
  CONSTRAINT fk_despesa_reboque FOREIGN KEY (reboque_id) REFERENCES reboques(id) ON DELETE SET NULL,
  CONSTRAINT fk_despesa_motorista FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE SET NULL,
  CONSTRAINT fk_despesa_viagem FOREIGN KEY (viagem_id) REFERENCES viagens(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABELA: notas_fiscais
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notas_fiscais (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(30) NOT NULL UNIQUE,
  viagem_id INT NULL,
  cliente VARCHAR(150) NOT NULL,
  cnpj_cpf VARCHAR(20),
  descricao_carga VARCHAR(200),
  valor_total DECIMAL(14,2) NOT NULL,
  data_emissao DATE NOT NULL,
  status ENUM('emitida', 'paga', 'cancelada', 'pendente') NOT NULL DEFAULT 'pendente',
  arquivo_url VARCHAR(255),
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_nota_viagem FOREIGN KEY (viagem_id) REFERENCES viagens(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABELA: financeiro (lançamentos manuais / consolidados)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financeiro (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('entrada', 'saida') NOT NULL,
  categoria VARCHAR(80) NOT NULL,
  descricao VARCHAR(200) NOT NULL,
  valor DECIMAL(14,2) NOT NULL,
  data_lancamento DATE NOT NULL,
  referencia_tipo ENUM('viagem', 'despesa', 'abastecimento', 'nota_fiscal', 'manual') DEFAULT 'manual',
  referencia_id INT NULL,
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABELA: integracoes (configuração futura: Telemetria, TrucksBook, Trucky)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integracoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome ENUM('telemetria_ets2', 'trucksbook', 'trucky') NOT NULL UNIQUE,
  ativa BOOLEAN NOT NULL DEFAULT FALSE,
  url_endpoint VARCHAR(255),
  api_key VARCHAR(255),
  configuracao_json JSON,
  ultima_sincronizacao DATETIME NULL,
  status_conexao ENUM('conectado', 'desconectado', 'erro') DEFAULT 'desconectado',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABELA: telemetria_status (snapshot mais recente de cada motorista,
-- enviado pelo Launcher GR EXPRESSO via heartbeat em tempo real)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- TABELA: alertas_manutencao (avisos de dano enviados pelo Launcher
-- quando engine/chassis/cabin/wheels atingem um threshold de desgaste)
-- ---------------------------------------------------------------------
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

-- =====================================================================
-- ÍNDICES adicionais para performance
-- =====================================================================
CREATE INDEX idx_viagens_status ON viagens(status);
CREATE INDEX idx_viagens_motorista ON viagens(motorista_id);
CREATE INDEX idx_viagens_data_saida ON viagens(data_saida);
CREATE INDEX idx_abastecimentos_data ON abastecimentos(data_abastecimento);
CREATE INDEX idx_despesas_data ON despesas(data_despesa);
CREATE INDEX idx_despesas_categoria ON despesas(categoria);
CREATE INDEX idx_notas_status ON notas_fiscais(status);
CREATE INDEX idx_financeiro_tipo_data ON financeiro(tipo, data_lancamento);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_status ON usuarios(status);
CREATE INDEX idx_usuarios_tipo ON usuarios(tipo);
CREATE INDEX idx_telemetria_caminhao ON telemetria_status(caminhao_id);
CREATE INDEX idx_alertas_caminhao ON alertas_manutencao(caminhao_id);
CREATE INDEX idx_alertas_resolvido ON alertas_manutencao(resolvido);
