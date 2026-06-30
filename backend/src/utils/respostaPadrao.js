// =====================================================================
// GR EXPRESSO - Padronização de respostas da API
// =====================================================================

function sucesso(res, dados = null, mensagem = 'Operação realizada com sucesso', status = 200) {
  return res.status(status).json({
    sucesso: true,
    mensagem,
    dados
  });
}

function erro(res, mensagem = 'Ocorreu um erro inesperado', status = 500, detalhes = null) {
  return res.status(status).json({
    sucesso: false,
    mensagem,
    detalhes
  });
}

function criado(res, dados, mensagem = 'Registro criado com sucesso') {
  return sucesso(res, dados, mensagem, 201);
}

function naoEncontrado(res, mensagem = 'Registro não encontrado') {
  return erro(res, mensagem, 404);
}

function requisicaoInvalida(res, mensagem = 'Dados inválidos', detalhes = null) {
  return erro(res, mensagem, 400, detalhes);
}

module.exports = {
  sucesso,
  erro,
  criado,
  naoEncontrado,
  requisicaoInvalida
};
