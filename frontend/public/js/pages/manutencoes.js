// =====================================================================
// GR EXPRESSO - Página: Manutenções
// =====================================================================

let modalManutencao, modalResolver, modalRegularizar;
let listaManutencoes = [];
let graficoManutencao = null;
let ehAdmin = false;
let filiaisCredenciadas = [];

// Componentes do veículo (espelho da tela ETS2)
const COMPONENTES_VEICULO = [
  { id: 'motor',      label: 'Motor',      icone: 'fa-gear' },
  { id: 'transmissao',label: 'Transmissão',icone: 'fa-gears' },
  { id: 'chassi',     label: 'Chassi',     icone: 'fa-car-burst' },
  { id: 'cabine',     label: 'Cabine',     icone: 'fa-truck' },
  { id: 'rodas',      label: 'Rodas',      icone: 'fa-circle-dot' },
];
const COMPONENTES_REBOQUE = [
  { id: 'carroceria', label: 'Carroceria', icone: 'fa-trailer' },
  { id: 'chassi_rb',  label: 'Chassi',     icone: 'fa-car-burst' },
  { id: 'rodas_rb',   label: 'Rodas',      icone: 'fa-circle-dot' },
];

// ─── Init ─────────────────────────────────────────────────────────────

(async function () {
  ehAdmin = AuthService.ehAdmin();

  montarLayout({
    paginaAtiva: 'manutencoes',
    titulo: ehAdmin ? 'Manutenções' : 'Minhas Manutenções',
    subtitulo: ehAdmin
      ? 'Controle de manutenções da frota — filiais credenciadas: Catanduva e Guapó'
      : 'Seus registros de manutenção — faça manutenções nas filiais para evitar penalidade',
  });

  AOS.init({ duration: 500, once: true });

  modalManutencao  = new bootstrap.Modal(document.getElementById('modalManutencao'));
  modalResolver    = new bootstrap.Modal(document.getElementById('modalResolver'));
  modalRegularizar = new bootstrap.Modal(document.getElementById('modalRegularizar'));

  document.getElementById('btnNovaManutencao').addEventListener('click', abrirModalNovo);
  document.getElementById('formManutencao').addEventListener('submit', salvarManutencao);
  document.getElementById('filtroCaminhaoId').addEventListener('change', carregarManutencoes);
  document.getElementById('filtroStatus').addEventListener('change', carregarManutencoes);
  document.getElementById('btnEnviarResolver').addEventListener('click', enviarResolver);
  document.getElementById('btnConfirmarRegularizar').addEventListener('click', confirmarRegularizar);

  await Promise.all([
    carregarFiliais(),
    carregarSelects(),
    carregarManutencoes(),
    carregarGrafico(),
  ]);

  renderizarTabelaComponentes();
})();

// ─── Filiais credenciadas ─────────────────────────────────────────────

async function carregarFiliais() {
  try {
    filiaisCredenciadas = await ApiService.get('/manutencoes/filiais-credenciadas');
    const wrap = document.getElementById('chipFiliais');
    if (!filiaisCredenciadas.length) {
      wrap.innerHTML = '<p class="text-muted small">Nenhuma filial cadastrada.</p>';
      return;
    }
    wrap.innerHTML = filiaisCredenciadas.map(f => `
      <div class="chip-filial">
        <div class="chip-filial__icone"><i class="fa-solid fa-building"></i></div>
        <div>
          <div class="chip-filial__nome">${f.posto}</div>
          <div class="chip-filial__cidade">${f.cidade}</div>
        </div>
        <span class="chip-filial__badge">Credenciada</span>
      </div>
    `).join('');
  } catch (e) {
    document.getElementById('chipFiliais').innerHTML = '<p class="text-muted small">Erro ao carregar filiais.</p>';
  }
}

// ─── Selects ──────────────────────────────────────────────────────────

async function carregarSelects() {
  try {
    const caminhoes = await ApiService.get('/caminhoes');
    const selFiltro = document.getElementById('filtroCaminhaoId');
    const selModal  = document.getElementById('campoCaminhaoId');

    caminhoes.forEach(c => {
      const label = `${c.placa}${c.modelo ? ' — ' + c.modelo : ''}`;
      selFiltro.add(new Option(label, c.id));
      selModal.add(new Option(label, c.id));
    });

    const motoristas = await ApiService.get('/motoristas');
    const selMot = document.getElementById('campoMotoristaId');
    motoristas.forEach(m => selMot.add(new Option(m.nome, m.id)));
  } catch (e) { console.error('Erro ao carregar selects:', e); }
}

