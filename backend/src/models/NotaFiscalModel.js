// =====================================================================
// GR EXPRESSO - Model: Notas Fiscais
// =====================================================================

const { pool } = require('../config/database');
const { proximoCodigo } = require('../utils/gerarCodigo');

const NotaFiscalModel = {
  async listarTodos(filtros = {}) {
    let sql = `
      SELECT nf.*,
        v.codigo AS viagem_codigo, v.origem, v.destino, v.motorista_id,
        v.distancia_km, v.peso_carga, v.carga AS viagem_carga,
        m.nome AS motorista_nome,
        c.placa AS caminhao_placa, c.marca AS caminhao_marca, c.modelo AS caminhao_modelo
      FROM notas_fiscais nf
      LEFT JOIN viagens v ON v.id = nf.viagem_id
      LEFT JOIN motoristas m ON m.id = v.motorista_id
      LEFT JOIN caminhoes c ON c.id = v.caminhao_id
      WHERE 1=1`;
    const params = [];

    if (filtros.status) {
      sql += ' AND nf.status = ?';
      params.push(filtros.status);
    }

    if (filtros.busca) {
      sql += ' AND (nf.cliente LIKE ? OR nf.numero LIKE ?)';
      params.push(`%${filtros.busca}%`, `%${filtros.busca}%`);
    }

    sql += ' ORDER BY nf.data_emissao DESC';

    const [linhas] = await pool.query(sql, params);
    return linhas;
  },

  async buscarPorId(id) {
    const [linhas] = await pool.query(
      `SELECT nf.*,
         v.codigo AS viagem_codigo, v.origem, v.destino, v.motorista_id,
         v.distancia_km, v.peso_carga, v.carga AS viagem_carga,
         m.nome AS motorista_nome,
         c.placa AS caminhao_placa, c.marca AS caminhao_marca, c.modelo AS caminhao_modelo
       FROM notas_fiscais nf
       LEFT JOIN viagens v ON v.id = nf.viagem_id
       LEFT JOIN motoristas m ON m.id = v.motorista_id
       LEFT JOIN caminhoes c ON c.id = v.caminhao_id
       WHERE nf.id = ?`,
      [id]
    );
    return linhas[0] || null;
  },

  async obterUltimoNumero() {
    const [linhas] = await pool.query(`SELECT numero FROM notas_fiscais ORDER BY id DESC LIMIT 1`);
    return linhas[0]?.numero || null;
  },

  async buscarPorViagemId(viagemId) {
    const [linhas] = await pool.query('SELECT * FROM notas_fiscais WHERE viagem_id = ? LIMIT 1', [viagemId]);
    return linhas[0] || null;
  },

  async criar(dados) {
    const { viagem_id, cliente, cnpj_cpf, descricao_carga, valor_total, data_emissao, status, arquivo_url, observacoes } = dados;

    const ultimoNumero = await this.obterUltimoNumero();
    const numero = proximoCodigo('NF-', ultimoNumero, 6);

    const [resultado] = await pool.query(
      `INSERT INTO notas_fiscais
        (numero, viagem_id, cliente, cnpj_cpf, descricao_carga, valor_total, data_emissao, status, arquivo_url, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [numero, viagem_id || null, cliente, cnpj_cpf || null, descricao_carga || null,
        valor_total, data_emissao, status || 'pendente', arquivo_url || null, observacoes || null]
    );

    return this.buscarPorId(resultado.insertId);
  },

  async atualizar(id, dados) {
    const { viagem_id, cliente, cnpj_cpf, descricao_carga, valor_total, data_emissao, status, arquivo_url, observacoes } = dados;

    await pool.query(
      `UPDATE notas_fiscais SET
        viagem_id = ?, cliente = ?, cnpj_cpf = ?, descricao_carga = ?, valor_total = ?,
        data_emissao = ?, status = ?, arquivo_url = ?, observacoes = ?
       WHERE id = ?`,
      [viagem_id || null, cliente, cnpj_cpf || null, descricao_carga || null, valor_total,
        data_emissao, status, arquivo_url || null, observacoes || null, id]
    );

    return this.buscarPorId(id);
  },

  async excluir(id) {
    const [resultado] = await pool.query('DELETE FROM notas_fiscais WHERE id = ?', [id]);
    return resultado.affectedRows > 0;
  }
};

module.exports = NotaFiscalModel;
