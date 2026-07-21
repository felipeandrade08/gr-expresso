// =====================================================================
// FELIPINHO LAUNCHER - Página: Motoristas (CRUD)
// =====================================================================

let modalMotorista;
let listaMotoristasAtual = [];

(async function () {
  // Página exclusiva de administrador.
  if (!AuthService.protegerPaginaAdmin()) return;

  montarLayout({
    paginaAtiva: 'motoristas',
    titulo: 'Motoristas',
    subtitulo: 'Gerencie o cadastro e o status dos motoristas da frota'
  });

  AOS.init({ duration: 500, once: true });
  modalMotorista = new bootstrap.Modal(document.getElementById('modalMotorista'));

  document.getElementById('btnNovoMotorista').addEventListener('click', abrirModalNovo);
  document.getElementById('formMotorista').addEventListener('submit', salvarMotorista);
  document.getElementById('campoBusca').addEventListener('input', debounce(carregarMotoristas, 350));
  document.getElementById('filtroStatus').addEventListener('change', carregarMotoristas);

  await carregarMotoristas();
})();

function debounce(fn, atraso) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), atraso);
  };
}

async function carregarMotoristas() {
  const corpo = document.getElementById('corpoTabelaMotoristas');
  const busca = document.getElementById('campoBusca').value.trim();
  const status = document.getElementById('filtroStatus').value;

  try {
    const params = new URLSearchParams();
    if (busca) params.set('busca', busca);
    if (status) params.set('status', status);

    const motoristas = await ApiService.get(`/motoristas?${params.toString()}`);
    listaMotoristasAtual = motoristas;
    renderizarTabela(motoristas);
  } catch (erro) {
    console.error(erro);
    corpo.innerHTML = `<tr><td colspan="8"><div class="estado-vazio"><i class="fa-solid fa-plug-circle-xmark" style="color:var(--perigo)"></i><h4>Erro ao carregar motoristas</h4><p>${erro.message}</p></div></td></tr>`;
  }
}

function renderizarTabela(motoristas) {
  const corpo = document.getElementById('corpoTabelaMotoristas');

  if (!motoristas.length) {
    corpo.innerHTML = `<tr><td colspan="8">
      <div class="estado-vazio">
        <i class="fa-solid fa-id-card"></i>
        <h4>Nenhum motorista encontrado</h4>
        <p>Cadastre o primeiro motorista da sua transportadora.</p>
        <button class="btn-gr-primario" onclick="abrirModalNovo()"><i class="fa-solid fa-plus"></i> Novo Motorista</button>
      </div>
    </td></tr>`;
    return;
  }

  corpo.innerHTML = motoristas.map((m) => `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-2">
          <div class="podio-avatar" style="width:34px;height:34px;font-size:0.8rem;">${Formatador.iniciais(m.nome)}</div>
          <div>
            <div class="fw-semibold" style="font-size:0.86rem;">${m.nome}</div>
            <div class="text-muted" style="font-size:0.74rem;">${m.apelido || '—'}</div>
          </div>
        </div>
      </td>
      <td>${m.cnh || '—'}</td>
      <td>
        <div style="font-size:0.8rem;">${m.telefone || '—'}</div>
        <div class="text-muted" style="font-size:0.74rem;">${m.email || '—'}</div>
      </td>
      <td>${m.total_viagens}</td>
      <td>${Formatador.km(m.total_km)}</td>
      <td>${Formatador.moeda(m.total_faturado)}</td>
      <td>${Formatador.badgeStatus(m.status)}</td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn-gr-icone" onclick="editarMotorista(${m.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
          ${m.status === 'ativo'
            ? `<button class="btn-gr-icone" style="color:#FFB020;border-color:rgba(255,176,32,.3)" onclick="toggleStatusMotorista(${m.id},'${m.nome.replace(/'/g,"\\'")}',' inativar')" title="Desativar motorista"><i class="fa-solid fa-user-slash"></i></button>`
            : `<button class="btn-gr-icone" style="color:#2ECC71;border-color:rgba(46,204,113,.3)" onclick="toggleStatusMotorista(${m.id},'${m.nome.replace(/'/g,"\\'")}',' ativar')" title="Ativar motorista"><i class="fa-solid fa-user-check"></i></button>`
          }
          <button class="btn-gr-icone perigo" onclick="excluirMotorista(${m.id}, '${m.nome.replace(/'/g, "\\'")}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function abrirModalNovo() {
  document.getElementById('formMotorista').reset();
  document.getElementById('motoristaId').value = '';
  document.getElementById('tituloModalMotorista').textContent = 'Novo Motorista';
  document.getElementById('campoStatus').value = 'ativo';
  modalMotorista.show();
}

