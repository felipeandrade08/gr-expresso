// =====================================================================
// GR EXPRESSO - Controller: Financeiro
// =====================================================================

const FinanceiroModel = require('../models/FinanceiroModel');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso, criado, naoEncontrado, requisicaoInvalida } = require('../utils/respostaPadrao');

const FinanceiroController = {
  listar: asyncHandler(async (req, res) => {
    const { tipo, data_inicio, data_fim } = req.query;
    const lancamentos = await FinanceiroModel.listarTodos({ tipo, data_inicio, data_fim });
    return sucesso(res, lancamentos);
  }),

  buscarPorId: asyncHandler(async (req, res) => {
    const lancamento = await FinanceiroModel.buscarPorId(req.params.id);
    if (!lancamento) return naoEncontrado(res, 'Lançamento não encontrado.');
    return sucesso(res, lancamento);
  }),

  criar: asyncHandler(async (req, res) => {
    const { tipo, categoria, descricao, valor, data_lancamento } = req.body;
    if (!tipo || !categoria || !descricao || !valor || !data_lancamento) {
      return requisicaoInvalida(res, 'Os campos "tipo", "categoria", "descricao", "valor" e "data_lancamento" são obrigatórios.');
    }

    const lancamento = await FinanceiroModel.criar(req.body);
    return criado(res, lancamento, 'Lançamento financeiro registrado com sucesso.');
  }),

  atualizar: asyncHandler(async (req, res) => {
    const existente = await FinanceiroModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Lançamento não encontrado.');

    const lancamento = await FinanceiroModel.atualizar(req.params.id, req.body);
    return sucesso(res, lancamento, 'Lançamento atualizado com sucesso.');
  }),

  excluir: asyncHandler(async (req, res) => {
    const existente = await FinanceiroModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Lançamento não encontrado.');

    await FinanceiroModel.excluir(req.params.id);
    return sucesso(res, null, 'Lançamento excluído com sucesso.');
  }),

  resumo: asyncHandler(async (req, res) => {
    const { data_inicio, data_fim } = req.query;
    const resumo = await FinanceiroModel.resumo({ data_inicio, data_fim });
    return sucesso(res, resumo);
  }),

  fluxoPorMes: asyncHandler(async (req, res) => {
    const meses = Number(req.query.meses) || 6;
    const fluxo = await FinanceiroModel.fluxoPorMes(meses);
    return sucesso(res, fluxo);
  })
};

module.exports = FinanceiroController;
