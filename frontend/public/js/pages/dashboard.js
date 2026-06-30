// =====================================================================
// GR EXPRESSO - Página: Dashboard
// Bifurca entre painel completo (admin) e painel pessoal (motorista)
// =====================================================================

(async function () {
  const ehAdmin = AuthService.ehAdmin();

  montarLayout({
    paginaAtiva: 'dashboard',
    titulo: ehAdmin ? 'Dashboard' : 'Meu Painel',
    subtitulo: ehAdmin ? 'Visão geral da operação da transportadora' : 'Acompanhe suas viagens e desempenho'
  });

  AOS.init({ duration: 500, once: true });

  if (ehAdmin) {
    await montarDashboardAdmin();
  } else {
    await montarDashboardMotorista();
  }
})();

function formatarMesLabel(mesAno) {
  if (!mesAno) return '';
  const [ano, mes] = mesAno.split('-');
  const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomesMeses[Number(mes) - 1]}/${ano.slice(2)}`;
}

// =====================================================================
// PAINEL DO ADMINISTRADOR
// =====================================================================

async function montarDashboardAdmin() {
  const main = document.getElementById('conteudoPagina');
  main.innerHTML = `
    <section class="row g-3 mb-4" id="gridIndicadores" data-aos="fade-up"></section>

    <div class="row g-3 mb-4">
      <div class="col-lg-8" data-aos="fade-up" data-aos-delay="50">
        <div class="card-gr h-100">
          <div class="card-gr__header">
            <h3>Faturamento dos últimos 6 meses</h3>
            <span class="badge-status status-ativo"><i class="fa-solid fa-circle"></i></span>
          </div>
          <div class="card-gr__body"><canvas id="graficoFaturamento" height="110"></canvas></div>
        </div>
      </div>
      <div class="col-lg-4" data-aos="fade-up" data-aos-delay="100">
        <div class="card-gr h-100">
          <div class="card-gr__header"><h3>Viagens por status</h3></div>
          <div class="card-gr__body d-flex align-items-center justify-content-center">
            <canvas id="graficoViagensStatus" height="220"></canvas>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-lg-8" data-aos="fade-up">
        <div class="card-gr">
          <div class="card-gr__header">
            <h3>Últimas viagens</h3>
            <a href="viagens.html" class="btn-gr-outline btn-sm">Ver todas</a>
          </div>
          <div class="table-responsive">
            <table class="tabela-gr">
              <thead><tr><th>Código</th><th>Motorista</th><th>Rota</th><th>Caminhão</th><th>Frete</th><th>Status</th></tr></thead>
              <tbody id="corpoUltimasViagens"><tr><td colspan="6" class="text-center text-muted py-4">Carregando...</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="col-lg-4" data-aos="fade-up" data-aos-delay="50">
        <div class="card-gr h-100">
          <div class="card-gr__header">
            <h3>Top motoristas do mês</h3>
            <a href="ranking.html" class="btn-gr-outline btn-sm">Ranking</a>
          </div>
          <div class="card-gr__body" id="listaTopMotoristas"></div>
        </div>
      </div>
    </div>

    <div class="row g-3 mt-1">
      <div class="col-12" data-aos="fade-up">
        <div class="card-gr" id="cardAlertas" style="display:none;">
          <div class="card-gr__header"><h3><i class="fa-solid fa-triangle-exclamation me-2" style="color:var(--alerta)"></i>Alertas da frota</h3></div>
          <div class="card-gr__body" id="corpoAlertas"></div>
        </div>
      </div>
    </div>

    <!-- FEED DE ENTREGAS + HALL DA FAMA -->
    <div class="row g-3 mt-1">
      <div class="col-lg-7" data-aos="fade-up">
        <div class="card-gr">
          <div class="card-gr__header">
            <h3><i class="fa-solid fa-satellite-dish me-2" style="color:var(--verde-limao)"></i>Feed ao vivo de entregas</h3>
            <span class="badge-live"><span class="badge-live__dot"></span>AO VIVO</span>
          </div>
          <div class="feed-entregas" id="feedEntregas">
            <div class="text-center text-muted py-4" style="font-size:0.85rem;">Aguardando dados...</div>
          </div>
        </div>
      </div>
      <div class="col-lg-5" data-aos="fade-up" data-aos-delay="60">
        <div class="card-gr h-100">
          <div class="card-gr__header">
            <h3><i class="fa-solid fa-crown me-2" style="color:#FFB020"></i>Hall da Fama</h3>
            <a href="ranking.html" class="btn-gr-outline btn-sm">Ver ranking</a>
          </div>
          <div class="card-gr__body" id="hallFama">
            <div class="text-center text-muted py-4" style="font-size:0.85rem;">Carregando...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const [resumo, hallFama] = await Promise.all([
      ApiService.get('/dashboard/resumo'),
      ApiService.get('/motoristas/hall-da-fama?limite=5')
    ]);
    renderizarIndicadoresAdmin(resumo.indicadores);
    renderizarGraficoFaturamento(resumo.faturamento_por_mes);
    renderizarGraficoViagensStatus(resumo.viagens_por_status);
    renderizarUltimasViagens(resumo.ultimas_viagens);
    renderizarTopMotoristas(resumo.top_motoristas);
    renderizarAlertas(resumo.alertas);
    renderizarFeedEntregas(resumo.ultimas_viagens);
    renderizarHallDaFama(hallFama);
  } catch (erro) {
    console.error(erro);
    UI.estadoErro('#gridIndicadores', erro.message);
  }
}

