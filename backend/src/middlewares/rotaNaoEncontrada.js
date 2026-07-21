// =====================================================================
// FELIPINHO LAUNCHER - Middleware para rotas inexistentes (404)
// =====================================================================

const { naoEncontrado } = require('../utils/respostaPadrao');

function rotaNaoEncontrada(req, res) {
  return naoEncontrado(res, `Rota ${req.method} ${req.originalUrl} não existe.`);
}

module.exports = rotaNaoEncontrada;
