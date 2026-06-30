// =====================================================================
// GR EXPRESSO - Model: Abastecimentos
// =====================================================================

const { pool } = require('../config/database');

const AbastecimentoModel = {
  async listarTodos(filtros = {}) {
    let sql = `
      SELECT a.*, c.placa AS caminhao_placa, m.nome AS motorista_nome, v.codigo AS viagem_codigo
      FROM abastecimentos a
      JOIN caminhoes c ON c.id = a.caminhao_id
      LEFT JOIN motoristas m ON m.id = a.motorista_id
      LEFT JOIN viagens v ON v.id = a.viagem_id
      WHERE 1=1`;
    const params = [];

    if (filtros.caminhao_id) {
      sql += ' AND a.caminhao_id = ?';
      params.push(filtros.caminhao_id);
    }

    if (filtros.data_inicio) {
      sql += ' AND a.data_abastecimento >= ?';
      params.push(filtros.data_inicio);
    }

    if (filtros.data_fim) {
      sql += ' AND a.data_abastecimento <= ?';
      params.push(filtros.data_fim);
    }

    sql += ' ORDER BY a.data_abastecimento DESC';

    const [linhas] = await pool.query(sql, params);
    return linhas;
  },

  async buscarPorId(id) {
    const [linhas] = await pool.query(
      `SELECT a.*, c.placa AS caminhao_placa, m.nome AS motorista_nome
       FROM abastecimentos a
       JOIN caminhoes c ON c.id = a.caminhao_id
       LEFT JOIN motoristas m ON m.id = a.motorista_id
       WHERE a.id = ?`,
      [id]
    );
    return linhas[0] || null;
  },

  async criar(dados) {
    const {
      caminhao_id, motorista_id, viagem_id,
      posto, cidade,
      litros, valor_litro, km_no_momento,
      data_abastecimento, observacoes,
      status = 'ok',
    } = dados;
    const valor_total = Number(litros) * Number(valor_litro);

    const [resultado] = await pool.query(
      `INSERT INTO abastecimentos
        (caminhao_id, motorista_id, viagem_id, posto, cidade, litros, valor_litro, valor_total, km_no_momento, data_abastecimento, observacoes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        caminhao_id, motorista_id || null, viagem_id || null,
        posto || null, cidade || null,
        litros, valor_litro,
        valor_total.toFixed(2), km_no_momento || 0,
        data_abastecimento, observacoes || null,
        status,
      ]
    );

    return this.buscarPorId(resultado.insertId);
  },

  async atualizar(id, dados) {
    const {
      caminhao_id, motorista_id, viagem_id,
      posto, cidade,
      litros, valor_litro, km_no_momento,
      data_abastecimento, observacoes,
      status,
    } = dados;
    const valor_total = Number(litros) * Number(valor_litro);

    await pool.query(
      `UPDATE abastecimentos SET
        caminhao_id = ?, motorista_id = ?, viagem_id = ?,
        posto = ?, cidade = ?,
        litros = ?, valor_litro = ?,
        valor_total = ?, km_no_momento = ?,
        data_abastecimento = ?, observacoes = ?,
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        caminhao_id, motorista_id || null, viagem_id || null,
        posto || null, cidade || null,
        litros, valor_litro,
        valor_total.toFixed(2), km_no_momento || 0,
        data_abastecimento, observacoes || null,
        status || null,
        id,
      ]
    );

    return this.buscarPorId(id);
  },

  /**
   * Lista abastecimentos com status "pendente".
   * Motorista só vê os próprios; admin vê todos.
   */
  async listarPendentes(motorista_id = null) {
    let sql = `
      SELECT a.*, c.placa AS caminhao_placa, m.nome AS motorista_nome
      FROM abastecimentos a
      JOIN caminhoes c ON c.id = a.caminhao_id
      LEFT JOIN motoristas m ON m.id = a.motorista_id
      WHERE a.status = 'pendente'`;
    const params = [];

    if (motorista_id) {
      sql += ' AND a.motorista_id = ?';
      params.push(motorista_id);
    }

    sql += ' ORDER BY a.data_abastecimento DESC';
    const [linhas] = await pool.query(sql, params);
    return linhas;
  },

  /**
   * Motorista resolve o pendente informando posto e cidade.
   * Não altera o status — quem fecha é o admin.
   */
  async resolverPendente(id, { posto, cidade }) {
    await pool.query(
      `UPDATE abastecimentos SET posto = ?, cidade = ? WHERE id = ? AND status = 'pendente'`,
      [posto, cidade, id]
    );
    return this.buscarPorId(id);
  },

  /**
   * Admin regulariza: define status final ('ok') e pode adicionar observação.
   */
  async regularizarPendente(id, { observacoes }) {
    await pool.query(
      `UPDATE abastecimentos SET status = 'ok', observacoes = ? WHERE id = ?`,
      [observacoes || null, id]
    );
    return this.buscarPorId(id);
  },

  async excluir(id) {
    const [resultado] = await pool.query('DELETE FROM abastecimentos WHERE id = ?', [id]);
    return resultado.affectedRows > 0;
  },

  async totalPorMes(meses = 6) {
    const [linhas] = await pool.query(
      `SELECT DATE_FORMAT(data_abastecimento, '%Y-%m') AS mes,
              SUM(valor_total) AS total_gasto, SUM(litros) AS total_litros
       FROM abastecimentos
       WHERE data_abastecimento >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
       GROUP BY mes
       ORDER BY mes ASC`,
      [meses]
    );
    return linhas;
  }
};

module.exports = AbastecimentoModel;
