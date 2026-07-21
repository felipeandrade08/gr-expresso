// =====================================================================
// FELIPINHO LAUNCHER - Model: Caminhões
// =====================================================================

const { pool } = require('../config/database');

const CaminhaoModel = {
  async listarTodos(filtros = {}) {
    let sql = `
      SELECT c.*, m.nome AS motorista_nome, m.apelido AS motorista_apelido
      FROM caminhoes c
      LEFT JOIN motoristas m ON m.id = c.motorista_atual_id
      WHERE 1=1`;
    const params = [];

    if (filtros.status) {
      sql += ' AND c.status = ?';
      params.push(filtros.status);
    }

    if (filtros.busca) {
      sql += ' AND (c.placa LIKE ? OR c.marca LIKE ? OR c.modelo LIKE ?)';
      params.push(`%${filtros.busca}%`, `%${filtros.busca}%`, `%${filtros.busca}%`);
    }

    sql += ' ORDER BY c.placa ASC';

    const [linhas] = await pool.query(sql, params);
    return linhas;
  },

  async buscarPorId(id) {
    const [linhas] = await pool.query(
      `SELECT c.*, m.nome AS motorista_nome
       FROM caminhoes c
       LEFT JOIN motoristas m ON m.id = c.motorista_atual_id
       WHERE c.id = ?`,
      [id]
    );
    return linhas[0] || null;
  },

  async criar(dados) {
    const {
      placa, marca, modelo, ano, cor, km_atual, capacidade_tanque,
      consumo_medio, status, motorista_atual_id, valor_aquisicao, foto_url, observacoes
    } = dados;

    const [resultado] = await pool.query(
      `INSERT INTO caminhoes
        (placa, marca, modelo, ano, cor, km_atual, capacidade_tanque, consumo_medio,
         status, motorista_atual_id, valor_aquisicao, foto_url, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [placa, marca, modelo, ano || null, cor || null, km_atual || 0, capacidade_tanque || 0,
        consumo_medio || 0, status || 'disponivel', motorista_atual_id || null,
        valor_aquisicao || 0, foto_url || null, observacoes || null]
    );

    return this.buscarPorId(resultado.insertId);
  },

  async atualizar(id, dados) {
    const {
      placa, marca, modelo, ano, cor, km_atual, capacidade_tanque,
      consumo_medio, status, motorista_atual_id, valor_aquisicao, foto_url, observacoes
    } = dados;

    await pool.query(
      `UPDATE caminhoes SET
        placa = ?, marca = ?, modelo = ?, ano = ?, cor = ?, km_atual = ?, capacidade_tanque = ?,
        consumo_medio = ?, status = ?, motorista_atual_id = ?, valor_aquisicao = ?, foto_url = ?, observacoes = ?
       WHERE id = ?`,
      [placa, marca, modelo, ano || null, cor || null, km_atual || 0, capacidade_tanque || 0,
        consumo_medio || 0, status, motorista_atual_id || null, valor_aquisicao || 0,
        foto_url || null, observacoes || null, id]
    );

    return this.buscarPorId(id);
  },

  async excluir(id) {
    const [resultado] = await pool.query('DELETE FROM caminhoes WHERE id = ?', [id]);
    return resultado.affectedRows > 0;
  },

  async contarPorStatus() {
    const [linhas] = await pool.query('SELECT status, COUNT(*) as total FROM caminhoes GROUP BY status');
    return linhas;
  },

  /**
   * Recalcula consumo_medio_real de um caminhão a partir dos abastecimentos.
   * Chamado após cada abastecimento registrado.
   */
  async recalcularConsumo(caminhao_id) {
    const [rows] = await pool.query(
      `SELECT
         (MAX(km_no_momento) - MIN(km_no_momento)) / NULLIF(SUM(litros), 0) AS consumo
       FROM abastecimentos
       WHERE caminhao_id = ? AND km_no_momento > 0
       HAVING COUNT(*) >= 2`,
      [caminhao_id]
    );
    if (rows[0]?.consumo) {
      await pool.query(
        'UPDATE caminhoes SET consumo_medio_real = ROUND(?, 2) WHERE id = ?',
        [rows[0].consumo, caminhao_id]
      );
    }
  },

  /**
   * Lista caminhões com alerta de consumo quando o real está 20%+ abaixo do esperado.
   */
  async alertasConsumo() {
    const [rows] = await pool.query(
      `SELECT id, placa, modelo, consumo_medio, consumo_medio_real,
              ROUND((1 - consumo_medio_real / NULLIF(consumo_medio, 0)) * 100, 1) AS desvio_pct
       FROM caminhoes
       WHERE consumo_medio > 0 AND consumo_medio_real IS NOT NULL
         AND consumo_medio_real < consumo_medio * 0.80
       ORDER BY desvio_pct DESC`
    );
    return rows;
  },
};

module.exports = CaminhaoModel;
