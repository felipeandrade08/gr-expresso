// =====================================================================
// FELIPINHO LAUNCHER - Página: Ranking de Motoristas
// =====================================================================

(async function () {
  montarLayout({
    paginaAtiva: 'ranking',
    titulo: 'Ranking de Motoristas',
    subtitulo: 'Classificação geral por desempenho na transportadora'
  });

  AOS.init({ duration: 500, once: true });

  // Botão de zerar ranking visível apenas para admins
  if (AuthService.ehAdmin()) {
    document.getElementById('btnZerarRanking').style.display = '';
  }

  try {
    const ranking = await ApiService.get('/motoristas/ranking?limite=20');
    renderizarPodio(ranking.slice(0, 3));
    renderizarTabela(ranking);
  } catch (erro) {
    console.error(erro);
    UI.estadoErro('#podioTop3', erro.message);
    document.getElementById('corpoTabelaRanking').innerHTML =
      `<tr><td colspan="9"><div class="estado-vazio"><i class="fa-solid fa-plug-circle-xmark" style="color:var(--perigo)"></i><h4>Erro ao carregar ranking</h4><p>${erro.message}</p></div></td></tr>`;
  }
})();

// -----------------------------------------------------------------------
// Pódio Top 3
// -----------------------------------------------------------------------
function renderizarPodio(top3) {
  const container = document.getElementById('podioTop3');

  if (!top3.length) {
    UI.estadoVazio(container, { icone: 'fa-trophy', titulo: 'Ranking ainda vazio', texto: 'Conclua viagens para que os motoristas pontuem.' });
    return;
  }

  const ordemVisual = [top3[1], top3[0], top3[2]].filter(Boolean);

  container.innerHTML = `
    <div class="podio-destaque">
      ${ordemVisual.map(m => {
        if (!m) return '';
        const classe  = m === top3[0] ? 'primeiro' : (m === top3[1] ? 'segundo' : 'terceiro');
        const medalha = m === top3[0] ? '🥇' : (m === top3[1] ? '🥈' : '🥉');
        const seq     = Number(m.sequencia_viagens_limpas) || 0;
        const seqBadge = seq >= 3
          ? `<div class="badge-seq" title="${seq} viagens limpas seguidas">🔥 ${seq}</div>`
          : '';
        return `
          <div class="podio-coluna ${classe} animate__animated animate__fadeInUp">
            <div style="font-size:1.6rem;">${medalha}</div>
            ${seqBadge}
            <div class="podio-coluna__avatar">${Formatador.iniciais(m.nome)}</div>
            <div class="fw-bold" style="font-size:0.9rem;">${m.apelido || m.nome}</div>
            <div class="text-muted" style="font-size:0.76rem; margin-bottom:8px;">${m.total_viagens} viagens</div>
            <div class="podio-coluna__base">
              <div class="podio-coluna__posicao" style="color:${Number(m.pontuacao_ranking) < 0 ? 'var(--perigo)' : 'inherit'}">${Formatador.numero(m.pontuacao_ranking, 1)}</div>
              <div style="font-size:0.7rem; opacity:0.85;">pontos</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// -----------------------------------------------------------------------
// Tabela completa
// -----------------------------------------------------------------------
function renderizarTabela(ranking) {
  const corpo = document.getElementById('corpoTabelaRanking');

  if (!ranking.length) {
    corpo.innerHTML = `<tr><td colspan="9">
      <div class="estado-vazio">
        <i class="fa-solid fa-trophy"></i>
        <h4>Nenhum motorista no ranking</h4>
        <p>Cadastre motoristas e conclua viagens para gerar pontuação.</p>
      </div>
    </td></tr>`;
    return;
  }

  corpo.innerHTML = ranking.map((m, i) => {
    const seq        = Number(m.sequencia_viagens_limpas) || 0;
    const multas     = Number(m.total_multas) || 0;
    const ptsPerdidos = Number(m.total_pontos_perdidos) || 0;

    const seqHtml = seq >= 3
      ? `<span class="badge bg-warning text-dark" title="Sequência ativa!">🔥 ${seq}</span>`
      : `<span class="text-muted">${seq}</span>`;

    const multaHtml = multas > 0
      ? `<span class="badge bg-danger">${multas} (−${Formatador.numero(ptsPerdidos, 0)} pts)</span>`
      : `<span class="text-success">—</span>`;

    return `
      <tr>
        <td class="fw-bold fonte-display" style="font-size:1rem;">${i + 1}º</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="podio-avatar" style="width:34px;height:34px;font-size:0.8rem;">${Formatador.iniciais(m.nome)}</div>
            <div>
              <div class="fw-semibold" style="font-size:0.86rem;">${m.nome}</div>
              <div class="text-muted" style="font-size:0.74rem;">${m.apelido || '—'}</div>
            </div>
          </div>
        </td>
        <td>${m.total_viagens}</td>
        <td>${Formatador.km(m.total_km)}</td>
        <td>${Formatador.moeda(m.total_faturado)}</td>
        <td>${seqHtml}</td>
        <td>${multaHtml}</td>
        <td class="fw-bold" style="color:${Number(m.pontuacao_ranking) < 0 ? 'var(--perigo)' : 'inherit'}">${Number(m.pontuacao_ranking) >= 0 ? '' : ''}${Formatador.numero(m.pontuacao_ranking, 1)}</td>
        <td>
          <div class="d-flex align-items-center gap-1 flex-wrap">
            ${Formatador.badgeStatus(m.status)}
            <button class="btn-gr-icone" onclick="verHistorico(${m.id}, '${m.nome}')" title="Ver histórico de pontos">
              <i class="fa-solid fa-chart-line"></i>
            </button>
            ${AuthService.ehAdmin() ? `<button class="btn-gr-icone perigo" onclick="zerarRankingMotorista(${m.id}, '${m.apelido || m.nome}')" title="Zerar pontos deste motorista"><i class="fa-solid fa-rotate-left"></i></button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// -----------------------------------------------------------------------
// Modal de histórico de eventos de pontuação
// -----------------------------------------------------------------------
async function verHistorico(motoristaId, nome) {
  Swal.fire({
    title: `📊 Histórico: ${nome}`,
    html: '<div id="modalHistoricoBody" class="text-center"><i class="fa-solid fa-spinner fa-spin"></i> Carregando...</div>',
    width: 720,
    showConfirmButton: false,
    showCloseButton: true,
  });

  try {
    const eventos = await ApiService.get(`/motoristas/ranking/${motoristaId}/eventos?limite=30`);
    const multas  = await ApiService.get(`/motoristas/ranking/${motoristaId}/multas?limite=20`);

    const ICONE_TIPO = {
      bonus_viagem:          '✅',
      bonus_sequencia:       '🔥',
      penalidade_velocidade: '🚨',
      penalidade_cancelamento:'❌',
      penalidade_dano:       '💥',
      penalidade_multa:      '⚠️',
      penalidade_manual:     '🔴',
    };

    const eventosHtml = eventos.length
      ? eventos.map(e => `
          <tr>
            <td>${ICONE_TIPO[e.tipo] || '📌'} <small class="text-muted">${e.tipo.replace(/_/g,' ')}</small></td>
            <td>${e.viagem_codigo || '—'}</td>
            <td class="${Number(e.pontos) >= 0 ? 'text-success' : 'text-danger'} fw-bold">
              ${Number(e.pontos) >= 0 ? '+' : ''}${Formatador.numero(e.pontos, 1)}
            </td>
            <td><small>${e.descricao || '—'}</small></td>
            <td><small class="text-muted">${new Date(e.criado_em).toLocaleString('pt-BR')}</small></td>
          </tr>
        `).join('')
      : `<tr><td colspan="5" class="text-center text-muted">Nenhum evento registrado.</td></tr>`;

    const multasHtml = multas.length
      ? multas.map(m => `
          <tr>
            <td><span class="badge bg-danger">${m.tipo}</span></td>
            <td>${m.viagem_codigo || '—'}</td>
            <td class="text-danger fw-bold">−${Formatador.numero(m.pontos_perdidos, 0)} pts</td>
            <td>${Formatador.moeda(m.valor_brl)}</td>
            <td><small>${m.descricao || '—'}</small></td>
          </tr>
        `).join('')
      : `<tr><td colspan="5" class="text-center text-muted">Sem multas registradas.</td></tr>`;

    document.getElementById('modalHistoricoBody').innerHTML = `
      <ul class="nav nav-tabs mb-3" id="tabHistorico">
        <li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#tabEventos">Eventos de Pontuação</a></li>
        <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#tabMultas">Multas</a></li>
      </ul>
      <div class="tab-content text-start">
        <div class="tab-pane fade show active" id="tabEventos">
          <div class="table-responsive" style="max-height:360px;overflow-y:auto;">
            <table class="tabela-gr" style="font-size:0.82rem;">
              <thead><tr><th>Tipo</th><th>Viagem</th><th>Pontos</th><th>Descrição</th><th>Data</th></tr></thead>
              <tbody>${eventosHtml}</tbody>
            </table>
          </div>
        </div>
        <div class="tab-pane fade" id="tabMultas">
          <div class="table-responsive" style="max-height:360px;overflow-y:auto;">
            <table class="tabela-gr" style="font-size:0.82rem;">
              <thead><tr><th>Tipo</th><th>Viagem</th><th>Penalidade</th><th>Valor</th><th>Descrição</th></tr></thead>
              <tbody>${multasHtml}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    document.getElementById('modalHistoricoBody').innerHTML = `<p class="text-danger">Erro ao carregar histórico: ${e.message}</p>`;
  }
}

// -----------------------------------------------------------------------
// Zerar ranking completo (apenas admin)
// -----------------------------------------------------------------------
async function zerarRanking() {
  const confirmado = await Swal.fire({
    title: 'Zerar ranking geral?',
    html: 'Isso vai <b>apagar todos os pontos, sequências, eventos e multas</b> de <u>todos</u> os motoristas.<br><br>Use apenas ao encerrar uma temporada de testes.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sim, zerar tudo',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc3545',
  });

  if (!confirmado.isConfirmed) return;

  try {
    await ApiService.delete('/motoristas/ranking');
    UI.toastSucesso('Ranking zerado com sucesso!');
    location.reload();
  } catch (erro) {
    UI.toastErro(erro.message);
  }
}

// -----------------------------------------------------------------------
// Zerar ranking de UM motorista (apenas admin)
// -----------------------------------------------------------------------
async function zerarRankingMotorista(id, nome) {
  const confirmado = await Swal.fire({
    title: `Zerar pontos de ${nome}?`,
    html: `Isso vai apagar <b>todos os pontos, sequência, eventos e multas</b> de <b>${nome}</b>.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sim, zerar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc3545',
  });

  if (!confirmado.isConfirmed) return;

  try {
    await ApiService.delete(`/motoristas/ranking/${id}`);
    UI.toastSucesso(`Pontos de ${nome} zerados!`);
    location.reload();
  } catch (erro) {
    UI.toastErro(erro.message);
  }
}

// -----------------------------------------------------------------------
// Gráfico de evolução de pontuação (últimos 30 dias)
// -----------------------------------------------------------------------
let graficoEvolucao = null;

async function carregarGraficoEvolucao() {
  const container = document.getElementById('graficoEvolucaoContainer');
  if (!container) return;

  try {
    const dados = await ApiService.get('/motoristas/ranking/evolucao-geral?dias=30');
    if (!dados.length) {
      container.innerHTML = '<p class="text-muted text-center py-4">Nenhum evento de pontuação nos últimos 30 dias.</p>';
      return;
    }

    // Agrupa por motorista
    const porMotorista = {};
    dados.forEach(row => {
      if (!porMotorista[row.motorista_nome]) porMotorista[row.motorista_nome] = {};
      porMotorista[row.motorista_nome][row.dia] = Number(row.pontos_dia);
    });

    // Gera array de datas único e ordenado
    const datas = [...new Set(dados.map(r => r.dia))].sort();

    // Paleta de cores
    const cores = ['#FFB020','#2ECC71','#3498DB','#E74C3C','#9B59B6','#1ABC9C','#E67E22'];

    const datasets = Object.entries(porMotorista).map(([nome, pontosPorDia], i) => {
      // Calcula acumulado
      let acumulado = 0;
      const valores = datas.map(d => {
        acumulado += pontosPorDia[d] || 0;
        return Math.round(acumulado * 100) / 100;
      });
      return {
        label: nome,
        data: valores,
        borderColor: cores[i % cores.length],
        backgroundColor: cores[i % cores.length] + '20',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.3,
        fill: false,
      };
    });

    const canvas = document.getElementById('graficoEvolucao');
    if (!canvas) return;
    if (graficoEvolucao) graficoEvolucao.destroy();

    graficoEvolucao = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels: datas.map(d => d.slice(5)), datasets },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('pt-BR')} pts`
            }
          }
        },
        scales: {
          y: { ticks: { callback: v => v + ' pts' } },
          x: { ticks: { maxRotation: 45 } }
        },
      }
    });
  } catch (e) {
    console.error('Erro ao carregar gráfico evolução:', e);
  }
}

// Chama ao carregar a página se o container existir
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('graficoEvolucaoContainer')) {
    carregarGraficoEvolucao();
  }
});
