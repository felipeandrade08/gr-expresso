// =====================================================================
// GR EXPRESSO - Model: Financeiro
// =====================================================================

const { pool } = require('../config/database');

const FinanceiroModel = {
  async listarTodos(filtros = {}) {
    let sql = 'SELECT * FROM financeiro WHERE 1=1';
    const params = [];

    if (filtros.tipo) {
      sql += ' AND tipo = ?';
      params.push(filtros.tipo);
    }

    if (filtros.data_inicio) {
      sql += ' AND data_lancamento >= ?';
      params.push(filtros.data_inicio);
    }

    if (filtros.data_fim) {
      sql += ' AND data_lancamento <= ?';
      params.push(filtros.data_fim);
    }

    sql += ' ORDER BY data_lancamento DESC';

    const [linhas] = await pool.query(sql, params);
    return linhas;
  },

  async buscarPorId(id) {
    const [linhas] = await pool.query('SELECT * FROM financeiro WHERE id = ?', [id]);
    return linhas[0] || null;
  },

  async criar(dados) {
    const { tipo, categoria, descricao, valor, data_lancamento, referencia_tipo, referencia_id, observacoes } = dados;

    const [resultado] = await pool.query(
      `INSERT INTO financeiro (tipo, categoria, descricao, valor, data_lancamento, referencia_tipo, referencia_id, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tipo, categoria, descricao, valor, data_lancamento, referencia_tipo || 'manual', referencia_id || null, observacoes || null]
    );

    return this.buscarPorId(resultado.insertId);
  },

  async atualizar(id, dados) {
    const { tipo, categoria, descricao, valor, data_lancamento, referencia_tipo, referencia_id, observacoes } = dados;

    await pool.query(
      `UPDATE financeiro SET
        tipo = ?, categoria = ?, descricao = ?, valor = ?, data_lancamento = ?,
        referencia_tipo = ?, referencia_id = ?, observacoes = ?
       WHERE id = ?`,
      [tipo, categoria, descricao, valor, data_lancamento, referencia_tipo || 'manual', referencia_id || null, observacoes || null, id]
    );

    return this.buscarPorId(id);
  },

  async excluir(id) {
    const [resultado] = await pool.query('DELETE FROM financeiro WHERE id = ?', [id]);
    return resultado.affectedRows > 0;
  },

  async resumo(filtros = {}) {
    let sqlEntradas = `SELECT COALESCE(SUM(valor), 0) AS total FROM financeiro WHERE tipo = 'entrada'`;
    let sqlSaidas = `SELECT COALESCE(SUM(valor), 0) AS total FROM financeiro WHERE tipo = 'saida'`;
    const params = [];

    if (filtros.data_inicio) {
      sqlEntradas += ' AND data_lancamento >= ?';
      sqlSaidas += ' AND data_lancamento >= ?';
      params.push(filtros.data_inicio);
    }
    if (filtros.data_fim) {
      sqlEntradas += ' AND data_lancamento <= ?';
      sqlSaidas += ' AND data_lancamento <= ?';
      params.push(filtros.data_fim);
    }

    const [entradas] = await pool.query(sqlEntradas, params);
    const [saidas] = await pool.query(sqlSaidas, params);

    const totalEntradas = Number(entradas[0].total);
    const totalSaidas = Number(saidas[0].total);

    return {
      total_entradas: totalEntradas,
      total_saidas: totalSaidas,
      saldo: totalEntradas - totalSaidas
    };
  },

  async fluxoPorMes(meses = 6) {
    const [linhas] = await pool.query(
      `SELECT DATE_FORMAT(data_lancamento, '%Y-%m') AS mes,
              SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) AS entradas,
              SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END) AS saidas
       FROM financeiro
       WHERE data_lancamento >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
       GROUP BY mes
       ORDER BY mes ASC`,
      [meses]
    );
    return linhas;
  }
};

module.exports = FinanceiroModel;
