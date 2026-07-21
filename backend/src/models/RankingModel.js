// =====================================================================
// FELIPINHO LAUNCHER - Model: Ranking (Pontuação e Penalidades)
//
// REGRAS DE PONTUAÇÃO:
//
//  GANHOS (por viagem concluída):
//   +25 pts  por viagem concluída
//   +0.10 pts por km rodado
//   +15 pts  bônus dificuldade "difícil"
//   +30 pts  bônus dificuldade "extrema"
//   +50 pts  bônus de sequência: a cada 3 viagens consecutivas sem
//            multa/dano/cancelamento/atraso (acumula a cada 3)
//
//  PENALIDADES (descontadas no encerramento ou em tempo real):
//   -5 pts   por evento de velocidade acima de 100 km/h (por ocorrência)
//   -25 pts  por cancelamento de viagem
//   -30 pts  por dano na entrega (componente com dano > 0)
//   -15 pts  por multa do tipo falta_combustivel
//   -15 pts  por multa do tipo manutencao_fora_base
//   -150 pts por multa do tipo acidente
//   -valor configurado em CONFIG_MULTA para outros tipos
//
//  A pontuação nunca cai abaixo de 0.
// =====================================================================

const { pool } = require('../config/database');

// -----------------------------------------------------------------------
// Configuração centralizada de pontos (espelha CONFIG_MULTA do MultaModel
// para não criar dependência circular, mas com foco em pontos de ranking)
// -----------------------------------------------------------------------
const PONTOS = {
  por_viagem:           25,      // viagem concluída
  por_km:               0.10,    // por km rodado
  bonus_dificil:        15,
  bonus_extrema:        30,
  bonus_sequencia:      50,      // a cada 3 viagens limpas consecutivas
  sequencia_gatilho:    3,       // viagens necessárias para acionar o bônus

  penalidade: {
    velocidade:           -5,
    infracao_transito:    -5,      // multa do próprio jogo (sinal, ultrapassagem, etc.)
    falta_combustivel:    -15,
    manutencao_fora_base: -15,
    acidente:             -150,
    cancelamento:         -25,
    dano:                 -30,
    manual:               0,     // configurado pelo admin na multa
  }
};

