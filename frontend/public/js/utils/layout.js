// =====================================================================
// GR EXPRESSO - Componente de Layout (Sidebar + Topbar)
// =====================================================================

const MENU_GESTOR = [
  {
    grupo: 'Visão Geral',
    itens: [
      { id: 'dashboard', label: 'Dashboard', icone: 'fa-gauge-high', href: 'dashboard.html' },
      { id: 'ao-vivo', label: 'Ao Vivo', icone: 'fa-satellite-dish', href: 'ao-vivo.html' },
      { id: 'mapa', label: 'Mapa das Entregas', icone: 'fa-map-location-dot', href: 'mapa.html' },
      { id: 'ranking', label: 'Ranking de Motoristas', icone: 'fa-trophy', href: 'ranking.html' }
    ]
  },
  {
    grupo: 'Operação',
    itens: [
      { id: 'viagens', label: 'Viagens', icone: 'fa-route', href: 'viagens.html' },
      { id: 'onibus', label: 'Frota de Ônibus', icone: 'fa-bus-simple', href: 'onibus.html' },
      { id: 'abastecimentos', label: 'Abastecimentos', icone: 'fa-gas-pump', href: 'abastecimentos.html' },
      { id: 'manutencoes', label: 'Manutenções', icone: 'fa-screwdriver-wrench', href: 'manutencoes.html' },
      { id: 'motoristas', label: 'Motoristas', icone: 'fa-id-card', href: 'motoristas.html' },
      { id: 'caminhoes', label: 'Caminhões', icone: 'fa-truck', href: 'caminhoes.html' },
      { id: 'reboques', label: 'Reboques', icone: 'fa-trailer', href: 'reboques.html' }
    ]
  },
  {
    grupo: 'Financeiro',
    itens: [
      { id: 'despesas', label: 'Despesas', icone: 'fa-receipt', href: 'despesas.html' },
      { id: 'notas-fiscais', label: 'Notas Fiscais', icone: 'fa-file-invoice', href: 'notas-fiscais.html' },
      { id: 'financeiro', label: 'Controle Financeiro', icone: 'fa-sack-dollar', href: 'financeiro.html' },
      { id: 'relatorios', label: 'Relatórios Avançados', icone: 'fa-chart-line', href: 'relatorios.html' }
    ]
  },
  {
    grupo: 'Sistema',
    itens: [
      { id: 'aprovacoes', label: 'Aprovações de Acesso', icone: 'fa-user-check', href: 'aprovacoes.html', badge: 'pendentes' },
      { id: 'recrutamentos', label: 'Recrutamentos', icone: 'fa-user-plus', href: 'recrutamentos.html' },
      { id: 'integracoes', label: 'Integrações', icone: 'fa-plug', href: 'integracoes.html' },
      { id: 'downloads', label: 'Downloads', icone: 'fa-download', href: 'downloads.html' }
    ]
  }
];

const MENU_MOTORISTA = [
  {
    grupo: 'Minha Área',
    itens: [
      { id: 'dashboard', label: 'Meu Painel', icone: 'fa-gauge-high', href: 'dashboard.html' },
      { id: 'ao-vivo', label: 'Ao Vivo', icone: 'fa-satellite-dish', href: 'ao-vivo.html' },
      { id: 'onibus', label: 'Frota de Ônibus', icone: 'fa-bus-simple', href: 'onibus.html' },
      { id: 'viagens', label: 'Minhas Viagens', icone: 'fa-route', href: 'viagens.html' },
      { id: 'abastecimentos', label: 'Meus Abastecimentos', icone: 'fa-gas-pump', href: 'abastecimentos.html' },
      { id: 'manutencoes', label: 'Minhas Manutenções', icone: 'fa-screwdriver-wrench', href: 'manutencoes.html' },
      { id: 'notas-fiscais', label: 'Minhas Notas Fiscais', icone: 'fa-file-invoice', href: 'notas-fiscais.html' },
      { id: 'ranking', label: 'Ranking de Motoristas', icone: 'fa-trophy', href: 'ranking.html' },
      { id: 'mapa', label: 'Mapa das Entregas', icone: 'fa-map-location-dot', href: 'mapa.html' },
      { id: 'downloads', label: 'Downloads', icone: 'fa-download', href: 'downloads.html' }
    ]
  }
];

function obterMenuAtual() {
  return AuthService.ehGestor() ? MENU_GESTOR : MENU_MOTORISTA;
}

function renderizarSidebar(paginaAtiva) {
  const itensMenu = obterMenuAtual();

  const grupos = itensMenu.map((grupo) => `
    <div class="sidebar-grupo-titulo">${grupo.grupo}</div>
    ${grupo.itens.map((item) => `
      <a href="${item.href}" class="sidebar-link ${item.id === paginaAtiva ? 'ativo' : ''}" data-badge="${item.badge || ''}">
        <i class="fa-solid ${item.icone}"></i>
        <span>${item.label}</span>
        ${item.badge ? `<span class="sidebar-badge" id="badge-${item.badge}" style="display:none;"></span>` : ''}
      </a>
    `).join('')}
  `).join('');

  return `
    <aside class="sidebar" id="sidebarPrincipal">
      <div class="sidebar-marca">
        <img src="img/logo/logo-gr-expresso.png" alt="GR EXPRESSO" class="sidebar-marca__icone-img">
        <div class="sidebar-marca__texto">
          <span class="sidebar-marca__nome">GR EXPRESSO</span>
          <span class="sidebar-marca__sub">ETS2 Logística</span>
        </div>
      </div>
      <nav class="sidebar-nav">${grupos}</nav>
      <div class="sidebar-rodape">
        GR EXPRESSO v1.0 &middot; Transportadora Virtual
      </div>
    </aside>
    <div class="overlay-sidebar" id="overlaySidebar"></div>
  `;
}

