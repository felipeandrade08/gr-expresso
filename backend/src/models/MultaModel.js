// =====================================================================
// FELIPINHO LAUNCHER - Model: Multas de Viagem
// Registra multas detectadas pelo Launcher (velocidade, cancelamento,
// dano) ou lançadas pelo admin.
// =====================================================================

const { pool } = require('../config/database');

// -----------------------------------------------------------------------
// Tabela central de penalidades financeiras e de ranking por tipo de multa
// -----------------------------------------------------------------------
const CONFIG_MULTA = {
  velocidade:           { valor_brl: 150,  pontos: 5   }, // por evento (30s acima de 100 km/h)
  infracao_transito:    { valor_brl: 150,  pontos: 5   }, // multa do próprio jogo (sinal, ultrapassagem, etc.)
  falta_combustivel:    { valor_brl: 300,  pontos: 15  }, // abasteceu fora da rede credenciada
  manutencao_fora_base: { valor_brl: 500,  pontos: 15  }, // manutenção fora das filiais
  acidente:             { valor_brl: 800,  pontos: 50 }, // spike de dano detectado
  cancelamento:         { valor_brl: 200,  pontos: 25  }, // viagem cancelada pelo motorista
  dano:                 { valor_brl: 400,  pontos: 30  }, // dano acima do threshold na entrega
  manual:               { valor_brl: 0,    pontos: 0   }, // admin define na hora
};

const MultaModel = {
  /**
   * Registra uma multa vinculada a uma viagem.
   * valor_brl e pontos_perdidos podem ser sobrescritos se passados explicitamente.
   */
  async registrar(dados) {
    const {
      viagem_id,
      motorista_id,
      tipo,
      velocidade_kmh   = null,
      duracao_segundos = null,
      descricao        = null,
      valor_brl        = null,
      pontos_perdidos  = null,
      origem           = 'launcher',
    } = dados;

    const config  = CONFIG_MULTA[tipo] || CONFIG_MULTA.manual;
    const valor   = valor_brl       ?? config.valor_brl;
    const pontos  = pontos_perdidos ?? config.pontos;

    const [resultado] = await pool.query(
      `INSERT INTO multas_viagem
        (viagem_id, motorista_id, tipo, velocidade_kmh, duracao_segundos,
         descricao, valor_brl, pontos_perdidos, origem)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [viagem_id, motorista_id, tipo, velocidade_kmh, duracao_segundos,
       descricao, valor, pontos, origem]
    );

    const [linhas] = await pool.query(
      'SELECT * FROM multas_viagem WHERE id = ?',
      [resultado.insertId]
    );
    return linhas[0];
  },

  async listarPorViagem(viagem_id) {
    const [linhas] = await pool.query(
      `SELECT m.*, mo.nome AS motorista_nome
       FROM multas_viagem m
       JOIN motoristas mo ON mo.id = m.motorista_id
       WHERE m.viagem_id = ?
       ORDER BY m.criado_em`,
      [viagem_id]
    );
    return linhas;
  },

  async listarPorMotorista(motorista_id, limite = 50) {
    const limiteSeguro = Math.max(1, parseInt(limite, 10) || 50);
    const [linhas] = await pool.query(
      `SELECT m.*, v.codigo AS viagem_codigo, v.origem, v.destino
       FROM multas_viagem m
       JOIN viagens v ON v.id = m.viagem_id
       WHERE m.motorista_id = ?
       ORDER BY m.criado_em DESC
       LIMIT ${limiteSeguro}`,
      [motorista_id]
    );
    return linhas;
  },

  /**
   * Soma total de pontos e valor financeiro de multas de uma viagem.
   * Usado pelo RankingModel ao fechar a viagem.
   */
  async totaisPorViagem(viagem_id) {
    const [[row]] = await pool.query(
      `SELECT
         COUNT(*)                          AS total_multas,
         COALESCE(SUM(valor_brl), 0)       AS total_valor_brl,
         COALESCE(SUM(pontos_perdidos), 0) AS total_pontos
       FROM multas_viagem
       WHERE viagem_id = ?`,
      [viagem_id]
    );
    return row;
  },
};

module.exports = MultaModel;
module.exports.CONFIG_MULTA = CONFIG_MULTA;
