// =====================================================================
// FELIPINHO LAUNCHER - Controller: Ranking (Penalidades e Bônus)
// =====================================================================

const RankingModel  = require('../models/RankingModel');
const MultaModel    = require('../models/MultaModel');
const asyncHandler  = require('../utils/asyncHandler');
const { sucesso, criado, requisicaoInvalida, naoEncontrado } = require('../utils/respostaPadrao');

const RankingController = {
  /**
   * GET /api/motoristas/hall-da-fama
   * Top motoristas nos ÚLTIMOS 30 DIAS (reseta automaticamente)
   */
  hallDaFama: asyncHandler(async (req, res) => {
    const limite = Math.min(Number(req.query.limite) || 5, 20);
    const hall = await RankingModel.hallDaFama(limite);
    return sucesso(res, hall);
  }),

  /**
   * GET /api/motoristas/ranking/:id/eventos
   * Histórico de eventos de pontuação de um motorista.
   */
  historicoEventos: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const limite = Math.min(Number(req.query.limite) || 30, 100);
    const eventos = await RankingModel.historicoEventos(id, limite);
    return sucesso(res, eventos);
  }),

  /**
   * GET /api/motoristas/ranking/:id/multas
   * Lista as multas registradas de um motorista.
   */
  multasMotorista: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const limite = Math.min(Number(req.query.limite) || 50, 200);
    const multas = await MultaModel.listarPorMotorista(id, limite);
    return sucesso(res, multas);
  }),

  /**
   * POST /api/motoristas/:id/multa  [admin]
   * Aplica uma multa manual a um motorista.
   *
   * Body:
   *   viagem_id      : number  (obrigatório)
   *   descricao      : string  (obrigatório)
   *   pontos_perdidos: number  (opcional, padrão = 0)
   *   valor_brl      : number  (opcional, padrão = 0)
   */
  /**
   * DELETE /api/motoristas/ranking  [admin]
   * Zera pontuação, sequências, eventos e multas de TODOS os motoristas.
   */
  zerarRanking: asyncHandler(async (req, res) => {
    await RankingModel.zerarTodos();
    return sucesso(res, null, 'Ranking zerado com sucesso.');
  }),

  /**
   * DELETE /api/motoristas/ranking/:id  [admin]
   * Zera pontuação, sequências, eventos e multas de UM motorista.
   */
  zerarRankingMotorista: asyncHandler(async (req, res) => {
    const { id } = req.params;
    await RankingModel.zerarMotorista(id);
    return sucesso(res, null, 'Ranking do motorista zerado com sucesso.');
  }),

  multaManual: asyncHandler(async (req, res) => {
    const { id: motorista_id } = req.params;
    const { viagem_id, descricao, pontos_perdidos = 0, valor_brl = 0 } = req.body;

    if (!viagem_id || !descricao) {
      return requisicaoInvalida(res, 'Os campos "viagem_id" e "descricao" são obrigatórios.');
    }

    // Registra a multa
    const multa = await MultaModel.registrar({
      viagem_id,
      motorista_id,
      tipo: 'manual',
      descricao,
      pontos_perdidos: Number(pontos_perdidos),
      valor_brl: Number(valor_brl),
      origem: 'admin',
    });

    // Aplica penalidade no ranking se houver pontos
    if (Number(pontos_perdidos) > 0) {
      await RankingModel.registrarEvento({
        motorista_id,
        viagem_id,
        tipo: 'penalidade_manual',
        pontos: -Number(pontos_perdidos),
        descricao: `Multa manual: ${descricao}`,
      });
      await RankingModel.zerarSequencia(motorista_id);
    }

    return criado(res, multa, 'Multa manual registrada com sucesso.');
  }),
  evolucaoMotorista: asyncHandler(async (req, res) => {
    const dias = Number(req.query.dias) || 30;
    const dados = await RankingModel.evolucaoPontuacao(req.params.id, dias);
    return sucesso(res, dados);
  }),

  evolucaoGeral: asyncHandler(async (req, res) => {
    const dias = Number(req.query.dias) || 30;
    const dados = await RankingModel.evolucaoGeral(dias);
    return sucesso(res, dados);
  }),
};

module.exports = RankingController;
