// =====================================================================
// GR EXPRESSO - Model: Telemetria (integração real com o Launcher ETS2)
// =====================================================================

const { pool } = require('../config/database');

const TelemetriaModel = {
  // -------------------------------------------------------------- //
  //  Caminhão: localizar por placa ou criar automaticamente          //
  // -------------------------------------------------------------- //

  /**
   * Busca um caminhão pela placa. Se não existir, cria um cadastro básico
   * automaticamente (o Launcher é, na prática, quem "descobre" o caminhão
   * em uso dentro do jogo). Campos que o jogo não informa entram com
   * valores padrão e podem ser completados depois pelo admin.
   */
  async buscarOuCriarPorPlaca(placa, dadosExtra = {}) {
    const placaNormalizada = (placa || '').trim().toUpperCase() || 'SEM-PLACA';

    const [existentes] = await pool.query(
      'SELECT * FROM caminhoes WHERE placa = ?',
      [placaNormalizada]
    );
    if (existentes[0]) return existentes[0];

    const {
      marca = 'Desconhecida',
      modelo = 'Desconhecido',
      capacidade_tanque = 0,
      motorista_atual_id = null
    } = dadosExtra;

    const [resultado] = await pool.query(
      `INSERT INTO caminhoes (placa, marca, modelo, capacidade_tanque, motorista_atual_id, observacoes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [placaNormalizada, marca, modelo, capacidade_tanque, motorista_atual_id,
        'Cadastrado automaticamente pelo Launcher GR EXPRESSO (telemetria).']
    );

    const [linhas] = await pool.query('SELECT * FROM caminhoes WHERE id = ?', [resultado.insertId]);
    return linhas[0];
  },

  // -------------------------------------------------------------- //
  //  Heartbeat (status em tempo real)                                //
  // -------------------------------------------------------------- //

  async atualizarHeartbeat(motoristaId, dados) {
    const {
      caminhao_id = null,
      viagem_id = null,
      online = true,
      perfil_jogo = null,
      cidade_atual = null,
      velocidade_kmh = 0,
      rpm = 0,
      marcha = 0,
      nivel_combustivel = 0,
      odometro = 0,
      em_viagem = false
    } = dados;

    await pool.query(
      `INSERT INTO telemetria_status
        (motorista_id, caminhao_id, viagem_id, online, perfil_jogo, cidade_atual,
         velocidade_kmh, rpm, marcha, nivel_combustivel, odometro, em_viagem, ultimo_heartbeat)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
        caminhao_id = VALUES(caminhao_id),
        viagem_id = VALUES(viagem_id),
        online = VALUES(online),
        perfil_jogo = VALUES(perfil_jogo),
        cidade_atual = VALUES(cidade_atual),
        velocidade_kmh = VALUES(velocidade_kmh),
        rpm = VALUES(rpm),
        marcha = VALUES(marcha),
        nivel_combustivel = VALUES(nivel_combustivel),
        odometro = VALUES(odometro),
        em_viagem = VALUES(em_viagem),
        ultimo_heartbeat = NOW()`,
      [motoristaId, caminhao_id, viagem_id, online, perfil_jogo, cidade_atual,
        velocidade_kmh, rpm, marcha, nivel_combustivel, odometro, em_viagem]
    );

    const [linhas] = await pool.query(
      'SELECT * FROM telemetria_status WHERE motorista_id = ?',
      [motoristaId]
    );
    return linhas[0];
  },

  async buscarStatusPorMotorista(motoristaId) {
    const [linhas] = await pool.query(
      `SELECT t.*, c.placa AS caminhao_placa, m.nome AS motorista_nome
       FROM telemetria_status t
       LEFT JOIN caminhoes c ON c.id = t.caminhao_id
       JOIN motoristas m ON m.id = t.motorista_id
       WHERE t.motorista_id = ?`,
      [motoristaId]
    );
    return linhas[0] || null;
  },

  async listarStatusOnline() {
    const [linhas] = await pool.query(
      `SELECT t.*, c.placa AS caminhao_placa, m.nome AS motorista_nome, m.apelido AS motorista_apelido
       FROM telemetria_status t
       LEFT JOIN caminhoes c ON c.id = t.caminhao_id
       JOIN motoristas m ON m.id = t.motorista_id
       WHERE t.online = TRUE
       ORDER BY t.ultimo_heartbeat DESC`
    );
    return linhas;
  },

  async marcarOffline(motoristaId) {
    await pool.query(
      'UPDATE telemetria_status SET online = FALSE WHERE motorista_id = ?',
      [motoristaId]
    );
  },

  // -------------------------------------------------------------- //
  //  Alertas de manutenção                                           //
  // -------------------------------------------------------------- //

  async criarAlertaManutencao(dados) {
    const {
      caminhao_id, motorista_id = null, viagem_id = null,
      componente, nivel_severidade, dano_atual, mensagem = null
    } = dados;

    const [resultado] = await pool.query(
      `INSERT INTO alertas_manutencao
        (caminhao_id, motorista_id, viagem_id, componente, nivel_severidade, dano_atual, mensagem)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [caminhao_id, motorista_id, viagem_id, componente, nivel_severidade, dano_atual, mensagem]
    );

    // Danos severos (>= 20%) colocam o caminhão em manutenção automaticamente.
    if (Number(nivel_severidade) >= 0.20) {
      await pool.query('UPDATE caminhoes SET status = "manutencao" WHERE id = ?', [caminhao_id]);
    }

    const [linhas] = await pool.query('SELECT * FROM alertas_manutencao WHERE id = ?', [resultado.insertId]);
    return linhas[0];
  },

  async listarAlertasAbertos(caminhaoId = null) {
    let sql = `
      SELECT a.*, c.placa AS caminhao_placa, m.nome AS motorista_nome
      FROM alertas_manutencao a
      JOIN caminhoes c ON c.id = a.caminhao_id
      LEFT JOIN motoristas m ON m.id = a.motorista_id
      WHERE a.resolvido = FALSE`;
    const params = [];
    if (caminhaoId) {
      sql += ' AND a.caminhao_id = ?';
      params.push(caminhaoId);
    }
    sql += ' ORDER BY a.criado_em DESC';
    const [linhas] = await pool.query(sql, params);
    return linhas;
  }
};

module.exports = TelemetriaModel;
