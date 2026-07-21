// =====================================================================
// FELIPINHO LAUNCHER - Model: Dashboard (consultas agregadas)
// =====================================================================

const { pool } = require('../config/database');

const DashboardModel = {
  async indicadoresGerais() {
    const [[motoristas]] = await pool.query(`SELECT COUNT(*) AS total FROM motoristas WHERE status = 'ativo'`);
    const [[caminhoes]] = await pool.query(`SELECT COUNT(*) AS total FROM caminhoes`);
    const [[caminhoesDisponiveis]] = await pool.query(`SELECT COUNT(*) AS total FROM caminhoes WHERE status = 'disponivel'`);
    const [[viagensAndamento]] = await pool.query(`SELECT COUNT(*) AS total FROM viagens WHERE status = 'em_andamento'`);
    const [[viagensMes]] = await pool.query(
      `SELECT COUNT(*) AS total FROM viagens WHERE MONTH(data_saida) = MONTH(CURDATE()) AND YEAR(data_saida) = YEAR(CURDATE())`
    );
    const [[faturamentoMes]] = await pool.query(
      `SELECT COALESCE(SUM(valor_frete), 0) AS total FROM viagens
       WHERE status = 'concluida' AND MONTH(data_saida) = MONTH(CURDATE()) AND YEAR(data_saida) = YEAR(CURDATE())`
    );
    const [[despesasMes]] = await pool.query(
      `SELECT COALESCE(SUM(valor), 0) AS total FROM despesas
       WHERE MONTH(data_despesa) = MONTH(CURDATE()) AND YEAR(data_despesa) = YEAR(CURDATE())`
    );
    const [[combustivelMes]] = await pool.query(
      `SELECT COALESCE(SUM(valor_total), 0) AS total FROM abastecimentos
       WHERE MONTH(data_abastecimento) = MONTH(CURDATE()) AND YEAR(data_abastecimento) = YEAR(CURDATE())`
    );
    const [[kmRodadoMes]] = await pool.query(
      `SELECT COALESCE(SUM(distancia_km), 0) AS total FROM viagens
       WHERE status = 'concluida' AND MONTH(data_saida) = MONTH(CURDATE()) AND YEAR(data_saida) = YEAR(CURDATE())`
    );

    return {
      motoristas_ativos: motoristas.total,
      total_caminhoes: caminhoes.total,
      caminhoes_disponiveis: caminhoesDisponiveis.total,
      viagens_em_andamento: viagensAndamento.total,
      viagens_no_mes: viagensMes.total,
      faturamento_mes: Number(faturamentoMes.total),
      despesas_mes: Number(despesasMes.total),
      combustivel_mes: Number(combustivelMes.total),
      km_rodado_mes: Number(kmRodadoMes.total),
      lucro_mes: Number(faturamentoMes.total) - Number(despesasMes.total) - Number(combustivelMes.total)
    };
  },

  async faturamentoPorMes(meses = 6) {
    const [linhas] = await pool.query(
      `SELECT DATE_FORMAT(data_saida, '%Y-%m') AS mes, COALESCE(SUM(valor_frete), 0) AS total
       FROM viagens
       WHERE status = 'concluida' AND data_saida >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
       GROUP BY mes ORDER BY mes ASC`,
      [meses]
    );
    return linhas;
  },

  async viagensPorStatus() {
    const [linhas] = await pool.query(`SELECT status, COUNT(*) AS total FROM viagens GROUP BY status`);
    return linhas;
  },

  async ultimasViagens(limite = 6) {
    const limiteSeguro = Math.max(1, parseInt(limite, 10) || 6);
    const [linhas] = await pool.query(
      `SELECT v.id, v.codigo, v.origem, v.destino, v.status, v.valor_frete, v.data_saida,
              m.nome AS motorista_nome, c.placa AS caminhao_placa
       FROM viagens v
       JOIN motoristas m ON m.id = v.motorista_id
       JOIN caminhoes c ON c.id = v.caminhao_id
       ORDER BY v.data_saida DESC
       LIMIT ${limiteSeguro}`
    );
    return linhas;
  },

  async topMotoristasMes(limite = 5) {
    const limiteSeguro = Math.max(1, parseInt(limite, 10) || 5);
    const [linhas] = await pool.query(
      `SELECT m.id, m.nome, m.apelido, m.foto_url,
              COUNT(v.id) AS viagens,
              COALESCE(SUM(v.distancia_km), 0) AS total_km,
              COALESCE(SUM(v.valor_frete), 0) AS faturado
       FROM motoristas m
       JOIN viagens v ON v.motorista_id = m.id
       WHERE v.status = 'concluida'
         AND MONTH(v.data_saida) = MONTH(CURDATE()) AND YEAR(v.data_saida) = YEAR(CURDATE())
       GROUP BY m.id
       ORDER BY total_km DESC, viagens DESC
       LIMIT ${limiteSeguro}`
    );
    return linhas;
  },

  async alertasFrota() {
    const [manutencao] = await pool.query(
      `SELECT id, placa, marca, modelo FROM caminhoes WHERE status = 'manutencao'`
    );
    const [notasPendentes] = await pool.query(
      `SELECT COUNT(*) AS total FROM notas_fiscais WHERE status = 'pendente'`
    );
    return {
      caminhoes_em_manutencao: manutencao,
      notas_fiscais_pendentes: notasPendentes[0].total
    };
  }
};

module.exports = DashboardModel;
