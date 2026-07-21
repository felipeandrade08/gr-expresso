// =====================================================================
// FELIPINHO LAUNCHER - Página: Despesas (CRUD + gráfico por categoria)
// =====================================================================

let modalDespesa;
let listaDespesasAtual = [];

const LABEL_CATEGORIA = {
  manutencao: 'Manutenção', pneus: 'Pneus', multa: 'Multa', pedagio: 'Pedágio',
  seguro: 'Seguro', salario: 'Salário', administrativa: 'Administrativa', outra: 'Outra'
};

(async function () {
  // Página exclusiva de administrador.
  if (!AuthService.protegerPaginaAdmin()) return;

  montarLayout({
    paginaAtiva: 'despesas',
    titulo: 'Despesas',
    subtitulo: 'Controle de custos operacionais da transportadora'
  });

  AOS.init({ duration: 500, once: true });
  modalDespesa = new bootstrap.Modal(document.getElementById('modalDespesa'));

  document.getElementById('btnNovaDespesa').addEventListener('click', abrirModalNovo);
  document.getElementById('formDespesa').addEventListener('submit', salvarDespesa);
  document.getElementById('filtroCategoria').addEventListener('change', carregarDespesas);
  document.getElementById('filtroDataInicio').addEventListener('change', carregarDespesas);
  document.getElementById('filtroDataFim').addEventListener('change', carregarDespesas);

  await Promise.all([carregarSelects(), carregarDespesas(), carregarGraficoCategorias()]);
})();

async function carregarSelects() {
  try {
    const [caminhoes, reboques, motoristas] = await Promise.all([
      ApiService.get('/caminhoes'), ApiService.get('/reboques'), ApiService.get('/motoristas')
    ]);

    document.getElementById('campoCaminhaoId').innerHTML = '<option value="">Não vinculado</option>' +
      caminhoes.map((c) => `<option value="${c.id}">${c.placa}</option>`).join('');
    document.getElementById('campoReboqueId').innerHTML = '<option value="">Não vinculado</option>' +
      reboques.map((r) => `<option value="${r.id}">${r.placa}</option>`).join('');
    document.getElementById('campoMotoristaId').innerHTML = '<option value="">Não vinculado</option>' +
      motoristas.map((m) => `<option value="${m.id}">${m.apelido || m.nome}</option>`).join('');
  } catch (erro) {
    console.error('Erro ao carregar selects:', erro);
  }
}

async function carregarGraficoCategorias() {
  try {
    const dados = await ApiService.get('/despesas/total-por-categoria');
    const totalGeral = dados.reduce((acc, d) => acc + Number(d.total), 0);

    document.getElementById('cardTotalDespesas').innerHTML = `
      <div class="card-indicador h-100">
        <div class="card-indicador__icone bg-alerta"><i class="fa-solid fa-receipt"></i></div>
        <div class="card-indicador__valor">${Formatador.moeda(totalGeral)}</div>
        <div class="card-indicador__label">Total de despesas registradas</div>
      </div>`;

    document.getElementById('cardQtdDespesas').innerHTML = `
      <div class="card-indicador h-100">
        <div class="card-indicador__icone bg-verde"><i class="fa-solid fa-list-check"></i></div>
        <div class="card-indicador__valor">${dados.length}</div>
        <div class="card-indicador__label">Categorias com despesas</div>
      </div>`;

    const cores = ['#0B0B0B', '#D4A017', '#3AA6FF', '#FFB020', '#FF4D4F', '#9AA39E', '#1A1A1A', '#B8860B'];
    const ctx = document.getElementById('graficoCategorias');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: dados.map((d) => LABEL_CATEGORIA[d.categoria] || d.categoria),
        datasets: [{ data: dados.map((d) => Number(d.total)), backgroundColor: cores, borderWidth: 0, hoverOffset: 6 }]
      },
      options: { responsive: true, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } }
    });
  } catch (erro) {
    console.error('Erro ao carregar gráfico de categorias:', erro);
  }
}

async function carregarDespesas() {
  const corpo = document.getElementById('corpoTabelaDespesas');
  const categoria = document.getElementById('filtroCategoria').value;
  const data_inicio = document.getElementById('filtroDataInicio').value;
  const data_fim = document.getElementById('filtroDataFim').value;

  try {
    const params = new URLSearchParams();
    if (categoria) params.set('categoria', categoria);
    if (data_inicio) params.set('data_inicio', data_inicio);
    if (data_fim) params.set('data_fim', data_fim);

    const despesas = await ApiService.get(`/despesas?${params.toString()}`);
    listaDespesasAtual = despesas;
    renderizarTabela(despesas);
  } catch (erro) {
    console.error(erro);
    corpo.innerHTML = `<tr><td colspan="7"><div class="estado-vazio"><i class="fa-solid fa-plug-circle-xmark" style="color:var(--perigo)"></i><h4>Erro ao carregar despesas</h4><p>${erro.message}</p></div></td></tr>`;
  }
}

