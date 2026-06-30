// =====================================================================
// GR EXPRESSO - Página: Viagens (CRUD + controle de status)
// =====================================================================

let modalViagem;
let listaViagensAtual = [];

(async function () {
  montarLayout({
    paginaAtiva: 'viagens',
    titulo: AuthService.ehAdmin() ? 'Viagens' : 'Minhas Viagens',
    subtitulo: AuthService.ehAdmin() ? 'Controle de viagens, rotas e status de entrega' : 'Registre e acompanhe suas próprias viagens'
  });

  AOS.init({ duration: 500, once: true });
  modalViagem = new bootstrap.Modal(document.getElementById('modalViagem'));

  // Aviso de pontos para motoristas (não aparece para admins)
  if (!AuthService.ehAdmin()) {
    const main = document.getElementById('conteudoPagina');
    const aviso = document.createElement('div');
    aviso.setAttribute('data-aos', 'fade-down');
    aviso.innerHTML = `
      <div style="
        background: linear-gradient(135deg, rgba(11,61,46,0.06) 0%, rgba(164,255,0,0.06) 100%);
        border: 1.5px solid rgba(164,255,0,0.35);
        border-left: 4px solid var(--verde-limao);
        border-radius: var(--raio);
        padding: 18px 22px;
        margin-bottom: 20px;
        display: flex;
        gap: 16px;
        align-items: flex-start;
      ">
        <div style="
          width: 38px; height: 38px; flex-shrink: 0;
          background: rgba(164,255,0,0.15);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem; color: #5A8E00;
        ">
          <i class="fa-solid fa-circle-info"></i>
        </div>
        <div>
          <div style="font-family: var(--fonte-display); font-weight: 700; font-size: 0.92rem; color: var(--preto); margin-bottom: 8px;">
            Como funcionam os pontos de viagem
          </div>
          <div style="font-size: 0.83rem; color: var(--cinza-600); line-height: 1.65; display: flex; flex-direction: column; gap: 6px;">
            <div style="display:flex; align-items:flex-start; gap:8px;">
              <i class="fa-solid fa-check" style="color:#1E9E58; margin-top:2px; font-size:0.75rem; flex-shrink:0;"></i>
              <span>Os pontos só são contabilizados enquanto você estiver <strong style="color:var(--preto);">dentro do caminhão no jogo</strong> — conduzindo ou parado com o motor ligado.</span>
            </div>
            <div style="display:flex; align-items:flex-start; gap:8px;">
              <i class="fa-solid fa-xmark" style="color:var(--perigo); margin-top:2px; font-size:0.75rem; flex-shrink:0;"></i>
              <span>Ficar no <strong style="color:var(--preto);">menu do jogo, na tela de carregamento ou no mapa</strong> não registra progresso — o Launcher precisa detectar você ao volante.</span>
            </div>
            <div style="display:flex; align-items:flex-start; gap:8px;">
              <i class="fa-solid fa-xmark" style="color:var(--perigo); margin-top:2px; font-size:0.75rem; flex-shrink:0;"></i>
              <span>Viagens registradas <strong style="color:var(--preto);">manualmente aqui no painel</strong> sem o Launcher ativo não geram pontos no ranking.</span>
            </div>
            <div style="display:flex; align-items:flex-start; gap:8px;">
              <i class="fa-solid fa-bolt" style="color:var(--alerta); margin-top:2px; font-size:0.75rem; flex-shrink:0;"></i>
              <span>Para garantir que tudo seja contabilizado: <strong style="color:var(--preto);">abra o Launcher → faça login → inicie o ETS2 pelo Launcher</strong> e só então aceite a carga.</span>
            </div>
          </div>
        </div>
      </div>
    `;
    main.insertBefore(aviso, main.firstChild);
  }

  ajustarFormularioPorPerfil();

  document.getElementById('btnNovaViagem').addEventListener('click', abrirModalNovo);
  document.getElementById('formViagem').addEventListener('submit', salvarViagem);
  document.getElementById('filtroStatus').addEventListener('change', carregarViagens);
  document.getElementById('filtroDataInicio').addEventListener('change', carregarViagens);
  document.getElementById('filtroDataFim').addEventListener('change', carregarViagens);

  await Promise.all([carregarViagens(), carregarSelects()]);
})();

/**
 * Motorista comum não pode escolher o motorista da viagem (sempre é ele
 * mesmo) e não tem acesso à listagem de motoristas, então esse campo
 * é ocultado para esse perfil.
 */
function ajustarFormularioPorPerfil() {
  if (AuthService.ehAdmin()) return;

  const campoMotorista = document.getElementById('campoMotoristaId');
  const wrapperMotorista = campoMotorista.closest('.col-md-6');
  if (wrapperMotorista) wrapperMotorista.style.display = 'none';
  campoMotorista.removeAttribute('required');
}

