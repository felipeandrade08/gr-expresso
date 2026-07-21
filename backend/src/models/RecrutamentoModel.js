// =====================================================================
// FELIPINHO LAUNCHER - Model: Recrutamentos
// =====================================================================

const { pool } = require('../config/database');

const RecrutamentoModel = {
  async listar(filtros = {}) {
    let sql = `SELECT * FROM recrutamentos WHERE 1=1`;
    const params = [];
    if (filtros.status) { sql += ' AND status = ?'; params.push(filtros.status); }
    sql += ' ORDER BY criado_em DESC';
    const [linhas] = await pool.query(sql, params);
    return linhas;
  },

  async buscarPorId(id) {
    const [linhas] = await pool.query('SELECT * FROM recrutamentos WHERE id = ?', [id]);
    return linhas[0] || null;
  },

  async criar(dados) {
    const { nome, apelido, discord_user, idade, experiencia, como_conheceu } = dados;
    const [res] = await pool.query(
      `INSERT INTO recrutamentos (nome, apelido, discord_user, idade, experiencia, como_conheceu)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nome, apelido || null, discord_user, idade || null, experiencia || null, como_conheceu || null]
    );
    return this.buscarPorId(res.insertId);
  },

  async atualizarStatus(id, status, observacoes = null) {
    await pool.query(
      'UPDATE recrutamentos SET status = ?, observacoes = ? WHERE id = ?',
      [status, observacoes, id]
    );
    return this.buscarPorId(id);
  }
};

module.exports = RecrutamentoModel;