const RankingModel = {
  // ------------------------------------------------------------------
  //  Registra um evento no log de auditoria e aplica os pontos
  // ------------------------------------------------------------------
  async registrarEvento(dados) {
    const {
      motorista_id,
      viagem_id = null,
      tipo,
      pontos: pontosRaw,
      descricao = null,
    } = dados;

    // Arredonda para 2 casas para evitar acumulação de imprecisão float
    const pontos = Math.round(Number(pontosRaw) * 100) / 100;

    await pool.query(
      `INSERT INTO ranking_eventos (motorista_id, viagem_id, tipo, pontos, descricao)
       VALUES (?, ?, ?, ?, ?)`,
      [motorista_id, viagem_id, tipo, pontos, descricao]
    );

    // Aplica os pontos ao motorista (pode ficar negativo)
    await pool.query(
      `UPDATE motoristas SET pontuacao_ranking = ROUND(pontuacao_ranking + ?, 2) WHERE id = ?`,
      [pontos, motorista_id]
    );
  },

  // ------------------------------------------------------------------
  //  Aplica penalidade de velocidade (chamado pelo TelemetriaController)
  // ------------------------------------------------------------------
  async penalizarVelocidade(motorista_id, viagem_id, velocidade_kmh) {
    const pontos = PONTOS.penalidade.velocidade;

    // Registra a multa na tabela de multas
    const MultaModel = require('./MultaModel');
    await MultaModel.registrar({
      viagem_id,
      motorista_id,
      tipo: 'velocidade',
      velocidade_kmh,
      descricao: `Velocidade detectada: ${velocidade_kmh} km/h (limite 100 km/h)`,
      origem: 'launcher',
    });

    await this.registrarEvento({
      motorista_id,
      viagem_id,
      tipo: 'penalidade_velocidade',
      pontos,
      descricao: `Excesso de velocidade: ${velocidade_kmh} km/h`,
    });

    // Quebra a sequência de viagens limpas
    await this.zerarSequencia(motorista_id);

    return pontos;
  },

  // ------------------------------------------------------------------
  //  Aplica penalidade de cancelamento de viagem
  // ------------------------------------------------------------------
  async penalizarCancelamento(motorista_id, viagem_id) {
    const pontos = PONTOS.penalidade.cancelamento;

    const MultaModel = require('./MultaModel');
    await MultaModel.registrar({
      viagem_id,
      motorista_id,
      tipo: 'cancelamento',
      descricao: 'Viagem cancelada pelo motorista',
      origem: 'launcher',
    });

    await this.registrarEvento({
      motorista_id,
      viagem_id,
      tipo: 'penalidade_cancelamento',
      pontos,
      descricao: 'Viagem cancelada',
    });

    await this.zerarSequencia(motorista_id);

    return pontos;
  },

  // ------------------------------------------------------------------
  //  Aplica penalidade de dano ao encerrar viagem
  //  danoTotal: soma dos componentes (0.0 a 4.0 teórico, 0.0 a 1.0 cada)
  // ------------------------------------------------------------------
  async penalizarDano(motorista_id, viagem_id, danoTotal) {
    if (!danoTotal || danoTotal <= 0) return 0;

    const pontos = PONTOS.penalidade.dano;

    const MultaModel = require('./MultaModel');
    await MultaModel.registrar({
      viagem_id,
      motorista_id,
      tipo: 'dano',
      descricao: `Dano total acumulado na viagem: ${(danoTotal * 100).toFixed(1)}%`,
      origem: 'launcher',
    });

    await this.registrarEvento({
      motorista_id,
      viagem_id,
      tipo: 'penalidade_dano',
      pontos,
      descricao: `Dano ${(danoTotal * 100).toFixed(1)}% acumulado`,
    });

    await this.zerarSequencia(motorista_id);

    return pontos;
  },

  // ------------------------------------------------------------------
  //  Aplica penalidade de uma multa já registrada (tipo genérico)
  // ------------------------------------------------------------------
  async penalizarMulta(motorista_id, viagem_id, tipoMulta, pontosCustom = null) {
    const pontos = pontosCustom ?? (PONTOS.penalidade[tipoMulta] || 0);
    if (pontos === 0) return 0;

    await this.registrarEvento({
      motorista_id,
      viagem_id,
      tipo: 'penalidade_multa',
      pontos,
      descricao: `Multa do tipo: ${tipoMulta}`,
    });

    await this.zerarSequencia(motorista_id);

    return pontos;
  },

  // ------------------------------------------------------------------
  //  Processa pontuação de uma viagem CONCLUÍDA
  //  Chamado pelo ViagemModel.atualizarStatus quando status = 'concluida'
  // ------------------------------------------------------------------
  async processarViagemConcluida(motorista_id, viagem_id, { distancia_km = 0, dificuldade = 'media', dano_viagem = 0 } = {}) {
    let totalPontos = 0;

    // 1. Pontos base por viagem
    const kmNum     = Number(distancia_km) || 0;
    const ptsPorKm  = Math.round(kmNum * PONTOS.por_km * 100) / 100;
    const pontosBase = PONTOS.por_viagem + ptsPorKm;
    await this.registrarEvento({
      motorista_id,
      viagem_id,
      tipo: 'bonus_viagem',
      pontos: pontosBase,
      descricao: `Viagem concluída — ${kmNum} km → +${PONTOS.por_viagem} pts base + ${ptsPorKm} pts de distância`,
    });
    totalPontos += pontosBase;

    // 2. Bônus de dificuldade
    let bonusDif = 0;
    if (dificuldade === 'dificil')  bonusDif = PONTOS.bonus_dificil;
    if (dificuldade === 'extrema')  bonusDif = PONTOS.bonus_extrema;
    if (bonusDif > 0) {
      await this.registrarEvento({
        motorista_id, viagem_id,
        tipo: 'bonus_viagem',
        pontos: bonusDif,
        descricao: `Bônus de dificuldade: ${dificuldade}`,
      });
      totalPontos += bonusDif;
    }

    // 3. Penalidade de dano — SOMENTE se não foi registrada ainda via heartbeat
    //    (evita dupla penalização: registrarAlertaManutencao já pode ter chamado penalizarDano)
    const MultaModel = require('./MultaModel');
    if (dano_viagem > 0) {
      const { total_multas: multasDano } = await MultaModel.contarPorTipo(viagem_id, 'dano');
      if (Number(multasDano) === 0) {
        // Nenhuma multa de dano registrada ainda → aplica agora
        const ptsDano = await this.penalizarDano(motorista_id, viagem_id, dano_viagem);
        totalPontos += ptsDano;
      }
      // Se já existe multa de dano (aplicada via heartbeat), não faz nada
    }

    // 4. Checa sequência de viagens limpas
    //    Uma viagem é "limpa" se não gerou nenhuma multa de qualquer tipo
    const viagemTemMulta = (await MultaModel.totaisPorViagem(viagem_id)).total_multas > 0;
    if (!viagemTemMulta && dano_viagem <= 0) {
      await this.incrementarSequencia(motorista_id, viagem_id);
    } else {
      await this.zerarSequencia(motorista_id);
    }

    return totalPontos;
  },

  // ------------------------------------------------------------------
  //  Gerenciamento da sequência de viagens limpas
  // ------------------------------------------------------------------
  async incrementarSequencia(motorista_id, viagem_id) {
    // Incrementa contador
    await pool.query(
      'UPDATE motoristas SET sequencia_viagens_limpas = sequencia_viagens_limpas + 1 WHERE id = ?',
      [motorista_id]
    );

    // Verifica se atingiu o gatilho de bônus
    const [[m]] = await pool.query(
      'SELECT sequencia_viagens_limpas FROM motoristas WHERE id = ?',
      [motorista_id]
    );

    if (m && m.sequencia_viagens_limpas % PONTOS.sequencia_gatilho === 0) {
      const seq = m.sequencia_viagens_limpas;
      await this.registrarEvento({
        motorista_id,
        viagem_id,
        tipo: 'bonus_sequencia',
        pontos: PONTOS.bonus_sequencia,
        descricao: `Bônus de sequência: ${seq} viagens sem infrações!`,
      });
    }
  },

  async zerarSequencia(motorista_id) {
    await pool.query(
      'UPDATE motoristas SET sequencia_viagens_limpas = 0 WHERE id = ?',
      [motorista_id]
    );
  },

  // ------------------------------------------------------------------
  //  Zera pontuação de TODOS os motoristas (ação administrativa)
  // ------------------------------------------------------------------
  async zerarTodos() {
    await pool.query(
      'UPDATE motoristas SET pontuacao_ranking = 0, sequencia_viagens_limpas = 0'
    );
    await pool.query('DELETE FROM ranking_eventos');
    await pool.query('DELETE FROM multas_viagem');
  },

  // ------------------------------------------------------------------
  //  Histórico de eventos de um motorista (para exibir no ranking)
  // ------------------------------------------------------------------
  async historicoEventos(motorista_id, limite = 30) {
    const limiteSeguro = Math.max(1, parseInt(limite, 10) || 30);
    const [linhas] = await pool.query(
      `SELECT re.*, v.codigo AS viagem_codigo
       FROM ranking_eventos re
       LEFT JOIN viagens v ON v.id = re.viagem_id
       WHERE re.motorista_id = ?
       ORDER BY re.criado_em DESC
       LIMIT ${limiteSeguro}`,
      [motorista_id]
    );
    return linhas;
  },

  // ------------------------------------------------------------------
  //  Lista de todos os motoristas com dados completos para o ranking
  // ------------------------------------------------------------------
  async listarRanking(limite = 20) {
    const limiteSeguro = Math.max(1, parseInt(limite, 10) || 20);
    const [linhas] = await pool.query(
      `SELECT
         m.id, m.nome, m.apelido, m.foto_url, m.status,
         m.total_km, m.total_viagens, m.total_faturado,
         m.pontuacao_ranking, m.sequencia_viagens_limpas,
         COALESCE(mult.total_multas, 0)       AS total_multas,
         COALESCE(mult.total_pontos_perdidos, 0) AS total_pontos_perdidos
       FROM motoristas m
       LEFT JOIN (
         SELECT motorista_id,
                COUNT(*)          AS total_multas,
                SUM(pontos_perdidos) AS total_pontos_perdidos
         FROM multas_viagem
         GROUP BY motorista_id
       ) mult ON mult.motorista_id = m.id
       ORDER BY m.pontuacao_ranking DESC
       LIMIT ${limiteSeguro}`
    );
    return linhas;
  },
  /**
   * Retorna a evolução de pontuação de um motorista agrupada por dia
   * (últimos N dias), calculada via soma cumulativa dos eventos de ranking.
   */
  async evolucaoPontuacao(motorista_id, dias = 30) {
    const [rows] = await pool.query(
      `SELECT
         DATE(criado_em) AS dia,
         SUM(pontos)     AS pontos_dia
       FROM ranking_eventos
       WHERE motorista_id = ?
         AND criado_em >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY dia
       ORDER BY dia ASC`,
      [motorista_id, dias]
    );
    return rows;
  },

  /**
   * Retorna evolução de pontuação de TODOS os motoristas (para gráfico
   * comparativo do admin). Agrupa por motorista + dia.
   */
  async evolucaoGeral(dias = 30) {
    const [rows] = await pool.query(
      `SELECT
         re.motorista_id,
         m.nome AS motorista_nome,
         DATE(re.criado_em) AS dia,
         SUM(re.pontos) AS pontos_dia
       FROM ranking_eventos re
       JOIN motoristas m ON m.id = re.motorista_id
       WHERE re.criado_em >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY re.motorista_id, m.nome, dia
       ORDER BY dia ASC`,
      [dias]
    );
    return rows;
  },

};