// ─── Dados ────────────────────────────────────────────────────────────

async function carregarManutencoes() {
  const caminhao_id = document.getElementById('filtroCaminhaoId').value;
  const status      = document.getElementById('filtroStatus').value;
  try {
    const params = new URLSearchParams();
    if (caminhao_id) params.set('caminhao_id', caminhao_id);
    if (status)      params.set('status', status);
    const query = params.toString() ? '?' + params : '';
    listaManutencoes = await ApiService.get('/manutencoes' + query);
    renderizarTabela(listaManutencoes);
    atualizarKpis(listaManutencoes);
    verificarPendentes();
  } catch (e) {
    document.getElementById('corpoTabelaManutencoes').innerHTML =
      '<tr><td colspan="9" class="text-center text-danger py-4">Erro ao carregar manutenções.</td></tr>';
  }
}

async function carregarGrafico() {
  try {
    const dados = await ApiService.get('/manutencoes/total-por-mes?meses=6');
    const ctx = document.getElementById('graficoManutencao').getContext('2d');
    if (graficoManutencao) graficoManutencao.destroy();
    graficoManutencao = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dados.map(d => d.mes),
        datasets: [{
          label: 'Custo (R$)',
          data: dados.map(d => Number(d.total_gasto)),
          backgroundColor: 'rgba(255,176,32,0.25)',
          borderColor: '#FFB020',
          borderWidth: 2,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { ticks: { callback: v => 'R$' + v.toLocaleString('pt-BR') } } },
      },
    });
  } catch (e) { console.error('Erro ao carregar gráfico:', e); }
}

// ─── KPIs / Resumo ────────────────────────────────────────────────────

function atualizarKpis(lista) {
  const total       = lista.length;
  const custo       = lista.reduce((s, m) => s + Number(m.custo_total || 0), 0);
  const pendentes   = lista.filter(m => m.status === 'pendente').length;
  const credenciadas = lista.filter(m => m.credenciada).length;

  document.getElementById('gridResumoManutencao').innerHTML = `
    <div class="col-6 col-md-3">
      <div class="card-gr text-center py-3">
        <div style="font-size:1.6rem;font-weight:700;font-family:var(--fonte-display)">${total}</div>
        <div class="text-muted small">Total de manutenções</div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="card-gr text-center py-3">
        <div style="font-size:1.4rem;font-weight:700;font-family:var(--fonte-display);color:#FFB020">
          ${custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </div>
        <div class="text-muted small">Custo total</div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="card-gr text-center py-3">
        <div style="font-size:1.6rem;font-weight:700;font-family:var(--fonte-display);color:#2ECC71">${credenciadas}</div>
        <div class="text-muted small">Em filial credenciada</div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="card-gr text-center py-3">
        <div style="font-size:1.6rem;font-weight:700;font-family:var(--fonte-display);color:${pendentes > 0 ? '#FFB020' : 'var(--cinza-400)'}">
          ${pendentes}
        </div>
        <div class="text-muted small">Pendentes</div>
      </div>
    </div>
  `;
}

function verificarPendentes() {
  const pendentes = listaManutencoes.filter(m => m.status === 'pendente');
  const alerta = document.getElementById('alertaPendentes');
  if (pendentes.length > 0) {
    alerta.classList.add('visivel');
    document.getElementById('txtQtdPendentes').textContent =
      `${pendentes.length} ${pendentes.length === 1 ? 'manutenção' : 'manutenções'}`;
  } else {
    alerta.classList.remove('visivel');
  }
}

function filtrarPendentes() {
  document.getElementById('filtroStatus').value = 'pendente';
  carregarManutencoes();
}

// ─── Tabela principal ─────────────────────────────────────────────────

function tipoLabel(tipo) {
  return { reparar: 'Reparar', substituir: 'Substituir', misto: 'Misto' }[tipo] || tipo;
}

