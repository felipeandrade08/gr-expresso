// =====================================================================
// FELIPINHO LAUNCHER - Model: Integrações (Telemetria ETS2, TrucksBook, Trucky)
// Estrutura preparada para integrações futuras
// =====================================================================

const { pool } = require('../config/database');

const IntegracaoModel = {
  async listarTodas() {
    const [linhas] = await pool.query('SELECT * FROM integracoes ORDER BY nome ASC');
    return linhas;
  },

  async buscarPorNome(nome) {
    const [linhas] = await pool.query('SELECT * FROM integracoes WHERE nome = ?', [nome]);
    return linhas[0] || null;
  },

  async atualizarConfiguracao(nome, dados) {
    const { ativa, url_endpoint, api_key, configuracao_json } = dados;

    await pool.query(
      `UPDATE integracoes SET
        ativa = ?, url_endpoint = ?, api_key = ?, configuracao_json = ?
       WHERE nome = ?`,
      [
        ativa ?? false,
        url_endpoint || null,
        api_key || null,
        configuracao_json ? JSON.stringify(configuracao_json) : null,
        nome
      ]
    );

    return this.buscarPorNome(nome);
  },

  async registrarSincronizacao(nome, statusConexao) {
    await pool.query(
      `UPDATE integracoes SET ultima_sincronizacao = NOW(), status_conexao = ? WHERE nome = ?`,
      [statusConexao, nome]
    );
    return this.buscarPorNome(nome);
  }
};

module.exports = IntegracaoModel;
