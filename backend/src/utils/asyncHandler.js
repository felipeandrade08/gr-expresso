// =====================================================================
// FELIPINHO LAUNCHER - Wrapper para tratamento automático de erros assíncronos
// Evita repetir try/catch em todos os controllers
// =====================================================================

/**
 * Envolve uma função de controller assíncrona, capturando erros
 * e repassando ao middleware de erro central (next(err)).
 * @param {Function} fn - função async (req, res, next)
 */
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
