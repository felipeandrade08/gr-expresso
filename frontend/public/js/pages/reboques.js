// =====================================================================
// GR EXPRESSO - Página: Reboques (CRUD)
// =====================================================================

let modalReboque;
let listaReboquesAtual = [];

(async function () {
  // Página exclusiva de administrador.
  if (!AuthService.protegerPaginaAdmin()) return;

  montarLayout({
    paginaAtiva: 'reboques',
    titulo: 'Reboques',
    subtitulo: 'Gerencie os reboques/semirreboques da frota'
  });

  AOS.init({ duration: 500, once: true });
  modalReboque = new bootstrap.Modal(document.getElementById('modalReboque'));

  document.getElementById('btnNovoReboque').addEventListener('click', abrirModalNovo);
  document.getElementById('formReboque').addEventListener('submit', salvarReboque);
  document.getElementById('filtroTipo').addEventListener('change', carregarReboques);
  document.getElementById('filtroStatus').addEventListener('change', carregarReboques);

  await carregarReboques();
})();

async function carregarReboques() {
  const corpo = document.getElementById('corpoTabelaReboques');
  const tipo = document.getElementById('filtroTipo').value;
  const status = document.getElementById('filtroStatus').value;

  try {
    const params = new URLSearchParams();
    if (tipo) params.set('tipo', tipo);
    if (status) params.set('status', status);

    const reboques = await ApiService.get(`/reboques?${params.toString()}`);
    listaReboquesAtual = reboques;
    renderizarTabela(reboques);
  } catch (erro) {
    console.error(erro);
    corpo.innerHTML = `<tr><td colspan="6"><div class="estado-vazio"><i class="fa-solid fa-plug-circle-xmark" style="color:var(--perigo)"></i><h4>Erro ao carregar reboques</h4><p>${erro.message}</p></div></td></tr>`;
  }
}

const LABEL_TIPO = {
  bau: 'Baú', graneleiro: 'Graneleiro', tanque: 'Tanque',
  plataforma: 'Plataforma', frigorifico: 'Frigorífico', cacamba: 'Caçamba', outro: 'Outro'
};

function renderizarTabela(reboques) {
  const corpo = document.getElementById('corpoTabelaReboques');

  if (!reboques.length) {
    corpo.innerHTML = `<tr><td colspan="6">
      <div class="estado-vazio">
        <i class="fa-solid fa-trailer"></i>
        <h4>Nenhum reboque cadastrado</h4>
        <p>Adicione o primeiro reboque da sua frota.</p>
        <button class="btn-gr-primario" onclick="abrirModalNovo()"><i class="fa-solid fa-plus"></i> Novo Reboque</button>
      </div>
    </td></tr>`;
    return;
  }

  corpo.innerHTML = reboques.map((r) => `
    <tr>
      <td class="fw-semibold">${r.placa}</td>
      <td>${LABEL_TIPO[r.tipo] || r.tipo}</td>
      <td>${r.capacidade_carga || 0} t</td>
      <td>${r.caminhao_placa || '—'}</td>
      <td>${Formatador.badgeStatus(r.status)}</td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn-gr-icone" onclick="editarReboque(${r.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-gr-icone perigo" onclick="excluirReboque(${r.id}, '${r.placa}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function abrirModalNovo() {
  document.getElementById('formReboque').reset();
  document.getElementById('reboqueId').value = '';
  document.getElementById('tituloModalReboque').textContent = 'Novo Reboque';
  document.getElementById('campoStatus').value = 'disponivel';
  modalReboque.show();
}

function editarReboque(id) {
  const r = listaReboquesAtual.find((x) => x.id === id);
  if (!r) return;

  document.getElementById('reboqueId').value = r.id;
  document.getElementById('campoPlaca').value = r.placa || '';
  document.getElementById('campoTipo').value = r.tipo || 'outro';
  document.getElementById('campoCapacidadeCarga').value = r.capacidade_carga || '';
  document.getElementById('campoStatus').value = r.status || 'disponivel';
  document.getElementById('campoValorAquisicao').value = r.valor_aquisicao || '';
  document.getElementById('campoObservacoes').value = r.observacoes || '';
  document.getElementById('tituloModalReboque').textContent = 'Editar Reboque';

  modalReboque.show();
}

async function salvarReboque(evento) {
  evento.preventDefault();
  const id = document.getElementById('reboqueId').value;

  const dados = {
    placa: document.getElementById('campoPlaca').value.trim().toUpperCase(),
    tipo: document.getElementById('campoTipo').value,
    capacidade_carga: document.getElementById('campoCapacidadeCarga').value || 0,
    status: document.getElementById('campoStatus').value,
    valor_aquisicao: document.getElementById('campoValorAquisicao').value || 0,
    observacoes: document.getElementById('campoObservacoes').value.trim()
  };

  try {
    if (id) {
      await ApiService.put(`/reboques/${id}`, dados);
      UI.toastSucesso('Reboque atualizado com sucesso!');
    } else {
      await ApiService.post('/reboques', dados);
      UI.toastSucesso('Reboque cadastrado com sucesso!');
    }
    modalReboque.hide();
    await carregarReboques();
  } catch (erro) {
    console.error(erro);
    UI.toastErro(erro.message);
  }
}

async function excluirReboque(id, placa) {
  const confirmado = await UI.confirmarExclusao(`o reboque <b>${placa}</b>`);
  if (!confirmado) return;

  try {
    await ApiService.delete(`/reboques/${id}`);
    UI.toastSucesso('Reboque excluído com sucesso.');
    await carregarReboques();
  } catch (erro) {
    console.error(erro);
    UI.toastErro(erro.message);
  }
}
