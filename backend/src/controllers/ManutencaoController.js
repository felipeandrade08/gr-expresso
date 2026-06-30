// =====================================================================
// GR EXPRESSO - Controller: Manutenções
//
// Regra de negócio:
//   Manutenção só é credenciada nas FILIAIS da empresa:
//     • Catanduva - SP  (Filial SP)
//     • Guapó - GO      (Filial GO)
//
// Fluxo (idêntico ao abastecimento pendente):
//   1. Launcher manda cidade vazia/"Desconhecida" e sem local_servico
//      → salva como pendente, motorista deve preencher
//   2. Motorista preenche cidade + local
//      → sistema verifica se é filial automaticamente
//      → se sim: OK automático  |  se não: vai para o admin decidir
//   3. Admin regulariza: penaliza ou libera
// =====================================================================

const ManutencaoModel = require('../models/ManutencaoModel');
const { REDE_CREDENCIADA, verificarCredenciamento } = require('../config/postosCredenciados');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso, criado, naoEncontrado, requisicaoInvalida, erro } = require('../utils/respostaPadrao');

// Apenas entradas com filial:true são válidas para manutenção
const FILIAIS_CREDENCIADAS = REDE_CREDENCIADA.filter(e => e.filial === true);

function verificarFilial(cidade, localServico) {
  // Reutiliza verificarCredenciamento mas filtra só filiais
  const { verificarCredenciamento: _v } = require('../config/postosCredenciados');
  const resultado = _v(cidade, localServico);

  if (!resultado.credenciado) {
    return { credenciada: false, motivo: resultado.motivo };
  }

  // Confirma que o match é de uma filial (não posto comum)
  const normalizar = (s) => s
    ? s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim()
    : '';

  const cidadeN = normalizar(cidade);
  const localN  = normalizar(localServico);

  const ehFilial = FILIAIS_CREDENCIADAS.some(f =>
    cidadeN.includes(normalizar(f.cidade)) || localN.includes(normalizar(f.posto))
  );

  if (ehFilial) {
    return { credenciada: true, motivo: resultado.motivo };
  }

  return {
    credenciada: false,
    motivo: `Local não é uma filial credenciada — cidade: "${cidade || '?'}", local: "${localServico || '?'}"`,
  };
}

function podeAcessar(usuario, manutencao) {
  if (usuario.tipo === 'admin') return true;
  return manutencao && Number(manutencao.motorista_id) === Number(usuario.motorista_id);
}

