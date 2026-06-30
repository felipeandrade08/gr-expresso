// =====================================================================
// GR EXPRESSO - Controller: Viagens
// =====================================================================

const ViagemModel = require('../models/ViagemModel');
const { calcularFrete } = require('../config/precificacao');
const NotaFiscalModel = require('../models/NotaFiscalModel');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso, criado, naoEncontrado, requisicaoInvalida, erro } = require('../utils/respostaPadrao');

const STATUS_VALIDOS = ['agendada', 'em_andamento', 'concluida', 'cancelada'];

/** Um motorista só pode mexer na própria viagem; admin pode em qualquer uma. */
function podeAcessarViagem(usuario, viagem) {
  if (usuario.tipo === 'admin') return true;
  return viagem && Number(viagem.motorista_id) === Number(usuario.motorista_id);
}

const ViagemController = {
  listar: asyncHandler(async (req, res) => {
    const { status, caminhao_id, data_inicio, data_fim } = req.query;

    // Motorista comum só vê as próprias viagens, independente do filtro pedido.
    const motorista_id = req.usuario.tipo === 'admin' ? req.query.motorista_id : req.usuario.motorista_id;

    const viagens = await ViagemModel.listarTodos({ status, motorista_id, caminhao_id, data_inicio, data_fim });
    return sucesso(res, viagens);
  }),

  buscarPorId: asyncHandler(async (req, res) => {
    const viagem = await ViagemModel.buscarPorId(req.params.id);
    if (!viagem) return naoEncontrado(res, 'Viagem não encontrada.');
    if (!podeAcessarViagem(req.usuario, viagem)) {
      return erro(res, 'Você não tem permissão para acessar esta viagem.', 403);
    }
    return sucesso(res, viagem);
  }),

  criar: asyncHandler(async (req, res) => {
    const dadosViagem = { ...req.body };

    // Motorista comum só pode criar viagem em seu próprio nome.
    if (req.usuario.tipo !== 'admin') {
      if (!req.usuario.motorista_id) {
        return erro(res, 'Sua conta não está vinculada a um cadastro de motorista.', 403);
      }
      dadosViagem.motorista_id = req.usuario.motorista_id;
    }

    const { motorista_id, caminhao_id, origem, destino, data_saida } = dadosViagem;
    if (!motorista_id || !caminhao_id || !origem || !destino || !data_saida) {
      return requisicaoInvalida(res, 'Os campos "motorista_id", "caminhao_id", "origem", "destino" e "data_saida" são obrigatórios.');
    }

    // Sempre recalcula o frete pela tabela interna para evitar valores absurdos do jogo
    dadosViagem.valor_frete = calcularFrete(
      dadosViagem.distancia_km || 0,
      dadosViagem.dificuldade  || 'media',
      dadosViagem.peso_carga   || 0
    );

    const viagem = await ViagemModel.criar(dadosViagem);

    // Se a viagem já nasce em andamento, gera a nota fiscal automaticamente.
    if (viagem.status === 'em_andamento') {
      await gerarNotaFiscalAutomatica(viagem);
    }

    return criado(res, viagem, 'Viagem criada com sucesso.');
  }),

  atualizar: asyncHandler(async (req, res) => {
    const existente = await ViagemModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Viagem não encontrada.');
    if (!podeAcessarViagem(req.usuario, existente)) {
      return erro(res, 'Você não tem permissão para editar esta viagem.', 403);
    }

    const dadosViagem = { ...req.body };
    // Motorista comum não pode reatribuir a viagem para outro motorista.
    if (req.usuario.tipo !== 'admin') {
      dadosViagem.motorista_id = req.usuario.motorista_id;
    }

    // Recalcula frete caso km, dificuldade ou peso tenham mudado
    dadosViagem.valor_frete = calcularFrete(
      dadosViagem.distancia_km || existente.distancia_km || 0,
      dadosViagem.dificuldade  || existente.dificuldade  || 'media',
      dadosViagem.peso_carga   || existente.peso_carga   || 0
    );
    const viagem = await ViagemModel.atualizar(req.params.id, dadosViagem);
    return sucesso(res, viagem, 'Viagem atualizada com sucesso.');
  }),

  atualizarStatus: asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!STATUS_VALIDOS.includes(status)) {
      return requisicaoInvalida(res, `Status inválido. Use um dos: ${STATUS_VALIDOS.join(', ')}.`);
    }

    const existente = await ViagemModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Viagem não encontrada.');
    if (!podeAcessarViagem(req.usuario, existente)) {
      return erro(res, 'Você não tem permissão para alterar esta viagem.', 403);
    }

    const statusAnterior = existente.status;
    const viagem = await ViagemModel.atualizarStatus(req.params.id, status);

    // Gera a nota fiscal automaticamente assim que a viagem entra em andamento
    // (apenas na transição, para não duplicar caso o status já fosse esse).
    let notaGerada = null;
    if (status === 'em_andamento' && statusAnterior !== 'em_andamento') {
      notaGerada = await gerarNotaFiscalAutomatica(viagem);
    }

    return sucesso(res, { ...viagem, nota_fiscal_gerada: notaGerada }, 'Status da viagem atualizado com sucesso.');
  }),

  excluir: asyncHandler(async (req, res) => {
    const existente = await ViagemModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Viagem não encontrada.');
    if (!podeAcessarViagem(req.usuario, existente)) {
      return erro(res, 'Você não tem permissão para excluir esta viagem.', 403);
    }

    // Apenas admin pode excluir viagens que já estão em andamento, concluídas ou canceladas.
    const STATUS_PROTEGIDOS = ['em_andamento', 'concluida', 'cancelada'];
    if (STATUS_PROTEGIDOS.includes(existente.status) && req.usuario.tipo !== 'admin') {
      return erro(res, `Viagens com status "${existente.status}" não podem ser excluídas. Apenas administradores podem fazer isso.`, 403);
    }

    await ViagemModel.excluir(req.params.id);
    return sucesso(res, null, 'Viagem excluída com sucesso.');
  }),

  mapaEntregas: asyncHandler(async (req, res) => {
    const limite = Number(req.query.limite) || 50;
    const viagens = await ViagemModel.viagensRecentesComCoordenadas(limite);
    return sucesso(res, viagens);
  })
};

/**
 * Gera automaticamente uma nota fiscal vinculada à viagem, simulando a
 * emissão real de frete assim que a viagem é despachada. Caso a viagem
 * já possua uma nota fiscal vinculada, não gera uma nova (evita duplicidade).
 */
async function gerarNotaFiscalAutomatica(viagem) {
  try {
    const jaExiste = await NotaFiscalModel.buscarPorViagemId(viagem.id);
    if (jaExiste) return jaExiste;

    return await NotaFiscalModel.criar({
      viagem_id: viagem.id,
      cliente: `Cliente da rota ${viagem.origem} → ${viagem.destino}`,
      cnpj_cpf: null,
      descricao_carga: viagem.carga || 'Carga geral',
      valor_total: viagem.valor_frete,
      data_emissao: new Date().toISOString().split('T')[0],
      status: 'emitida',
      observacoes: 'Nota fiscal gerada automaticamente ao iniciar a viagem.'
    });
  } catch (e) {
    // Não deixamos a falha na geração da nota travar a atualização da viagem;
    // apenas registramos no log do servidor para investigação posterior.
    console.error('⚠️  Falha ao gerar nota fiscal automática para a viagem', viagem.id, e.message);
    return null;
  }
}

module.exports = ViagemController;