function renderizarIndicadoresAdmin(ind) {
  const cartoes = [
    { label: 'Faturamento do mês', valor: Formatador.moeda(ind.faturamento_mes), icone: 'fa-sack-dollar', cor: 'bg-limao' },
    { label: 'Lucro estimado do mês', valor: Formatador.moeda(ind.lucro_mes), icone: 'fa-chart-line', cor: 'bg-verde' },
    { label: 'Viagens em andamento', valor: ind.viagens_em_andamento, icone: 'fa-route', cor: 'bg-info' },
    { label: 'KM rodados no mês', valor: Formatador.km(ind.km_rodado_mes), icone: 'fa-road', cor: 'bg-verde' },
    { label: 'Motoristas ativos', valor: ind.motoristas_ativos, icone: 'fa-id-card', cor: 'bg-info' },
    { label: 'Caminhões disponíveis', valor: `${ind.caminhoes_disponiveis} / ${ind.total_caminhoes}`, icone: 'fa-truck', cor: 'bg-verde' },
    { label: 'Despesas do mês', valor: Formatador.moeda(ind.despesas_mes), icone: 'fa-receipt', cor: 'bg-alerta' },
    { label: 'Combustível do mês', valor: Formatador.moeda(ind.combustivel_mes), icone: 'fa-gas-pump', cor: 'bg-alerta' }
  ];

  document.getElementById('gridIndicadores').innerHTML = cartoes.map((c) => `
    <div class="col-6 col-lg-3">
      <div class="card-indicador">
        <div class="card-indicador__icone ${c.cor}"><i class="fa-solid ${c.icone}"></i></div>
        <div class="card-indicador__valor">${c.valor}</div>
        <div class="card-indicador__label">${c.label}</div>
      </div>
    </div>
  `).join('');
}

function renderizarGraficoFaturamento(dados) {
  const ctx = document.getElementById('graficoFaturamento');
  const labels = dados.map((d) => formatarMesLabel(d.mes));
  const valores = dados.map((d) => Number(d.total));

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Faturamento (R$)',
        data: valores,
        borderColor: '#0B3D2E',
        backgroundColor: (context) => {
          const { ctx: c, chartArea } = context.chart;
          if (!chartArea) return 'rgba(164,255,0,0.15)';
          const gradiente = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradiente.addColorStop(0, 'rgba(164,255,0,0.35)');
          gradiente.addColorStop(1, 'rgba(164,255,0,0.02)');
          return gradiente;
        },
        borderWidth: 2.5,
        pointBackgroundColor: '#A4FF00',
        pointBorderColor: '#0B3D2E',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: (v) => `R$ ${v}` }, grid: { color: '#E7EBE9' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderizarGraficoViagensStatus(dados) {
  const ctx = document.getElementById('graficoViagensStatus');
  const cores = { agendada: '#FFB020', em_andamento: '#3AA6FF', concluida: '#A4FF00', cancelada: '#FF4D4F' };

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: dados.map((d) => Formatador.statusLabel(d.status)),
      datasets: [{
        data: dados.map((d) => d.total),
        backgroundColor: dados.map((d) => cores[d.status] || '#9AA39E'),
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      cutout: '68%',
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } }
    }
  });
}

