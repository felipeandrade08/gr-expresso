// =====================================================================
// FELIPINHO LAUNCHER - Middleware de Autenticação e Autorização
// =====================================================================

const { verificarToken } = require('../utils/token');
const { erro } = require('../utils/respostaPadrao');

function exigirAutenticacao(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  // Aceita token via query string para SSE (EventSource não suporta headers)
  const token = cabecalho.startsWith('Bearer ')
    ? cabecalho.slice(7)
    : (req.query.token || null);

  if (!token) {
    return erro(res, 'Você precisa estar autenticado para acessar este recurso.', 401);
  }

  try {
    req.usuario = verificarToken(token);
    return next();
  } catch (e) {
    return erro(res, 'Sessão inválida ou expirada. Faça login novamente.', 401);
  }
}

/** Admin = acesso total */
function exigirAdmin(req, res, next) {
  if (!req.usuario || req.usuario.tipo !== 'admin') {
    return erro(res, 'Apenas administradores podem realizar esta ação.', 403);
  }
  return next();
}

/** Admin OU Diretoria — mesmos poderes que admin no sistema */
function exigirDiretoriaOuAdmin(req, res, next) {
  const tipo = req.usuario?.tipo;
  if (!tipo || !['admin', 'diretoria'].includes(tipo)) {
    return erro(res, 'Acesso restrito à Diretoria ou Administradores.', 403);
  }
  return next();
}

/** Admin, Diretoria OU RH */
function exigirAdminOuRH(req, res, next) {
  const tipo = req.usuario?.tipo;
  if (!tipo || !['admin', 'diretoria', 'rh'].includes(tipo)) {
    return erro(res, 'Acesso restrito à equipe administrativa (Admin, Diretoria ou RH).', 403);
  }
  return next();
}

module.exports = { exigirAutenticacao, exigirAdmin, exigirDiretoriaOuAdmin, exigirAdminOuRH };
