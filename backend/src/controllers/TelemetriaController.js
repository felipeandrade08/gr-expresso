// =====================================================================
// FELIPINHO LAUNCHER - Controller: Telemetria (integração real com o Launcher ETS2)
// =====================================================================

const TelemetriaModel   = require('../models/TelemetriaModel');
const ViagemModel       = require('../models/ViagemModel');
const AbastecimentoModel = require('../models/AbastecimentoModel');
const RankingModel      = require('../models/RankingModel');
const { verificarCredenciamento, REDE_CREDENCIADA } = require('../config/postosCredenciados');
const ManutencaoModel = require('../models/ManutencaoModel');
const { calcularFrete } = require('../config/precificacao');

// Filiais onde manutenção é permitida
const FILIAIS_MAN = REDE_CREDENCIADA.filter(e => e.filial === true);
const _norm = s => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim() : '';
function verificarFilialManutencao(cidade, local) {
  const cN = _norm(cidade); const lN = _norm(local);
  const match = FILIAIS_MAN.find(f => cN.includes(_norm(f.cidade)) || lN.includes(_norm(f.posto)));
  if (match) return { credenciada: true, motivo: `Filial credenciada: ${match.posto} — ${match.cidade}` };
  return { credenciada: false, motivo: `Local não é filial — cidade: "${cidade||'?'}", local: "${local||'?'}"` };
}
const asyncHandler      = require('../utils/asyncHandler');
const { sucesso, criado, requisicaoInvalida, erro } = require('../utils/respostaPadrao');

const COMPONENTES_VALIDOS = ['engine', 'chassis', 'cabin', 'wheels'];

// Limite de velocidade (km/h) que dispara penalidade
const LIMITE_VELOCIDADE_KMH = 100;

// Controle em memória para evitar spam de penalidade de velocidade
// { [motorista_id]: { ultima_penalidade: timestamp } }
const _velocidadeState = {};
const INTERVALO_PENALIDADE_VEL_MS = 30_000; // 30s entre penalidades

/** Garante que a requisição vem de um usuário vinculado a um motorista. */
function exigirMotoristaVinculado(req, res) {
  if (!req.usuario.motorista_id) {
    erro(res, 'Sua conta não está vinculada a um cadastro de motorista. Peça a um administrador para vincular seu usuário.', 403);
    return null;
  }
  return req.usuario.motorista_id;
}

/** Resolve (ou cria) o caminhão a partir do bloco "vehicle" enviado pelo Launcher. */
async function resolverCaminhao(vehicle, motoristaId) {
  const placa = vehicle?.placa || vehicle?.license_plate || '';
  return TelemetriaModel.buscarOuCriarPorPlaca(placa, {
    marca: vehicle?.marca || vehicle?.brand,
    modelo: vehicle?.modelo || vehicle?.model,
    capacidade_tanque: vehicle?.capacidade_tanque || vehicle?.fuel_capacity,
    motorista_atual_id: motoristaId
  });
}

