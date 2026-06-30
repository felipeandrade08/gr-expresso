// =====================================================================
// GR EXPRESSO - Página: Abastecimentos (CRUD + gráfico de gastos)
// =====================================================================

let modalAbastecimento;
let listaAbastecimentosAtual = [];
let listaPostosCredenciados = [];

(async function () {
  montarLayout({
    paginaAtiva: 'abastecimentos',
    titulo: AuthService.ehAdmin() ? 'Abastecimentos' : 'Meus Abastecimentos',
    subtitulo: AuthService.ehAdmin() ? 'Controle de combustível da frota' : 'Registre os abastecimentos das suas viagens'
  });

  AOS.init({ duration: 500, once: true });
  modalAbastecimento = new bootstrap.Modal(document.getElementById('modalAbastecimento'));

  ajustarFormularioPorPerfil();

  document.getElementById('btnNovoAbastecimento').addEventListener('click', abrirModalNovo);
  document.getElementById('formAbastecimento').addEventListener('submit', salvarAbastecimento);
  document.getElementById('filtroCaminhaoId').addEventListener('change', carregarAbastecimentos);
  document.getElementById('buscaPostoCredenciado').addEventListener('input', filtrarPostosCredenciados);

  await Promise.all([carregarSelects(), carregarAbastecimentos(), carregarGraficoEResumo(), carregarPostosCredenciados()]);
})();

/** Carrega a rede de postos credenciados e monta a esteira animada. */
async function carregarPostosCredenciados() {
  try {
    listaPostosCredenciados = await ApiService.get('/abastecimentos/postos-credenciados');
    montarEsteiraPostos(listaPostosCredenciados);
  } catch (erro) {
    console.error('Erro ao carregar postos credenciados:', erro);
    document.getElementById('wrapperEsteiraPostos').innerHTML =
      '<p class="card-postos__vazio">Não foi possível carregar a lista de postos credenciados.</p>';
  }
}

function chipPostoHtml(p) {
  const icone = p.filial ? 'fa-building' : 'fa-gas-pump';
  const classeFilial = p.filial ? 'chip-posto--filial' : '';
  return `
    <div class="chip-posto ${classeFilial}">
      <i class="fa-solid ${icone}"></i>
      <div>
        <div class="chip-posto__posto">${p.posto}</div>
        <div class="chip-posto__cidade">${p.cidade}</div>
      </div>
    </div>
  `;
}

/** Duplica a lista de chips para a animação de rolagem ficar contínua (loop sem corte). */
function montarEsteiraPostos(postos) {
  const esteira = document.getElementById('esteiraPostos');
  if (!postos.length) {
    document.getElementById('wrapperEsteiraPostos').innerHTML =
      '<p class="card-postos__vazio">Nenhum posto credenciado cadastrado.</p>';
    return;
  }
  const chips = postos.map(chipPostoHtml).join('');
  esteira.innerHTML = chips + chips; // duplicado: a animação translateX(-50%) volta exatamente onde começou
}

/** Filtra a lista por posto ou cidade; ao digitar, troca a esteira animada por um grid estático de resultados. */
function filtrarPostosCredenciados(evento) {
  const termo = evento.target.value.trim().toLowerCase();
  const wrapperEsteira = document.getElementById('wrapperEsteiraPostos');
  const divResultados = document.getElementById('resultadosPostos');

  if (!termo) {
    wrapperEsteira.classList.remove('escondido');
    divResultados.classList.remove('ativo');
    divResultados.innerHTML = '';
    return;
  }

  const filtrados = listaPostosCredenciados.filter((p) =>
    p.posto.toLowerCase().includes(termo) || p.cidade.toLowerCase().includes(termo)
  );

  wrapperEsteira.classList.add('escondido');
  divResultados.classList.add('ativo');

  divResultados.innerHTML = filtrados.length
    ? filtrados.map(chipPostoHtml).join('')
    : '<p class="card-postos__vazio">Nenhum posto credenciado encontrado para essa busca.</p>';
}

