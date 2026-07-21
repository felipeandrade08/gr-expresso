// =====================================================================
// FELIPINHO LAUNCHER - Utilitários de formatação e helpers de UI
// =====================================================================

const Formatador = {
  moeda(valor) {
    const numero = Number(valor) || 0;
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },

  numero(valor, casasDecimais = 0) {
    const numero = Number(valor) || 0;
    return numero.toLocaleString('pt-BR', { minimumFractionDigits: casasDecimais, maximumFractionDigits: casasDecimais });
  },

  km(valor) {
    return `${this.numero(valor, 0)} km`;
  },

  data(valorData) {
    if (!valorData) return '—';
    const d = new Date(valorData);
    if (Number.isNaN(d.getTime())) return valorData;
    return d.toLocaleDateString('pt-BR');
  },

  dataHora(valorData) {
    if (!valorData) return '—';
    const d = new Date(valorData);
    if (Number.isNaN(d.getTime())) return valorData;
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  statusLabel(status) {
    const mapa = {
      ativo: 'Ativo', inativo: 'Inativo', ferias: 'Férias', suspenso: 'Suspenso',
      disponivel: 'Disponível', em_viagem: 'Em viagem', manutencao: 'Manutenção',
      em_uso: 'Em uso', agendada: 'Agendada', em_andamento: 'Em andamento',
      concluida: 'Concluída', cancelada: 'Cancelada',
      emitida: 'Emitida', paga: 'Paga', pendente: 'Pendente'
    };
    return mapa[status] || status;
  },

  badgeStatus(status) {
    return `<span class="badge-status status-${status}">${this.statusLabel(status)}</span>`;
  },

  iniciais(nome) {
    if (!nome) return '?';
    const partes = nome.trim().split(' ');
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }
};

const UI = {
  /** Exibe um toast de sucesso (SweetAlert2) */
  toastSucesso(mensagem) {
    Swal.fire({
      toast: true, position: 'top-end', icon: 'success', title: mensagem,
      showConfirmButton: false, timer: 2800, timerProgressBar: true,
      customClass: { popup: 'gr-toast' }
    });
  },

  /** Exibe um toast de erro (SweetAlert2) */
  toastErro(mensagem) {
    Swal.fire({
      toast: true, position: 'top-end', icon: 'error', title: mensagem,
      showConfirmButton: false, timer: 3800, timerProgressBar: true,
      customClass: { popup: 'gr-toast' }
    });
  },

  /** Exibe modal de confirmação de exclusão */
  async confirmarExclusao(nomeItem = 'este registro') {
    const resultado = await Swal.fire({
      title: 'Tem certeza?',
      html: `Esta ação vai excluir <b>${nomeItem}</b> permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#FF4D4F',
      cancelButtonColor: '#5C645F',
      reverseButtons: true
    });
    return resultado.isConfirmed;
  },

  /** Estado de carregamento simples para containers */
  carregando(seletorOuElemento) {
    const el = typeof seletorOuElemento === 'string' ? document.querySelector(seletorOuElemento) : seletorOuElemento;
    if (!el) return;
    el.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border" style="color:var(--verde-escuro)" role="status"></div>
        <p class="mt-3 text-muted small">Carregando dados...</p>
      </div>`;
  },

  /** Estado vazio padronizado */
  estadoVazio(seletorOuElemento, { icone = 'fa-inbox', titulo = 'Nada por aqui ainda', texto = '', botaoHtml = '' } = {}) {
    const el = typeof seletorOuElemento === 'string' ? document.querySelector(seletorOuElemento) : seletorOuElemento;
    if (!el) return;
    el.innerHTML = `
      <div class="estado-vazio">
        <i class="fa-solid ${icone}"></i>
        <h4>${titulo}</h4>
        <p>${texto}</p>
        ${botaoHtml}
      </div>`;
  },

  /** Estado de erro ao buscar dados da API */
  estadoErro(seletorOuElemento, mensagem) {
    const el = typeof seletorOuElemento === 'string' ? document.querySelector(seletorOuElemento) : seletorOuElemento;
    if (!el) return;
    el.innerHTML = `
      <div class="estado-vazio">
        <i class="fa-solid fa-plug-circle-xmark" style="color:var(--perigo)"></i>
        <h4>Não foi possível carregar os dados</h4>
        <p>${mensagem || 'Verifique se o servidor backend está rodando.'}</p>
      </div>`;
  }
};

window.Formatador = Formatador;
window.UI = UI;
