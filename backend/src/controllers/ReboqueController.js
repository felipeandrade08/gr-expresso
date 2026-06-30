// =====================================================================
// GR EXPRESSO - Controller: Reboques
// =====================================================================

const ReboqueModel = require('../models/ReboqueModel');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso, criado, naoEncontrado, requisicaoInvalida } = require('../utils/respostaPadrao');

const ReboqueController = {
  listar: asyncHandler(async (req, res) => {
    const { status, tipo } = req.query;
    const reboques = await ReboqueModel.listarTodos({ status, tipo });
    return sucesso(res, reboques);
  }),

  buscarPorId: asyncHandler(async (req, res) => {
    const reboque = await ReboqueModel.buscarPorId(req.params.id);
    if (!reboque) return naoEncontrado(res, 'Reboque não encontrado.');
    return sucesso(res, reboque);
  }),

  criar: asyncHandler(async (req, res) => {
    const { placa } = req.body;
    if (!placa) return requisicaoInvalida(res, 'O campo "placa" é obrigatório.');

    const reboque = await ReboqueModel.criar(req.body);
    return criado(res, reboque, 'Reboque cadastrado com sucesso.');
  }),

  atualizar: asyncHandler(async (req, res) => {
    const existente = await ReboqueModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Reboque não encontrado.');

    const reboque = await ReboqueModel.atualizar(req.params.id, req.body);
    return sucesso(res, reboque, 'Reboque atualizado com sucesso.');
  }),

  excluir: asyncHandler(async (req, res) => {
    const existente = await ReboqueModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Reboque não encontrado.');

    await ReboqueModel.excluir(req.params.id);
    return sucesso(res, null, 'Reboque excluído com sucesso.');
  })
};

module.exports = ReboqueController;
