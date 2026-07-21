// =====================================================================
// FELIPINHO LAUNCHER - Controller: Abastecimentos
// =====================================================================

const AbastecimentoModel = require('../models/AbastecimentoModel');
const { REDE_CREDENCIADA, verificarCredenciamento } = require('../config/postosCredenciados');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso, criado, naoEncontrado, requisicaoInvalida, erro } = require('../utils/respostaPadrao');

function podeAcessar(usuario, abastecimento) {
  if (usuario.tipo === 'admin') return true;
  return abastecimento && Number(abastecimento.motorista_id) === Number(usuario.motorista_id);
}

const AbastecimentoController = {
  listar: asyncHandler(async (req, res) => {
    const { caminhao_id, data_inicio, data_fim } = req.query;
    const abastecimentos = await AbastecimentoModel.listarTodos({ caminhao_id, data_inicio, data_fim });

    // Motorista comum só vê os próprios abastecimentos.
    const filtrados = req.usuario.tipo === 'admin'
      ? abastecimentos
      : abastecimentos.filter((a) => Number(a.motorista_id) === Number(req.usuario.motorista_id));

    return sucesso(res, filtrados);
  }),

  buscarPorId: asyncHandler(async (req, res) => {
    const abastecimento = await AbastecimentoModel.buscarPorId(req.params.id);
    if (!abastecimento) return naoEncontrado(res, 'Abastecimento não encontrado.');
    if (!podeAcessar(req.usuario, abastecimento)) {
      return erro(res, 'Você não tem permissão para acessar este abastecimento.', 403);
    }
    return sucesso(res, abastecimento);
  }),

  criar: asyncHandler(async (req, res) => {
    const dados = { ...req.body };

    if (req.usuario.tipo !== 'admin') {
      if (!req.usuario.motorista_id) {
        return erro(res, 'Sua conta não está vinculada a um cadastro de motorista.', 403);
      }
      dados.motorista_id = req.usuario.motorista_id;
    }

    const { caminhao_id, litros, valor_litro, data_abastecimento } = dados;
    if (!caminhao_id || !litros || !valor_litro || !data_abastecimento) {
      return requisicaoInvalida(res, 'Os campos "caminhao_id", "litros", "valor_litro" e "data_abastecimento" são obrigatórios.');
    }

    const abastecimento = await AbastecimentoModel.criar(dados);
    return criado(res, abastecimento, 'Abastecimento registrado com sucesso.');
  }),

  atualizar: asyncHandler(async (req, res) => {
    const existente = await AbastecimentoModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Abastecimento não encontrado.');
    if (!podeAcessar(req.usuario, existente)) {
      return erro(res, 'Você não tem permissão para editar este abastecimento.', 403);
    }

    const dados = { ...req.body };
    if (req.usuario.tipo !== 'admin') {
      dados.motorista_id = req.usuario.motorista_id;
    }

    const abastecimento = await AbastecimentoModel.atualizar(req.params.id, dados);
    return sucesso(res, abastecimento, 'Abastecimento atualizado com sucesso.');
  }),

  excluir: asyncHandler(async (req, res) => {
    const existente = await AbastecimentoModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Abastecimento não encontrado.');
    if (!podeAcessar(req.usuario, existente)) {
      return erro(res, 'Você não tem permissão para excluir este abastecimento.', 403);
    }

    await AbastecimentoModel.excluir(req.params.id);
    return sucesso(res, null, 'Abastecimento excluído com sucesso.');
  }),

  totalPorMes: asyncHandler(async (req, res) => {
    const meses = Number(req.query.meses) || 6;
    const dados = await AbastecimentoModel.totalPorMes(meses);
    return sucesso(res, dados);
  }),

  /**
   * Lista a rede de postos e filiais credenciados, usada pelo frontend
   * para avisar o motorista onde ele pode abastecer sem levar penalidade.
   */
  listarPostosCredenciados: asyncHandler(async (req, res) => {
    return sucesso(res, REDE_CREDENCIADA);
  }),

  // ─── Fluxo de Pendentes ────────────────────────────────────────────────

  /**
   * GET /api/abastecimentos/pendentes
   * Admin vê todos; motorista vê só os próprios.
   */
  listarPendentes: asyncHandler(async (req, res) => {
    const motorista_id = req.usuario.tipo === 'admin' ? null : req.usuario.motorista_id;
    const pendentes = await AbastecimentoModel.listarPendentes(motorista_id);
    return sucesso(res, pendentes);
  }),

  /**
   * PATCH /api/abastecimentos/:id/resolver-pendente
   * Motorista informa posto e cidade que faltavam.
   * Body: { posto: string, cidade: string }
   */
  /**
   * PATCH /api/abastecimentos/:id/resolver-pendente
   * Motorista informa posto e cidade que faltavam.
   *
   * Fluxo automático:
   *   - Se posto OU cidade bater na lista de credenciados → fecha como OK na hora (sem penalidade).
   *   - Se não bater → fica pendente para o admin decidir.
   *
   * Body: { posto: string, cidade: string }
   */
  resolverPendente: asyncHandler(async (req, res) => {
    const abastecimento = await AbastecimentoModel.buscarPorId(req.params.id);
    if (!abastecimento) return naoEncontrado(res, 'Abastecimento não encontrado.');

    if (!podeAcessar(req.usuario, abastecimento)) {
      return erro(res, 'Você não tem permissão para editar este abastecimento.', 403);
    }
    if (abastecimento.status !== 'pendente') {
      return requisicaoInvalida(res, 'Este abastecimento não está pendente.');
    }

    const { posto, cidade } = req.body;
    if (!posto || !posto.trim()) {
      return requisicaoInvalida(res, 'Informe o nome do posto onde abasteceu.');
    }
    if (!cidade || !cidade.trim()) {
      return requisicaoInvalida(res, 'Informe a cidade onde abasteceu.');
    }

    // Persiste posto e cidade informados pelo motorista
    await AbastecimentoModel.resolverPendente(req.params.id, {
      posto: posto.trim(),
      cidade: cidade.trim(),
    });

    // ── Verifica credenciamento com os dados fornecidos ─────────────
    const { credenciado, motivo } = verificarCredenciamento(cidade.trim(), posto.trim());

    if (credenciado) {
      // Posto/cidade reconhecidos → fecha automaticamente como OK
      const atualizado = await AbastecimentoModel.regularizarPendente(req.params.id, {
        observacoes: `Credenciado automaticamente pelo sistema ao preencher pendente — ${motivo}`,
      });

      return sucesso(res, { abastecimento: atualizado, credenciado: true, motivo },
        `Abastecimento confirmado automaticamente! ${motivo}`);
    }

    // Não credenciado → mantém pendente, admin vai decidir
    const atualizado = await AbastecimentoModel.buscarPorId(req.params.id);
    return sucesso(res, { abastecimento: atualizado, credenciado: false, motivo },
      'Posto não identificado na rede credenciada. Dados enviados ao administrador para regularização.');
  }),

  /**
   * PATCH /api/abastecimentos/:id/regularizar   (somente admin)
   * Admin decide se aplica penalidade ou libera como correto.
   * Body: { penalizar: boolean, observacoes?: string, viagem_id?: number }
   */
  regularizarPendente: asyncHandler(async (req, res) => {
    if (req.usuario.tipo !== 'admin') {
      return erro(res, 'Somente administradores podem regularizar abastecimentos.', 403);
    }

    const abastecimento = await AbastecimentoModel.buscarPorId(req.params.id);
    if (!abastecimento) return naoEncontrado(res, 'Abastecimento não encontrado.');
    if (abastecimento.status !== 'pendente') {
      return requisicaoInvalida(res, 'Este abastecimento não está pendente.');
    }
    if (!abastecimento.posto || !abastecimento.cidade) {
      return requisicaoInvalida(res,
        'O motorista ainda não preencheu posto e cidade. Aguarde antes de regularizar.');
    }

    const { penalizar = true, observacoes, viagem_id } = req.body;

    let penalidade = null;
    if (penalizar) {
      const RankingModel = require('../models/RankingModel');
      const MultaModel   = require('../models/MultaModel');
      const vid = viagem_id || abastecimento.viagem_id;

      if (vid) {
        await MultaModel.registrar({
          viagem_id:    vid,
          motorista_id: abastecimento.motorista_id,
          tipo:         'falta_combustivel',
          descricao:    `Penalidade pelo admin — pendente regularizado: posto "${abastecimento.posto}", cidade "${abastecimento.cidade}"`,
          origem:       'admin',
        });
        const pts = await RankingModel.penalizarMulta(
          abastecimento.motorista_id, vid, 'falta_combustivel'
        );
        penalidade = { penalizado: true, pontos: pts };
      }
    }

    const obs = observacoes
      || (penalizar
        ? `Admin regularizou como PENALIDADE — posto: "${abastecimento.posto}", cidade: "${abastecimento.cidade}"`
        : `Admin regularizou como CORRETO — posto: "${abastecimento.posto}", cidade: "${abastecimento.cidade}"`);

    const atualizado = await AbastecimentoModel.regularizarPendente(req.params.id, { observacoes: obs });

    return sucesso(res, { abastecimento: atualizado, penalidade },
      penalizar
        ? 'Abastecimento regularizado com PENALIDADE aplicada.'
        : 'Abastecimento regularizado como correto (sem penalidade).');
  })
};

module.exports = AbastecimentoController;
