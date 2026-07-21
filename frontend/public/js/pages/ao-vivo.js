// =====================================================================
// FELIPINHO LAUNCHER - Página: Ao Vivo (Telemetria real — GET /api/telemetria/online)
//
// Campos reais retornados pela API (listarStatusOnline):
//   motorista_id, motorista_nome, motorista_apelido
//   caminhao_placa, perfil_jogo, cidade_atual
//   velocidade_kmh, rpm, marcha
//   nivel_combustivel  ← float 0.0 a 1.0
//   odometro, em_viagem, viagem_id, online
//   ultimo_heartbeat
// =====================================================================

(function () {
  montarLayout({
    paginaAtiva: 'ao-vivo',
    titulo: 'Ao Vivo',
    subtitulo: 'Motoristas conectados agora — telemetria em tempo real'
  });

  AOS.init({ duration: 450, once: true });

  // Considera online apenas quem enviou heartbeat nos últimos 2 minutos
  const LIMITE_HEARTBEAT_MS = 2 * 60 * 1000;

  let intervalo = null;

  document.getElementById('btnAtualizar')?.addEventListener('click', carregarDados);

  const INTERVALO_ATUALIZACAO_MS = 5000;

  carregarDados();
  intervalo = setInterval(carregarDados, INTERVALO_ATUALIZACAO_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(intervalo);
    } else {
      carregarDados();
      intervalo = setInterval(carregarDados, INTERVALO_ATUALIZACAO_MS);
    }
  });

  // ─────────────────────────────────────────────────────────────────
  async function carregarDados() {
    try {
      const lista = await ApiService.get('/telemetria/online');
      const todos = Array.isArray(lista) ? lista : [];

      // Filtra apenas quem tem heartbeat recente (realmente online agora)
      const agora = Date.now();
      const reaisOnline = todos.filter(m => {
        if (!m.ultimo_heartbeat) return false;
        const diff = agora - new Date(m.ultimo_heartbeat).getTime();
        return diff <= LIMITE_HEARTBEAT_MS;
      });

      renderizarResumo(reaisOnline);
      renderizarGrid(reaisOnline);
      atualizarTimestamp();
    } catch (err) {
      console.error('Telemetria:', err);
      document.getElementById('gridMotoristas').innerHTML = `
        <div class="estado-vazio" style="grid-column:1/-1;">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p>Não foi possível carregar a telemetria.<br>
          <small style="color:var(--cinza-400);">${err.message || 'Erro desconhecido'}</small></p>
        </div>`;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  function renderizarResumo(lista) {
    const emViagem = lista.filter(m => m.em_viagem);
    const velNums  = lista
      .filter(m => Number(m.velocidade_kmh) > 0)
      .map(m => Number(m.velocidade_kmh));
    const velMedia = velNums.length
      ? Math.round(velNums.reduce((a, b) => a + b, 0) / velNums.length)
      : 0;

    document.getElementById('numOnline').textContent   = lista.length;
    document.getElementById('numViagem').textContent   = emViagem.length;
    document.getElementById('numOffline').textContent  = lista.length - emViagem.length;
    document.getElementById('numVelMedia').textContent = velMedia > 0 ? `${velMedia} km/h` : '—';

    document.getElementById('labelOnline').textContent =
      lista.length === 0
        ? 'Nenhum motorista conectado agora'
        : `${lista.length} motorista${lista.length > 1 ? 's' : ''} conectado${lista.length > 1 ? 's' : ''} agora`;
  }

  // ─────────────────────────────────────────────────────────────────
  // Reconciliação: atualiza/insere/remove apenas os cards necessários,
  // em vez de recriar todo o innerHTML (isso é o que causava o "piscar"
  // a cada atualização, já que o navegador descartava e remontava o
  // DOM inteiro, incluindo imagens, animações e o scroll do usuário).
  // ─────────────────────────────────────────────────────────────────
  function renderizarGrid(lista) {
    const grid = document.getElementById('gridMotoristas');

    if (lista.length === 0) {
      // Só substitui pelo estado vazio se ainda não estiver nesse estado
      if (!grid.querySelector('.estado-vazio')) {
        grid.innerHTML = `
          <div class="estado-vazio" style="grid-column:1/-1;">
            <i class="fa-solid fa-satellite-dish"></i>
            <p>Nenhum motorista conectado no momento.</p>
          </div>`;
      }
      return;
    }

    // Em viagem primeiro
    const ordenados = [...lista].sort((a, b) =>
      (b.em_viagem ? 1 : 0) - (a.em_viagem ? 1 : 0)
    );

    // Se o grid estava vazio (estado-vazio ou sem cards), faz a primeira
    // renderização completa normalmente.
    if (grid.querySelector('.estado-vazio') || !grid.querySelector('.card-motorista')) {
      grid.innerHTML = ordenados.map(m => cardMotorista(m)).join('');
      return;
    }

    const idsNovos = new Set(ordenados.map(m => String(m.motorista_id)));

    // Remove cards de motoristas que ficaram offline
    grid.querySelectorAll('.card-motorista').forEach(el => {
      if (!idsNovos.has(el.dataset.motoristaId)) {
        el.remove();
      }
    });

    // Atualiza ou insere cada card, mantendo a ordem desejada
    let anterior = null;
    ordenados.forEach(m => {
      const id = String(m.motorista_id);
      const existente = grid.querySelector(`.card-motorista[data-motorista-id="${id}"]`);

      if (existente) {
        atualizarCardMotorista(existente, m);
        // Garante a posição correta na ordenação (em viagem primeiro)
        if (anterior ? anterior.nextElementSibling !== existente : grid.firstElementChild !== existente) {
          grid.insertBefore(existente, anterior ? anterior.nextElementSibling : grid.firstElementChild);
        }
        anterior = existente;
      } else {
        const div = document.createElement('div');
        div.innerHTML = cardMotorista(m).trim();
        const novoEl = div.firstElementChild;
        if (anterior) {
          anterior.after(novoEl);
        } else {
          grid.insertBefore(novoEl, grid.firstElementChild);
        }
        anterior = novoEl;
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // Atualiza apenas os campos que mudam dentro de um card já existente,
  // sem tocar no resto do DOM (evita qualquer flash visual).
  // ─────────────────────────────────────────────────────────────────
  function atualizarCardMotorista(el, m) {
    // Substitui o conteúdo interno do card, mas mantém o próprio elemento
    // (mesma referência no DOM), então não há remoção/recriação visual.
    const div = document.createElement('div');
    div.innerHTML = cardMotorista(m).trim();
    const novo = div.firstElementChild;

    // Atualiza classes (estado online/em viagem) sem recriar o elemento
    el.className = novo.className;
    // Substitui apenas o conteúdo interno
    el.innerHTML = novo.innerHTML;
  }

  // ─────────────────────────────────────────────────────────────────
  function cardMotorista(m) {
    // ── Nome e iniciais ──
    const nomeCompleto = m.motorista_nome || 'Motorista';
    const apelido      = m.motorista_apelido || '';
    const nomeExibido  = apelido || nomeCompleto;
    const iniciais     = nomeCompleto
      .trim().split(' ').filter(Boolean).slice(0, 2)
      .map(p => p[0]).join('').toUpperCase();

    // ── Estado ──
    let classeCard, classeBadge, textoBadge;
    if (m.em_viagem) {
      classeCard  = 'card-motorista--viagem';
      classeBadge = 'badge-em-viagem';
      textoBadge  = '<i class="fa-solid fa-road" style="font-size:0.6rem;"></i> Em Viagem';
    } else {
      classeCard  = 'card-motorista--online';
      classeBadge = 'badge-online';
      textoBadge  = '<i class="fa-solid fa-circle" style="font-size:0.45rem;"></i> Online';
    }

    // ── Localização ──
    const cidadeAtual = (m.cidade_atual || '').trim();
    const perfilJogo  = (m.perfil_jogo  || '').trim();

    let rotaHtml;
    if (cidadeAtual) {
      rotaHtml = `
        <i class="fa-solid fa-location-dot" style="color:var(--verde-limao);font-size:0.75rem;flex-shrink:0;"></i>
        <span class="rota-cidade">${cidadeAtual}</span>
        ${perfilJogo ? `<span style="margin-left:auto;font-size:0.7rem;color:var(--cinza-400);white-space:nowrap;">${perfilJogo}</span>` : ''}
      `;
    } else {
      rotaHtml = `<span class="rota-sem">Aguardando localização...</span>`;
    }

    // ── Velocidade ──
    const vel = Number(m.velocidade_kmh) || 0;
    let classeVel = '';
    if (vel > 100) classeVel = 'metrica--perigo';
    else if (vel > 80) classeVel = 'metrica--alerta';

    const velHtml = vel > 0
      ? `${vel}<span style="font-size:0.6rem;font-weight:500;"> km/h</span>`
      : '<span style="color:var(--cinza-400);font-size:0.9rem;">parado</span>';

    // ── Marcha ──
    const marchaVal = m.marcha !== undefined && m.marcha !== null ? Number(m.marcha) : null;
    const marchaHtml = marchaVal === null ? '—'
      : marchaVal === 0 ? '<span style="color:var(--cinza-400);">N</span>'
      : marchaVal === -1 ? '<span style="color:var(--alerta);">R</span>'
      : `M${marchaVal}`;

    // ── Odômetro ──
    const odometro = m.odometro && Number(m.odometro) > 0
      ? `${Number(m.odometro).toFixed(0)} km`
      : '—';

    // ── Combustível (0.0–1.0 no banco) ──
    const nivelRaw = Number(m.nivel_combustivel) || 0;
    const pctComb  = nivelRaw <= 1
      ? Math.round(nivelRaw * 100)
      : Math.min(100, Math.round(nivelRaw));

    let classeBarra = 'barra-fill--ok';
    if (pctComb < 20) classeBarra = 'barra-fill--critico';
    else if (pctComb < 40) classeBarra = 'barra-fill--medio';

    // ── Placa ──
    const placa = (m.caminhao_placa || '').trim() || '—';

    // ── Tempo do heartbeat ──
    const tempo = m.ultimo_heartbeat ? tempoRelativo(m.ultimo_heartbeat) : '';

    return `
      <div class="card-motorista ${classeCard}" data-motorista-id="${m.motorista_id}">
        <div class="card-motorista__faixa"></div>

        <div class="card-motorista__head">
          <div class="card-motorista__avatar">${iniciais}</div>
          <div class="card-motorista__info">
            <div class="card-motorista__nome">${nomeExibido}</div>
            ${apelido && nomeCompleto !== apelido
              ? `<div class="card-motorista__perfil">${nomeCompleto}</div>`
              : ''}
          </div>
          <span class="card-motorista__badge ${classeBadge}">${textoBadge}</span>
        </div>

        <div class="card-motorista__rota">${rotaHtml}</div>

        <div class="card-motorista__metricas">
          <div class="metrica ${classeVel}">
            <div class="metrica__valor">${velHtml}</div>
            <div class="metrica__label">Velocidade</div>
          </div>
          <div class="metrica">
            <div class="metrica__valor">${marchaHtml}</div>
            <div class="metrica__label">Marcha</div>
          </div>
          <div class="metrica">
            <div class="metrica__valor" style="font-size:0.88rem;">${odometro}</div>
            <div class="metrica__label">Odômetro</div>
          </div>
        </div>

        <div class="card-motorista__combustivel">
          <div class="barra-label">
            <span>
              <i class="fa-solid fa-gas-pump" style="font-size:0.68rem;color:var(--cinza-400);margin-right:4px;"></i>
              Combustível
            </span>
            <span>${pctComb > 0 ? pctComb + '%' : '—'}</span>
          </div>
          <div class="barra-track">
            <div class="barra-fill ${classeBarra}" style="width:${pctComb}%;"></div>
          </div>
        </div>

        <div class="card-motorista__rodape">
          <div class="rodape-caminhao">
            <i class="fa-solid fa-id-badge" style="color:var(--verde-escuro);"></i>
            <span>${placa}</span>
          </div>
          ${tempo ? `<span class="rodape-tempo">${tempo}</span>` : ''}
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────────
  function atualizarTimestamp() {
    const agora = new Date();
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('labelAtualizado').textContent =
      `Atualizado às ${pad(agora.getHours())}:${pad(agora.getMinutes())}:${pad(agora.getSeconds())}`;
  }

  function tempoRelativo(isoStr) {
    try {
      const diff = (Date.now() - new Date(isoStr).getTime()) / 1000;
      if (diff < 5)    return 'agora mesmo';
      if (diff < 60)   return `há ${Math.round(diff)}s`;
      if (diff < 3600) return `há ${Math.round(diff / 60)}min`;
      return `há ${Math.round(diff / 3600)}h`;
    } catch { return ''; }
  }
})();
