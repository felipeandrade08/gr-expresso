// =====================================================================
// FELIPINHO LAUNCHER - Página: Pendentes (dashboard unificado admin)
// =====================================================================

let modalReg;
let todosOsPendentes = [];
let filtroAtual = 'todos';

(async function () {
  if (!AuthService.ehGestor()) {
    window.location.href = 'dashboard.html';
    return;
  }

  montarLayout({
    paginaAtiva: 'pendentes',
    titulo: 'Pendentes',
    subtitulo: 'Abastecimentos e manutenções aguardando decisão do administrador',
  });

  AOS.init({ duration: 400, once: true });
  modalReg = new bootstrap.Modal(document.getElementById('modalRegularizarPend'));
  document.getElementById('btnConfirmarPend').addEventListener('click', confirmar);

  await carregar();
})();

async function carregar() {
  try {
    const [abast, manut] = await Promise.all([
      ApiService.get('/abastecimentos/pendentes'),
      ApiService.get('/manutencoes/pendentes'),
    ]);

    todosOsPendentes = [
      ...abast.map(a => ({ ...a, _tipo: 'abastecimento' })),
      ...manut.map(m => ({ ...m, _tipo: 'manutencao' })),
    ].sort((a, b) => new Date(b.data_abastecimento || b.data_manutencao) - new Date(a.data_abastecimento || a.data_manutencao));

    renderKpis(abast.length, manut.length);
    renderBadges(abast.length, manut.length);
    renderLista(todosOsPendentes);
  } catch (e) {
    document.getElementById('listaPendentes').innerHTML =
      `<div class="empty-pendentes"><i class="fa-solid fa-plug-circle-xmark" style="color:var(--perigo)"></i>Erro ao carregar pendentes.<br><small>${e.message}</small></div>`;
  }
}

function renderKpis(qtdAbast, qtdManut) {
  const total = qtdAbast + qtdManut;
  document.getElementById('kpisPendentes').innerHTML = `
    <div class="col-6 col-md-4">
      <div class="card-gr text-center py-3">
        <div style="font-size:2rem;font-weight:700;font-family:var(--fonte-display);color:${total>0?'#FFB020':'#2ECC71'}">${total}</div>
        <div class="text-muted small">Total pendentes</div>
      </div>
    </div>
    <div class="col-6 col-md-4">
      <div class="card-gr text-center py-3">
        <div style="font-size:2rem;font-weight:700;font-family:var(--fonte-display);color:#3498DB">${qtdAbast}</div>
        <div class="text-muted small"><i class="fa-solid fa-gas-pump"></i> Abastecimentos</div>
      </div>
    </div>
    <div class="col-12 col-md-4">
      <div class="card-gr text-center py-3">
        <div style="font-size:2rem;font-weight:700;font-family:var(--fonte-display);color:#FFB020">${qtdManut}</div>
        <div class="text-muted small"><i class="fa-solid fa-screwdriver-wrench"></i> Manutenções</div>
      </div>
    </div>
  `;
}

function renderBadges(qtdAbast, qtdManut) {
  const fmt = n => n > 0 ? `(${n})` : '';
  document.getElementById('badgeTodos').textContent  = fmt(qtdAbast + qtdManut);
  document.getElementById('badgeAbast').textContent  = fmt(qtdAbast);
  document.getElementById('badgeManut').textContent  = fmt(qtdManut);
}

function filtrar(tipo, btn) {
  filtroAtual = tipo;
  document.querySelectorAll('.filtro-tab').forEach(t => t.classList.remove('ativo'));
  btn.classList.add('ativo');
  const lista = tipo === 'todos'
    ? todosOsPendentes
    : todosOsPendentes.filter(p => p._tipo === tipo);
  renderLista(lista);
}