const ManutencaoController = {

  listar: asyncHandler(async (req, res) => {
    const { caminhao_id, data_inicio, data_fim } = req.query;
    const motorista_id = req.usuario.tipo === 'admin' ? null : req.usuario.motorista_id;
    const lista = await ManutencaoModel.listarTodas({ motorista_id, caminhao_id, data_inicio, data_fim });
    return sucesso(res, lista);
  }),

  buscarPorId: asyncHandler(async (req, res) => {
    const man = await ManutencaoModel.buscarPorId(req.params.id);
    if (!man) return naoEncontrado(res, 'Manutenção não encontrada.');
    if (!podeAcessar(req.usuario, man)) return erro(res, 'Acesso negado.', 403);
    return sucesso(res, man);
  }),

  /**
   * POST manual (admin ou motorista registra sem o Launcher).
   */
  criar: asyncHandler(async (req, res) => {
    const dados = { ...req.body, origem: 'manual' };

    if (req.usuario.tipo !== 'admin') {
      if (!req.usuario.motorista_id)
        return erro(res, 'Conta não vinculada a motorista.', 403);
      dados.motorista_id = req.usuario.motorista_id;
    }

    if (!dados.caminhao_id || !dados.data_manutencao)
      return requisicaoInvalida(res, 'Os campos "caminhao_id" e "data_manutencao" são obrigatórios.');

    const { credenciada, motivo } = verificarFilial(dados.cidade, dados.local_servico);
    dados.credenciada = credenciada;
    dados.status = 'ok';
    dados.observacoes = dados.observacoes || (credenciada ? `Filial credenciada: ${motivo}` : `Não credenciada: ${motivo}`);

    const man = await ManutencaoModel.criar(dados);
    return criado(res, man, 'Manutenção registrada.');
  }),

  excluir: asyncHandler(async (req, res) => {
    const man = await ManutencaoModel.buscarPorId(req.params.id);
    if (!man) return naoEncontrado(res, 'Manutenção não encontrada.');
    if (req.usuario.tipo !== 'admin') return erro(res, 'Apenas administradores podem excluir manutenções.', 403);
    const { pool } = require('../config/database');
    await pool.query('DELETE FROM manutencoes WHERE id = ?', [req.params.id]);
    return sucesso(res, null, 'Manutenção excluída.');
  }),

  totalPorMes: asyncHandler(async (req, res) => {
    const meses = Number(req.query.meses) || 6;
    return sucesso(res, await ManutencaoModel.totalPorMes(meses));
  }),

  /**
   * Lista as filiais onde manutenção é permitida.
   */
  listarFiliaisCredenciadas: asyncHandler(async (req, res) => {
    return sucesso(res, FILIAIS_CREDENCIADAS);
  }),

  // ─── Fluxo Pendente ────────────────────────────────────────────────

  listarPendentes: asyncHandler(async (req, res) => {
    const motorista_id = req.usuario.tipo === 'admin' ? null : req.usuario.motorista_id;
    return sucesso(res, await ManutencaoModel.listarPendentes(motorista_id));
  }),

  /**
   * PATCH /:id/resolver-pendente
   * Motorista informa cidade + local_servico.
   * Se for filial → fecha como OK automaticamente.
   * Se não for → mantém pendente para o admin.
   */
  resolverPendente: asyncHandler(async (req, res) => {
    const man = await ManutencaoModel.buscarPorId(req.params.id);
    if (!man) return naoEncontrado(res, 'Manutenção não encontrada.');
    if (!podeAcessar(req.usuario, man)) return erro(res, 'Acesso negado.', 403);
    if (man.status !== 'pendente') return requisicaoInvalida(res, 'Esta manutenção não está pendente.');

    const { cidade, local_servico } = req.body;
    if (!cidade || !cidade.trim())
      return requisicaoInvalida(res, 'Informe a cidade onde fez a manutenção.');
    if (!local_servico || !local_servico.trim())
      return requisicaoInvalida(res, 'Informe o nome da oficina ou filial onde fez a manutenção.');

    // Persiste os dados do motorista
    await ManutencaoModel.resolverPendente(req.params.id, {
      cidade: cidade.trim(),
      local_servico: local_servico.trim(),
    });

    const { credenciada, motivo } = verificarFilial(cidade.trim(), local_servico.trim());

    if (credenciada) {
      const atualizado = await ManutencaoModel.regularizarPendente(req.params.id, {
        observacoes: `Filial confirmada automaticamente pelo sistema — ${motivo}`,
      });
      return sucesso(res, { manutencao: atualizado, credenciada: true, motivo },
        `Manutenção confirmada automaticamente! ${motivo}`);
    }

    const atualizado = await ManutencaoModel.buscarPorId(req.params.id);
    return sucesso(res, { manutencao: atualizado, credenciada: false, motivo },
      'Local não é uma filial credenciada. Dados enviados ao administrador para regularização.');
  }),

  /**
   * PATCH /:id/regularizar  (admin)
   * Body: { penalizar: boolean, observacoes?: string }
   */
  regularizarPendente: asyncHandler(async (req, res) => {
    if (req.usuario.tipo !== 'admin')
      return erro(res, 'Somente administradores podem regularizar manutenções.', 403);

    const man = await ManutencaoModel.buscarPorId(req.params.id);
    if (!man) return naoEncontrado(res, 'Manutenção não encontrada.');
    if (man.status !== 'pendente') return requisicaoInvalida(res, 'Esta manutenção não está pendente.');
    if (!man.cidade || !man.local_servico)
      return requisicaoInvalida(res,
        'O motorista ainda não preencheu cidade e local. Aguarde antes de regularizar.');

    const { penalizar = true, observacoes, viagem_id } = req.body;

    let penalidade = null;
    if (penalizar) {
      const RankingModel = require('../models/RankingModel');
      const MultaModel   = require('../models/MultaModel');
      const vid = viagem_id || man.viagem_id;

      if (vid) {
        await MultaModel.registrar({
          viagem_id:    vid,
          motorista_id: man.motorista_id,
          tipo:         'manutencao_fora_base',
          descricao:    `Manutenção fora da filial — local: "${man.local_servico}", cidade: "${man.cidade}"`,
          origem:       'admin',
        });
        const pts = await RankingModel.penalizarMulta(man.motorista_id, vid, 'manutencao_fora_base');
        penalidade = { penalizado: true, pontos: pts };
      }
    }

    const obs = observacoes || (penalizar
      ? `Admin regularizou como PENALIDADE — local: "${man.local_servico}", cidade: "${man.cidade}"`
      : `Admin regularizou como CORRETO — local: "${man.local_servico}", cidade: "${man.cidade}"`);

    const atualizado = await ManutencaoModel.regularizarPendente(req.params.id, { observacoes: obs });

    return sucesso(res, { manutencao: atualizado, penalidade },
      penalizar
        ? 'Manutenção regularizada com PENALIDADE aplicada.'
        : 'Manutenção regularizada como correta (sem penalidade).');
  }),
};

module.exports = ManutencaoController;
