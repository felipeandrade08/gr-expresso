// =====================================================================
// FELIPINHO LAUNCHER - Middleware central de tratamento de erros
// =====================================================================

const { erro } = require('../utils/respostaPadrao');

function tratadorDeErros(err, req, res, next) {
  console.error('🔥 Erro capturado:', err);

  // Erros de chave estrangeira / integridade do MySQL
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    return erro(res, 'Registro relacionado não encontrado (verifique IDs informados).', 400);
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    return erro(res, 'Não é possível excluir: este registro está sendo usado em outro lugar do sistema.', 409);
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return erro(res, 'Já existe um registro com esse valor único (placa, código, número, etc).', 409);
  }

  if (err.code === 'ECONNREFUSED') {
    return erro(res, 'Não foi possível conectar ao banco de dados.', 503);
  }

  if (err.message === 'Origem não permitida pela política de CORS.') {
    return erro(res, 'Este endereço não tem permissão para acessar a API do FELIPINHO LAUNCHER.', 403);
  }

  return erro(res, err.mensagemPublica || 'Erro interno do servidor.', err.status || 500);
}

module.exports = tratadorDeErros;