function renderizarTabela(lista) {
  const tbody = document.getElementById('corpoTabelaManutencoes');
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">Nenhuma manutenção encontrada.</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(m => {
    const data  = m.data_manutencao ? new Date(m.data_manutencao).toLocaleString('pt-BR') : '—';
    const custo = Number(m.custo_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const local = [m.local_servico, m.cidade].filter(Boolean).join(' — ') || '<span class="text-muted">—</span>';

    const statusBadge = m.status === 'pendente'
      ? '<span class="badge-status-pendente"><i class="fa-solid fa-clock"></i> Pendente</span>'
      : '<span class="badge-status-ok"><i class="fa-solid fa-check"></i> OK</span>';
    const credBadge = m.credenciada
      ? '<span class="badge-credenciada"><i class="fa-solid fa-building"></i> Filial</span>'
      : '<span class="badge-nao-credenciada"><i class="fa-solid fa-xmark"></i> Não credenciada</span>';

    let acoes = '';
    if (m.status === 'pendente') {
      if (!ehAdmin) {
        if (!m.cidade && !m.local_servico) {
          acoes = `<button class="btn btn-sm btn-warning" onclick="abrirResolver(${m.id})">
                     <i class="fa-solid fa-pen"></i> Informar
                   </button>`;
        } else {
          acoes = '<span class="text-muted small">Aguard. admin</span>';
        }
      } else {
        if (m.cidade || m.local_servico) {
          acoes = `<button class="btn btn-sm btn-warning" onclick="abrirRegularizar(${m.id})">
                     <i class="fa-solid fa-gavel"></i> Regularizar
                   </button>`;
        } else {
          acoes = '<span class="text-muted small">Aguard. motorista</span>';
        }
      }
    }

    return `
      <tr>
        <td>${data}</td>
        <td>${m.caminhao_placa || '—'}</td>
        <td>${m.motorista_nome || '—'}</td>
        <td>${local}</td>
        <td>${tipoLabel(m.tipo)}</td>
        <td>${custo}</td>
        <td>${statusBadge}</td>
        <td>${credBadge}</td>
        <td>${acoes}</td>
      </tr>`;
  }).join('');
}

// ─── Modal: componentes (tabelas ETS2) ───────────────────────────────

function renderizarTabelaComponentes() {
  _renderComponentes('corpoVeiculo',  COMPONENTES_VEICULO,  'veiculo');
  _renderComponentes('corpoReboque',  COMPONENTES_REBOQUE,  'reboque');
}

function _renderComponentes(tbodyId, componentes, prefixo) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = componentes.map(comp => `
    <tr>
      <td>
        <i class="fa-solid ${comp.icone} me-2" style="color:#FFB020;width:18px;text-align:center;"></i>
        ${comp.label}
      </td>
      <td>
        <input type="number" min="0" max="100" step="1" class="form-control form-control-sm"
          id="${prefixo}_desgaste_${comp.id}" placeholder="0"
          onchange="recalcularCusto()">
      </td>
      <td>
        <input type="number" min="0" max="100" step="1" class="form-control form-control-sm"
          id="${prefixo}_dano_${comp.id}" placeholder="0"
          onchange="recalcularCusto()">
      </td>
      <td>
        <select class="form-select form-select-sm" id="${prefixo}_acao_${comp.id}" onchange="recalcularCusto()">
          <option value="">— Nenhuma —</option>
          <option value="reparar">🔧 Reparar</option>
          <option value="substituir">🔄 Substituir</option>
        </select>
      </td>
      <td>
        <input type="number" min="0" step="0.01" class="form-control form-control-sm"
          id="${prefixo}_custo_${comp.id}" placeholder="0,00"
          onchange="recalcularCusto()">
      </td>
    </tr>
  `).join('');
}

// Preenche ação de todos os componentes de uma seção
function preencherAcao(prefixo, acao) {
  const componentes = prefixo === 'veiculo' ? COMPONENTES_VEICULO : COMPONENTES_REBOQUE;
  componentes.forEach(comp => {
    const sel = document.getElementById(`${prefixo}_acao_${comp.id}`);
    if (sel) sel.value = acao;
  });
  recalcularCusto();
}

function recalcularCusto() {
  const subtotalV = _somarCustos('veiculo',  COMPONENTES_VEICULO);
  const subtotalR = _somarCustos('reboque',  COMPONENTES_REBOQUE);
  const total     = subtotalV + subtotalR;

  document.getElementById('subtotalVeiculo').textContent =
    subtotalV.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  document.getElementById('subtotalReboque').textContent =
    subtotalR.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  document.getElementById('campoCustoTotal').value = total.toFixed(2);

  // Detecta tipo de serviço automaticamente
  const acoesV = _listarAcoes('veiculo', COMPONENTES_VEICULO);
  const acoesR = _listarAcoes('reboque', COMPONENTES_REBOQUE);
  const todas  = [...acoesV, ...acoesR].filter(Boolean);
  const temRep = todas.includes('reparar');
  const temSub = todas.includes('substituir');
  const tipo   = (temRep && temSub) ? 'misto' : temSub ? 'substituir' : 'reparar';
  // Reflete no campo escondido
  document.getElementById('_tipoAutoDetectado').value = tipo;
}