function editarMotorista(id) {
  const motorista = listaMotoristasAtual.find((m) => m.id === id);
  if (!motorista) return;

  document.getElementById('motoristaId').value = motorista.id;
  document.getElementById('campoNome').value = motorista.nome || '';
  document.getElementById('campoApelido').value = motorista.apelido || '';
  document.getElementById('campoCnh').value = motorista.cnh || '';
  document.getElementById('campoTelefone').value = motorista.telefone || '';
  document.getElementById('campoEmail').value = motorista.email || '';
  document.getElementById('campoSteamId').value = motorista.steam_id || '';
  document.getElementById('campoDataAdmissao').value = motorista.data_admissao ? motorista.data_admissao.split('T')[0] : '';
  document.getElementById('campoStatus').value = motorista.status || 'ativo';
  document.getElementById('campoObservacoes').value = motorista.observacoes || '';
  document.getElementById('tituloModalMotorista').textContent = 'Editar Motorista';

  modalMotorista.show();
}

async function salvarMotorista(evento) {
  evento.preventDefault();

  const id = document.getElementById('motoristaId').value;
  const dados = {
    nome: document.getElementById('campoNome').value.trim(),
    apelido: document.getElementById('campoApelido').value.trim(),
    cnh: document.getElementById('campoCnh').value.trim(),
    telefone: document.getElementById('campoTelefone').value.trim(),
    email: document.getElementById('campoEmail').value.trim(),
    steam_id: document.getElementById('campoSteamId').value.trim(),
    data_admissao: document.getElementById('campoDataAdmissao').value || null,
    status: document.getElementById('campoStatus').value,
    observacoes: document.getElementById('campoObservacoes').value.trim()
  };

  try {
    if (id) {
      await ApiService.put(`/motoristas/${id}`, dados);
      UI.toastSucesso('Motorista atualizado com sucesso!');
    } else {
      await ApiService.post('/motoristas', dados);
      UI.toastSucesso('Motorista cadastrado com sucesso!');
    }
    modalMotorista.hide();
    await carregarMotoristas();
  } catch (erro) {
    console.error(erro);
    UI.toastErro(erro.message);
  }
}

async function excluirMotorista(id, nome) {
  const confirmado = await UI.confirmarExclusao(`o motorista <b>${nome}</b>`);
  if (!confirmado) return;

  try {
    await ApiService.delete(`/motoristas/${id}`);
    UI.toastSucesso('Motorista excluído com sucesso.');
    await carregarMotoristas();
  } catch (erro) {
    console.error(erro);
    UI.toastErro(erro.message);
  }
}

// ─── Toggle ativo/inativo ─────────────────────────────────────────────
async function toggleStatusMotorista(id, nome, acao) {
  const novoStatus = acao.trim() === 'ativar' ? 'ativo' : 'inativo';
  const { isConfirmed } = await Swal.fire({
    title: `${acao.trim() === 'ativar' ? 'Ativar' : 'Desativar'} ${nome}?`,
    text: novoStatus === 'ativo'
      ? 'O motorista voltará a aparecer nas listagens e poderá fazer login.'
      : 'O motorista ficará inativo e não poderá acessar o sistema.',
    icon: novoStatus === 'ativo' ? 'question' : 'warning',
    showCancelButton: true,
    confirmButtonText: novoStatus === 'ativo' ? 'Sim, ativar' : 'Sim, desativar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: novoStatus === 'ativo' ? '#2ECC71' : '#FFB020',
  });
  if (!isConfirmed) return;

  try {
    // Busca dados atuais e atualiza só o status
    const motorista = await ApiService.get(`/motoristas/${id}`);
    await ApiService.put(`/motoristas/${id}`, { ...motorista, status: novoStatus });
    const label = novoStatus === 'ativo' ? 'ativado' : 'desativado';
    Swal.fire({ icon: 'success', title: `${nome} ${label}!`, timer: 2000, showConfirmButton: false });
    await carregarMotoristas();
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Erro', text: e.message || 'Não foi possível atualizar o status.' });
  }
}
