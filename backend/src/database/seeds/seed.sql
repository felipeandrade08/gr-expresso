-- =====================================================================
-- GR EXPRESSO - Dados de exemplo (seed)
-- Execute após o schema.sql para popular o sistema com dados de teste
-- =====================================================================

USE gr_expresso;

-- ---------------------------------------------------------------------
-- MOTORISTAS
-- ---------------------------------------------------------------------
INSERT INTO motoristas (nome, apelido, cnh, telefone, email, steam_id, data_admissao, status, total_km, total_viagens, total_faturado, pontuacao_ranking) VALUES
('Carlos Eduardo Silva', 'Cadu', 'CNH-001', '(11) 98888-1111', 'cadu@grexpresso.com', 'steam_cadu01', '2024-01-15', 'ativo', 48230.50, 87, 154300.00, 920.5),
('Marina Souza Lima', 'Mari', 'CNH-002', '(21) 97777-2222', 'mari@grexpresso.com', 'steam_mari02', '2024-02-20', 'ativo', 39120.00, 64, 121800.00, 845.0),
('Roberto Almeida', 'Beto', 'CNH-003', '(31) 96666-3333', 'beto@grexpresso.com', 'steam_beto03', '2024-03-10', 'ativo', 51200.75, 95, 178900.00, 980.2),
('Fernanda Costa', 'Fê', 'CNH-004', '(41) 95555-4444', 'fe@grexpresso.com', 'steam_fe04', '2024-04-05', 'ferias', 22300.00, 38, 78200.00, 610.0),
('Lucas Martins', 'Lukinhas', 'CNH-005', '(51) 94444-5555', 'lucas@grexpresso.com', 'steam_lucas05', '2024-05-18', 'ativo', 33500.25, 52, 99500.00, 730.8);

-- ---------------------------------------------------------------------
-- USUARIOS (login do sistema)
-- ---------------------------------------------------------------------
-- Usuario administrador padrao:
--   E-mail: admin@grexpresso.com
--   Senha:  admin123
-- IMPORTANTE: troque essa senha assim que possivel, em um ambiente real.
INSERT INTO usuarios (nome, email, senha_hash, tipo, status) VALUES
('Administrador', 'admin@grexpresso.com', '$2a$10$JBqJiKg2ItB1JmsLjV.bZeXUMqsKvBM.yosygAXhTL.Za3.sKd.OO', 'admin', 'aprovado');

-- ---------------------------------------------------------------------
-- CAMINHÕES
-- ---------------------------------------------------------------------
INSERT INTO caminhoes (placa, marca, modelo, ano, cor, km_atual, capacidade_tanque, consumo_medio, status, motorista_atual_id, valor_aquisicao) VALUES
('GRE1A01', 'Scania', 'R 540 6x2', 2023, 'Verde Escuro', 48230.50, 900.00, 2.8, 'em_viagem', 1, 750000.00),
('GRE1A02', 'Volvo', 'FH 540 6x4', 2023, 'Preto', 39120.00, 800.00, 3.0, 'em_viagem', 2, 720000.00),
('GRE1A03', 'MAN', 'TGX 29.640', 2022, 'Verde Limão', 51200.75, 750.00, 3.2, 'em_viagem', 3, 690000.00),
('GRE1A04', 'Mercedes-Benz', 'Actros 2651', 2024, 'Branco', 22300.00, 850.00, 2.9, 'disponivel', 4, 780000.00),
('GRE1A05', 'DAF', 'XF 540 FTS', 2023, 'Preto', 33500.25, 780.00, 3.1, 'em_viagem', 5, 730000.00),
('GRE1A06', 'Iveco', 'S-Way 570', 2022, 'Verde Escuro', 18000.00, 700.00, 3.3, 'manutencao', NULL, 660000.00);

-- ---------------------------------------------------------------------
-- REBOQUES
-- ---------------------------------------------------------------------
INSERT INTO reboques (placa, tipo, capacidade_carga, status, caminhao_atual_id, valor_aquisicao) VALUES
('GRE2B01', 'bau', 28.00, 'em_uso', 1, 145000.00),
('GRE2B02', 'graneleiro', 32.00, 'em_uso', 2, 135000.00),
('GRE2B03', 'frigorifico', 24.00, 'em_uso', 3, 190000.00),
('GRE2B04', 'plataforma', 30.00, 'disponivel', NULL, 120000.00),
('GRE2B05', 'tanque', 26.00, 'em_uso', 5, 165000.00);

-- ---------------------------------------------------------------------
-- VIAGENS
-- ---------------------------------------------------------------------
INSERT INTO viagens (codigo, motorista_id, caminhao_id, reboque_id, origem, destino, carga, peso_carga, distancia_km, valor_frete, data_saida, data_chegada, status, dificuldade) VALUES
('VG-0001', 1, 1, 1, 'São Paulo - SP', 'Curitiba - PR', 'Equipamentos Eletrônicos', 18.5, 408.00, 4200.00, '2026-06-10 08:00:00', '2026-06-10 18:30:00', 'concluida', 'media'),
('VG-0002', 2, 2, 2, 'Porto Alegre - RS', 'Florianópolis - SC', 'Grãos a Granel', 26.0, 460.00, 3850.00, '2026-06-11 07:15:00', '2026-06-11 17:00:00', 'concluida', 'facil'),
('VG-0003', 3, 3, 3, 'Belo Horizonte - MG', 'Rio de Janeiro - RJ', 'Produtos Refrigerados', 20.0, 434.00, 2900.00, '2026-06-12 09:00:00', '2026-06-12 15:45:00', 'concluida', 'media'),
('VG-0004', 5, 5, 5, 'Salvador - BA', 'Recife - PE', 'Combustível Industrial', 22.0, 680.00, 4100.00, '2026-06-13 06:30:00', NULL, 'em_andamento', 'dificil'),
('VG-0005', 1, 1, 1, 'Curitiba - PR', 'São Paulo - SP', 'Peças Automotivas', 16.0, 408.00, 3700.00, '2026-06-15 10:00:00', NULL, 'em_andamento', 'extrema'),
('VG-0006', 4, 4, 4, 'Goiânia - GO', 'Brasília - DF', 'Mobiliário', 19.5, 209.00, 3950.00, '2026-06-18 08:00:00', NULL, 'agendada', 'media'),
('VG-0007', 2, 2, 2, 'Florianópolis - SC', 'Porto Alegre - RS', 'Materiais de Construção', 28.0, 460.00, 3600.00, '2026-06-19 09:00:00', NULL, 'agendada', 'facil');