function renderizarTopbar(titulo, subtitulo) {
  const usuario = AuthService.obterUsuario() || { nome: 'Usuário', tipo: 'motorista' };
  const iniciais = (usuario.nome || '?')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  const cargo = AuthService.obterCargoBadge();

  // Cor do badge por cargo
  const coresMap = {
    Administrador: 'var(--verde-limao)',
    Diretoria: '#FFB020',
    RH: '#5865F2',
    Motorista: 'var(--cinza-400)'
  };
  const corCargo = coresMap[cargo] || 'var(--cinza-400)';

  return `
    <header class="topbar">
      <div class="d-flex align-items-center gap-3">
        <button class="btn-toggle-sidebar" id="btnToggleSidebar" aria-label="Abrir menu">
          <i class="fa-solid fa-bars"></i>
        </button>
        <div class="topbar-titulo">
          <h1>${titulo}</h1>
          <p>${subtitulo || ''}</p>
        </div>
      </div>
      <div class="topbar-acoes">
        <div class="busca-topbar d-none d-md-block">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" placeholder="Buscar no sistema..." />
        </div>
        <div class="icone-notificacao" id="btnNotificacoes">
          <i class="fa-regular fa-bell"></i>
          <span class="bolha" id="bolhaNotificacao" style="display:none;"></span>
        </div>
        <div class="perfil-usuario" id="btnPerfilUsuario">
          <div class="perfil-usuario__avatar">${iniciais}</div>
          <div>
            <div class="perfil-usuario__nome">${usuario.nome}</div>
            <div class="perfil-usuario__cargo" style="color:${corCargo}; font-weight:600;">${cargo}</div>
          </div>
          <i class="fa-solid fa-chevron-down" style="font-size:0.7rem;color:var(--cinza-600)"></i>
        </div>
      </div>
    </header>
  `;
}

function montarLayout({ paginaAtiva, titulo, subtitulo }) {
  if (!AuthService.protegerPagina()) return;

  const raiz = document.getElementById('appShell');
  const conteudoExistente = document.getElementById('conteudoPagina');
  const htmlConteudo = conteudoExistente ? conteudoExistente.innerHTML : '';

  raiz.innerHTML = `
    ${renderizarSidebar(paginaAtiva)}
    <div class="conteudo-principal">
      ${renderizarTopbar(titulo, subtitulo)}
      <main class="area-pagina" id="conteudoPagina">
        ${htmlConteudo}
      </main>
    </div>
  `;

  const btnToggle = document.getElementById('btnToggleSidebar');
  const sidebar = document.getElementById('sidebarPrincipal');
  const overlay = document.getElementById('overlaySidebar');

  function abrirMenu() { sidebar.classList.add('aberta'); overlay.classList.add('ativo'); }
  function fecharMenu() { sidebar.classList.remove('aberta'); overlay.classList.remove('ativo'); }

  btnToggle?.addEventListener('click', abrirMenu);
  overlay?.addEventListener('click', fecharMenu);

  const btnPerfil = document.getElementById('btnPerfilUsuario');
  btnPerfil?.addEventListener('click', () => {
    Swal.fire({
      title: 'Sair do sistema?',
      text: 'Você precisará fazer login novamente para voltar a acessar o GR EXPRESSO.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sair',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0B3D2E',
      cancelButtonColor: '#9AA39E'
    }).then((resultado) => {
      if (resultado.isConfirmed) {
        AuthService.encerrarSessao();
        window.location.href = 'index.html';
      }
    });
  });

  if (AuthService.ehRH()) {
    carregarBadgePendentes();
  }
}

async function carregarBadgePendentes() {
  try {
    const pendentes = await ApiService.get('/auth/usuarios/pendentes');
    if (pendentes.length > 0) {
      const badge = document.getElementById('badge-pendentes');
      const bolha = document.getElementById('bolhaNotificacao');
      if (badge) { badge.textContent = pendentes.length; badge.style.display = 'inline-flex'; }
      if (bolha) bolha.style.display = 'block';
    }
  } catch (erro) {
    console.error('Erro ao carregar pendências:', erro);
  }
}

window.montarLayout = montarLayout;

// ─── Notificações SSE de pendentes ───────────────────────────────────
(function initNotificacoes() {
  if (!AuthService.ehGestor()) return;

  function atualizarBadge(total) {
    const badge = document.getElementById('badgePendentes');
    if (!badge) return;
    if (total > 0) {
      badge.textContent = total;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
    // Atualiza título da página com indicador
    const titulo = document.title.replace(/^\(\d+\) /, '');
    document.title = total > 0 ? `(${total}) ${titulo}` : titulo;
  }

  // Tenta SSE primeiro; se falhar, cai para polling
  try {
    const token = AuthService.obterToken ? AuthService.obterToken() : sessionStorage.getItem('gr_token');
    // GR_API_URL já termina em /api (ex: https://host.com/api)
    const apiBase = window.GR_API_URL || 'http://localhost:3000/api';
    const url   = apiBase + '/notificacoes/stream';
    const es    = new EventSource(url + (token ? '?token=' + encodeURIComponent(token) : ''));

    es.addEventListener('pendentes_atualizados', e => {
      try { const d = JSON.parse(e.data); atualizarBadge(d.total); } catch(_) {}
    });
    es.onerror = () => { es.close(); iniciarPolling(); };
  } catch(_) { iniciarPolling(); }

  function iniciarPolling() {
    async function poll() {
      try {
        const d = await ApiService.get('/notificacoes/pendentes');
        atualizarBadge(d.total || 0);
      } catch(_) {}
    }
    poll();
    setInterval(poll, 30_000);
  }
})();
