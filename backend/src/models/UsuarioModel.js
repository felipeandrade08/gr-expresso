// =====================================================================
// GR EXPRESSO - Model: Usuários (autenticação)
// =====================================================================

const { pool } = require('../config/database');

const UsuarioModel = {
  async buscarPorEmail(email) {
    const [linhas] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    return linhas[0] || null;
  },

  async buscarPorId(id) {
    const [linhas] = await pool.query(
      `SELECT u.*, m.nome AS motorista_nome, m.apelido AS motorista_apelido,
              m.nivel AS motorista_nivel, m.total_km AS motorista_total_km
       FROM usuarios u
       LEFT JOIN motoristas m ON m.id = u.motorista_id
       WHERE u.id = ?`,
      [id]
    );
    return linhas[0] || null;
  },

  async listarPendentes() {
    const [linhas] = await pool.query(
      `SELECT u.id, u.nome, u.email, u.tipo, u.status, u.criado_em, m.nome AS motorista_nome
       FROM usuarios u
       LEFT JOIN motoristas m ON m.id = u.motorista_id
       WHERE u.status = 'pendente'
       ORDER BY u.criado_em ASC`
    );
    return linhas;
  },

  async listarTodos(filtros = {}) {
    let sql = `
      SELECT u.id, u.nome, u.email, u.tipo, u.status, u.ultimo_login, u.criado_em,
             m.nome AS motorista_nome, m.nivel AS motorista_nivel, m.total_km AS motorista_total_km
      FROM usuarios u
      LEFT JOIN motoristas m ON m.id = u.motorista_id
      WHERE 1=1`;
    const params = [];

    if (filtros.status) { sql += ' AND u.status = ?'; params.push(filtros.status); }
    if (filtros.tipo)   { sql += ' AND u.tipo = ?';   params.push(filtros.tipo); }

    sql += ' ORDER BY u.criado_em DESC';

    const [linhas] = await pool.query(sql, params);
    return linhas;
  },

  async criarComMotorista({ nome, email, senhaHash, telefone, cnh, nivel = 'novato' }) {
    const conexao = await pool.getConnection();
    try {
      await conexao.beginTransaction();

      const [resultadoMotorista] = await conexao.query(
        `INSERT INTO motoristas (nome, telefone, cnh, status, nivel) VALUES (?, ?, ?, 'ativo', ?)`,
        [nome, telefone || null, cnh || null, nivel]
      );

      const motoristaId = resultadoMotorista.insertId;

      const [resultadoUsuario] = await conexao.query(
        `INSERT INTO usuarios (nome, email, senha_hash, tipo, status, motorista_id)
         VALUES (?, ?, ?, 'motorista', 'pendente', ?)`,
        [nome, email, senhaHash, motoristaId]
      );

      await conexao.commit();
      return this.buscarPorId(resultadoUsuario.insertId);
    } catch (erro) {
      await conexao.rollback();
      throw erro;
    } finally {
      conexao.release();
    }
  },

  async atualizarStatus(id, status) {
    await pool.query('UPDATE usuarios SET status = ? WHERE id = ?', [status, id]);
    // Se dispensado, bloqueia o motorista vinculado também
    if (status === 'dispensado' || status === 'bloqueado') {
      await pool.query(
        `UPDATE motoristas m
         JOIN usuarios u ON u.motorista_id = m.id
         SET m.status = 'inativo'
         WHERE u.id = ?`,
        [id]
      );
    }
    return this.buscarPorId(id);
  },

  async atualizarCargo(id, tipo) {
    await pool.query('UPDATE usuarios SET tipo = ? WHERE id = ?', [tipo, id]);
  },

  async registrarLogin(id) {
    await pool.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [id]);
  },

  async excluir(id) {
    const [resultado] = await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
    return resultado.affectedRows > 0;
  },

  /**
   * Verifica motoristas novatos que atingiram 10.000 km e promove para "motorista"
   * Deve ser chamado após encerrar viagens
   */
  async verificarProgressaoNovatos() {
    await pool.query(
      `UPDATE motoristas SET nivel = 'motorista'
       WHERE nivel = 'novato' AND total_km >= 10000`
    );
  }
};

module.exports = UsuarioModel;
