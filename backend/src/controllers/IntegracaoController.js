// =====================================================================
// FELIPINHO LAUNCHER - Controller: Integrações (Telemetria ETS2, TrucksBook, Trucky)
// Endpoints preparados para ativação futura dessas integrações
// =====================================================================

const IntegracaoModel = require('../models/IntegracaoModel');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso, naoEncontrado, requisicaoInvalida } = require('../utils/respostaPadrao');

const NOMES_VALIDOS = ['telemetria_ets2', 'trucksbook', 'trucky'];

const IntegracaoController = {
  listar: asyncHandler(async (req, res) => {
    const integracoes = await IntegracaoModel.listarTodas();
    return sucesso(res, integracoes);
  }),

  buscarPorNome: asyncHandler(async (req, res) => {
    const { nome } = req.params;
    if (!NOMES_VALIDOS.includes(nome)) {
      return requisicaoInvalida(res, `Integração inválida. Use uma de: ${NOMES_VALIDOS.join(', ')}.`);
    }

    const integracao = await IntegracaoModel.buscarPorNome(nome);
    if (!integracao) return naoEncontrado(res, 'Integração não encontrada.');
    return sucesso(res, integracao);
  }),

  atualizarConfiguracao: asyncHandler(async (req, res) => {
    const { nome } = req.params;
    if (!NOMES_VALIDOS.includes(nome)) {
      return requisicaoInvalida(res, `Integração inválida. Use uma de: ${NOMES_VALIDOS.join(', ')}.`);
    }

    const integracao = await IntegracaoModel.atualizarConfiguracao(nome, req.body);
    return sucesso(res, integracao, 'Configuração da integração atualizada com sucesso.');
  }),

  /**
   * Placeholder para sincronização manual. Quando as integrações reais
   * forem implementadas, este método deve chamar a API externa
   * (Telemetria ETS2 / TrucksBook / Trucky) e persistir os dados recebidos.
   */
  sincronizar: asyncHandler(async (req, res) => {
    const { nome } = req.params;
    if (!NOMES_VALIDOS.includes(nome)) {
      return requisicaoInvalida(res, `Integração inválida. Use uma de: ${NOMES_VALIDOS.join(', ')}.`);
    }

    const integracao = await IntegracaoModel.buscarPorNome(nome);
    if (!integracao) return naoEncontrado(res, 'Integração não encontrada.');

    if (!integracao.ativa) {
      return requisicaoInvalida(res, 'Esta integração ainda não está ativada. Configure-a antes de sincronizar.');
    }

    // TODO: implementar chamada real à API externa correspondente.
    const atualizado = await IntegracaoModel.registrarSincronizacao(nome, 'conectado');
    return sucesso(res, atualizado, 'Sincronização simulada concluída (integração ainda em desenvolvimento).');
  })
};

module.exports = IntegracaoController;