/** Motorista comum não escolhe quem abasteceu (é sempre ele mesmo). */
function ajustarFormularioPorPerfil() {
  if (AuthService.ehAdmin()) return;

  const campoMotorista = document.getElementById('campoMotoristaId');
  const wrapper = campoMotorista.closest('.col-md-6');
  if (wrapper) wrapper.style.display = 'none';
}

async function carregarSelects() {
  try {
    const promessas = [ApiService.get('/caminhoes')];
    if (AuthService.ehAdmin()) {
      promessas.push(ApiService.get('/motoristas?status=ativo'));
    }

    const [caminhoes, motoristas] = await Promise.all(promessas);

    const optsCaminhoes = caminhoes.map((c) => `<option value="${c.id}">${c.placa} - ${c.marca} ${c.modelo}</option>`).join('');
    document.getElementById('campoCaminhaoId').innerHTML = '<option value="">Selecione...</option>' + optsCaminhoes;
    document.getElementById('filtroCaminhaoId').innerHTML = '<option value="">Todos os caminhões</option>' + optsCaminhoes;

    if (AuthService.ehAdmin() && motoristas) {
      document.getElementById('campoMotoristaId').innerHTML = '<option value="">Não informado</option>' +
        motoristas.map((m) => `<option value="${m.id}">${m.apelido || m.nome}</option>`).join('');
    }
  } catch (erro) {
    console.error('Erro ao carregar selects:', erro);
  }
}

async function carregarGraficoEResumo() {
  try {
    const dados = await ApiService.get('/abastecimentos/total-por-mes?meses=6');

    const totalGasto = dados.reduce((acc, d) => acc + Number(d.total_gasto), 0);
    const totalLitros = dados.reduce((acc, d) => acc + Number(d.total_litros), 0);
    const mediaLitro = totalLitros > 0 ? totalGasto / totalLitros : 0;

    document.getElementById('gridResumoAbastecimento').innerHTML = `
      <div class="col-md-4">
        <div class="card-indicador">
          <div class="card-indicador__icone bg-alerta"><i class="fa-solid fa-gas-pump"></i></div>
          <div class="card-indicador__valor">${Formatador.moeda(totalGasto)}</div>
          <div class="card-indicador__label">Gasto total (6 meses)</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card-indicador">
          <div class="card-indicador__icone bg-verde"><i class="fa-solid fa-droplet"></i></div>
          <div class="card-indicador__valor">${Formatador.numero(totalLitros)} L</div>
          <div class="card-indicador__label">Litros abastecidos (6 meses)</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card-indicador">
          <div class="card-indicador__icone bg-info"><i class="fa-solid fa-coins"></i></div>
          <div class="card-indicador__valor">${Formatador.moeda(mediaLitro)}</div>
          <div class="card-indicador__label">Preço médio por litro</div>
        </div>
      </div>
    `;

    const ctx = document.getElementById('graficoCombustivel');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dados.map((d) => formatarMesLabel(d.mes)),
        datasets: [{
          label: 'Gasto com combustível (R$)',
          data: dados.map((d) => Number(d.total_gasto)),
          backgroundColor: '#0B3D2E',
          borderRadius: 6,
          maxBarThickness: 46
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { ticks: { callback: (v) => `R$ ${v}` }, grid: { color: '#E7EBE9' } }, x: { grid: { display: false } } }
      }
    });
  } catch (erro) {
    console.error('Erro ao carregar resumo de abastecimentos:', erro);
  }
}

