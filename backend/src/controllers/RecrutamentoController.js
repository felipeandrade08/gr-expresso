// =====================================================================
// FELIPINHO LAUNCHER - Controller: Recrutamentos
// =====================================================================

const RecrutamentoModel = require('../models/RecrutamentoModel');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso, criado, naoEncontrado, requisicaoInvalida } = require('../utils/respostaPadrao');

const RecrutamentoController = {
  /** Público — formulário de recrutamento */
  submeter: asyncHandler(async (req, res) => {
    const { nome, apelido, discord_user, idade, experiencia, como_conheceu } = req.body;
    if (!nome || !discord_user) {
      return requisicaoInvalida(res, 'Nome e usuário do Discord são obrigatórios.');
    }
    const registro = await RecrutamentoModel.criar({ nome, apelido, discord_user, idade, experiencia, como_conheceu });
    return criado(res, registro, 'Formulário enviado! Entre no Discord para continuar o recrutamento.');
  }),

  /** [ADMIN/RH] Lista solicitações */
  listar: asyncHandler(async (req, res) => {
    const { status } = req.query;
    const lista = await RecrutamentoModel.listar({ status });
    return sucesso(res, lista);
  }),

  /** [ADMIN/RH] Atualiza status de uma solicitação */
  atualizarStatus: asyncHandler(async (req, res) => {
    const { status, observacoes } = req.body;
    if (!['aprovado', 'rejeitado', 'pendente'].includes(status)) {
      return requisicaoInvalida(res, 'Status inválido.');
    }
    const existente = await RecrutamentoModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Solicitação não encontrada.');
    const atualizado = await RecrutamentoModel.atualizarStatus(req.params.id, status, observacoes);
    return sucesso(res, atualizado, 'Status atualizado.');
  })
};

module.exports = RecrutamentoController;
