// =====================================================================
// FELIPINHO LAUNCHER - Model: Manutenções
// =====================================================================

const { pool } = require('../config/database');

const ManutencaoModel = {

  async listarTodas(filtros = {}) {
    let sql = `
      SELECT m.*, c.placa AS caminhao_placa, mo.nome AS motorista_nome, v.codigo AS viagem_codigo
      FROM manutencoes m
      JOIN caminhoes c ON c.id = m.caminhao_id
      LEFT JOIN motoristas mo ON mo.id = m.motorista_id
      LEFT JOIN viagens v ON v.id = m.viagem_id
      WHERE 1=1`;
    const params = [];

    if (filtros.motorista_id) {
      sql += ' AND m.motorista_id = ?';
      params.push(filtros.motorista_id);
    }
    if (filtros.caminhao_id) {
      sql += ' AND m.caminhao_id = ?';
      params.push(filtros.caminhao_id);
    }
    if (filtros.status) {
      sql += ' AND m.status = ?';
      params.push(filtros.status);
    }
    if (filtros.data_inicio) {
      sql += ' AND m.data_manutencao >= ?';
      params.push(filtros.data_inicio);
    }
    if (filtros.data_fim) {
      sql += ' AND m.data_manutencao <= ?';
      params.push(filtros.data_fim);
    }

    sql += ' ORDER BY m.data_manutencao DESC';
    const [linhas] = await pool.query(sql, params);

    return linhas.map(_parseComponentes);
  },

  async buscarPorId(id) {
    const [linhas] = await pool.query(
      `SELECT m.*, c.placa AS caminhao_placa, mo.nome AS motorista_nome
       FROM manutencoes m
       JOIN caminhoes c ON c.id = m.caminhao_id
       LEFT JOIN motoristas mo ON mo.id = m.motorista_id
       WHERE m.id = ?`,
      [id]
    );
    return linhas[0] ? _parseComponentes(linhas[0]) : null;
  },

  async criar(dados) {
    const {
      caminhao_id, motorista_id, viagem_id,
      cidade, local_servico,
      tipo = 'reparar', componentes, custo_total,
      status = 'ok', credenciada = false, origem = 'launcher',
      observacoes, data_manutencao,
    } = dados;

    const [res] = await pool.query(
      `INSERT INTO manutencoes
        (caminhao_id, motorista_id, viagem_id, cidade, local_servico, tipo, componentes,
         custo_total, status, credenciada, origem, observacoes, data_manutencao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        caminhao_id, motorista_id || null, viagem_id || null,
        cidade || null, local_servico || null,
        tipo, componentes ? JSON.stringify(componentes) : null,
        custo_total || 0,
        status, credenciada ? 1 : 0, origem,
        observacoes || null, data_manutencao,
      ]
    );

    return this.buscarPorId(res.insertId);
  },

  async listarPendentes(motorista_id = null) {
    let sql = `
      SELECT m.*, c.placa AS caminhao_placa, mo.nome AS motorista_nome
      FROM manutencoes m
      JOIN caminhoes c ON c.id = m.caminhao_id
      LEFT JOIN motoristas mo ON mo.id = m.motorista_id
      WHERE m.status = 'pendente'`;
    const params = [];
    if (motorista_id) { sql += ' AND m.motorista_id = ?'; params.push(motorista_id); }
    sql += ' ORDER BY m.data_manutencao DESC';
    const [linhas] = await pool.query(sql, params);
    return linhas.map(_parseComponentes);
  },

  /** Motorista preenche cidade + local onde fez a manutenção */
  async resolverPendente(id, { cidade, local_servico }) {
    await pool.query(
      `UPDATE manutencoes SET cidade = ?, local_servico = ? WHERE id = ? AND status = 'pendente'`,
      [cidade, local_servico, id]
    );
    return this.buscarPorId(id);
  },

  /** Admin finaliza: marca ok e registra observação */
  async regularizarPendente(id, { observacoes }) {
    await pool.query(
      `UPDATE manutencoes SET status = 'ok', observacoes = ? WHERE id = ?`,
      [observacoes || null, id]
    );
    return this.buscarPorId(id);
  },

  async totalPorMes(meses = 6) {
    const [linhas] = await pool.query(
      `SELECT DATE_FORMAT(data_manutencao, '%Y-%m') AS mes,
              SUM(custo_total) AS total_gasto,
              COUNT(*) AS total_servicos
       FROM manutencoes
       WHERE data_manutencao >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
       GROUP BY mes
       ORDER BY mes ASC`,
      [meses]
    );
    return linhas;
  },
};

function _parseComponentes(row) {
  if (row.componentes && typeof row.componentes === 'string') {
    try { row.componentes = JSON.parse(row.componentes); } catch (_) { row.componentes = []; }
  }
  return row;
}

module.exports = ManutencaoModel;