function _somarCustos(prefixo, componentes) {
  return componentes.reduce((soma, comp) => {
    const val = parseFloat(document.getElementById(`${prefixo}_custo_${comp.id}`)?.value) || 0;
    return soma + val;
  }, 0);
}

function _listarAcoes(prefixo, componentes) {
  return componentes.map(comp =>
    document.getElementById(`${prefixo}_acao_${comp.id}`)?.value || ''
  );
}

function _coletarComponentes() {
  const todos = [];
  const seções = [
    { prefixo: 'veiculo', lista: COMPONENTES_VEICULO, secao: 'Veículo' },
    { prefixo: 'reboque', lista: COMPONENTES_REBOQUE, secao: 'Reboque' },
  ];
  seções.forEach(({ prefixo, lista, secao }) => {
    lista.forEach(comp => {
      const acao = document.getElementById(`${prefixo}_acao_${comp.id}`)?.value;
      if (!acao) return; // ignora componentes sem ação
      todos.push({
        secao,
        componente: comp.label,
        desgaste:   parseFloat(document.getElementById(`${prefixo}_desgaste_${comp.id}`)?.value) || 0,
        dano:       parseFloat(document.getElementById(`${prefixo}_dano_${comp.id}`)?.value) || 0,
        acao,
        custo:      parseFloat(document.getElementById(`${prefixo}_custo_${comp.id}`)?.value) || 0,
      });
    });
  });
  return todos;
}

// ─── Verificação de filial em tempo real ─────────────────────────────

function verificarFilialModal() {
  const cidade = (document.getElementById('campoCidade')?.value || '').trim().toLowerCase();
  const local  = (document.getElementById('campoLocalServico')?.value || '').trim().toLowerCase();
  const badge  = document.getElementById('badgeFilialModal');
  const footer = document.getElementById('avisoFilialFooter');

  if (!cidade && !local) {
    badge.innerHTML  = '<i class="fa-solid fa-question-circle"></i> Aguardando';
    badge.style.cssText = 'background:rgba(158,158,158,0.1);color:#9E9E9E;border:1px dashed #9E9E9E;';
    footer.textContent = '';
    return;
  }

  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const match = filiaisCredenciadas.find(f =>
    norm(cidade).includes(norm(f.cidade)) || norm(local).includes(norm(f.posto))
  );

  if (match) {
    badge.innerHTML  = `<i class="fa-solid fa-check-circle"></i> ${match.posto}`;
    badge.style.cssText = 'background:rgba(46,204,113,0.12);color:#2ECC71;border:1px solid rgba(46,204,113,0.35);';
    footer.innerHTML = `<i class="fa-solid fa-check-circle" style="color:#2ECC71"></i> Filial credenciada — sem penalidade`;
    footer.style.color = '#2ECC71';
  } else {
    badge.innerHTML  = '<i class="fa-solid fa-triangle-exclamation"></i> Não credenciada';
    badge.style.cssText = 'background:rgba(255,77,79,0.12);color:#FF4D4F;border:1px solid rgba(255,77,79,0.3);';
    footer.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color:#FF4D4F"></i> Local não é uma filial — <strong>pode gerar penalidade</strong>`;
    footer.style.color = '#FF4D4F';
  }
}

// ─── Abrir modal ──────────────────────────────────────────────────────

function abrirModalNovo() {
  document.getElementById('formManutencao').reset();
  document.getElementById('manutencaoId').value = '';
  document.getElementById('campoDataManutencao').value = new Date().toISOString().slice(0, 16);
  document.getElementById('badgeFilialModal').innerHTML = '<i class="fa-solid fa-question-circle"></i> Aguardando';
  document.getElementById('badgeFilialModal').style.cssText = 'background:rgba(158,158,158,0.1);color:#9E9E9E;border:1px dashed #9E9E9E;';
  document.getElementById('avisoFilialFooter').textContent = '';
  document.getElementById('campoCustoTotal').value = '';
  document.getElementById('subtotalVeiculo').textContent = 'R$ 0,00';
  document.getElementById('subtotalReboque').textContent = 'R$ 0,00';

  // Limpa todas as linhas de componentes
  [...COMPONENTES_VEICULO, ...COMPONENTES_REBOQUE].forEach(comp => {
    ['veiculo','reboque'].forEach(p => {
      ['desgaste','dano','custo'].forEach(campo => {
        const el = document.getElementById(`${p}_${campo}_${comp.id}`);
        if (el) el.value = '';
      });
      const sel = document.getElementById(`${p}_acao_${comp.id}`);
      if (sel) sel.value = '';
    });
  });

  modalManutencao.show();
}

