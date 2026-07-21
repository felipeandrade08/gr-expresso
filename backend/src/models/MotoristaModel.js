// =====================================================================
// FELIPINHO LAUNCHER - Model: Motoristas
// =====================================================================

const { pool } = require('../config/database');

const MotoristaModel = {
  async listarTodos(filtros = {}) {
    let sql = 'SELECT * FROM motoristas WHERE 1=1';
    const params = [];

    if (filtros.status) {
      sql += ' AND status = ?';
      params.push(filtros.status);
    }

    if (filtros.busca) {
      sql += ' AND (nome LIKE ? OR apelido LIKE ?)';
      params.push(`%${filtros.busca}%`, `%${filtros.busca}%`);
    }

    sql += ' ORDER BY nome ASC';

    const [linhas] = await pool.query(sql, params);
    return linhas;
  },

  async buscarPorId(id) {
    const [linhas] = await pool.query('SELECT * FROM motoristas WHERE id = ?', [id]);
    return linhas[0] || null;
  },

  async criar(dados) {
    const {
      nome, apelido, cnh, telefone, email, steam_id,
      data_admissao, status, foto_url, observacoes
    } = dados;

    const [resultado] = await pool.query(
      `INSERT INTO motoristas
        (nome, apelido, cnh, telefone, email, steam_id, data_admissao, status, foto_url, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nome, apelido || null, cnh || null, telefone || null, email || null, steam_id || null,
        data_admissao || null, status || 'ativo', foto_url || null, observacoes || null]
    );

    return this.buscarPorId(resultado.insertId);
  },

  async atualizar(id, dados) {
    const {
      nome, apelido, cnh, telefone, email, steam_id,
      data_admissao, status, foto_url, observacoes
    } = dados;

    await pool.query(
      `UPDATE motoristas SET
        nome = ?, apelido = ?, cnh = ?, telefone = ?, email = ?, steam_id = ?,
        data_admissao = ?, status = ?, foto_url = ?, observacoes = ?
       WHERE id = ?`,
      [nome, apelido || null, cnh || null, telefone || null, email || null, steam_id || null,
        data_admissao || null, status, foto_url || null, observacoes || null, id]
    );

    return this.buscarPorId(id);
  },

  async excluir(id) {
    const [resultado] = await pool.query('DELETE FROM motoristas WHERE id = ?', [id]);
    return resultado.affectedRows > 0;
  },

  /**
   * Retorna o ranking completo com dados de multas e sequência.
   * Delega ao RankingModel para manter a lógica centralizada.
   */
  async ranking(limite = 20) {
    const RankingModel = require('./RankingModel');
    return RankingModel.listarRanking(limite);
  },

  /**
   * Atualiza apenas os contadores de km/viagens/faturado a partir do banco.
   * A pontuacao_ranking é gerenciada de forma incremental pelo RankingModel
   * (evento a evento), então NÃO é recalculada aqui para não sobrescrever
   * penalidades já aplicadas.
   */
  async atualizarEstatisticas(id) {
    await pool.query(
      `UPDATE motoristas m
       SET
         total_viagens = (
           SELECT COUNT(*) FROM viagens
           WHERE motorista_id = m.id AND status = 'concluida'
         ),
         total_km = (
           SELECT COALESCE(SUM(distancia_km), 0) FROM viagens
           WHERE motorista_id = m.id AND status = 'concluida'
         ),
         total_faturado = (
           SELECT COALESCE(SUM(valor_frete), 0) FROM viagens
           WHERE motorista_id = m.id AND status = 'concluida'
         )
       WHERE m.id = ?`,
      [id]
    );
    return this.buscarPorId(id);
  },

  async contarPorStatus() {
    const [linhas] = await pool.query(
      `SELECT status, COUNT(*) as total FROM motoristas GROUP BY status`
    );
    return linhas;
  },

  async atualizarFoto(id, foto_url) {
    await pool.query('UPDATE motoristas SET foto_url = ? WHERE id = ?', [foto_url, id]);
    return this.buscarPorId(id);
  }
};

module.exports = MotoristaModel;
