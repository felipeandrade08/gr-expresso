// =====================================================================
// FELIPINHO LAUNCHER - Controller: Relatórios Avançados
// Combina dados de viagens, despesas, abastecimentos e financeiro
// =====================================================================

const { pool } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso } = require('../utils/respostaPadrao');

const RelatorioController = {
  /**
   * Relatório consolidado de desempenho por motorista em um período.
   */
  desempenhoMotoristas: asyncHandler(async (req, res) => {
    const { data_inicio, data_fim } = req.query;

    let sql = `
      SELECT m.id, m.nome, m.apelido, m.status,
             COUNT(v.id) AS total_viagens,
             COALESCE(SUM(v.distancia_km), 0) AS total_km,
             COALESCE(SUM(v.valor_frete), 0) AS total_faturado,
             COALESCE(AVG(v.distancia_km), 0) AS media_km_viagem
      FROM motoristas m
      LEFT JOIN viagens v ON v.motorista_id = m.id AND v.status = 'concluida'`;
    const params = [];

    if (data_inicio || data_fim) {
      sql += ' WHERE 1=1';
      if (data_inicio) { sql += ' AND v.data_saida >= ?'; params.push(data_inicio); }
      if (data_fim) { sql += ' AND v.data_saida <= ?'; params.push(data_fim); }
    }

    sql += ' GROUP BY m.id ORDER BY total_faturado DESC';

    const [linhas] = await pool.query(sql, params);
    return sucesso(res, linhas);
  }),

  /**
   * Relatório de custo operacional por caminhão (combustível + despesas).
   */
  custoPorCaminhao: asyncHandler(async (req, res) => {
    const { data_inicio, data_fim } = req.query;
    const params = [];
    let filtroData = '';

    if (data_inicio) { filtroData += ' AND data_referencia >= ?'; params.push(data_inicio); }
    if (data_fim) { filtroData += ' AND data_referencia <= ?'; params.push(data_fim); }

    const [linhas] = await pool.query(
      `SELECT c.id, c.placa, c.marca, c.modelo, c.km_atual,
              COALESCE(combustivel.total, 0) AS gasto_combustivel,
              COALESCE(despesas.total, 0) AS gasto_despesas,
              COALESCE(combustivel.total, 0) + COALESCE(despesas.total, 0) AS custo_total
       FROM caminhoes c
       LEFT JOIN (
         SELECT caminhao_id, SUM(valor_total) AS total
         FROM abastecimentos
         GROUP BY caminhao_id
       ) combustivel ON combustivel.caminhao_id = c.id
       LEFT JOIN (
         SELECT caminhao_id, SUM(valor) AS total
         FROM despesas
         GROUP BY caminhao_id
       ) despesas ON despesas.caminhao_id = c.id
       ORDER BY custo_total DESC`,
      []
    );
    return sucesso(res, linhas);
  }),

  /**
   * Relatório de lucratividade geral: faturamento x despesas x combustível, por mês.
   */
  lucratividade: asyncHandler(async (req, res) => {
    const meses = Number(req.query.meses) || 6;

    const [faturamento] = await pool.query(
      `SELECT DATE_FORMAT(data_saida, '%Y-%m') AS mes, COALESCE(SUM(valor_frete), 0) AS valor
       FROM viagens WHERE status = 'concluida' AND data_saida >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
       GROUP BY mes`,
      [meses]
    );

    const [despesas] = await pool.query(
      `SELECT DATE_FORMAT(data_despesa, '%Y-%m') AS mes, COALESCE(SUM(valor), 0) AS valor
       FROM despesas WHERE data_despesa >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
       GROUP BY mes`,
      [meses]
    );

    const [combustivel] = await pool.query(
      `SELECT DATE_FORMAT(data_abastecimento, '%Y-%m') AS mes, COALESCE(SUM(valor_total), 0) AS valor
       FROM abastecimentos WHERE data_abastecimento >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
       GROUP BY mes`,
      [meses]
    );

    const mesesMap = {};
    const addAoMapa = (linhas, chave) => {
      linhas.forEach((l) => {
        if (!mesesMap[l.mes]) mesesMap[l.mes] = { mes: l.mes, faturamento: 0, despesas: 0, combustivel: 0 };
        mesesMap[l.mes][chave] = Number(l.valor);
      });
    };

    addAoMapa(faturamento, 'faturamento');
    addAoMapa(despesas, 'despesas');
    addAoMapa(combustivel, 'combustivel');

    const resultado = Object.values(mesesMap)
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .map((m) => ({ ...m, lucro: m.faturamento - m.despesas - m.combustivel }));

    return sucesso(res, resultado);
  }),

  /**
   * Relatório de rotas mais utilizadas.
   */
  rotasMaisFrequentes: asyncHandler(async (req, res) => {
    const limite = Math.max(1, parseInt(req.query.limite, 10) || 10);
    const [linhas] = await pool.query(
      `SELECT origem, destino, COUNT(*) AS total_viagens,
              COALESCE(SUM(valor_frete), 0) AS faturamento_total,
              COALESCE(AVG(distancia_km), 0) AS distancia_media
       FROM viagens
       WHERE status = 'concluida'
       GROUP BY origem, destino
       ORDER BY total_viagens DESC
       LIMIT ${limite}`
    );
    return sucesso(res, linhas);
  })
};

module.exports = RelatorioController;