const TelemetriaController = {
  /**
   * POST /api/telemetria/heartbeat
   * Enviado periodicamente pelo Launcher. Detecta excesso de velocidade.
   */
  heartbeat: asyncHandler(async (req, res) => {
    const motoristaId = exigirMotoristaVinculado(req, res);
    if (!motoristaId) return;

    const {
      vehicle = {}, perfil_jogo, cidade_atual,
      velocidade_kmh, rpm, marcha,
      nivel_combustivel, odometro, em_viagem, viagem_id
    } = req.body;

    const caminhao = await resolverCaminhao(vehicle, motoristaId);

    const status = await TelemetriaModel.atualizarHeartbeat(motoristaId, {
      caminhao_id: caminhao.id,
      viagem_id: viagem_id || null,
      online: true,
      perfil_jogo, cidade_atual,
      velocidade_kmh, rpm, marcha,
      nivel_combustivel, odometro,
      em_viagem: Boolean(em_viagem)
    });

    // ── Detecta excesso de velocidade (max 1 penalidade a cada 30s) ──
    let penalidade_velocidade = null;
    const velNum = Number(velocidade_kmh) || 0;

    if (velNum > LIMITE_VELOCIDADE_KMH && viagem_id) {
      const agora  = Date.now();
      const estado = _velocidadeState[motoristaId] || { ultima_penalidade: 0 };

      if (agora - estado.ultima_penalidade >= INTERVALO_PENALIDADE_VEL_MS) {
        _velocidadeState[motoristaId] = { ultima_penalidade: agora };
        const pts = await RankingModel.penalizarVelocidade(motoristaId, viagem_id, velNum);
        penalidade_velocidade = { pontos: pts, velocidade_kmh: velNum };
      }
    } else if (velNum <= LIMITE_VELOCIDADE_KMH) {
      if (_velocidadeState[motoristaId]) {
        _velocidadeState[motoristaId] = { ultima_penalidade: 0 };
      }
    }

    return sucesso(res, { ...status, penalidade_velocidade });
  }),

  /**
   * POST /api/telemetria/viagem/inicio
   */
  iniciarViagem: asyncHandler(async (req, res) => {
    const motoristaId = exigirMotoristaVinculado(req, res);
    if (!motoristaId) return;

    const {
      vehicle = {}, origem, destino, carga,
      peso_carga_kg, distancia_km, valor_frete, dificuldade
    } = req.body;

    if (!origem || !destino) {
      return requisicaoInvalida(res, 'Os campos "origem" e "destino" são obrigatórios.');
    }

    const caminhao = await resolverCaminhao(vehicle, motoristaId);
    const { pool } = require('../config/database');
    const [[motorista]] = await pool.query('SELECT nome FROM motoristas WHERE id = ?', [motoristaId]);

    // Calcula o frete pela tabela de preços interna (ignora valor do jogo)
    const freteCalculado = calcularFrete(
      distancia_km || 0,
      dificuldade || 'media',
      peso_carga_kg || 0
    );

    const viagem = await ViagemModel.criar({
      motorista_id: motoristaId,
      motorista_nome: motorista?.nome || 'FELIPINHO LAUNCHER',
      caminhao_id: caminhao.id,
      origem, destino,
      carga: carga || 'Carga geral',
      peso_carga: peso_carga_kg || 0,
      distancia_km: distancia_km || 0,
      valor_frete: freteCalculado,
      data_saida: new Date(),
      status: 'em_andamento',
      dificuldade: dificuldade || 'media',
      observacoes: 'Viagem criada automaticamente pelo Launcher FELIPINHO LAUNCHER (telemetria do jogo).'
    });

    await TelemetriaModel.atualizarHeartbeat(motoristaId, {
      caminhao_id: caminhao.id,
      viagem_id: viagem.id,
      online: true,
      em_viagem: true
    });

    return criado(res, viagem, 'Viagem iniciada automaticamente a partir da telemetria.');
  }),

  /**
   * POST /api/telemetria/viagem/:id/fim
   * Body: { distancia_km, cancelada, dano_viagem }
   */
  finalizarViagem: asyncHandler(async (req, res) => {
    const motoristaId = exigirMotoristaVinculado(req, res);
    if (!motoristaId) return;

    const { id } = req.params;
    const { distancia_km, cancelada, dano_viagem = 0 } = req.body;

    const viagem = await ViagemModel.buscarPorId(id);
    if (!viagem) return requisicaoInvalida(res, 'Viagem não encontrada (pode já ter sido finalizada).');
    if (Number(viagem.motorista_id) !== Number(motoristaId)) {
      return erro(res, 'Esta viagem não pertence ao motorista autenticado.', 403);
    }

    if (distancia_km) {
      await ViagemModel.atualizar(id, { ...viagem, distancia_km });
    }

    const novoStatus = cancelada ? 'cancelada' : 'concluida';
    const viagemAtualizada = await ViagemModel.atualizarStatus(id, novoStatus, { dano_viagem });

    await TelemetriaModel.atualizarHeartbeat(motoristaId, {
      caminhao_id: viagem.caminhao_id,
      viagem_id: null,
      online: true,
      em_viagem: false
    });

    return sucesso(res, viagemAtualizada, 'Viagem finalizada com sucesso a partir da telemetria.');
  }),

  /**
   * POST /api/telemetria/abastecimento
   * Verifica se o local é credenciado. Se não for, penaliza o motorista.
   *
   * Body esperado (além dos campos já existentes):
   *   cidade     : string  — cidade onde aconteceu o abastecimento
   *   nome_posto : string  — nome do posto (opcional, mas melhora a detecção)
   */
  registrarAbastecimento: asyncHandler(async (req, res) => {
    const motoristaId = exigirMotoristaVinculado(req, res);
    if (!motoristaId) return;

    const {
      vehicle = {},
      litros, custo_total, valor_total, valor_litro,
      cidade, nome_posto, km_no_momento, viagem_id
    } = req.body;

    const valorTotalRecebido = valor_total ?? custo_total;

    if (!litros || (!valorTotalRecebido && !valor_litro)) {
      return requisicaoInvalida(res, 'Os campos "litros" e "valor_total" (ou "valor_litro") são obrigatórios.');
    }

    const caminhao  = await resolverCaminhao(vehicle, motoristaId);
    const litrosNum  = Number(litros);
    const precoLitro = valor_litro
      ? Number(valor_litro)
      : Number(valorTotalRecebido) / litrosNum;

    // ── Detecta se cidade/posto estão ausentes ou genéricos ────────
    const cidadeVazia = !cidade
      || cidade.trim() === ''
      || cidade.toLowerCase().includes('desconhecid');

    const postoVazio = !nome_posto || nome_posto.trim() === '';

    // Quando não há informação suficiente para verificar credenciamento,
    // salvamos como "pendente" e exigimos que o motorista preencha.
    if (cidadeVazia && postoVazio) {
      const abastecimento = await AbastecimentoModel.criar({
        caminhao_id:        caminhao.id,
        motorista_id:       motoristaId,
        viagem_id:          viagem_id || null,
        posto:              null,
        cidade:             null,
        litros:             litrosNum,
        valor_litro:        precoLitro,
        km_no_momento:      km_no_momento || 0,
        data_abastecimento: new Date(),
        observacoes:        'Launcher não enviou cidade nem nome do posto — pendente de regularização pelo admin.',
        status:             'pendente',
      });

      require('../models/CaminhaoModel').recalcularConsumo(caminhao.id).catch(()=>{});
      return criado(res, {
        abastecimento,
        pendente:  true,
        mensagem_motorista: 'Seu abastecimento foi registrado como PENDENTE. Informe o nome do posto e a cidade para o administrador regularizar.',
      }, 'Abastecimento pendente — dados insuficientes do Launcher. Motorista deve preencher posto e cidade.');
    }

    // ── Verifica credenciamento (há cidade ou posto informados) ─────
    const { credenciado, motivo } = verificarCredenciamento(cidade, nome_posto);

    let penalidade_abastecimento = null;

    if (!credenciado && viagem_id) {
      // Penaliza por abastecer fora da rede credenciada
      const MultaModel = require('../models/MultaModel');
      await MultaModel.registrar({
        viagem_id,
        motorista_id: motoristaId,
        tipo: 'falta_combustivel',
        descricao: `Abastecimento fora da rede — ${motivo}`,
        origem: 'launcher',
      });

      const pts = await RankingModel.penalizarMulta(
        motoristaId, viagem_id, 'falta_combustivel'
      );

      penalidade_abastecimento = {
        penalizado: true,
        pontos: pts,
        motivo,
      };
    }

    const nomePosToSalvar = nome_posto
      ? nome_posto
      : cidade
        ? `Posto em ${cidade}`
        : null;

    const abastecimento = await AbastecimentoModel.criar({
      caminhao_id:        caminhao.id,
      motorista_id:       motoristaId,
      viagem_id:          viagem_id || null,
      posto:              nomePosToSalvar,
      cidade:             cidade || null,
      litros:             litrosNum,
      valor_litro:        precoLitro,
      km_no_momento:      km_no_momento || 0,
      data_abastecimento: new Date(),
      observacoes:        credenciado
        ? `Abastecimento credenciado: ${motivo}`
        : `Abastecimento NÃO credenciado: ${motivo}`,
      status: 'ok',
    });

    require('../models/CaminhaoModel').recalcularConsumo(caminhao.id).catch(()=>{});
    return criado(res, {
      abastecimento,
      credenciado,
      motivo,
      penalidade_abastecimento,
    }, credenciado
      ? 'Abastecimento registrado (posto credenciado).'
      : 'Abastecimento registrado — PENALIDADE aplicada (posto não credenciado).'
    );
  }),

  /**
   * POST /api/telemetria/manutencao
   * Dano >= 20% também aplica penalidade de dano no ranking.
   */
  registrarAlertaManutencao: asyncHandler(async (req, res) => {
    const motoristaId = exigirMotoristaVinculado(req, res);
    if (!motoristaId) return;

    const {
      vehicle = {},
      componente, nivel_severidade, dano_atual, mensagem, viagem_id
    } = req.body;

    if (!componente || !COMPONENTES_VALIDOS.includes(componente)) {
      return requisicaoInvalida(res, `Campo "componente" inválido. Use um de: ${COMPONENTES_VALIDOS.join(', ')}.`);
    }
    if (nivel_severidade === undefined || dano_atual === undefined) {
      return requisicaoInvalida(res, 'Os campos "nivel_severidade" e "dano_atual" são obrigatórios.');
    }

    const caminhao = await resolverCaminhao(vehicle, motoristaId);

    const alerta = await TelemetriaModel.criarAlertaManutencao({
      caminhao_id: caminhao.id,
      motorista_id: motoristaId,
      viagem_id: viagem_id || null,
      componente, nivel_severidade, dano_atual, mensagem
    });

    if (Number(nivel_severidade) >= 0.20 && viagem_id) {
      await RankingModel.penalizarDano(motoristaId, viagem_id, Number(dano_atual));
    }

    return criado(res, alerta, 'Alerta de manutenção registrado a partir da telemetria.');
  }),

  /**
   * POST /api/telemetria/viagem/:id/nota-fiscal
   */
  emitirNotaFiscal: asyncHandler(async (req, res) => {
    const motoristaId = exigirMotoristaVinculado(req, res);
    if (!motoristaId) return;

    const { id } = req.params;
    const NotaFiscalModel = require('../models/NotaFiscalModel');

    const nfExistente = await NotaFiscalModel.buscarPorViagemId(id);
    if (nfExistente) {
      return sucesso(res, nfExistente, 'Nota fiscal já emitida para esta viagem.');
    }

    const viagem = await ViagemModel.buscarPorId(id);
    if (!viagem) return requisicaoInvalida(res, 'Viagem não encontrada.');
    if (Number(viagem.motorista_id) !== Number(motoristaId)) {
      return erro(res, 'Esta viagem não pertence ao motorista autenticado.', 403);
    }

    const nota = await NotaFiscalModel.criar({
      viagem_id: id,
      cliente: viagem.motorista_nome || 'FELIPINHO LAUNCHER',
      descricao_carga: viagem.carga || 'Carga geral',
      valor_total: viagem.valor_frete || 0,
      data_emissao: new Date(),
      status: 'emitida',
      observacoes: 'Nota fiscal gerada automaticamente pelo Launcher FELIPINHO LAUNCHER ao iniciar a viagem.'
    });

    return criado(res, nota, 'Nota fiscal emitida com sucesso.');
  }),

  /**
   * POST /api/telemetria/multa
   * Registra uma multa de trânsito detectada pelo próprio jogo (evento
   * "fined" do SCS SDK — sinal, ultrapassagem proibida, etc.), distinta
   * da detecção de velocidade feita via heartbeat.
   *
   * Body: { vehicle, viagem_id, motivo, valor }
   */
  registrarMulta: asyncHandler(async (req, res) => {
    const motoristaId = exigirMotoristaVinculado(req, res);
    if (!motoristaId) return;

    const { viagem_id, motivo, valor } = req.body;

    const MultaModel = require('../models/MultaModel');
    const multa = await MultaModel.registrar({
      viagem_id: viagem_id || null,
      motorista_id: motoristaId,
      tipo: 'infracao_transito',
      descricao: motivo ? `Multa de trânsito (jogo): ${motivo}` : 'Multa de trânsito detectada pelo jogo',
      valor_brl: valor || null,
      origem: 'launcher',
    });

    let penalidade = null;
    if (viagem_id) {
      const pts = await RankingModel.penalizarMulta(motoristaId, viagem_id, 'infracao_transito');
      penalidade = { pontos: pts };
    }

    return criado(res, { multa, penalidade }, 'Multa de trânsito registrada a partir da telemetria.');
  }),

  /**
   * POST /api/telemetria/manutencao-servico
   * Chamado pelo Launcher quando o motorista conclui um serviço na oficina do ETS2.
   *
   * Body:
   *   vehicle        : objeto com dados do caminhão
   *   cidade         : cidade atual (pode vir vazia/"Desconhecida")
   *   local_servico  : nome da oficina (pode vir vazio)
   *   tipo           : 'reparar' | 'substituir' | 'misto'
   *   componentes    : array [{ componente, desgaste, dano, acao, custo }]
   *   custo_total    : número (R$)
   *   viagem_id      : opcional
   */
  registrarManutencaoServico: asyncHandler(async (req, res) => {
    const motoristaId = exigirMotoristaVinculado(req, res);
    if (!motoristaId) return;

    const {
      vehicle = {}, cidade, local_servico,
      tipo = 'reparar', componentes, custo_total = 0, viagem_id
    } = req.body;

    const caminhao = await resolverCaminhao(vehicle, motoristaId);

    const cidadeVazia = !cidade || cidade.trim() === '' || cidade.toLowerCase().includes('desconhecid');
    const localVazio  = !local_servico || local_servico.trim() === '';

    // Sem dados suficientes → pendente
    if (cidadeVazia && localVazio) {
      const man = await ManutencaoModel.criar({
        caminhao_id:     caminhao.id,
        motorista_id:    motoristaId,
        viagem_id:       viagem_id || null,
        cidade:          null,
        local_servico:   null,
        tipo, componentes, custo_total,
        status:          'pendente',
        credenciada:     false,
        origem:          'launcher',
        data_manutencao: new Date(),
        observacoes:     'Launcher não enviou cidade nem local — pendente de regularização.',
      });

      return criado(res, {
        manutencao: man,
        pendente:   true,
        mensagem_motorista: 'Sua manutenção foi registrada como PENDENTE. Informe a cidade e o nome da filial/oficina para o administrador regularizar.',
      }, 'Manutenção pendente — dados insuficientes do Launcher.');
    }

    // Verifica se é filial credenciada
    const { credenciada, motivo } = verificarFilialManutencao(cidade, local_servico);

    let penalidade_manutencao = null;

    if (!credenciada && viagem_id) {
      const MultaModel = require('../models/MultaModel');
      await MultaModel.registrar({
        viagem_id,
        motorista_id: motoristaId,
        tipo:         'manutencao_fora_base',
        descricao:    `Manutenção fora da filial — ${motivo}`,
        origem:       'launcher',
      });
      const pts = await RankingModel.penalizarMulta(motoristaId, viagem_id, 'manutencao_fora_base');
      penalidade_manutencao = { penalizado: true, pontos: pts, motivo };
    }

    const man = await ManutencaoModel.criar({
      caminhao_id:     caminhao.id,
      motorista_id:    motoristaId,
      viagem_id:       viagem_id || null,
      cidade:          cidade || null,
      local_servico:   local_servico || null,
      tipo, componentes, custo_total,
      status:          'ok',
      credenciada,
      origem:          'launcher',
      data_manutencao: new Date(),
      observacoes:     credenciada ? `Filial credenciada: ${motivo}` : `Não credenciada: ${motivo}`,
    });

    return criado(res, {
      manutencao: man,
      credenciada,
      motivo,
      penalidade_manutencao,
    }, credenciada
      ? 'Manutenção registrada (filial credenciada).'
      : 'Manutenção registrada — PENALIDADE aplicada (oficina não credenciada).');
  }),

  /** GET /api/telemetria/online */
  listarOnline: asyncHandler(async (req, res) => {
    const lista = await TelemetriaModel.listarStatusOnline();
    return sucesso(res, lista);
  }),

  /** GET /api/telemetria/meu-status */
  meuStatus: asyncHandler(async (req, res) => {
    const motoristaId = exigirMotoristaVinculado(req, res);
    if (!motoristaId) return;
    const status = await TelemetriaModel.buscarStatusPorMotorista(motoristaId);
    return sucesso(res, status);
  }),

  /** POST /api/telemetria/desconectar */
  desconectar: asyncHandler(async (req, res) => {
    const motoristaId = exigirMotoristaVinculado(req, res);
    if (!motoristaId) return;
    await TelemetriaModel.marcarOffline(motoristaId);
    return sucesso(res, null, 'Status atualizado para offline.');
  })
};

module.exports = TelemetriaController;