function renderLista(lista) {
  const el = document.getElementById('listaPendentes');
  if (!lista.length) {
    el.innerHTML = `<div class="empty-pendentes">
      <i class="fa-solid fa-circle-check"></i>
      Nenhum pendente no momento!
    </div>`;
    return;
  }

  el.innerHTML = lista.map(p => {
    const ehAbast = p._tipo === 'abastecimento';
    const data = Formatador.dataHora(p.data_abastecimento || p.data_manutencao);
    const local = ehAbast
      ? [p.posto, p.cidade].filter(Boolean).join(' — ') || '—'
      : [p.local_servico, p.cidade].filter(Boolean).join(' — ') || '—';
    const valor = ehAbast
      ? Formatador.moeda(p.valor_total)
      : Formatador.moeda(p.custo_total);

    // Verifica se motorista já preencheu os dados
    const motoristaPreencheu = ehAbast
      ? (p.posto || p.cidade)
      : (p.local_servico || p.cidade);

    const statusLabel = motoristaPreencheu
      ? 'Aguardando admin'
      : 'Aguardando motorista';
    const statusClass = motoristaPreencheu ? '' : 'aguard';

    let btns = '';
    if (motoristaPreencheu) {
      btns = `<button class="btn btn-sm btn-warning" onclick="abrirRegularizar(${p.id},'${p._tipo}')">
                <i class="fa-solid fa-gavel"></i> Regularizar
              </button>`;
    } else {
      btns = `<span class="text-muted small"><i class="fa-solid fa-hourglass-half"></i> Motorista ainda não preencheu</span>`;
    }

    return `<div class="pend-card">
      <div class="pend-card__header">
        <div class="pend-card__tipo ${ehAbast ? 'abast' : 'manut'}">
          <i class="fa-solid ${ehAbast ? 'fa-gas-pump' : 'fa-screwdriver-wrench'}"></i>
        </div>
        <div class="pend-card__info">
          <div class="pend-card__title">${p.caminhao_placa || '—'} · ${p.motorista_nome || '—'}</div>
          <div class="pend-card__sub">${data} · ${ehAbast ? 'Abastecimento' : 'Manutenção'}</div>
        </div>
        <span class="pend-card__status ${statusClass}">${statusLabel}</span>
      </div>
      <div class="pend-card__meta">
        <span><strong>Local:</strong> ${local}</span>
        <span><strong>Valor:</strong> ${valor}</span>
        ${ehAbast ? `<span><strong>Litros:</strong> ${Number(p.litros||0).toFixed(1)} L</span>` : ''}
        ${!ehAbast && p.tipo ? `<span><strong>Tipo:</strong> ${p.tipo}</span>` : ''}
      </div>
      <div class="pend-card__acoes">${btns}</div>
    </div>`;
  }).join('');
}

// ─── Modal regularizar ────────────────────────────────────────────────

function abrirRegularizar(id, tipo) {
  const p = todosOsPendentes.find(x => x.id === id && x._tipo === tipo);
  if (!p) return;

  document.getElementById('pendId').value   = id;
  document.getElementById('pendTipo').value = tipo;
  document.getElementById('pendObs').value  = '';
  document.getElementById('optPendAprovar').checked = true;
  document.getElementById('tituloModalPend').textContent =
    tipo === 'abastecimento' ? 'Regularizar Abastecimento' : 'Regularizar Manutenção';

  const local = tipo === 'abastecimento'
    ? [p.posto, p.cidade].filter(Boolean).join(' — ')
    : [p.local_servico, p.cidade].filter(Boolean).join(' — ');
  const valor = Formatador.moeda(p.valor_total || p.custo_total);

  document.getElementById('infoModalPend').innerHTML = `
    <strong>Motorista:</strong> ${p.motorista_nome || '—'}<br>
    <strong>Caminhão:</strong> ${p.caminhao_placa || '—'}<br>
    <strong>Local:</strong> ${local || '—'}<br>
    <strong>Valor:</strong> ${valor}
  `;
  modalReg.show();
}

async function confirmar() {
  const id      = document.getElementById('pendId').value;
  const tipo    = document.getElementById('pendTipo').value;
  const decisao = document.querySelector('input[name="decisaoPend"]:checked').value;
  const penalizar = decisao === 'penalizar';
  const obs     = document.getElementById('pendObs').value.trim() || null;

  const rota = tipo === 'abastecimento'
    ? `/abastecimentos/${id}/regularizar`
    : `/manutencoes/${id}/regularizar`;

  try {
    await ApiService.patch(rota, { penalizar, observacoes: obs });
    modalReg.hide();
    await carregar();
    Swal.fire({
      icon: penalizar ? 'warning' : 'success',
      title: penalizar ? 'Penalidade aplicada!' : 'Aprovado sem penalidade!',
      timer: 2500, showConfirmButton: false,
    });
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Erro', text: e.message || 'Não foi possível regularizar.' });
  }
}
