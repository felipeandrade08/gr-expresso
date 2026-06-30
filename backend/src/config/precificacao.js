// =====================================================================
// GR EXPRESSO - Tabela de Precificação de Frete
//
// O valor do frete é sempre calculado por KM percorrido.
// O Launcher manda o valor em moeda do jogo (EUR) — ignoramos esse
// número e calculamos o preço real baseado nas regras abaixo.
//
// Fórmula:
//   valor = distancia_km * preco_base_por_km
//           * multiplicador_dificuldade
//           * multiplicador_peso
//
// Para alterar os preços, edite apenas este arquivo.
// =====================================================================

const PRECO_BASE_KM = 8.50; // R$ por km rodado

const MULTIPLICADOR_DIFICULDADE = {
  facil:   1.00,
  media:   1.20,
  dificil: 1.50,
  extrema: 2.00,
};

// Faixas de peso da carga (toneladas)
const MULTIPLICADOR_PESO = [
  { ate: 5,   fator: 1.00 },
  { ate: 10,  fator: 1.10 },
  { ate: 20,  fator: 1.25 },
  { ate: 30,  fator: 1.40 },
  { ate: 40,  fator: 1.55 },
  { ate: Infinity, fator: 1.70 },
];

/**
 * Calcula o valor do frete com base nos parâmetros da viagem.
 *
 * @param {number} distancia_km  - Distância total da viagem em km
 * @param {string} dificuldade   - 'facil' | 'media' | 'dificil' | 'extrema'
 * @param {number} peso_carga    - Peso da carga em toneladas (0 = sem carga)
 * @returns {number}             - Valor em R$ arredondado para 2 casas
 */
function calcularFrete(distancia_km, dificuldade = 'media', peso_carga = 0) {
  const km     = Number(distancia_km) || 0;
  const peso   = Number(peso_carga)   || 0;

  if (km <= 0) return 0;

  const multDif  = MULTIPLICADOR_DIFICULDADE[dificuldade] ?? MULTIPLICADOR_DIFICULDADE.media;
  const faixaPeso = MULTIPLICADOR_PESO.find(f => peso <= f.ate);
  const multPeso = faixaPeso ? faixaPeso.fator : 1.70;

  const valor = km * PRECO_BASE_KM * multDif * multPeso;
  return Math.round(valor * 100) / 100;
}

module.exports = { calcularFrete, PRECO_BASE_KM, MULTIPLICADOR_DIFICULDADE, MULTIPLICADOR_PESO };
