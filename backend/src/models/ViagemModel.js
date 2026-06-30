// =====================================================================
// GR EXPRESSO - Model: Viagens
// =====================================================================

const { pool } = require('../config/database');
const { proximoCodigo } = require('../utils/gerarCodigo');

const ViagemModel = {
  async listarTodos(filtros = {}) {
    let sql = `
      SELECT v.*,
        m.nome AS motorista_nome, m.apelido AS motorista_apelido,
        c.placa AS caminhao_placa, c.marca AS caminhao_marca, c.modelo AS caminhao_modelo,
        r.placa AS reboque_placa
      FROM viagens v
      JOIN motoristas m ON m.id = v.motorista_id
      JOIN caminhoes c ON c.id = v.caminhao_id
      LEFT JOIN reboques r ON r.id = v.reboque_id
      WHERE 1=1`;
    const params = [];

    if (filtros.status) {
      sql += ' AND v.status = ?';
      params.push(filtros.status);
    }

    if (filtros.motorista_id) {
      sql += ' AND v.motorista_id = ?';
      params.push(filtros.motorista_id);
    }

    if (filtros.caminhao_id) {
      sql += ' AND v.caminhao_id = ?';
      params.push(filtros.caminhao_id);
    }

    if (filtros.data_inicio) {
      sql += ' AND v.data_saida >= ?';
      params.push(filtros.data_inicio);
    }

    if (filtros.data_fim) {
      sql += ' AND v.data_saida <= ?';
      params.push(filtros.data_fim);
    }

    sql += ' ORDER BY v.data_saida DESC';

    const [linhas] = await pool.query(sql, params);
    return linhas;
  },

  async buscarPorId(id) {
    const [linhas] = await pool.query(
      `SELECT v.*,
        m.nome AS motorista_nome, m.apelido AS motorista_apelido,
        c.placa AS caminhao_placa, c.marca AS caminhao_marca, c.modelo AS caminhao_modelo,
        r.placa AS reboque_placa
       FROM viagens v
       JOIN motoristas m ON m.id = v.motorista_id
       JOIN caminhoes c ON c.id = v.caminhao_id
       LEFT JOIN reboques r ON r.id = v.reboque_id
       WHERE v.id = ?`,
      [id]
    );
    return linhas[0] || null;
  },

  async obterUltimoCodigo() {
    const [linhas] = await pool.query(
      `SELECT codigo FROM viagens ORDER BY id DESC LIMIT 1`
    );
    return linhas[0]?.codigo || null;
  },

  async criar(dados) {
    const {
      motorista_id, caminhao_id, reboque_id, origem, destino,
      origem_lat, origem_lng, destino_lat, destino_lng,
      carga, peso_carga, distancia_km, valor_frete,
      data_saida, data_chegada, status, dificuldade, observacoes
    } = dados;

    const ultimoCodigo = await this.obterUltimoCodigo();
    const codigo = proximoCodigo('VG-', ultimoCodigo, 4);

    const conexao = await pool.getConnection();
    try {
      await conexao.beginTransaction();

      const [resultado] = await conexao.query(
        `INSERT INTO viagens
          (codigo, motorista_id, caminhao_id, reboque_id, origem, destino,
           origem_lat, origem_lng, destino_lat, destino_lng, carga, peso_carga,
           distancia_km, valor_frete, data_saida, data_chegada, status, dificuldade, observacoes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [codigo, motorista_id, caminhao_id, reboque_id || null, origem, destino,
          origem_lat || null, origem_lng || null, destino_lat || null, destino_lng || null,
          carga || null, peso_carga || 0, distancia_km || 0, valor_frete || 0,
          data_saida, data_chegada || null, status || 'agendada', dificuldade || 'media', observacoes || null]
      );

      // Se a viagem nasce "em_andamento", marca caminhão como em_viagem
      if ((status || 'agendada') === 'em_andamento') {
        await conexao.query('UPDATE caminhoes SET status = "em_viagem" WHERE id = ?', [caminhao_id]);
        if (reboque_id) {
          await conexao.query('UPDATE reboques SET status = "em_uso" WHERE id = ?', [reboque_id]);
        }

        // Emite nota fiscal automaticamente ao iniciar a viagem
        const { proximoCodigo } = require('../utils/gerarCodigo');
        const [[ultimaNF]] = await conexao.query('SELECT numero FROM notas_fiscais ORDER BY id DESC LIMIT 1');
        const numeroNF = proximoCodigo('NF-', ultimaNF?.numero || null, 6);
        await conexao.query(
          `INSERT INTO notas_fiscais
            (numero, viagem_id, cliente, descricao_carga, valor_total, data_emissao, status, observacoes)
           VALUES (?, ?, ?, ?, ?, NOW(), 'emitida', ?)`,
          [
            numeroNF,
            resultado.insertId,
            dados.motorista_nome || 'GR EXPRESSO',
            dados.carga || 'Carga geral',
            dados.valor_frete || 0,
            'Nota fiscal gerada automaticamente pelo Launcher GR EXPRESSO ao iniciar a viagem.'
          ]
        );
      }

      await conexao.commit();
      return this.buscarPorId(resultado.insertId);
    } catch (erro) {
      await conexao.rollback();
      throw erro;
    } finally {
      conexao.release();
    }
  },

  async atualizar(id, dados) {
    const {
      motorista_id, caminhao_id, reboque_id, origem, destino,
      origem_lat, origem_lng, destino_lat, destino_lng,
      carga, peso_carga, distancia_km, valor_frete,
      data_saida, data_chegada, status, dificuldade, observacoes
    } = dados;

    await pool.query(
      `UPDATE viagens SET
        motorista_id = ?, caminhao_id = ?, reboque_id = ?, origem = ?, destino = ?,
        origem_lat = ?, origem_lng = ?, destino_lat = ?, destino_lng = ?,
        carga = ?, peso_carga = ?, distancia_km = ?, valor_frete = ?,
        data_saida = ?, data_chegada = ?, status = ?, dificuldade = ?, observacoes = ?
       WHERE id = ?`,
      [motorista_id, caminhao_id, reboque_id || null, origem, destino,
        origem_lat || null, origem_lng || null, destino_lat || null, destino_lng || null,
        carga || null, peso_carga || 0, distancia_km || 0, valor_frete || 0,
        data_saida, data_chegada || null, status, dificuldade || 'media', observacoes || null, id]
    );

    return this.buscarPorId(id);
  },

  /**
   * Atualiza apenas o status da viagem e aplica efeitos colaterais:
   * - concluida: libera caminhão/reboque, soma km, atualiza stats e PROCESSA RANKING
   * - cancelada: libera caminhão/reboque e PENALIZA no ranking
   * - em_andamento: marca caminhão/reboque como ocupados
   */
  async atualizarStatus(id, novoStatus, opcoes = {}) {
    const viagem = await this.buscarPorId(id);
    if (!viagem) return null;

    const conexao = await pool.getConnection();
    try {
      await conexao.beginTransaction();

      const dataChegada = novoStatus === 'concluida' ? new Date() : viagem.data_chegada;

      await conexao.query(
        'UPDATE viagens SET status = ?, data_chegada = ? WHERE id = ?',
        [novoStatus, dataChegada, id]
      );

      if (novoStatus === 'em_andamento') {
        await conexao.query('UPDATE caminhoes SET status = "em_viagem" WHERE id = ?', [viagem.caminhao_id]);
        if (viagem.reboque_id) {
          await conexao.query('UPDATE reboques SET status = "em_uso" WHERE id = ?', [viagem.reboque_id]);
        }
      }

      if (novoStatus === 'concluida') {
        await conexao.query(
          'UPDATE caminhoes SET status = "disponivel", km_atual = km_atual + ? WHERE id = ?',
          [viagem.distancia_km, viagem.caminhao_id]
        );
        if (viagem.reboque_id) {
          await conexao.query('UPDATE reboques SET status = "disponivel" WHERE id = ?', [viagem.reboque_id]);
        }
      }

      if (novoStatus === 'cancelada') {
        await conexao.query('UPDATE caminhoes SET status = "disponivel" WHERE id = ?', [viagem.caminhao_id]);
        if (viagem.reboque_id) {
          await conexao.query('UPDATE reboques SET status = "disponivel" WHERE id = ?', [viagem.reboque_id]);
        }
      }

      await conexao.commit();
    } catch (erro) {
      await conexao.rollback();
      throw erro;
    } finally {
      conexao.release();
    }

    // Atualiza contadores do motorista (km, viagens, faturado)
    const MotoristaModel = require('./MotoristaModel');
    await MotoristaModel.atualizarEstatisticas(viagem.motorista_id);

    // ----------------------------------------------------------------
    // Processa ranking APÓS a atualização de status
    // ----------------------------------------------------------------
    const RankingModel = require('./RankingModel');

    if (novoStatus === 'concluida') {
      // dano_viagem pode vir nas opcoes (enviado pelo Launcher ao finalizar)
      const danoViagem = opcoes.dano_viagem || 0;
      await RankingModel.processarViagemConcluida(
        viagem.motorista_id,
        id,
        {
          distancia_km: viagem.distancia_km,
          dificuldade: viagem.dificuldade,
          dano_viagem: danoViagem,
        }
      );
    }

    if (novoStatus === 'cancelada') {
      await RankingModel.penalizarCancelamento(viagem.motorista_id, id);
    }

    // Verifica se algum motorista novato atingiu 10.000 km e deve ser promovido
    if (novoStatus === 'concluida') {
      const UsuarioModel = require('./UsuarioModel');
      await UsuarioModel.verificarProgressaoNovatos();
    }

    return this.buscarPorId(id);
  },

  async excluir(id) {
    const [resultado] = await pool.query('DELETE FROM viagens WHERE id = ?', [id]);
    return resultado.affectedRows > 0;
  },

  async contarPorStatus() {
    const [linhas] = await pool.query('SELECT status, COUNT(*) as total FROM viagens GROUP BY status');
    return linhas;
  },

  async viagensRecentesComCoordenadas(limite = 50) {
    const limiteSeguro = Math.max(1, parseInt(limite, 10) || 50);
    const [linhas] = await pool.query(
      `SELECT v.id, v.codigo, v.origem, v.destino, v.origem_lat, v.origem_lng,
              v.destino_lat, v.destino_lng, v.status, m.nome AS motorista_nome
       FROM viagens v
       JOIN motoristas m ON m.id = v.motorista_id
       WHERE v.origem_lat IS NOT NULL AND v.destino_lat IS NOT NULL
       ORDER BY v.data_saida DESC
       LIMIT ${limiteSeguro}`
    );
    return linhas;
  }
};

module.exports = ViagemModel;
