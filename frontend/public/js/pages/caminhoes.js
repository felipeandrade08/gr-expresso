// =====================================================================
// GR EXPRESSO - Página: Caminhões (CRUD)
// =====================================================================

let modalCaminhao;
let listaCaminhoesAtual = [];

(async function () {
  // Página exclusiva de administrador.
  if (!AuthService.protegerPaginaAdmin()) return;

  montarLayout({
    paginaAtiva: 'caminhoes',
    titulo: 'Caminhões',
    subtitulo: 'Gerencie a frota de caminhões da transportadora'
  });

  AOS.init({ duration: 500, once: true });
  modalCaminhao = new bootstrap.Modal(document.getElementById('modalCaminhao'));

  document.getElementById('btnNovoCaminhao').addEventListener('click', abrirModalNovo);
  document.getElementById('formCaminhao').addEventListener('submit', salvarCaminhao);
  document.getElementById('campoBusca').addEventListener('input', debounce(carregarCaminhoes, 350));
  document.getElementById('filtroStatus').addEventListener('change', carregarCaminhoes);

  await Promise.all([carregarCaminhoes(), carregarMotoristasParaSelect()]);
})();

function debounce(fn, atraso) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), atraso); };
}

async function carregarMotoristasParaSelect() {
  try {
    const motoristas = await ApiService.get('/motoristas?status=ativo');
    const select = document.getElementById('campoMotoristaId');
    motoristas.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.apelido || m.nome;
      select.appendChild(opt);
    });
  } catch (erro) {
    console.error('Erro ao carregar motoristas para o select:', erro);
  }
}

async function carregarCaminhoes() {
  const grid = document.getElementById('gridCaminhoes');
  const busca = document.getElementById('campoBusca').value.trim();
  const status = document.getElementById('filtroStatus').value;

  try {
    const params = new URLSearchParams();
    if (busca) params.set('busca', busca);
    if (status) params.set('status', status);

    const caminhoes = await ApiService.get(`/caminhoes?${params.toString()}`);
    listaCaminhoesAtual = caminhoes;
    renderizarGrid(caminhoes);
  } catch (erro) {
    console.error(erro);
    UI.estadoErro(grid, erro.message);
  }
}

const ICONE_STATUS = {
  disponivel: 'fa-circle-check', em_viagem: 'fa-route', manutencao: 'fa-screwdriver-wrench', inativo: 'fa-circle-xmark'
};

