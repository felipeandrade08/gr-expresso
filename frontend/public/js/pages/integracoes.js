// =====================================================================
// GR EXPRESSO - Página: Integrações (Telemetria ETS2, TrucksBook, Trucky)
// =====================================================================

let modalIntegracao;
let listaIntegracoesAtual = [];

const META_INTEGRACOES = {
  telemetria_ets2: { titulo: 'Telemetria ETS2', icone: 'fa-satellite-dish', descricao: 'Sincroniza dados em tempo real do jogo: velocidade, combustível, posição e dano do veículo.' },
  trucksbook: { titulo: 'TrucksBook', icone: 'fa-book', descricao: 'Importa o histórico de viagens e estatísticas de carreira registradas no TrucksBook.' },
  trucky: { titulo: 'Trucky', icone: 'fa-truck-fast', descricao: 'Integra convois, eventos da comunidade VTC e dados de frota gerenciados via Trucky.' }
};

(async function () {
  // Página exclusiva de administrador.
  if (!AuthService.protegerPaginaAdmin()) return;

  montarLayout({
    paginaAtiva: 'integracoes',
    titulo: 'Integrações',
    subtitulo: 'Conecte o GR EXPRESSO a ferramentas externas do ecossistema ETS2'
  });

  AOS.init({ duration: 500, once: true });
  modalIntegracao = new bootstrap.Modal(document.getElementById('modalIntegracao'));

  document.getElementById('formIntegracao').addEventListener('submit', salvarIntegracao);

  await carregarIntegracoes();
})();

async function carregarIntegracoes() {
  const grid = document.getElementById('gridIntegracoes');

  try {
    const integracoes = await ApiService.get('/integracoes');
    listaIntegracoesAtual = integracoes;
    renderizarGrid(integracoes);
  } catch (erro) {
    console.error(erro);
    UI.estadoErro(grid, erro.message);
  }
}

function renderizarGrid(integracoes) {
  const grid = document.getElementById('gridIntegracoes');

  grid.innerHTML = integracoes.map((i) => {
    const meta = META_INTEGRACOES[i.nome] || { titulo: i.nome, icone: 'fa-plug', descricao: '' };
    return `
      <div class="col-md-6 col-xl-4">
        <div class="card-gr h-100">
          <div class="card-gr__body d-flex flex-column h-100">
            <div class="d-flex align-items-start gap-3 mb-3">
              <div class="card-integracao__logo"><i class="fa-solid ${meta.icone}"></i></div>
              <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-start">
                  <h4 class="fonte-display fw-bold mb-1" style="font-size:1rem;">${meta.titulo}</h4>
                  ${badgeAtiva(i.ativa)}
                </div>
                <p class="text-muted mb-0" style="font-size:0.8rem;">${meta.descricao}</p>
              </div>
            </div>

            <div class="linha-rodovia mb-3" style="width:100%; opacity:0.4;"></div>

            <div class="text-muted mb-3" style="font-size:0.76rem;">
              <i class="fa-regular fa-clock me-1"></i>
              Última sincronização: ${i.ultima_sincronizacao ? Formatador.dataHora(i.ultima_sincronizacao) : 'Nunca sincronizado'}
            </div>

            <div class="mt-auto d-flex gap-2">
              <button class="btn-gr-outline flex-grow-1" onclick="abrirConfiguracao('${i.nome}')">
                <i class="fa-solid fa-gear"></i> Configurar
              </button>
              <button class="btn-gr-secundario" onclick="sincronizarIntegracao('${i.nome}')" title="Sincronizar agora">
                <i class="fa-solid fa-rotate"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function badgeAtiva(ativa) {
  return ativa
    ? `<span class="badge-status status-ativo">Ativa</span>`
    : `<span class="badge-status status-inativo">Inativa</span>`;
}

function abrirConfiguracao(nome) {
  const integracao = listaIntegracoesAtual.find((i) => i.nome === nome);
  if (!integracao) return;

  const meta = META_INTEGRACOES[nome] || { titulo: nome };

  document.getElementById('integracaoNome').value = nome;
  document.getElementById('campoAtiva').checked = !!integracao.ativa;
  document.getElementById('campoUrlEndpoint').value = integracao.url_endpoint || '';
  document.getElementById('campoApiKey').value = integracao.api_key || '';
  document.getElementById('tituloModalIntegracao').textContent = `Configurar ${meta.titulo}`;

  modalIntegracao.show();
}

async function salvarIntegracao(evento) {
  evento.preventDefault();
  const nome = document.getElementById('integracaoNome').value;

  const dados = {
    ativa: document.getElementById('campoAtiva').checked,
    url_endpoint: document.getElementById('campoUrlEndpoint').value.trim(),
    api_key: document.getElementById('campoApiKey').value.trim()
  };

  try {
    await ApiService.put(`/integracoes/${nome}`, dados);
    UI.toastSucesso('Configuração salva com sucesso!');
    modalIntegracao.hide();
    await carregarIntegracoes();
  } catch (erro) {
    console.error(erro);
    UI.toastErro(erro.message);
  }
}

async function sincronizarIntegracao(nome) {
  try {
    await ApiService.post(`/integracoes/${nome}/sincronizar`);
    UI.toastSucesso('Sincronização disparada com sucesso!');
    await carregarIntegracoes();
  } catch (erro) {
    console.error(erro);
    UI.toastErro(erro.message);
  }
}
