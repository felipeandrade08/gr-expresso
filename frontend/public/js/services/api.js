// =====================================================================
// GR EXPRESSO - Serviço de API (camada de comunicação com o backend)
// =====================================================================

const API_BASE_URL = (() => {
  // Permite sobrescrever via window.GR_API_URL antes de carregar este script
  if (window.GR_API_URL) return window.GR_API_URL;
  return 'http://localhost:3000/api';
})();

/**
 * Cliente HTTP central. Lança erro com mensagem amigável em caso de falha,
 * para ser capturado e exibido via SweetAlert2 nas páginas.
 */
async function apiRequest(caminho, opcoes = {}) {
  const url = `${API_BASE_URL}${caminho}`;

  const token = window.AuthService ? window.AuthService.obterToken() : null;

  const config = {
    method: opcoes.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opcoes.headers || {})
    }
  };

  if (opcoes.body) {
    config.body = JSON.stringify(opcoes.body);
  }

  let resposta;
  try {
    resposta = await fetch(url, config);
  } catch (erroRede) {
    const erro = new Error('Não foi possível conectar à API do GR EXPRESSO. Verifique se o servidor backend está rodando.');
    erro.tipo = 'rede';
    throw erro;
  }

  let corpo;
  try {
    corpo = await resposta.json();
  } catch (erroParse) {
    corpo = { sucesso: false, mensagem: 'Resposta inválida do servidor.' };
  }

  if (resposta.status === 401 && window.AuthService) {
    // Sessão expirada ou inválida: encerra a sessão local e manda para o login,
    // exceto quando o próprio request de login/registro é que falhou.
    const ehRotaDeAuth = caminho.startsWith('/auth/login') || caminho.startsWith('/auth/registrar');
    if (!ehRotaDeAuth) {
      window.AuthService.encerrarSessao();
      window.location.href = 'index.html';
    }
  }

  if (!resposta.ok || !corpo.sucesso) {
    const erro = new Error(corpo.mensagem || `Erro ${resposta.status} ao consultar a API.`);
    erro.status = resposta.status;
    erro.detalhes = corpo.detalhes;
    throw erro;
  }

  return corpo.dados;
}

const ApiService = {
  get: (caminho) => apiRequest(caminho, { method: 'GET' }),
  post: (caminho, body) => apiRequest(caminho, { method: 'POST', body }),
  put: (caminho, body) => apiRequest(caminho, { method: 'PUT', body }),
  patch: (caminho, body) => apiRequest(caminho, { method: 'PATCH', body }),
  delete: (caminho) => apiRequest(caminho, { method: 'DELETE' })
};

window.ApiService = ApiService;
window.API_BASE_URL = API_BASE_URL;