async function carregarSelects() {
  try {
    const promessas = [
      ApiService.get('/caminhoes'),
      ApiService.get('/reboques')
    ];

    // Lista de motoristas só é necessária (e só é acessível) para o admin.
    if (AuthService.ehAdmin()) {
      promessas.unshift(ApiService.get('/motoristas?status=ativo'));
    }

    const resultados = await Promise.all(promessas);
    const [motoristas, caminhoes, reboques] = AuthService.ehAdmin()
      ? resultados
      : [null, resultados[0], resultados[1]];

    if (AuthService.ehAdmin()) {
      const selMotorista = document.getElementById('campoMotoristaId');
      selMotorista.innerHTML = '<option value="">Selecione...</option>' +
        motoristas.map((m) => `<option value="${m.id}">${m.apelido || m.nome}</option>`).join('');
    }

    const selCaminhao = document.getElementById('campoCaminhaoId');
    selCaminhao.innerHTML = '<option value="">Selecione...</option>' +
      caminhoes.map((c) => `<option value="${c.id}">${c.placa} - ${c.marca} ${c.modelo}</option>`).join('');

    const selReboque = document.getElementById('campoReboqueId');
    selReboque.innerHTML = '<option value="">Nenhum</option>' +
      reboques.map((r) => `<option value="${r.id}">${r.placa}</option>`).join('');
  } catch (erro) {
    console.error('Erro ao carregar selects:', erro);
  }
}

async function carregarViagens() {
  const corpo = document.getElementById('corpoTabelaViagens');
  const status = document.getElementById('filtroStatus').value;
  const data_inicio = document.getElementById('filtroDataInicio').value;
  const data_fim = document.getElementById('filtroDataFim').value;

  try {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (data_inicio) params.set('data_inicio', data_inicio);
    if (data_fim) params.set('data_fim', data_fim);

    const viagens = await ApiService.get(`/viagens?${params.toString()}`);
    listaViagensAtual = viagens;
    renderizarTabela(viagens);
  } catch (erro) {
    console.error(erro);
    corpo.innerHTML = `<tr><td colspan="9"><div class="estado-vazio"><i class="fa-solid fa-plug-circle-xmark" style="color:var(--perigo)"></i><h4>Erro ao carregar viagens</h4><p>${erro.message}</p></div></td></tr>`;
  }
}

function podeExcluir(viagem) {
  const STATUS_PROTEGIDOS = ['em_andamento', 'concluida', 'cancelada'];
  if (AuthService.ehAdmin()) return true;
  return !STATUS_PROTEGIDOS.includes(viagem.status);
}

