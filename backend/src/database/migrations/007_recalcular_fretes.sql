-- =====================================================================
-- GR EXPRESSO - Migration 007: Recalcular fretes + consumo real
--
-- 1. Atualiza valor_frete de TODAS as viagens usando a fórmula:
--      valor = distancia_km * 8.50 * mult_dificuldade * mult_peso
--
-- 2. Adiciona coluna consumo_medio_real em caminhoes (calculado dos
--    abastecimentos reais — atualizado pelo backend periodicamente).
--
-- Seguro para rodar em produção: não dropa nada.
-- =====================================================================

-- ── 1. Recalcula valor_frete de todas as viagens ────────────────────
-- A lógica SQL espelha calcularFrete() de precificacao.js

UPDATE viagens
SET valor_frete = ROUND(
  distancia_km
  * 8.50
  * CASE dificuldade
      WHEN 'facil'   THEN 1.00
      WHEN 'media'   THEN 1.20
      WHEN 'dificil' THEN 1.50
      WHEN 'extrema' THEN 2.00
      ELSE 1.20
    END
  * CASE
      WHEN peso_carga <= 5  THEN 1.00
      WHEN peso_carga <= 10 THEN 1.10
      WHEN peso_carga <= 20 THEN 1.25
      WHEN peso_carga <= 30 THEN 1.40
      WHEN peso_carga <= 40 THEN 1.55
      ELSE 1.70
    END
, 2)
WHERE distancia_km > 0;

-- Viagens sem distância ficam com valor 0 (sem dados suficientes para calcular)
UPDATE viagens SET valor_frete = 0 WHERE distancia_km = 0 OR distancia_km IS NULL;

-- ── 2. Sincroniza notas fiscais com o novo valor_frete ───────────────
UPDATE notas_fiscais nf
JOIN viagens v ON v.id = nf.viagem_id
SET nf.valor_total = v.valor_frete
WHERE nf.viagem_id IS NOT NULL
  AND v.valor_frete > 0;

-- ── 3. Atualiza total_faturado dos motoristas ────────────────────────
UPDATE motoristas m
SET total_faturado = (
  SELECT COALESCE(SUM(v.valor_frete), 0)
  FROM viagens v
  WHERE v.motorista_id = m.id AND v.status = 'concluida'
);

-- ── 4. Coluna consumo_medio_real em caminhoes ────────────────────────
SET @col_cmr = (
  SELECT COUNT(1) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE table_schema = DATABASE()
    AND table_name = 'caminhoes'
    AND column_name = 'consumo_medio_real'
);
SET @sql_cmr = IF(@col_cmr = 0,
  'ALTER TABLE caminhoes ADD COLUMN consumo_medio_real DECIMAL(6,2) DEFAULT NULL COMMENT "km/L calculado dos abastecimentos reais" AFTER consumo_medio',
  'SELECT 1'
);
PREPARE st FROM @sql_cmr; EXECUTE st; DEALLOCATE PREPARE st;

-- ── 5. Calcula consumo_medio_real imediato para todos os caminhões ───
-- Técnica: diferença de km entre abastecimentos consecutivos / litros
UPDATE caminhoes c
SET consumo_medio_real = (
  SELECT ROUND(
    (MAX(a.km_no_momento) - MIN(a.km_no_momento))
    / NULLIF(SUM(a.litros), 0)
  , 2)
  FROM abastecimentos a
  WHERE a.caminhao_id = c.id
    AND a.km_no_momento > 0
  HAVING COUNT(*) >= 2
)
WHERE EXISTS (
  SELECT 1 FROM abastecimentos WHERE caminhao_id = c.id AND km_no_momento > 0
);

-- ── 6. Tabela para configuração de precificação (admin pode editar) ──
CREATE TABLE IF NOT EXISTS config_precificacao (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  chave    VARCHAR(60) NOT NULL UNIQUE,
  valor    DECIMAL(10,4) NOT NULL,
  descricao VARCHAR(200),
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO config_precificacao (chave, valor, descricao) VALUES
  ('preco_base_km',       8.5000, 'R$ por km rodado (base)'),
  ('mult_facil',          1.0000, 'Multiplicador dificuldade fácil'),
  ('mult_media',          1.2000, 'Multiplicador dificuldade média'),
  ('mult_dificil',        1.5000, 'Multiplicador dificuldade difícil'),
  ('mult_extrema',        2.0000, 'Multiplicador dificuldade extrema'),
  ('mult_peso_0_5t',      1.0000, 'Multiplicador carga 0–5 ton'),
  ('mult_peso_5_10t',     1.1000, 'Multiplicador carga 5–10 ton'),
  ('mult_peso_10_20t',    1.2500, 'Multiplicador carga 10–20 ton'),
  ('mult_peso_20_30t',    1.4000, 'Multiplicador carga 20–30 ton'),
  ('mult_peso_30_40t',    1.5500, 'Multiplicador carga 30–40 ton'),
  ('mult_peso_40t_plus',  1.7000, 'Multiplicador carga acima de 40 ton');
