// =====================================================================
// FELIPINHO LAUNCHER - Controller: Despesas
// =====================================================================

const DespesaModel = require('../models/DespesaModel');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso, criado, naoEncontrado, requisicaoInvalida } = require('../utils/respostaPadrao');

const DespesaController = {
  listar: asyncHandler(async (req, res) => {
    const { categoria, data_inicio, data_fim } = req.query;
    const despesas = await DespesaModel.listarTodos({ categoria, data_inicio, data_fim });
    return sucesso(res, despesas);
  }),

  buscarPorId: asyncHandler(async (req, res) => {
    const despesa = await DespesaModel.buscarPorId(req.params.id);
    if (!despesa) return naoEncontrado(res, 'Despesa não encontrada.');
    return sucesso(res, despesa);
  }),

  criar: asyncHandler(async (req, res) => {
    const { categoria, descricao, valor, data_despesa } = req.body;
    if (!categoria || !descricao || !valor || !data_despesa) {
      return requisicaoInvalida(res, 'Os campos "categoria", "descricao", "valor" e "data_despesa" são obrigatórios.');
    }

    const despesa = await DespesaModel.criar(req.body);
    return criado(res, despesa, 'Despesa registrada com sucesso.');
  }),

  atualizar: asyncHandler(async (req, res) => {
    const existente = await DespesaModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Despesa não encontrada.');

    const despesa = await DespesaModel.atualizar(req.params.id, req.body);
    return sucesso(res, despesa, 'Despesa atualizada com sucesso.');
  }),

  excluir: asyncHandler(async (req, res) => {
    const existente = await DespesaModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Despesa não encontrada.');

    await DespesaModel.excluir(req.params.id);
    return sucesso(res, null, 'Despesa excluída com sucesso.');
  }),

  totalPorCategoria: asyncHandler(async (req, res) => {
    const { data_inicio, data_fim } = req.query;
    const dados = await DespesaModel.totalPorCategoria({ data_inicio, data_fim });
    return sucesso(res, dados);
  })
};

module.exports = DespesaController;