module.exports = RankingModel;
module.exports.PONTOS = PONTOS;

// ------------------------------------------------------------------
//  Hall da Fama — top motoristas dos ÚLTIMOS 30 DIAS (zera mensalmente)
//  Classificação por desempenho operacional: KM rodados (critério
//  principal) e viagens concluídas (critério de desempate).
// ------------------------------------------------------------------
RankingModel.hallDaFama = async function(limite = 5) {
  const limiteSeguro = Math.max(1, parseInt(limite, 10) || 5);
  const [linhas] = await pool.query(
    `SELECT
       m.id, m.nome, m.apelido, m.foto_url,
       m.total_viagens  AS viagens,
       m.total_km,
       m.total_faturado AS faturado,
       m.pontuacao_ranking AS pontos_periodo
     FROM motoristas m
     WHERE m.status = 'ativo'
       AND m.total_viagens > 0
     ORDER BY m.total_km DESC, m.total_viagens DESC
     LIMIT ${limiteSeguro}`
  );
  return linhas;
};

// ------------------------------------------------------------------
//  Zera ranking de UM motorista específico (ação administrativa)
// ------------------------------------------------------------------
RankingModel.zerarMotorista = async function(motorista_id) {
  await pool.query(
    'UPDATE motoristas SET pontuacao_ranking = 0, sequencia_viagens_limpas = 0 WHERE id = ?',
    [motorista_id]
  );
  await pool.query('DELETE FROM ranking_eventos WHERE motorista_id = ?', [motorista_id]);
  await pool.query('DELETE FROM multas_viagem WHERE motorista_id = ?', [motorista_id]);
};
