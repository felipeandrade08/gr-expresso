// =====================================================================
// GR EXPRESSO - Controller: Notas Fiscais
// =====================================================================

const NotaFiscalModel = require('../models/NotaFiscalModel');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso, criado, naoEncontrado, requisicaoInvalida, erro } = require('../utils/respostaPadrao');

function podeAcessar(usuario, nota) {
  if (usuario.tipo === 'admin') return true;
  return nota && Number(nota.motorista_id) === Number(usuario.motorista_id);
}

const NotaFiscalController = {
  listar: asyncHandler(async (req, res) => {
    const { status, busca } = req.query;
    const notas = await NotaFiscalModel.listarTodos({ status, busca });

    // Motorista comum só vê as notas fiscais das próprias viagens.
    const filtradas = req.usuario.tipo === 'admin'
      ? notas
      : notas.filter((n) => Number(n.motorista_id) === Number(req.usuario.motorista_id));

    return sucesso(res, filtradas);
  }),

  buscarPorId: asyncHandler(async (req, res) => {
    const nota = await NotaFiscalModel.buscarPorId(req.params.id);
    if (!nota) return naoEncontrado(res, 'Nota fiscal não encontrada.');
    if (!podeAcessar(req.usuario, nota)) {
      return erro(res, 'Você não tem permissão para acessar esta nota fiscal.', 403);
    }
    return sucesso(res, nota);
  }),

  // Criação, edição e exclusão de notas fiscais ficam restritas ao administrador.
  // Para motoristas, as notas são geradas automaticamente ao iniciar uma viagem.
  criar: asyncHandler(async (req, res) => {
    if (req.usuario.tipo !== 'admin') {
      return erro(res, 'Apenas administradores podem criar notas fiscais manualmente.', 403);
    }

    const { cliente, valor_total, data_emissao } = req.body;
    if (!cliente || !valor_total || !data_emissao) {
      return requisicaoInvalida(res, 'Os campos "cliente", "valor_total" e "data_emissao" são obrigatórios.');
    }

    const nota = await NotaFiscalModel.criar(req.body);
    return criado(res, nota, 'Nota fiscal emitida com sucesso.');
  }),

  atualizar: asyncHandler(async (req, res) => {
    if (req.usuario.tipo !== 'admin') {
      return erro(res, 'Apenas administradores podem editar notas fiscais.', 403);
    }

    const existente = await NotaFiscalModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Nota fiscal não encontrada.');

    const nota = await NotaFiscalModel.atualizar(req.params.id, req.body);
    return sucesso(res, nota, 'Nota fiscal atualizada com sucesso.');
  }),

  excluir: asyncHandler(async (req, res) => {
    if (req.usuario.tipo !== 'admin') {
      return erro(res, 'Apenas administradores podem excluir notas fiscais.', 403);
    }

    const existente = await NotaFiscalModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Nota fiscal não encontrada.');

    await NotaFiscalModel.excluir(req.params.id);
    return sucesso(res, null, 'Nota fiscal excluída com sucesso.');
  })
};

module.exports = NotaFiscalController;