function renderizarGrid(caminhoes) {
  const grid = document.getElementById('gridCaminhoes');

  if (!caminhoes.length) {
    grid.innerHTML = `<div class="col-12"><div class="card-gr"><div class="estado-vazio">
      <i class="fa-solid fa-truck"></i>
      <h4>Nenhum caminhão cadastrado</h4>
      <p>Adicione o primeiro caminhão da sua frota.</p>
      <button class="btn-gr-primario" onclick="abrirModalNovo()"><i class="fa-solid fa-plus"></i> Novo Caminhão</button>
    </div></div></div>`;
    return;
  }

  grid.innerHTML = caminhoes.map((c) => `
    <div class="col-md-6 col-xl-4">
      <div class="card-gr h-100">
        <div class="card-gr__body">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="d-flex align-items-center gap-3">
              <div class="card-indicador__icone bg-verde" style="margin-bottom:0;">
                <i class="fa-solid fa-truck"></i>
              </div>
              <div>
                <div class="fw-bold fonte-display" style="font-size:1rem;">${c.placa}</div>
                <div class="text-muted" style="font-size:0.8rem;">${c.marca} ${c.modelo} ${c.ano || ''}</div>
              </div>
            </div>
            ${Formatador.badgeStatus(c.status)}
          </div>

          <div class="linha-rodovia mb-3" style="width:100%; opacity:0.5;"></div>

          <div class="row g-2 mb-3" style="font-size:0.8rem;">
            <div class="col-6">
              <div class="text-muted" style="font-size:0.72rem;">KM rodados</div>
              <div class="fw-semibold">${Formatador.km(c.km_atual)}</div>
            </div>
            <div class="col-6">
              <div class="text-muted" style="font-size:0.72rem;">Consumo médio</div>
              <div class="fw-semibold">${c.consumo_medio || 0} km/L</div>
            </div>
            <div class="col-6">
              <div class="text-muted" style="font-size:0.72rem;">Motorista</div>
              <div class="fw-semibold">${c.motorista_nome || '—'}</div>
            </div>
            <div class="col-6">
              <div class="text-muted" style="font-size:0.72rem;">Tanque</div>
              <div class="fw-semibold">${c.capacidade_tanque || 0} L</div>
            </div>
          </div>

          <div class="d-flex gap-2">
            <button class="btn-gr-outline flex-grow-1" onclick="editarCaminhao(${c.id})"><i class="fa-solid fa-pen"></i> Editar</button>
            <button class="btn-gr-icone perigo" onclick="excluirCaminhao(${c.id}, '${c.placa}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function abrirModalNovo() {
  document.getElementById('formCaminhao').reset();
  document.getElementById('caminhaoId').value = '';
  document.getElementById('tituloModalCaminhao').textContent = 'Novo Caminhão';
  document.getElementById('campoStatus').value = 'disponivel';
  modalCaminhao.show();
}

function editarCaminhao(id) {
  const c = listaCaminhoesAtual.find((x) => x.id === id);
  if (!c) return;

  document.getElementById('caminhaoId').value = c.id;
  document.getElementById('campoPlaca').value = c.placa || '';
  document.getElementById('campoMarca').value = c.marca || '';
  document.getElementById('campoModelo').value = c.modelo || '';
  document.getElementById('campoAno').value = c.ano || '';
  document.getElementById('campoCor').value = c.cor || '';
  document.getElementById('campoKmAtual').value = c.km_atual || 0;
  document.getElementById('campoStatus').value = c.status || 'disponivel';
  document.getElementById('campoCapacidadeTanque').value = c.capacidade_tanque || '';
  document.getElementById('campoConsumoMedio').value = c.consumo_medio || '';
  document.getElementById('campoValorAquisicao').value = c.valor_aquisicao || '';
  document.getElementById('campoMotoristaId').value = c.motorista_atual_id || '';
  document.getElementById('campoObservacoes').value = c.observacoes || '';
  document.getElementById('tituloModalCaminhao').textContent = 'Editar Caminhão';

  modalCaminhao.show();
}

async function salvarCaminhao(evento) {
  evento.preventDefault();
  const id = document.getElementById('caminhaoId').value;

  const dados = {
    placa: document.getElementById('campoPlaca').value.trim().toUpperCase(),
    marca: document.getElementById('campoMarca').value.trim(),
    modelo: document.getElementById('campoModelo').value.trim(),
    ano: document.getElementById('campoAno').value || null,
    cor: document.getElementById('campoCor').value.trim(),
    km_atual: document.getElementById('campoKmAtual').value || 0,
    status: document.getElementById('campoStatus').value,
    capacidade_tanque: document.getElementById('campoCapacidadeTanque').value || 0,
    consumo_medio: document.getElementById('campoConsumoMedio').value || 0,
    valor_aquisicao: document.getElementById('campoValorAquisicao').value || 0,
    motorista_atual_id: document.getElementById('campoMotoristaId').value || null,
    observacoes: document.getElementById('campoObservacoes').value.trim()
  };

  try {
    if (id) {
      await ApiService.put(`/caminhoes/${id}`, dados);
      UI.toastSucesso('Caminhão atualizado com sucesso!');
    } else {
      await ApiService.post('/caminhoes', dados);
      UI.toastSucesso('Caminhão cadastrado com sucesso!');
    }
    modalCaminhao.hide();
    await carregarCaminhoes();
  } catch (erro) {
    console.error(erro);
    UI.toastErro(erro.message);
  }
}

async function excluirCaminhao(id, placa) {
  const confirmado = await UI.confirmarExclusao(`o caminhão <b>${placa}</b>`);
  if (!confirmado) return;

  try {
    await ApiService.delete(`/caminhoes/${id}`);
    UI.toastSucesso('Caminhão excluído com sucesso.');
    await carregarCaminhoes();
  } catch (erro) {
    console.error(erro);
    UI.toastErro(erro.message);
  }
}
