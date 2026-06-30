-- =====================================================================
-- GR EXPRESSO - Migração 004: Multas de trânsito do próprio jogo
--
-- O plugin scs-telemetry expõe o evento "fined" (multa de trânsito
-- aplicada pelo próprio ETS2 — sinal, ultrapassagem em local proibido,
-- excesso de velocidade detectado pelo jogo, etc.), distinto da
-- detecção de velocidade feita pelo backend via heartbeat.
--
-- Esta migração adiciona o tipo 'infracao_transito' ao ENUM da tabela
-- multas_viagem para que o Launcher possa registrar esse evento.
-- =====================================================================

ALTER TABLE multas_viagem
  MODIFY COLUMN tipo ENUM(
    'velocidade',
    'infracao_transito',
    'falta_combustivel',
    'manutencao_fora_base',
    'acidente',
    'cancelamento',
    'dano',
    'manual'
  ) NOT NULL;
