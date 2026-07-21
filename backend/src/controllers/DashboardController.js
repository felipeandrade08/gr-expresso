// =====================================================================
// FELIPINHO LAUNCHER - Controller: Dashboard
// =====================================================================

const DashboardModel = require('../models/DashboardModel');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso } = require('../utils/respostaPadrao');

const DashboardController = {
  indicadores: asyncHandler(async (req, res) => {
    const indicadores = await DashboardModel.indicadoresGerais();
    return sucesso(res, indicadores);
  }),

  faturamentoPorMes: asyncHandler(async (req, res) => {
    const meses = Number(req.query.meses) || 6;
    const dados = await DashboardModel.faturamentoPorMes(meses);
    return sucesso(res, dados);
  }),

  viagensPorStatus: asyncHandler(async (req, res) => {
    const dados = await DashboardModel.viagensPorStatus();
    return sucesso(res, dados);
  }),

  ultimasViagens: asyncHandler(async (req, res) => {
    const limite = Number(req.query.limite) || 6;
    const dados = await DashboardModel.ultimasViagens(limite);
    return sucesso(res, dados);
  }),

  topMotoristas: asyncHandler(async (req, res) => {
    const limite = Number(req.query.limite) || 5;
    const dados = await DashboardModel.topMotoristasMes(limite);
    return sucesso(res, dados);
  }),

  alertas: asyncHandler(async (req, res) => {
    const dados = await DashboardModel.alertasFrota();
    return sucesso(res, dados);
  }),

  resumoCompleto: asyncHandler(async (req, res) => {
    const [indicadores, faturamento, viagensPorStatus, ultimasViagens, topMotoristas, alertas] = await Promise.all([
      DashboardModel.indicadoresGerais(),
      DashboardModel.faturamentoPorMes(6),
      DashboardModel.viagensPorStatus(),
      DashboardModel.ultimasViagens(20),
      DashboardModel.topMotoristasMes(5),
      DashboardModel.alertasFrota()
    ]);

    return sucesso(res, {
      indicadores,
      faturamento_por_mes: faturamento,
      viagens_por_status: viagensPorStatus,
      ultimas_viagens: ultimasViagens,
      top_motoristas: topMotoristas,
      alertas
    });
  })
};

module.exports = DashboardController;
