// =====================================================================
// FELIPINHO LAUNCHER - Página: Controle Financeiro (CRUD + fluxo de caixa)
// =====================================================================

let modalLancamento;
let listaFinanceiroAtual = [];

(async function () {
  // Página exclusiva de administrador.
  if (!AuthService.protegerPaginaAdmin()) return;

  montarLayout({
    paginaAtiva: 'financeiro',
    titulo: 'Controle Financeiro',
    subtitulo: 'Entradas, saídas e saldo consolidado da transportadora'
  });

  AOS.init({ duration: 500, once: true });
  modalLancamento = new bootstrap.Modal(document.getElementById('modalLancamento'));

  document.getElementById('btnNovoLancamento').addEventListener('click', abrirModalNovo);
  document.getElementById('formLancamento').addEventListener('submit', salvarLancamento);
  document.getElementById('filtroTipo').addEventListener('change', carregarLancamentos);
  document.getElementById('filtroDataInicio').addEventListener('change', carregarLancamentos);
  document.getElementById('filtroDataFim').addEventListener('change', carregarLancamentos);

  await Promise.all([carregarResumo(), carregarGraficoFluxo(), carregarLancamentos()]);
})();

async function carregarResumo() {
  try {
    const resumo = await ApiService.get('/financeiro/resumo');
    document.getElementById('gridResumoFinanceiro').innerHTML = `
      <div class="col-md-4">
        <div class="card-indicador">
          <div class="card-indicador__icone bg-limao"><i class="fa-solid fa-arrow-trend-up"></i></div>
          <div class="card-indicador__valor">${Formatador.moeda(resumo.total_entradas)}</div>
          <div class="card-indicador__label">Total de entradas</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card-indicador">
          <div class="card-indicador__icone bg-alerta"><i class="fa-solid fa-arrow-trend-down"></i></div>
          <div class="card-indicador__valor">${Formatador.moeda(resumo.total_saidas)}</div>
          <div class="card-indicador__label">Total de saídas</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card-indicador">
          <div class="card-indicador__icone bg-verde"><i class="fa-solid fa-scale-balanced"></i></div>
          <div class="card-indicador__valor">${Formatador.moeda(resumo.saldo)}</div>
          <div class="card-indicador__label">Saldo atual</div>
        </div>
      </div>
    `;
  } catch (erro) {
    console.error('Erro ao carregar resumo financeiro:', erro);
  }
}

async function carregarGraficoFluxo() {
  try {
    const dados = await ApiService.get('/financeiro/fluxo-por-mes?meses=6');
    const ctx = document.getElementById('graficoFluxo');

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dados.map((d) => formatarMesLabel(d.mes)),
        datasets: [
          { label: 'Entradas', data: dados.map((d) => Number(d.entradas)), backgroundColor: '#D4A017', borderRadius: 6, maxBarThickness: 38 },
          { label: 'Saídas', data: dados.map((d) => Number(d.saidas)), backgroundColor: '#0B0B0B', borderRadius: 6, maxBarThickness: 38 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
        scales: { y: { ticks: { callback: (v) => `R$ ${v}` }, grid: { color: '#E7EBE9' } }, x: { grid: { display: false } } }
      }
    });
  } catch (erro) {
    console.error('Erro ao carregar gráfico de fluxo:', erro);
  }
}