function renderizarUltimasViagens(viagens) {
  const corpo = document.getElementById('corpoUltimasViagens');

  if (!viagens.length) {
    corpo.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Nenhuma viagem registrada ainda.</td></tr>`;
    return;
  }

  corpo.innerHTML = viagens.map((v) => `
    <tr>
      <td class="fw-semibold">${v.codigo}</td>
      <td>${v.motorista_nome}</td>
      <td>${v.origem} <i class="fa-solid fa-arrow-right-long mx-1 text-muted" style="font-size:0.7rem;"></i> ${v.destino}</td>
      <td>${v.caminhao_placa}</td>
      <td>${Formatador.moeda(v.valor_frete)}</td>
      <td>${Formatador.badgeStatus(v.status)}</td>
    </tr>
  `).join('');
}

function renderizarTopMotoristas(motoristas) {
  const container = document.getElementById('listaTopMotoristas');

  if (!motoristas.length) {
    UI.estadoVazio(container, { icone: 'fa-trophy', titulo: 'Sem dados ainda', texto: 'Nenhuma viagem concluída neste mês.' });
    return;
  }

  container.innerHTML = motoristas.map((m, i) => `
    <div class="podio-item ${i === 0 ? 'primeiro' : ''}">
      <div class="podio-posicao">${i + 1}</div>
      <div class="podio-avatar">${Formatador.iniciais(m.nome)}</div>
      <div class="flex-grow-1">
        <div class="fw-semibold" style="font-size:0.86rem;">${m.apelido || m.nome}</div>
        <div class="text-muted" style="font-size:0.74rem;">${m.viagens} viagens · ${Formatador.km(m.total_km)}</div>
      </div>
    </div>
  `).join('');
}

function renderizarAlertas(alertas) {
  const card = document.getElementById('cardAlertas');
  const corpo = document.getElementById('corpoAlertas');
  const itens = [];

  if (alertas.caminhoes_em_manutencao.length) {
    alertas.caminhoes_em_manutencao.forEach((c) => {
      itens.push(`
        <div class="col-md-4">
          <div class="d-flex align-items-center gap-3 p-3 rounded-3" style="background:rgba(255,77,79,0.06);">
            <i class="fa-solid fa-truck-ramp-box" style="color:var(--perigo)"></i>
            <div>
              <div class="fw-semibold" style="font-size:0.85rem;">${c.placa} em manutenção</div>
              <div class="text-muted" style="font-size:0.76rem;">${c.marca} ${c.modelo}</div>
            </div>
          </div>
        </div>
      `);
    });
  }

  if (alertas.notas_fiscais_pendentes > 0) {
    itens.push(`
      <div class="col-md-4">
        <div class="d-flex align-items-center gap-3 p-3 rounded-3" style="background:rgba(255,176,32,0.08);">
          <i class="fa-solid fa-file-invoice" style="color:var(--alerta)"></i>
          <div>
            <div class="fw-semibold" style="font-size:0.85rem;">${alertas.notas_fiscais_pendentes} nota(s) fiscal(is) pendente(s)</div>
            <div class="text-muted" style="font-size:0.76rem;">Verifique a seção de Notas Fiscais</div>
          </div>
        </div>
      </div>
    `);
  }

  if (itens.length) {
    card.style.display = 'block';
    corpo.innerHTML = `<div class="row g-2">${itens.join('')}</div>`;
  }
}


// =====================================================================
// FEED DE ENTREGAS AO VIVO
// =====================================================================

let _feedViagens = [];
let _feedIndex = 0;
let _feedInterval = null;

function renderizarFeedEntregas(viagens) {
  _feedViagens = (viagens || []).slice();
  _feedIndex = 0;
  const container = document.getElementById('feedEntregas');
  if (!container) return;

  if (!_feedViagens.length) {
    container.innerHTML = `<div class="feed-vazio"><i class="fa-solid fa-route"></i><span>Nenhuma viagem recente</span></div>`;
    return;
  }

  container.innerHTML = '';

  // Renderiza todos os itens de uma vez (até 8), depois anima entrada sequencial
  const visiveis = _feedViagens.slice(0, 8);
  visiveis.forEach((v, i) => {
    const item = criarItemFeed(v, i);
    container.appendChild(item);
  });

  // Inicia ciclo de "nova entrega chegando" a cada 4 segundos
  if (_feedInterval) clearInterval(_feedInterval);
  _feedInterval = setInterval(() => {
    _feedIndex = (_feedIndex + 1) % _feedViagens.length;
    const container = document.getElementById('feedEntregas');
    if (!container) { clearInterval(_feedInterval); return; }

    const novo = criarItemFeed(_feedViagens[_feedIndex], 0);
    novo.classList.add('feed-item--entrando');
    container.insertBefore(novo, container.firstChild);

    // Remove o último se tiver mais de 8
    const itens = container.querySelectorAll('.feed-item');
    if (itens.length > 8) {
      const ultimo = itens[itens.length - 1];
      ultimo.classList.add('feed-item--saindo');
      setTimeout(() => ultimo.remove(), 400);
    }

    // Remove classe de animação após ela terminar
    setTimeout(() => novo.classList.remove('feed-item--entrando'), 600);
  }, 4000);
}

function criarItemFeed(v, delay) {
  const iconeStatus = {
    concluida: { icon: 'fa-circle-check', cor: 'var(--sucesso)' },
    em_andamento: { icon: 'fa-truck-moving', cor: 'var(--info)' },
    agendada: { icon: 'fa-clock', cor: 'var(--alerta)' },
    cancelada: { icon: 'fa-circle-xmark', cor: 'var(--perigo)' }
  }[v.status] || { icon: 'fa-route', cor: 'var(--cinza-400)' };

  const tempoAtras = v.data_saida ? calcularTempoAtras(v.data_saida) : '';

  const div = document.createElement('div');
  div.className = 'feed-item';
  div.style.animationDelay = `${delay * 80}ms`;
  div.innerHTML = `
    <div class="feed-item__icone" style="color:${iconeStatus.cor}">
      <i class="fa-solid ${iconeStatus.icon}"></i>
    </div>
    <div class="feed-item__corpo">
      <div class="feed-item__titulo">
        <span class="feed-item__motorista">${v.motorista_nome || 'Motorista'}</span>
        <span class="feed-item__badge" style="color:${iconeStatus.cor}">${Formatador.statusLabel(v.status)}</span>
      </div>
      <div class="feed-item__rota">
        <i class="fa-solid fa-location-dot" style="font-size:0.7rem; color:var(--cinza-400)"></i>
        ${v.origem} <i class="fa-solid fa-arrow-right mx-1" style="font-size:0.6rem; color:var(--cinza-400)"></i> ${v.destino}
      </div>
      <div class="feed-item__meta">
        <span><i class="fa-solid fa-truck" style="font-size:0.65rem;"></i> ${v.caminhao_placa}</span>
        <span>${Formatador.moeda(v.valor_frete)}</span>
        ${tempoAtras ? `<span class="feed-item__tempo">${tempoAtras}</span>` : ''}
      </div>
    </div>
  `;
  return div;
}

function calcularTempoAtras(dataStr) {
  const diff = Date.now() - new Date(dataStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

// =====================================================================
// HALL DA FAMA
// =====================================================================

function renderizarHallDaFama(motoristas) {
  const container = document.getElementById('hallFama');
  if (!container) return;

  if (!motoristas || !motoristas.length) {
    UI.estadoVazio(container, { icone: 'fa-crown', titulo: 'Hall vazio por enquanto', texto: 'Conclua viagens para aparecer aqui.' });
    return;
  }

  const medalhas = ['🥇', '🥈', '🥉'];
  const estilosPosicao = [
    'background: linear-gradient(135deg, #FFB020 0%, #FF8C00 100%); color:#fff;',
    'background: linear-gradient(135deg, #9AA39E 0%, #6b7470 100%); color:#fff;',
    'background: linear-gradient(135deg, #CD7F32 0%, #a0622a 100%); color:#fff;'
  ];

  container.innerHTML = motoristas.map((m, i) => {
    const avatar = m.foto_url
      ? `<img src="${m.foto_url}" alt="${m.nome}" class="hall-avatar hall-avatar--foto">`
      : `<div class="hall-avatar hall-avatar--iniciais" style="${estilosPosicao[i] || 'background:var(--verde-escuro);color:#fff;'}">${Formatador.iniciais(m.nome)}</div>`;

    const destaque = i === 0 ? 'hall-item--destaque' : '';

    return `
      <div class="hall-item ${destaque}">
        <div class="hall-posicao">${medalhas[i] || `#${i + 1}`}</div>
        ${avatar}
        <div class="hall-info">
          <div class="hall-nome">${m.apelido || m.nome}</div>
          <div class="hall-stats">
            <span><i class="fa-solid fa-flag-checkered"></i> ${m.viagens} viagens</span>
            <span class="hall-faturado">${Formatador.km(m.total_km)}</span>
          </div>
        </div>
        ${i === 0 ? '<div class="hall-coroa"><i class="fa-solid fa-crown"></i></div>' : ''}
      </div>
    `;
  }).join('');
}

// =====================================================================
// PAINEL DO MOTORISTA
// =====================================================================

async function montarDashboardMotorista() {
  const main = document.getElementById('conteudoPagina');

  // Popup de boas-vindas/novidades (uma vez por sessão)
  mostrarPopupBoasVindas();

  // Badge de nível do motorista
  const usuario = AuthService.obterUsuario();
  const nivel = usuario?.motorista_nivel || 'novato';
  const badgeNivel = nivel === 'novato'
    ? `<span style="background:rgba(255,176,32,0.15);color:#FFB020;border:1px solid rgba(255,176,32,0.3);font-size:0.7rem;font-weight:700;padding:3px 10px;border-radius:99px;margin-left:8px;"><i class="fa-solid fa-seedling me-1"></i>Motorista Novato</span>`
    : `<span style="background:rgba(164,255,0,0.12);color:var(--verde-limao);border:1px solid rgba(164,255,0,0.25);font-size:0.7rem;font-weight:700;padding:3px 10px;border-radius:99px;margin-left:8px;"><i class="fa-solid fa-star me-1"></i>Motorista</span>`;

  main.innerHTML = `
    <section class="row g-3 mb-4" id="gridIndicadoresMotorista" data-aos="fade-up"></section>

    <!-- Linha 1: Feed de viagens + posição no ranking -->
    <div class="row g-3 mb-3">
      <div class="col-lg-8" data-aos="fade-up">
        <div class="card-gr">
          <div class="card-gr__header">
            <h3><i class="fa-solid fa-satellite-dish me-2" style="color:var(--verde-limao)"></i>Feed de Viagens${badgeNivel}</h3>
            <a href="viagens.html" class="btn-gr-outline btn-sm">Ver todas</a>
          </div>
          <div class="feed-entregas" id="feedMotorista">
            <div class="text-center text-muted py-4" style="font-size:0.85rem;">Carregando...</div>
          </div>
        </div>
      </div>
      <div class="col-lg-4" data-aos="fade-up" data-aos-delay="50">
        <div class="card-gr h-100">
          <div class="card-gr__header">
            <h3>Minha posição</h3>
            <a href="ranking.html" class="btn-gr-outline btn-sm">Ranking completo</a>
          </div>
          <div class="card-gr__body" id="minhaPosicaoRanking"></div>
        </div>
      </div>
    </div>

    <!-- Linha 2: Hall da Fama (últimos 30 dias) -->
    <div class="row g-3">
      <div class="col-12" data-aos="fade-up">
        <div class="card-gr">
          <div class="card-gr__header">
            <h3><i class="fa-solid fa-crown me-2" style="color:#FFB020"></i>Hall da Fama — Últimos 30 dias</h3>
            <span style="font-size:0.74rem;color:rgba(255,255,255,0.4);">Reseta automaticamente a cada ciclo</span>
          </div>
          <div class="card-gr__body" id="hallFamaMotorista" style="padding:0;"></div>
        </div>
      </div>
    </div>
  `;

  try {
    const [viagens, ranking, hallFama] = await Promise.all([
      ApiService.get('/viagens'),
      ApiService.get('/motoristas/ranking?limite=50'),
      ApiService.get('/motoristas/hall-da-fama?limite=5')
    ]);

    renderizarIndicadoresMotorista(viagens);
    renderizarFeedMotorista(viagens);
    renderizarMinhaPosicaoRanking(ranking, usuario?.motorista_id);
    renderizarHallDaFamaMotorista(hallFama);
  } catch (erro) {
    console.error(erro);
    UI.estadoErro('#gridIndicadoresMotorista', erro.message);
  }
}

function renderizarFeedMotorista(viagens) {
  const container = document.getElementById('feedMotorista');
  if (!container) return;

  if (!viagens || !viagens.length) {
    container.innerHTML = `<div class="feed-vazio"><i class="fa-solid fa-route"></i><span>Nenhuma viagem registrada ainda</span></div>`;
    return;
  }

  const recentes = viagens.slice(0, 10);
  container.innerHTML = '';
  recentes.forEach((v, i) => {
    const item = criarItemFeedMotorista(v, i);
    container.appendChild(item);
  });
}

function criarItemFeedMotorista(v, i) {
  const statusCores = { concluida: '#A4FF00', em_andamento: '#FFB020', agendada: '#5865F2', cancelada: '#FF4D4F' };
  const statusLabels = { concluida: 'Concluída', em_andamento: 'Em andamento', agendada: 'Agendada', cancelada: 'Cancelada' };
  const cor = statusCores[v.status] || '#9AA39E';
  const label = statusLabels[v.status] || v.status;
  const tempo = calcularTempoAtras(v.data_saida);

  const div = document.createElement('div');
  div.className = 'feed-item';
  div.style.animationDelay = `${i * 60}ms`;
  div.innerHTML = `
    <div class="feed-item__status" style="background:${cor}20;border-color:${cor}40;">
      <span style="width:7px;height:7px;border-radius:50%;background:${cor};display:inline-block;"></span>
    </div>
    <div class="feed-item__corpo">
      <div class="feed-item__cabecalho">
        <span class="feed-item__codigo">${v.codigo}</span>
        <span style="font-size:0.7rem;font-weight:700;color:${cor};">${label}</span>
      </div>
      <div class="feed-item__rota">
        <i class="fa-solid fa-location-dot" style="font-size:0.7rem;color:var(--cinza-400)"></i>
        ${v.origem} <i class="fa-solid fa-arrow-right mx-1" style="font-size:0.6rem;color:var(--cinza-400)"></i> ${v.destino}
      </div>
      <div class="feed-item__meta">
        <span><i class="fa-solid fa-truck" style="font-size:0.65rem;"></i> ${v.caminhao_placa || '—'}</span>
        <span>${Formatador.moeda(v.valor_frete)}</span>
        <span>${Formatador.km(v.distancia_km)}</span>
        ${tempo ? `<span class="feed-item__tempo">${tempo}</span>` : ''}
      </div>
    </div>
  `;
  return div;
}

function renderizarHallDaFamaMotorista(motoristas) {
  const container = document.getElementById('hallFamaMotorista');
  if (!container) return;

  if (!motoristas || !motoristas.length) {
    container.innerHTML = `<div class="estado-vazio" style="padding:32px;"><i class="fa-solid fa-crown"></i><h4>Hall vazio por enquanto</h4><p>Conclua viagens nos últimos 30 dias para aparecer aqui.</p></div>`;
    return;
  }

  const medalhas = ['🥇', '🥈', '🥉'];
  const gradientes = [
    'linear-gradient(135deg, #FFB020, #FF8C00)',
    'linear-gradient(135deg, #9AA39E, #6b7470)',
    'linear-gradient(135deg, #CD7F32, #a0622a)'
  ];

  container.innerHTML = `
    <div style="display:flex;gap:0;overflow-x:auto;">
      ${motoristas.map((m, i) => {
        const avatar = m.foto_url
          ? `<img src="${m.foto_url}" alt="${m.nome}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,0.2);">`
          : `<div style="width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.1rem;background:${gradientes[i] || 'var(--verde-escuro)'};color:#fff;border:3px solid rgba(255,255,255,0.15);">${Formatador.iniciais(m.nome)}</div>`;

        const destaque = i === 0 ? 'border-top:3px solid #FFB020;' : '';
        return `
          <div style="flex:1;min-width:160px;padding:20px 16px;text-align:center;border-right:1px solid rgba(255,255,255,0.06);${destaque}">
            <div style="font-size:1.4rem;margin-bottom:8px;">${medalhas[i] || `#${i+1}`}</div>
            ${avatar}
            <div style="font-weight:700;font-size:0.88rem;margin-top:10px;margin-bottom:4px;">${m.apelido || m.nome}</div>
            <div style="font-size:0.74rem;color:rgba(255,255,255,0.5);margin-bottom:8px;">${m.viagens} viagens / 30 dias</div>
            <div style="font-size:0.82rem;font-weight:700;color:var(--verde-limao);">${Formatador.km(m.total_km)}</div>
            <div style="font-size:0.7rem;color:rgba(255,255,255,0.4);">${Formatador.moeda(m.faturado)}</div>
          </div>
        `;
      }).join('')}
    </div>
    <div style="padding:10px 16px;border-top:1px solid rgba(255,255,255,0.06);font-size:0.72rem;color:rgba(255,255,255,0.3);text-align:center;">
      <i class="fa-solid fa-rotate me-1"></i>Ranking baseado nos últimos 30 dias · Zera automaticamente
    </div>
  `;
}

function renderizarIndicadoresMotorista(viagens) {
  const concluidas = viagens.filter((v) => v.status === 'concluida');
  const emAndamento = viagens.filter((v) => v.status === 'em_andamento').length;
  const totalKm = concluidas.reduce((acc, v) => acc + Number(v.distancia_km), 0);
  const totalFaturado = concluidas.reduce((acc, v) => acc + Number(v.valor_frete), 0);

  const cartoes = [
    { label: 'Viagens concluídas', valor: concluidas.length, icone: 'fa-flag-checkered', cor: 'bg-verde' },
    { label: 'Viagens em andamento', valor: emAndamento, icone: 'fa-route', cor: 'bg-info' },
    { label: 'KM rodados (total)', valor: Formatador.km(totalKm), icone: 'fa-road', cor: 'bg-limao' },
    { label: 'Faturado (total)', valor: Formatador.moeda(totalFaturado), icone: 'fa-sack-dollar', cor: 'bg-limao' }
  ];

  document.getElementById('gridIndicadoresMotorista').innerHTML = cartoes.map((c) => `
    <div class="col-6 col-lg-3">
      <div class="card-indicador">
        <div class="card-indicador__icone ${c.cor}"><i class="fa-solid ${c.icone}"></i></div>
        <div class="card-indicador__valor">${c.valor}</div>
        <div class="card-indicador__label">${c.label}</div>
      </div>
    </div>
  `).join('');
}

function renderizarMinhasViagens(viagens) {
  const corpo = document.getElementById('corpoMinhasViagens');

  if (!viagens.length) {
    corpo.innerHTML = `<tr><td colspan="5">
      <div class="estado-vazio">
        <i class="fa-solid fa-route"></i>
        <h4>Nenhuma viagem registrada ainda</h4>
        <p>Registre sua primeira viagem para começar a acompanhar seu desempenho.</p>
        <a href="viagens.html" class="btn-gr-primario"><i class="fa-solid fa-plus"></i> Nova Viagem</a>
      </div>
    </td></tr>`;
    return;
  }

  corpo.innerHTML = viagens.map((v) => `
    <tr>
      <td class="fw-semibold">${v.codigo}</td>
      <td>${v.origem} <i class="fa-solid fa-arrow-right-long mx-1 text-muted" style="font-size:0.7rem;"></i> ${v.destino}</td>
      <td>${v.caminhao_placa}</td>
      <td>${Formatador.moeda(v.valor_frete)}</td>
      <td>${Formatador.badgeStatus(v.status)}</td>
    </tr>
  `).join('');
}

function renderizarMinhaPosicaoRanking(ranking, motoristaId) {
  const container = document.getElementById('minhaPosicaoRanking');
  const posicao = ranking.findIndex((m) => Number(m.id) === Number(motoristaId));

  if (posicao === -1) {
    UI.estadoVazio(container, { icone: 'fa-trophy', titulo: 'Ainda sem pontuação', texto: 'Conclua viagens para entrar no ranking.' });
    return;
  }

  const meuRegistro = ranking[posicao];
  container.innerHTML = `
    <div class="text-center py-3">
      <div class="podio-avatar mx-auto mb-3" style="width:64px;height:64px;font-size:1.4rem;">
        ${Formatador.iniciais(meuRegistro.nome)}
      </div>
      <div class="fonte-display fw-bold" style="font-size:2rem; color:var(--verde-escuro);">${posicao + 1}º</div>
      <div class="text-muted mb-3" style="font-size:0.82rem;">de ${ranking.length} motoristas</div>
      <div class="linha-rodovia mx-auto mb-3" style="width:100px;"></div>
      <div class="d-flex justify-content-around">
        <div>
          <div class="fw-bold" style="font-size:1.1rem;">${meuRegistro.total_viagens}</div>
          <div class="text-muted" style="font-size:0.72rem;">Viagens</div>
        </div>
        <div>
          <div class="fw-bold" style="font-size:1.1rem;">${Formatador.numero(meuRegistro.pontuacao_ranking, 0)}</div>
          <div class="text-muted" style="font-size:0.72rem;">Pontos</div>
        </div>
      </div>
    </div>
  `;
}

// =====================================================================
// Popup de boas-vindas e novidades para o motorista
// Aparece uma vez por sessão (sessionStorage controla)
// =====================================================================

// Versão atual das novidades — mude para forçar o popup aparecer de novo
function mostrarPopupBoasVindas() {
  const VERSAO_POPUP = '2025-v3';
  const chave = 'gr_popup_visto_' + VERSAO_POPUP;
  if (sessionStorage.getItem(chave)) return;
  sessionStorage.setItem(chave, '1');

  const usuario = AuthService.obterUsuario();
  const nome = usuario?.nome?.split(' ')[0] || 'Motorista';

  Swal.fire({
    html: `
      <div style="text-align:left;font-family:var(--font-sans, system-ui);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <div style="width:46px;height:46px;border-radius:12px;background:rgba(11,61,46,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <i class="fa-solid fa-truck" style="font-size:1.3rem;color:#0B3D2E;"></i>
          </div>
          <div>
            <div style="font-size:1.15rem;font-weight:700;color:#0B3D2E;">Olá, ${nome}! 👋</div>
            <div style="font-size:0.82rem;color:#666;">Bem-vindo ao GR EXPRESSO</div>
          </div>
        </div>

        <p style="font-size:0.88rem;color:#444;margin-bottom:16px;line-height:1.6;">
          Veja como o sistema funciona e as últimas atualizações:
        </p>

        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">

          <div style="background:#f8f9fa;border-radius:10px;padding:12px 14px;display:flex;gap:12px;align-items:flex-start;">
            <div style="width:32px;height:32px;border-radius:8px;background:rgba(52,152,219,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fa-solid fa-gas-pump" style="color:#3498DB;font-size:.85rem;"></i>
            </div>
            <div>
              <div style="font-weight:600;font-size:.85rem;color:#222;">Abastecimentos</div>
              <div style="font-size:.78rem;color:#666;margin-top:2px;line-height:1.5;">
                Só é permitido abastecer em <strong>postos credenciados</strong>. Se o jogo não identificar o posto automaticamente, você será notificado para informar o nome e a cidade manualmente.
              </div>
            </div>
          </div>

          <div style="background:#f8f9fa;border-radius:10px;padding:12px 14px;display:flex;gap:12px;align-items:flex-start;">
            <div style="width:32px;height:32px;border-radius:8px;background:rgba(255,176,32,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fa-solid fa-screwdriver-wrench" style="color:#FFB020;font-size:.85rem;"></i>
            </div>
            <div>
              <div style="font-weight:600;font-size:.85rem;color:#222;">Manutenções</div>
              <div style="font-size:.78rem;color:#666;margin-top:2px;line-height:1.5;">
                Faça manutenções <strong>apenas nas filiais</strong>: <strong>Catanduva - SP</strong> e <strong>Guapó - GO</strong>. Oficinas fora dessas cidades geram penalidade no ranking.
              </div>
            </div>
          </div>

          <div style="background:#f8f9fa;border-radius:10px;padding:12px 14px;display:flex;gap:12px;align-items:flex-start;">
            <div style="width:32px;height:32px;border-radius:8px;background:rgba(46,204,113,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fa-solid fa-trophy" style="color:#2ECC71;font-size:.85rem;"></i>
            </div>
            <div>
              <div style="font-weight:600;font-size:.85rem;color:#222;">Ranking e pontuação</div>
              <div style="font-size:.78rem;color:#666;margin-top:2px;line-height:1.5;">
                Ganhe pontos ao concluir viagens. Perda de pontos por excesso de velocidade, cancelamento, dano ao veículo e infrações. Confira sua posição na aba <strong>Ranking</strong>.
              </div>
            </div>
          </div>

          <div style="background:#f8f9fa;border-radius:10px;padding:12px 14px;display:flex;gap:12px;align-items:flex-start;">
            <div style="width:32px;height:32px;border-radius:8px;background:rgba(255,77,79,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fa-solid fa-clock" style="color:#FF4D4F;font-size:.85rem;"></i>
            </div>
            <div>
              <div style="font-weight:600;font-size:.85rem;color:#222;">Pendentes</div>
              <div style="font-size:.78rem;color:#666;margin-top:2px;line-height:1.5;">
                Se tiver abastecimentos ou manutenções <strong>pendentes</strong>, o administrador pode solicitar que você informe os dados. Fique de olho nas abas de Abastecimentos e Manutenções.
              </div>
            </div>
          </div>

          <div style="background:#f8f9fa;border-radius:10px;padding:12px 14px;display:flex;gap:12px;align-items:flex-start;">
            <div style="width:32px;height:32px;border-radius:8px;background:rgba(11,61,46,0.10);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fa-solid fa-coins" style="color:#0B3D2E;font-size:.85rem;"></i>
            </div>
            <div>
              <div style="font-weight:600;font-size:.85rem;color:#222;">Valor das viagens</div>
              <div style="font-size:.78rem;color:#666;margin-top:2px;line-height:1.5;">
                O frete é calculado automaticamente por <strong>km rodado</strong> com base na dificuldade e no peso da carga — o valor mostrado no jogo é ignorado.
              </div>
            </div>
          </div>

        </div>

        <div style="background:rgba(11,61,46,0.06);border-radius:8px;padding:10px 12px;font-size:0.78rem;color:#555;text-align:center;">
          <i class="fa-solid fa-circle-info" style="color:#0B3D2E;margin-right:4px;"></i>
          Este aviso aparece apenas uma vez por sessão. Boas viagens!
        </div>
      </div>
    `,
    showConfirmButton: true,
    confirmButtonText: 'Entendido, vamos começar!',
    confirmButtonColor: '#0B3D2E',
    width: 520,
    padding: '24px',
    showClass: { popup: 'animate__animated animate__fadeInDown animate__faster' },
    hideClass: { popup: 'animate__animated animate__fadeOutUp animate__faster' },
  });
}
