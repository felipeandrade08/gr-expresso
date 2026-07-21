// =====================================================================
// FELIPINHO LAUNCHER - Controller: Motoristas
// =====================================================================

const MotoristaModel = require('../models/MotoristaModel');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso, criado, naoEncontrado, requisicaoInvalida } = require('../utils/respostaPadrao');

const MotoristaController = {
  listar: asyncHandler(async (req, res) => {
    const { status, busca } = req.query;
    const motoristas = await MotoristaModel.listarTodos({ status, busca });
    return sucesso(res, motoristas);
  }),

  buscarPorId: asyncHandler(async (req, res) => {
    const motorista = await MotoristaModel.buscarPorId(req.params.id);
    if (!motorista) return naoEncontrado(res, 'Motorista não encontrado.');
    return sucesso(res, motorista);
  }),

  criar: asyncHandler(async (req, res) => {
    const { nome } = req.body;
    if (!nome) return requisicaoInvalida(res, 'O campo "nome" é obrigatório.');

    const motorista = await MotoristaModel.criar(req.body);
    return criado(res, motorista, 'Motorista cadastrado com sucesso.');
  }),

  atualizar: asyncHandler(async (req, res) => {
    const existente = await MotoristaModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Motorista não encontrado.');

    const motorista = await MotoristaModel.atualizar(req.params.id, req.body);
    return sucesso(res, motorista, 'Motorista atualizado com sucesso.');
  }),

  excluir: asyncHandler(async (req, res) => {
    const existente = await MotoristaModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Motorista não encontrado.');

    await MotoristaModel.excluir(req.params.id);
    return sucesso(res, null, 'Motorista excluído com sucesso.');
  }),

  ranking: asyncHandler(async (req, res) => {
    const limite = Number(req.query.limite) || 10;
    const ranking = await MotoristaModel.ranking(limite);
    return sucesso(res, ranking);
  }),

  /**
   * PUT /api/motoristas/:id/foto
   * Atualiza a foto de perfil do motorista (qualquer usuário autenticado pode
   * atualizar a própria foto; admins podem atualizar qualquer motorista).
   * Body: { foto_url: "https://..." }
   */
  atualizarFoto: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { foto_url } = req.body;

    if (!foto_url) return requisicaoInvalida(res, 'O campo "foto_url" é obrigatório.');

    // Validação básica de URL
    try { new URL(foto_url); } catch {
      return requisicaoInvalida(res, 'foto_url deve ser uma URL válida.');
    }

    const existente = await MotoristaModel.buscarPorId(id);
    if (!existente) return naoEncontrado(res, 'Motorista não encontrado.');

    await MotoristaModel.atualizarFoto(id, foto_url);
    return sucesso(res, { foto_url }, 'Foto de perfil atualizada com sucesso.');
  })
};

module.exports = MotoristaController;