function formatarMesLabel(mesAno) {
  if (!mesAno) return '';
  const [ano, mes] = mesAno.split('-');
  const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomesMeses[Number(mes) - 1]}/${ano.slice(2)}`;
}

async function carregarAbastecimentos() {
  const corpo = document.getElementById('corpoTabelaAbastecimentos');
  const caminhao_id = document.getElementById('filtroCaminhaoId').value;

  try {
    const params = new URLSearchParams();
    if (caminhao_id) params.set('caminhao_id', caminhao_id);

    const abastecimentos = await ApiService.get(`/abastecimentos?${params.toString()}`);
    listaAbastecimentosAtual = abastecimentos;
    renderizarTabela(abastecimentos);
    if (typeof atualizarAlertaPendentesAbast === 'function') atualizarAlertaPendentesAbast(abastecimentos);
  } catch (erro) {
    console.error(erro);
    corpo.innerHTML = `<tr><td colspan="8"><div class="estado-vazio"><i class="fa-solid fa-plug-circle-xmark" style="color:var(--perigo)"></i><h4>Erro ao carregar abastecimentos</h4><p>${erro.message}</p></div></td></tr>`;
  }
}

function renderizarTabela(abastecimentos) {
  const corpo = document.getElementById('corpoTabelaAbastecimentos');

  if (!abastecimentos.length) {
    corpo.innerHTML = `<tr><td colspan="8">
      <div class="estado-vazio">
        <i class="fa-solid fa-gas-pump"></i>
        <h4>Nenhum abastecimento registrado</h4>
        <p>Registre o primeiro abastecimento da frota.</p>
        <button class="btn-gr-primario" onclick="abrirModalNovo()"><i class="fa-solid fa-plus"></i> Novo Abastecimento</button>
      </div>
    </td></tr>`;
    return;
  }

  corpo.innerHTML = abastecimentos.map((a) => {
    const ehPendente = a.status === 'pendente';
    const local = [a.posto, a.cidade].filter(Boolean).join(' — ') || '—';

    const statusBadge = ehPendente
      ? `<span style="background:rgba(255,176,32,0.15);color:#FFB020;border-radius:20px;padding:3px 10px;font-size:0.75rem;font-weight:600;white-space:nowrap;"><i class="fa-solid fa-clock"></i> Pendente</span>`
      : `<span style="background:rgba(46,204,113,0.15);color:#2ECC71;border-radius:20px;padding:3px 10px;font-size:0.75rem;font-weight:600;white-space:nowrap;"><i class="fa-solid fa-check"></i> OK</span>`;

    // Botão de ação para pendente
    let btnPendente = '';
    if (ehPendente) {
      const isAdmin = typeof ehAdminAbast !== 'undefined' && ehAdminAbast;
      if (!isAdmin) {
        // Motorista: informa posto + cidade se ainda não preencheu
        if (!a.posto && !a.cidade) {
          btnPendente = `<button class="btn btn-sm btn-warning" onclick="abrirResolverAbast(${a.id})" title="Informar posto e cidade"><i class="fa-solid fa-pen"></i> Informar</button>`;
        } else {
          btnPendente = `<span class="text-muted" style="font-size:0.78rem;">Aguard. admin</span>`;
        }
      } else {
        // Admin: regulariza se motorista já preencheu
        if (a.posto || a.cidade) {
          btnPendente = `<button class="btn btn-sm btn-warning" onclick="abrirRegularizarAbast(${a.id})" title="Aprovar ou penalizar"><i class="fa-solid fa-gavel"></i> Regularizar</button>`;
        } else {
          btnPendente = `<span class="text-muted" style="font-size:0.78rem;">Aguard. motorista</span>`;
        }
      }
    }

    return `
      <tr${ehPendente ? ' style="background:rgba(255,176,32,0.04);"' : ''}>
        <td>${Formatador.dataHora(a.data_abastecimento)}</td>
        <td class="fw-semibold">${a.caminhao_placa}</td>
        <td>${a.motorista_nome || '—'}</td>
        <td>${local}</td>
        <td>${Formatador.numero(a.litros, 1)} L</td>
        <td>${Formatador.moeda(a.valor_litro)}</td>
        <td class="fw-semibold">${Formatador.moeda(a.valor_total)}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="d-flex gap-2 align-items-center flex-wrap">
            ${btnPendente}
            ${!ehPendente ? `<button class="btn-gr-icone" onclick="editarAbastecimento(${a.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>` : ''}
            <button class="btn-gr-icone perigo" onclick="excluirAbastecimento(${a.id})" title="Excluir"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function abrirModalNovo() {
  document.getElementById('formAbastecimento').reset();
  document.getElementById('abastecimentoId').value = '';
  document.getElementById('tituloModalAbastecimento').textContent = 'Novo Abastecimento';
  const agora = new Date();
  document.getElementById('campoDataAbastecimento').value = paraDatetimeLocal(agora);
  modalAbastecimento.show();
}

