// =====================================================================
// FELIPINHO LAUNCHER - Model: Despesas
// =====================================================================

const { pool } = require('../config/database');

const DespesaModel = {
  async listarTodos(filtros = {}) {
    let sql = `
      SELECT d.*, c.placa AS caminhao_placa, r.placa AS reboque_placa,
             m.nome AS motorista_nome, v.codigo AS viagem_codigo
      FROM despesas d
      LEFT JOIN caminhoes c ON c.id = d.caminhao_id
      LEFT JOIN reboques r ON r.id = d.reboque_id
      LEFT JOIN motoristas m ON m.id = d.motorista_id
      LEFT JOIN viagens v ON v.id = d.viagem_id
      WHERE 1=1`;
    const params = [];

    if (filtros.categoria) {
      sql += ' AND d.categoria = ?';
      params.push(filtros.categoria);
    }

    if (filtros.data_inicio) {
      sql += ' AND d.data_despesa >= ?';
      params.push(filtros.data_inicio);
    }

    if (filtros.data_fim) {
      sql += ' AND d.data_despesa <= ?';
      params.push(filtros.data_fim);
    }

    sql += ' ORDER BY d.data_despesa DESC';

    const [linhas] = await pool.query(sql, params);
    return linhas;
  },

  async buscarPorId(id) {
    const [linhas] = await pool.query(
      `SELECT d.*, c.placa AS caminhao_placa, r.placa AS reboque_placa,
              m.nome AS motorista_nome, v.codigo AS viagem_codigo
       FROM despesas d
       LEFT JOIN caminhoes c ON c.id = d.caminhao_id
       LEFT JOIN reboques r ON r.id = d.reboque_id
       LEFT JOIN motoristas m ON m.id = d.motorista_id
       LEFT JOIN viagens v ON v.id = d.viagem_id
       WHERE d.id = ?`,
      [id]
    );
    return linhas[0] || null;
  },

  async criar(dados) {
    const {
      categoria, descricao, caminhao_id, reboque_id, motorista_id, viagem_id,
      valor, data_despesa, forma_pagamento, comprovante_url, observacoes
    } = dados;

    const [resultado] = await pool.query(
      `INSERT INTO despesas
        (categoria, descricao, caminhao_id, reboque_id, motorista_id, viagem_id,
         valor, data_despesa, forma_pagamento, comprovante_url, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [categoria, descricao, caminhao_id || null, reboque_id || null, motorista_id || null,
        viagem_id || null, valor, data_despesa, forma_pagamento || 'outro', comprovante_url || null, observacoes || null]
    );

    return this.buscarPorId(resultado.insertId);
  },

  async atualizar(id, dados) {
    const {
      categoria, descricao, caminhao_id, reboque_id, motorista_id, viagem_id,
      valor, data_despesa, forma_pagamento, comprovante_url, observacoes
    } = dados;

    await pool.query(
      `UPDATE despesas SET
        categoria = ?, descricao = ?, caminhao_id = ?, reboque_id = ?, motorista_id = ?, viagem_id = ?,
        valor = ?, data_despesa = ?, forma_pagamento = ?, comprovante_url = ?, observacoes = ?
       WHERE id = ?`,
      [categoria, descricao, caminhao_id || null, reboque_id || null, motorista_id || null,
        viagem_id || null, valor, data_despesa, forma_pagamento, comprovante_url || null, observacoes || null, id]
    );

    return this.buscarPorId(id);
  },

  async excluir(id) {
    const [resultado] = await pool.query('DELETE FROM despesas WHERE id = ?', [id]);
    return resultado.affectedRows > 0;
  },

  async totalPorCategoria(filtros = {}) {
    let sql = `SELECT categoria, SUM(valor) AS total FROM despesas WHERE 1=1`;
    const params = [];

    if (filtros.data_inicio) {
      sql += ' AND data_despesa >= ?';
      params.push(filtros.data_inicio);
    }
    if (filtros.data_fim) {
      sql += ' AND data_despesa <= ?';
      params.push(filtros.data_fim);
    }

    sql += ' GROUP BY categoria ORDER BY total DESC';

    const [linhas] = await pool.query(sql, params);
    return linhas;
  }
};

module.exports = DespesaModel;