-- ---------------------------------------------------------------------
-- ABASTECIMENTOS
-- ---------------------------------------------------------------------
INSERT INTO abastecimentos (caminhao_id, motorista_id, viagem_id, posto, litros, valor_litro, valor_total, km_no_momento, data_abastecimento) VALUES
(1, 1, 1, 'Posto Ipiranga - Régis Bittencourt', 420.00, 6.15, 2583.00, 47600.00, '2026-06-10 07:50:00'),
(2, 2, 2, 'Posto Shell - BR-101', 380.00, 6.05, 2299.00, 38500.00, '2026-06-11 07:00:00'),
(3, 3, 3, 'Posto Petrobras - Fernão Dias', 350.00, 5.95, 2082.50, 50800.00, '2026-06-12 08:45:00'),
(5, 5, 4, 'Posto BR - BR-116 Bahia', 410.00, 6.20, 2542.00, 33100.00, '2026-06-13 06:15:00'),
(1, 1, 5, 'Posto Ipiranga - Curitiba', 400.00, 6.10, 2440.00, 48230.50, '2026-06-15 09:45:00');

-- ---------------------------------------------------------------------
-- DESPESAS
-- ---------------------------------------------------------------------
INSERT INTO despesas (categoria, descricao, caminhao_id, motorista_id, viagem_id, valor, data_despesa, forma_pagamento) VALUES
('manutencao', 'Troca de óleo e filtros - Scania R540', 1, NULL, NULL, 1850.00, '2026-06-05', 'transferencia'),
('pneus', 'Substituição de 2 pneus dianteiros - Volvo FH', 2, NULL, NULL, 3200.00, '2026-06-07', 'transferencia'),
('pedagio', 'Pedágios rota São Paulo-Curitiba', NULL, 1, 1, 245.00, '2026-06-10', 'cartao'),
('seguro', 'Parcela mensal seguro de frota', NULL, NULL, NULL, 4500.00, '2026-06-01', 'transferencia'),
('multa', 'Excesso de velocidade - rota BH-Rio', 3, 3, 3, 280.00, '2026-06-12', 'dinheiro'),
('manutencao', 'Revisão geral - MAN TGX', 6, NULL, NULL, 5600.00, '2026-06-14', 'transferencia'),
('administrativa', 'Taxas administrativas da transportadora', NULL, NULL, NULL, 980.00, '2026-06-15', 'transferencia');

-- ---------------------------------------------------------------------
-- NOTAS FISCAIS
-- ---------------------------------------------------------------------
INSERT INTO notas_fiscais (numero, viagem_id, cliente, cnpj_cpf, descricao_carga, valor_total, data_emissao, status) VALUES
('NF-100001', 1, 'TechSP Indústria Eletrônica Ltda', '12.345.678/0001-90', 'Equipamentos Eletrônicos', 4200.00, '2026-06-10', 'paga'),
('NF-100002', 2, 'AgroSul Comércio de Grãos Ltda', '23.456.789/0001-91', 'Grãos a Granel', 3850.00, '2026-06-11', 'paga'),
('NF-100003', 3, 'FrioMinas Distribuidora Ltda', '34.567.890/0001-92', 'Produtos Refrigerados', 2900.00, '2026-06-12', 'emitida'),
('NF-100004', 4, 'Bahia Energy Combustíveis S.A.', '45.678.901/0001-93', 'Combustível Industrial', 4100.00, '2026-06-13', 'pendente'),
('NF-100005', 5, 'AutoPeças Curitiba Ltda', '56.789.012/0001-94', 'Peças Automotivas', 3700.00, '2026-06-15', 'pendente');

-- ---------------------------------------------------------------------
-- FINANCEIRO (lançamentos consolidados de exemplo)
-- ---------------------------------------------------------------------
INSERT INTO financeiro (tipo, categoria, descricao, valor, data_lancamento, referencia_tipo, referencia_id) VALUES
('entrada', 'Frete', 'Recebimento NF-100001', 4200.00, '2026-06-10', 'nota_fiscal', 1),
('entrada', 'Frete', 'Recebimento NF-100002', 3850.00, '2026-06-11', 'nota_fiscal', 2),
('saida', 'Combustível', 'Abastecimento Scania GRE1A01', 2583.00, '2026-06-10', 'abastecimento', 1),
('saida', 'Manutenção', 'Troca de óleo e filtros', 1850.00, '2026-06-05', 'despesa', 1),
('saida', 'Seguro', 'Parcela mensal seguro de frota', 4500.00, '2026-06-01', 'despesa', 4);

-- ---------------------------------------------------------------------
-- INTEGRAÇÕES (registros base, desativadas por padrão)
-- ---------------------------------------------------------------------
INSERT INTO integracoes (nome, ativa, status_conexao) VALUES
('telemetria_ets2', FALSE, 'desconectado'),
('trucksbook', FALSE, 'desconectado'),
('trucky', FALSE, 'desconectado');