function paraDatetimeLocal(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function editarAbastecimento(id) {
  const a = listaAbastecimentosAtual.find((x) => x.id === id);
  if (!a) return;

  document.getElementById('abastecimentoId').value = a.id;
  document.getElementById('campoCaminhaoId').value = a.caminhao_id;
  document.getElementById('campoMotoristaId').value = a.motorista_id || '';
  document.getElementById('campoPosto').value = a.posto || '';
  document.getElementById('campoKmNoMomento').value = a.km_no_momento || '';
  document.getElementById('campoLitros').value = a.litros || '';
  document.getElementById('campoValorLitro').value = a.valor_litro || '';
  document.getElementById('campoDataAbastecimento').value = paraDatetimeLocal(a.data_abastecimento);
  document.getElementById('campoObservacoes').value = a.observacoes || '';
  document.getElementById('tituloModalAbastecimento').textContent = 'Editar Abastecimento';

  modalAbastecimento.show();
}

async function salvarAbastecimento(evento) {
  evento.preventDefault();
  const id = document.getElementById('abastecimentoId').value;

  const dados = {
    caminhao_id: document.getElementById('campoCaminhaoId').value,
    motorista_id: document.getElementById('campoMotoristaId').value || null,
    posto: document.getElementById('campoPosto').value.trim(),
    km_no_momento: document.getElementById('campoKmNoMomento').value || 0,
    litros: document.getElementById('campoLitros').value,
    valor_litro: document.getElementById('campoValorLitro').value,
    data_abastecimento: document.getElementById('campoDataAbastecimento').value,
    observacoes: document.getElementById('campoObservacoes').value.trim()
  };

  try {
    if (id) {
      await ApiService.put(`/abastecimentos/${id}`, dados);
      UI.toastSucesso('Abastecimento atualizado com sucesso!');
    } else {
      await ApiService.post('/abastecimentos', dados);
      UI.toastSucesso('Abastecimento registrado com sucesso!');
    }
    modalAbastecimento.hide();
    await carregarAbastecimentos();
  } catch (erro) {
    console.error(erro);
    UI.toastErro(erro.message);
  }
}

async function excluirAbastecimento(id) {
  const confirmado = await UI.confirmarExclusao('este abastecimento');
  if (!confirmado) return;

  try {
    await ApiService.delete(`/abastecimentos/${id}`);
    UI.toastSucesso('Abastecimento excluído com sucesso.');
    await carregarAbastecimentos();
  } catch (erro) {
    console.error(erro);
    UI.toastErro(erro.message);
  }
}

// ─── Pendentes: abastecimentos ────────────────────────────────────────

let modalResolverAbast, modalRegularizarAbast;
let ehAdminAbast = false;

// Inicializa modais e eventos de pendente após o DOM estar pronto
document.addEventListener('DOMContentLoaded', function initPendentes() {
  ehAdminAbast = AuthService.ehAdmin();

  const elResolver    = document.getElementById('modalResolverAbast');
  const elRegularizar = document.getElementById('modalRegularizarAbast');
  if (elResolver)    modalResolverAbast    = new bootstrap.Modal(elResolver);
  if (elRegularizar) modalRegularizarAbast = new bootstrap.Modal(elRegularizar);

  const btnResolver    = document.getElementById('btnEnviarResolverAbast');
  const btnRegularizar = document.getElementById('btnConfirmarRegularizarAbast');
  if (btnResolver)    btnResolver.addEventListener('click', enviarResolverAbast);
  if (btnRegularizar) btnRegularizar.addEventListener('click', confirmarRegularizarAbast);
});

/** Filtra a tabela para mostrar só pendentes */
function filtrarPendentesAbast() {
  // Se existir filtro de status na página, usa ele; senão re-renderiza só pendentes
  const tbody = document.getElementById('corpoTabelaAbastecimentos');
  const pendentes = listaAbastecimentosAtual.filter(a => a.status === 'pendente');
  renderizarTabela(pendentes);
}

/** Atualiza o alerta de pendentes no topo da tabela */
function atualizarAlertaPendentesAbast(lista) {
  const pendentes = lista.filter(a => a.status === 'pendente');
  const alerta = document.getElementById('alertaPendentesAbast');
  if (pendentes.length > 0) {
    alerta.style.display = 'block';
    document.getElementById('txtQtdPendentesAbast').textContent =
      `${pendentes.length} ${pendentes.length === 1 ? 'abastecimento' : 'abastecimentos'}`;
  } else {
    alerta.style.display = 'none';
  }
}

/** Motorista abre modal para informar posto + cidade */
function abrirResolverAbast(id) {
  document.getElementById('resolverAbastId').value = id;
  document.getElementById('resolverAbastPosto').value = '';
  document.getElementById('resolverAbastCidade').value = '';
  modalResolverAbast.show();
}

async function enviarResolverAbast() {
  const id    = document.getElementById('resolverAbastId').value;
  const posto = document.getElementById('resolverAbastPosto').value.trim();
  const cidade= document.getElementById('resolverAbastCidade').value.trim();

  if (!posto || !cidade) {
    Swal.fire({ icon: 'warning', title: 'Campos obrigatórios', text: 'Informe o nome do posto e a cidade.' });
    return;
  }

  try {
    const res = await ApiService.patch(`/abastecimentos/${id}/resolver-pendente`, { posto, cidade });
    modalResolverAbast.hide();
    listaAbastecimentosAtual = await ApiService.get('/abastecimentos');
    renderizarTabela(listaAbastecimentosAtual);
    atualizarAlertaPendentesAbast(listaAbastecimentosAtual);

    if (res.credenciado) {
      Swal.fire({ icon: 'success', title: 'Aprovado automaticamente!', text: res.motivo, timer: 3000, showConfirmButton: false });
    } else {
      Swal.fire({ icon: 'info', title: 'Dados enviados', text: 'O administrador irá revisar e regularizar em breve.' });
    }
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Erro', text: err.message || 'Não foi possível enviar.' });
  }
}

/** Admin abre modal para aprovar ou penalizar */
function abrirRegularizarAbast(id) {
  const abast = listaAbastecimentosAtual.find(a => a.id === id);
  if (!abast) return;

  document.getElementById('regularizarAbastId').value = id;
  document.getElementById('regularizarAbastObs').value = '';
  document.getElementById('optAbastAprovar').checked = true;
  document.getElementById('infoAbastPendenteAdmin').innerHTML = `
    <strong>Motorista:</strong> ${abast.motorista_nome || '—'}<br>
    <strong>Caminhão:</strong> ${abast.caminhao_placa || '—'}<br>
    <strong>Posto informado:</strong> ${abast.posto || '—'}<br>
    <strong>Cidade informada:</strong> ${abast.cidade || '—'}<br>
    <strong>Litros:</strong> ${Number(abast.litros || 0).toFixed(1)} L &nbsp;|&nbsp;
    <strong>Total:</strong> ${Number(abast.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
  `;
  modalRegularizarAbast.show();
}

async function confirmarRegularizarAbast() {
  const id      = document.getElementById('regularizarAbastId').value;
  const decisao = document.querySelector('input[name="decisaoAbast"]:checked').value;
  const penalizar = decisao === 'penalizar';
  const obs     = document.getElementById('regularizarAbastObs').value.trim() || null;

  try {
    await ApiService.patch(`/abastecimentos/${id}/regularizar`, { penalizar, observacoes: obs });
    modalRegularizarAbast.hide();
    listaAbastecimentosAtual = await ApiService.get('/abastecimentos');
    renderizarTabela(listaAbastecimentosAtual);
    atualizarAlertaPendentesAbast(listaAbastecimentosAtual);
    Swal.fire({
      icon: penalizar ? 'warning' : 'success',
      title: penalizar ? 'Penalidade aplicada!' : 'Abastecimento aprovado!',
      timer: 2500, showConfirmButton: false,
    });
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Erro', text: err.message || 'Não foi possível regularizar.' });
  }
}
