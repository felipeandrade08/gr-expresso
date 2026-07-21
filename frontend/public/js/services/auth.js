// =====================================================================
// FELIPINHO LAUNCHER - Serviço de Autenticação (frontend)
// =====================================================================

const CHAVE_TOKEN = 'gr_expresso_token';
const CHAVE_USUARIO = 'gr_expresso_usuario';

const AuthService = {
  salvarSessao(token, usuario) {
    sessionStorage.setItem(CHAVE_TOKEN, token);
    sessionStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
  },

  obterToken() {
    return sessionStorage.getItem(CHAVE_TOKEN);
  },

  obterUsuario() {
    const bruto = sessionStorage.getItem(CHAVE_USUARIO);
    return bruto ? JSON.parse(bruto) : null;
  },

  estaAutenticado() {
    return !!this.obterToken();
  },

  ehAdmin() {
    const u = this.obterUsuario();
    return u?.tipo === 'admin';
  },

  /** Diretoria tem os mesmos acessos que admin */
  ehDiretoria() {
    const u = this.obterUsuario();
    return u?.tipo === 'admin' || u?.tipo === 'diretoria';
  },

  ehRH() {
    const u = this.obterUsuario();
    return ['admin', 'diretoria', 'rh'].includes(u?.tipo);
  },

  /** Verifica se tem acesso gerencial (admin, diretoria ou rh) */
  ehGestor() {
    const u = this.obterUsuario();
    return ['admin', 'diretoria', 'rh'].includes(u?.tipo);
  },

  obterCargoBadge() {
    const u = this.obterUsuario();
    const cargos = {
      admin: 'Administrador',
      diretoria: 'Diretoria',
      rh: 'RH',
      motorista: 'Motorista'
    };
    return cargos[u?.tipo] || 'Motorista';
  },

  encerrarSessao() {
    sessionStorage.removeItem(CHAVE_TOKEN);
    sessionStorage.removeItem(CHAVE_USUARIO);
  },

  protegerPagina() {
    if (!this.estaAutenticado()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  },

  protegerPaginaAdmin() {
    if (!this.protegerPagina()) return false;
    if (!this.ehDiretoria()) {
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  },

  protegerPaginaRH() {
    if (!this.protegerPagina()) return false;
    if (!this.ehRH()) {
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  }
};

window.AuthService = AuthService;