// ─── Salvar manutenção ────────────────────────────────────────────────

async function salvarManutencao(e) {
  e.preventDefault();

  const componentes = _coletarComponentes();
  const custo_total = parseFloat(document.getElementById('campoCustoTotal').value) || 0;
  const tipo        = document.getElementById('_tipoAutoDetectado')?.value || 'reparar';

  const payload = {
    caminhao_id:     document.getElementById('campoCaminhaoId').value,
    motorista_id:    document.getElementById('campoMotoristaId').value || null,
    cidade:          document.getElementById('campoCidade').value.trim(),
    local_servico:   document.getElementById('campoLocalServico').value.trim(),
    tipo,
    componentes,
    custo_total,
    data_manutencao: document.getElementById('campoDataManutencao').value,
    observacoes:     document.getElementById('campoObservacoes').value.trim() || null,
  };

  if (!payload.cidade || !payload.local_servico) {
    Swal.fire({ icon: 'warning', title: 'Campos obrigatórios', text: 'Informe a cidade e o local/filial.' });
    return;
  }

  try {
    await ApiService.post('/manutencoes', payload);
    modalManutencao.hide();
    await carregarManutencoes();
    Swal.fire({ icon: 'success', title: 'Manutenção registrada!', timer: 2000, showConfirmButton: false });
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Erro', text: err.message || 'Não foi possível salvar.' });
  }
}

// ─── Modal: Resolver pendente (motorista) ─────────────────────────────

function abrirResolver(id) {
  document.getElementById('resolverManutencaoId').value = id;
  document.getElementById('resolverCidade').value = '';
  document.getElementById('resolverLocalServico').value = '';
  modalResolver.show();
}

async function enviarResolver() {
  const id            = document.getElementById('resolverManutencaoId').value;
  const cidade        = document.getElementById('resolverCidade').value.trim();
  const local_servico = document.getElementById('resolverLocalServico').value.trim();

  if (!cidade || !local_servico) {
    Swal.fire({ icon: 'warning', title: 'Preencha todos os campos', text: 'Informe a cidade e o nome da filial/oficina.' });
    return;
  }

  try {
    const res = await ApiService.patch(`/manutencoes/${id}/resolver-pendente`, { cidade, local_servico });
    modalResolver.hide();
    await carregarManutencoes();
    if (res.credenciada) {
      Swal.fire({ icon: 'success', title: 'Confirmado automaticamente!', text: res.motivo, timer: 3000, showConfirmButton: false });
    } else {
      Swal.fire({ icon: 'info', title: 'Dados enviados', text: 'O administrador irá regularizar em breve.' });
    }
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Erro', text: err.message || 'Não foi possível enviar.' });
  }
}

// ─── Modal: Regularizar pendente (admin) ──────────────────────────────

function abrirRegularizar(id) {
  const man = listaManutencoes.find(m => m.id === id);
  if (!man) return;
  document.getElementById('regularizarManutencaoId').value = id;
  document.getElementById('regularizarObs').value = '';
  document.getElementById('optPenalizar').checked = true;
  document.getElementById('infoPendenteAdmin').innerHTML = `
    <strong>Motorista:</strong> ${man.motorista_nome || '—'}<br>
    <strong>Caminhão:</strong> ${man.caminhao_placa || '—'}<br>
    <strong>Local informado:</strong> ${man.local_servico || '—'}<br>
    <strong>Cidade informada:</strong> ${man.cidade || '—'}<br>
    <strong>Custo:</strong> ${Number(man.custo_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
  `;
  modalRegularizar.show();
}

async function confirmarRegularizar() {
  const id       = document.getElementById('regularizarManutencaoId').value;
  const decisao  = document.querySelector('input[name="decisaoRegularizar"]:checked').value;
  const penalizar = decisao === 'penalizar';
  const obs      = document.getElementById('regularizarObs').value.trim() || null;

  try {
    await ApiService.patch(`/manutencoes/${id}/regularizar`, { penalizar, observacoes: obs });
    modalRegularizar.hide();
    await carregarManutencoes();
    Swal.fire({
      icon: penalizar ? 'warning' : 'success',
      title: penalizar ? 'Penalidade aplicada' : 'Liberado sem penalidade',
      timer: 2500, showConfirmButton: false,
    });
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Erro', text: err.message || 'Não foi possível regularizar.' });
  }
}