function renderizarTabela(despesas) {
  const corpo = document.getElementById('corpoTabelaDespesas');

  if (!despesas.length) {
    corpo.innerHTML = `<tr><td colspan="7">
      <div class="estado-vazio">
        <i class="fa-solid fa-receipt"></i>
        <h4>Nenhuma despesa registrada</h4>
        <p>Registre a primeira despesa da transportadora.</p>
        <button class="btn-gr-primario" onclick="abrirModalNovo()"><i class="fa-solid fa-plus"></i> Nova Despesa</button>
      </div>
    </td></tr>`;
    return;
  }

  corpo.innerHTML = despesas.map((d) => `
    <tr>
      <td>${Formatador.data(d.data_despesa)}</td>
      <td class="fw-semibold">${d.descricao}</td>
      <td>${LABEL_CATEGORIA[d.categoria] || d.categoria}</td>
      <td class="text-muted" style="font-size:0.78rem;">${[d.caminhao_placa, d.reboque_placa, d.motorista_nome].filter(Boolean).join(', ') || '—'}</td>
      <td class="fw-semibold">${Formatador.moeda(d.valor)}</td>
      <td class="text-capitalize">${d.forma_pagamento}</td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn-gr-icone" onclick="editarDespesa(${d.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-gr-icone perigo" onclick="excluirDespesa(${d.id})" title="Excluir"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function abrirModalNovo() {
  document.getElementById('formDespesa').reset();
  document.getElementById('despesaId').value = '';
  document.getElementById('tituloModalDespesa').textContent = 'Nova Despesa';
  document.getElementById('campoDataDespesa').value = new Date().toISOString().split('T')[0];
  modalDespesa.show();
}

function editarDespesa(id) {
  const d = listaDespesasAtual.find((x) => x.id === id);
  if (!d) return;

  document.getElementById('despesaId').value = d.id;
  document.getElementById('campoDescricao').value = d.descricao || '';
  document.getElementById('campoCategoria').value = d.categoria || 'outra';
  document.getElementById('campoCaminhaoId').value = d.caminhao_id || '';
  document.getElementById('campoReboqueId').value = d.reboque_id || '';
  document.getElementById('campoMotoristaId').value = d.motorista_id || '';
  document.getElementById('campoValor').value = d.valor || '';
  document.getElementById('campoDataDespesa').value = d.data_despesa ? d.data_despesa.split('T')[0] : '';
  document.getElementById('campoFormaPagamento').value = d.forma_pagamento || 'outro';
  document.getElementById('campoObservacoes').value = d.observacoes || '';
  document.getElementById('tituloModalDespesa').textContent = 'Editar Despesa';

  modalDespesa.show();
}

async function salvarDespesa(evento) {
  evento.preventDefault();
  const id = document.getElementById('despesaId').value;

  const dados = {
    descricao: document.getElementById('campoDescricao').value.trim(),
    categoria: document.getElementById('campoCategoria').value,
    caminhao_id: document.getElementById('campoCaminhaoId').value || null,
    reboque_id: document.getElementById('campoReboqueId').value || null,
    motorista_id: document.getElementById('campoMotoristaId').value || null,
    valor: document.getElementById('campoValor').value,
    data_despesa: document.getElementById('campoDataDespesa').value,
    forma_pagamento: document.getElementById('campoFormaPagamento').value,
    observacoes: document.getElementById('campoObservacoes').value.trim()
  };

  try {
    if (id) {
      await ApiService.put(`/despesas/${id}`, dados);
      UI.toastSucesso('Despesa atualizada com sucesso!');
    } else {
      await ApiService.post('/despesas', dados);
      UI.toastSucesso('Despesa registrada com sucesso!');
    }
    modalDespesa.hide();
    await carregarDespesas();
  } catch (erro) {
    console.error(erro);
    UI.toastErro(erro.message);
  }
}

async function excluirDespesa(id) {
  const confirmado = await UI.confirmarExclusao('esta despesa');
  if (!confirmado) return;

  try {
    await ApiService.delete(`/despesas/${id}`);
    UI.toastSucesso('Despesa excluída com sucesso.');
    await carregarDespesas();
  } catch (erro) {
    console.error(erro);
    UI.toastErro(erro.message);
  }
}