function renderizarTabela(viagens) {
  const corpo = document.getElementById('corpoTabelaViagens');

  if (!viagens.length) {
    corpo.innerHTML = `<tr><td colspan="9">
      <div class="estado-vazio">
        <i class="fa-solid fa-route"></i>
        <h4>Nenhuma viagem encontrada</h4>
        <p>Registre a primeira viagem da transportadora.</p>
        <button class="btn-gr-primario" onclick="abrirModalNovo()"><i class="fa-solid fa-plus"></i> Nova Viagem</button>
      </div>
    </td></tr>`;
    return;
  }

  corpo.innerHTML = viagens.map((v) => `
    <tr>
      <td class="fw-semibold">${v.codigo}</td>
      <td>${v.motorista_apelido || v.motorista_nome}</td>
      <td>${v.origem} <i class="fa-solid fa-arrow-right-long mx-1 text-muted" style="font-size:0.7rem;"></i> ${v.destino}</td>
      <td>${v.caminhao_placa}${v.reboque_placa ? ' / ' + v.reboque_placa : ''}</td>
      <td>${Formatador.km(v.distancia_km)}</td>
      <td>${Formatador.moeda(v.valor_frete)}</td>
      <td>${Formatador.dataHora(v.data_saida)}</td>
      <td>${renderizarSeletorStatus(v)}</td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn-gr-icone" onclick="editarViagem(${v.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
          ${podeExcluir(v) ? `<button class="btn-gr-icone perigo" onclick="excluirViagem(${v.id}, '${v.codigo}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function renderizarSeletorStatus(viagem) {
  const opcoes = ['agendada', 'em_andamento', 'concluida', 'cancelada'];
  return `
    <select class="form-select form-select-sm badge-status status-${viagem.status}"
            style="border:none; font-weight:700; cursor:pointer; padding:5px 28px 5px 11px;"
            onchange="mudarStatusViagem(${viagem.id}, this.value)">
      ${opcoes.map((s) => `<option value="${s}" ${s === viagem.status ? 'selected' : ''}>${Formatador.statusLabel(s)}</option>`).join('')}
    </select>
  `;
}

async function mudarStatusViagem(id, novoStatus) {
  try {
    await ApiService.patch(`/viagens/${id}/status`, { status: novoStatus });
    UI.toastSucesso('Status da viagem atualizado!');
    await carregarViagens();
  } catch (erro) {
    console.error(erro);
    UI.toastErro(erro.message);
    await carregarViagens();
  }
}

function abrirModalNovo() {
  document.getElementById('formViagem').reset();
  document.getElementById('viagemId').value = '';
  document.getElementById('tituloModalViagem').textContent = 'Nova Viagem';
  document.getElementById('campoStatus').value = 'agendada';
  document.getElementById('campoDificuldade').value = 'media';
  modalViagem.show();
}

function paraDatetimeLocal(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function editarViagem(id) {
  const v = listaViagensAtual.find((x) => x.id === id);
  if (!v) return;

  document.getElementById('viagemId').value = v.id;
  document.getElementById('campoMotoristaId').value = v.motorista_id;
  document.getElementById('campoCaminhaoId').value = v.caminhao_id;
  document.getElementById('campoReboqueId').value = v.reboque_id || '';
  document.getElementById('campoDificuldade').value = v.dificuldade || 'media';
  document.getElementById('campoOrigem').value = v.origem || '';
  document.getElementById('campoDestino').value = v.destino || '';
  document.getElementById('campoCarga').value = v.carga || '';
  document.getElementById('campoPesoCarga').value = v.peso_carga || '';
  document.getElementById('campoDistanciaKm').value = v.distancia_km || '';
  // Mostra frete atual no preview (servidor vai recalcular ao salvar)
  const fAtual = Number(v.valor_frete||0);
  document.getElementById('previewFreteValor').textContent =
    fAtual.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  document.getElementById('campoValorFrete').value = fAtual;
  document.getElementById('campoStatus').value = v.status || 'agendada';
  document.getElementById('campoDataSaida').value = paraDatetimeLocal(v.data_saida);
  document.getElementById('campoDataChegada').value = paraDatetimeLocal(v.data_chegada);
  document.getElementById('campoObservacoes').value = v.observacoes || '';
  document.getElementById('tituloModalViagem').textContent = 'Editar Viagem';

  modalViagem.show();
}

async function salvarViagem(evento) {
  evento.preventDefault();
  const id = document.getElementById('viagemId').value;

  const dados = {
    caminhao_id: document.getElementById('campoCaminhaoId').value,
    reboque_id: document.getElementById('campoReboqueId').value || null,
    dificuldade: document.getElementById('campoDificuldade').value,
    origem: document.getElementById('campoOrigem').value.trim(),
    destino: document.getElementById('campoDestino').value.trim(),
    carga: document.getElementById('campoCarga').value.trim(),
    peso_carga: document.getElementById('campoPesoCarga').value || 0,
    distancia_km: document.getElementById('campoDistanciaKm').value || 0,
    // valor_frete calculado automaticamente pelo servidor via calcularFrete()
    status: document.getElementById('campoStatus').value,
    data_saida: document.getElementById('campoDataSaida').value,
    data_chegada: document.getElementById('campoDataChegada').value || null,
    observacoes: document.getElementById('campoObservacoes').value.trim()
  };

  if (AuthService.ehAdmin()) {
    dados.motorista_id = document.getElementById('campoMotoristaId').value;
  }

  try {
    if (id) {
      await ApiService.put(`/viagens/${id}`, dados);
      UI.toastSucesso('Viagem atualizada com sucesso!');
    } else {
      await ApiService.post('/viagens', dados);
      UI.toastSucesso('Viagem registrada com sucesso!');
    }
    modalViagem.hide();
    await carregarViagens();
  } catch (erro) {
    console.error(erro);
    UI.toastErro(erro.message);
  }
}

async function excluirViagem(id, codigo) {
  const confirmado = await UI.confirmarExclusao(`a viagem <b>${codigo}</b>`);
  if (!confirmado) return;

  try {
    await ApiService.delete(`/viagens/${id}`);
    UI.toastSucesso('Viagem excluída com sucesso.');
    await carregarViagens();
  } catch (erro) {
    console.error(erro);
    UI.toastErro(erro.message);
  }
}

// ─── Preview de frete calculado ──────────────────────────────────────
// Tabela de multiplicadores (espelha backend/src/config/precificacao.js)
const _MULT_DIF  = { facil:1, media:1.2, dificil:1.5, extrema:2 };
const _MULT_PESO = [
  { ate:5, f:1.00 }, { ate:10, f:1.10 }, { ate:20, f:1.25 },
  { ate:30, f:1.40 }, { ate:40, f:1.55 }, { ate:Infinity, f:1.70 }
];
const PRECO_KM = 8.50;

function previewFrete() {
  const km    = parseFloat(document.getElementById('campoDistanciaKm')?.value) || 0;
  const dif   = document.getElementById('campoDificuldade')?.value || 'media';
  const peso  = parseFloat(document.getElementById('campoPesoCarga')?.value)   || 0;
  const mDif  = _MULT_DIF[dif] ?? 1.2;
  const mPeso = (_MULT_PESO.find(f => peso <= f.ate) || _MULT_PESO.at(-1)).f;
  const valor = Math.round(km * PRECO_KM * mDif * mPeso * 100) / 100;
  const box   = document.getElementById('previewFreteValor');
  if (box) box.textContent = valor.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const hid   = document.getElementById('campoValorFrete');
  if (hid) hid.value = valor;
}

// Também recalcula quando dificuldade ou peso mudam
document.addEventListener('DOMContentLoaded', () => {
  ['campoDificuldade','campoPesoCarga'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', previewFrete);
    if (el) el.addEventListener('input',  previewFrete);
  });
});