function formatarMesLabel(mesAno) {
  if (!mesAno) return '';
  const [ano, mes] = mesAno.split('-');
  const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomesMeses[Number(mes) - 1]}/${ano.slice(2)}`;
}

async function carregarLancamentos() {
  const corpo = document.getElementById('corpoTabelaFinanceiro');
  const tipo = document.getElementById('filtroTipo').value;
  const data_inicio = document.getElementById('filtroDataInicio').value;
  const data_fim = document.getElementById('filtroDataFim').value;

  try {
    const params = new URLSearchParams();
    if (tipo) params.set('tipo', tipo);
    if (data_inicio) params.set('data_inicio', data_inicio);
    if (data_fim) params.set('data_fim', data_fim);

    const lancamentos = await ApiService.get(`/financeiro?${params.toString()}`);
    listaFinanceiroAtual = lancamentos;
    renderizarTabela(lancamentos);
  } catch (erro) {
    console.error(erro);
    corpo.innerHTML = `<tr><td colspan="6"><div class="estado-vazio"><i class="fa-solid fa-plug-circle-xmark" style="color:var(--perigo)"></i><h4>Erro ao carregar lançamentos</h4><p>${erro.message}</p></div></td></tr>`;
  }
}

function renderizarTabela(lancamentos) {
  const corpo = document.getElementById('corpoTabelaFinanceiro');

  if (!lancamentos.length) {
    corpo.innerHTML = `<tr><td colspan="6">
      <div class="estado-vazio">
        <i class="fa-solid fa-sack-dollar"></i>
        <h4>Nenhum lançamento registrado</h4>
        <p>Registre o primeiro lançamento financeiro.</p>
        <button class="btn-gr-primario" onclick="abrirModalNovo()"><i class="fa-solid fa-plus"></i> Novo Lançamento</button>
      </div>
    </td></tr>`;
    return;
  }

  corpo.innerHTML = lancamentos.map((l) => `
    <tr>
      <td>${Formatador.data(l.data_lancamento)}</td>
      <td class="fw-semibold">${l.descricao}</td>
      <td>${l.categoria}</td>
      <td><span class="badge-status ${l.tipo === 'entrada' ? 'status-ativo' : 'status-cancelada'}">${l.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
      <td class="fw-semibold" style="color:${l.tipo === 'entrada' ? '#1E9E58' : '#D6393B'}">
        ${l.tipo === 'entrada' ? '+' : '-'} ${Formatador.moeda(l.valor)}
      </td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn-gr-icone" onclick="editarLancamento(${l.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-gr-icone perigo" onclick="excluirLancamento(${l.id})" title="Excluir"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function abrirModalNovo() {
  document.getElementById('formLancamento').reset();
  document.getElementById('lancamentoId').value = '';
  document.getElementById('tituloModalLancamento').textContent = 'Novo Lançamento';
  document.getElementById('campoDataLancamento').value = new Date().toISOString().split('T')[0];
  modalLancamento.show();
}

function editarLancamento(id) {
  const l = listaFinanceiroAtual.find((x) => x.id === id);
  if (!l) return;

  document.getElementById('lancamentoId').value = l.id;
  document.getElementById('campoTipo').value = l.tipo;
  document.getElementById('campoDescricao').value = l.descricao || '';
  document.getElementById('campoCategoria').value = l.categoria || '';
  document.getElementById('campoValor').value = l.valor || '';
  document.getElementById('campoDataLancamento').value = l.data_lancamento ? l.data_lancamento.split('T')[0] : '';
  document.getElementById('campoObservacoes').value = l.observacoes || '';
  document.getElementById('tituloModalLancamento').textContent = 'Editar Lançamento';

  modalLancamento.show();
}

async function salvarLancamento(evento) {
  evento.preventDefault();
  const id = document.getElementById('lancamentoId').value;

  const dados = {
    tipo: document.getElementById('campoTipo').value,
    descricao: document.getElementById('campoDescricao').value.trim(),
    categoria: document.getElementById('campoCategoria').value.trim(),
    valor: document.getElementById('campoValor').value,
    data_lancamento: document.getElementById('campoDataLancamento').value,
    referencia_tipo: 'manual',
    observacoes: document.getElementById('campoObservacoes').value.trim()
  };

  try {
    if (id) {
      await ApiService.put(`/financeiro/${id}`, dados);
      UI.toastSucesso('Lançamento atualizado com sucesso!');
    } else {
      await ApiService.post('/financeiro', dados);
      UI.toastSucesso('Lançamento registrado com sucesso!');
    }
    modalLancamento.hide();
    await Promise.all([carregarLancamentos(), carregarResumo()]);
  } catch (erro) {
    console.error(erro);
    UI.toastErro(erro.message);
  }
}

async function excluirLancamento(id) {
  const confirmado = await UI.confirmarExclusao('este lançamento');
  if (!confirmado) return;

  try {
    await ApiService.delete(`/financeiro/${id}`);
    UI.toastSucesso('Lançamento excluído com sucesso.');
    await Promise.all([carregarLancamentos(), carregarResumo()]);
  } catch (erro) {
    console.error(erro);
    UI.toastErro(erro.message);
  }
}
