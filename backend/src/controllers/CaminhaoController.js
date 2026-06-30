// =====================================================================
// GR EXPRESSO - Controller: Caminhões
// =====================================================================

const CaminhaoModel = require('../models/CaminhaoModel');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso, criado, naoEncontrado, requisicaoInvalida } = require('../utils/respostaPadrao');

const CaminhaoController = {
  listar: asyncHandler(async (req, res) => {
    const { status, busca } = req.query;
    const caminhoes = await CaminhaoModel.listarTodos({ status, busca });
    return sucesso(res, caminhoes);
  }),

  buscarPorId: asyncHandler(async (req, res) => {
    const caminhao = await CaminhaoModel.buscarPorId(req.params.id);
    if (!caminhao) return naoEncontrado(res, 'Caminhão não encontrado.');
    return sucesso(res, caminhao);
  }),

  criar: asyncHandler(async (req, res) => {
    const { placa, marca, modelo } = req.body;
    if (!placa || !marca || !modelo) {
      return requisicaoInvalida(res, 'Os campos "placa", "marca" e "modelo" são obrigatórios.');
    }

    const caminhao = await CaminhaoModel.criar(req.body);
    return criado(res, caminhao, 'Caminhão cadastrado com sucesso.');
  }),

  atualizar: asyncHandler(async (req, res) => {
    const existente = await CaminhaoModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Caminhão não encontrado.');

    const caminhao = await CaminhaoModel.atualizar(req.params.id, req.body);
    return sucesso(res, caminhao, 'Caminhão atualizado com sucesso.');
  }),

  excluir: asyncHandler(async (req, res) => {
    const existente = await CaminhaoModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Caminhão não encontrado.');

    await CaminhaoModel.excluir(req.params.id);
    return sucesso(res, null, 'Caminhão excluído com sucesso.');
  }),

  alertasConsumo: asyncHandler(async (req, res) => {
    const alertas = await CaminhaoModel.alertasConsumo();
    return sucesso(res, alertas);
  }),
};

module.exports = CaminhaoController;
