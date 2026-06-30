// =====================================================================
// GR EXPRESSO - Controller: Notificações em tempo real
//
// Usa Server-Sent Events (SSE) — sem dependência extra, funciona em
// qualquer navegador moderno. O cliente se conecta em GET /notificacoes
// e recebe eventos quando surgem novos pendentes.
// =====================================================================

const { pool } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// Clientes SSE conectados: Map<usuarioId, response>
const clientes = new Map();

// Envia evento para um usuário específico
function notificarUsuario(usuarioId, evento, dados) {
  const res = clientes.get(String(usuarioId));
  if (res) {
    res.write(`event: ${evento}\n`);
    res.write(`data: ${JSON.stringify(dados)}\n\n`);
  }
}

// Envia evento para todos os admins conectados
async function notificarAdmins(evento, dados) {
  for (const [uid, res] of clientes.entries()) {
    try {
      res.write(`event: ${evento}\n`);
      res.write(`data: ${JSON.stringify(dados)}\n\n`);
    } catch (_) {
      clientes.delete(uid);
    }
  }
}

// Conta todos os pendentes (abastecimentos + manutenções)
async function contarPendentes() {
  const [[ab]] = await pool.query(
    "SELECT COUNT(*) AS total FROM abastecimentos WHERE status = 'pendente'"
  );
  const [[man]] = await pool.query(
    "SELECT COUNT(*) AS total FROM manutencoes WHERE status = 'pendente'"
  );
  return {
    abastecimentos: Number(ab.total),
    manutencoes:    Number(man.total),
    total:          Number(ab.total) + Number(man.total),
  };
}

// Polling interno: verifica novos pendentes a cada 15s e notifica admins
let _ultimoTotal = 0;
setInterval(async () => {
  if (clientes.size === 0) return;
  try {
    const counts = await contarPendentes();
    if (counts.total !== _ultimoTotal) {
      _ultimoTotal = counts.total;
      await notificarAdmins('pendentes_atualizados', counts);
    }
  } catch (_) {}
}, 15_000);

const NotificacaoController = {

  /**
   * GET /api/notificacoes/stream
   * Abre conexão SSE. Mantém viva enquanto o cliente estiver conectado.
   */
  stream: (req, res) => {
    res.set({
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    const uid = String(req.usuario.id);
    clientes.set(uid, res);

    // Envia contagem imediata ao conectar
    contarPendentes().then(counts => {
      res.write(`event: pendentes_atualizados\n`);
      res.write(`data: ${JSON.stringify(counts)}\n\n`);
    });

    // Heartbeat a cada 25s para manter a conexão viva
    const hb = setInterval(() => {
      try { res.write(': ping\n\n'); } catch (_) { clearInterval(hb); }
    }, 25_000);

    req.on('close', () => {
      clientes.delete(uid);
      clearInterval(hb);
    });
  },

  /**
   * GET /api/notificacoes/pendentes
   * Retorna contagem atual (para polling simples sem SSE).
   */
  contarPendentes: asyncHandler(async (req, res) => {
    const counts = await contarPendentes();
    const { sucesso } = require('../utils/respostaPadrao');
    return sucesso(res, counts);
  }),
};

module.exports = { NotificacaoController, notificarAdmins };
