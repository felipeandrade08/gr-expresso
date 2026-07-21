// =====================================================================
// FELIPINHO LAUNCHER - Página: Ônibus (Controle de Frota de Ônibus)
// Dados pré-carregados da planilha + persistência em localStorage
// =====================================================================

(function () {
  montarLayout({
    paginaAtiva: 'onibus',
    titulo: 'Frota de Ônibus',
    subtitulo: 'Controle de viagens e linhas da frota de passageiros'
  });

  AOS.init({ duration: 450, once: true });

  // ── Dados base extraídos da planilha ──────────────────────────────
  const DADOS_PLANILHA = [
    // Modshop
    { carro: 'G6 1200 Scania',          prefixo: 1301,  modshop: 'Modshop' },
    { carro: 'G6 1200 Mercedes Benz',   prefixo: 1311,  modshop: 'Modshop' },
    { carro: 'G7 1200 Mercedes',        prefixo: 1051,  modshop: 'Modshop' },
    { carro: 'G7 1200 Scania',          prefixo: 1061,  modshop: 'Modshop' },
    { carro: 'G7 1800 DD Scania',       prefixo: 4001,  modshop: 'Modshop' },
    { carro: 'G7 1800 DD Scania',       prefixo: 4011,  modshop: 'Modshop' },
    { carro: 'G8 1200 Mercedes Benz',   prefixo: 8201,  modshop: 'Modshop' },
    { carro: 'G8 1200 Mercedes Benz',   prefixo: 8210,  modshop: 'Modshop' },
    { carro: 'G8 1200 Mercedes Benz',   prefixo: 8202,  modshop: 'Modshop' },
    { carro: 'G8 1200 Mercedes Benz',   prefixo: 8209,  modshop: 'Modshop' },
    { carro: 'G8 1200 Scania',          prefixo: 16900, modshop: 'Modshop' },
    { carro: 'G8 1200 Scania',          prefixo: 8270,  modshop: 'Modshop' },
    { carro: 'G8 1600 LD Scania',       prefixo: 8001,  modshop: 'Modshop' },
    { carro: 'G8 1600 LD Scania',       prefixo: 8011,  modshop: 'Modshop' },
    { carro: 'G8 1600 LD Volvo',        prefixo: 8101,  modshop: 'Modshop' },
    { carro: 'G8 1800 DD Mercedes',     prefixo: 9011,  modshop: 'Modshop' },
    { carro: 'G8 1800 DD Scania',       prefixo: 9100,  modshop: 'Modshop' },
    { carro: 'G8 1800 DD Scania',       prefixo: 9111,  modshop: 'Modshop' },
    { carro: 'G8 1800 DD Volvo',        prefixo: 8530,  modshop: 'Modshop' },
    { carro: 'Invictus 1800 Volvo',     prefixo: 4601,  modshop: 'Modshop' },
    { carro: 'Invictus 1800 Volvo',     prefixo: 4602,  modshop: 'Modshop' },
    { carro: 'Invictus 1800 Volvo',     prefixo: 4603,  modshop: 'Modshop' },
    { carro: 'Invictus 1800 Volvo',     prefixo: 15100, modshop: 'Modshop' },
    { carro: 'Vistabuss DD',            prefixo: 8520,  modshop: 'Modshop' },
    { carro: 'Campione 3.65',           prefixo: 3240,  modshop: 'Modshop' },

    // Norman Mods
    { carro: 'G6 1550 LD Scania',          prefixo: 1067, modshop: 'Norman Mods' },
    { carro: 'G6 1550 LD Scania',          prefixo: 1087, modshop: 'Norman Mods' },
    { carro: 'G7 1200 Scania 4x2',         prefixo: 1011, modshop: 'Norman Mods' },
    { carro: 'G7 1200 Scania 6x2',         prefixo: 1065, modshop: 'Norman Mods' },
    { carro: 'G7 1200 Mercedes 4x2',       prefixo: 1001, modshop: 'Norman Mods' },
    { carro: 'G7 1200 Mercedes 6x2',       prefixo: 1041, modshop: 'Norman Mods' },
    { carro: 'G7 1600 LD Mercedes',        prefixo: 1100, modshop: 'Norman Mods' },
    { carro: 'Jumbuss 380 Scania',         prefixo: 1200, modshop: 'Norman Mods' },
    { carro: 'Jumbuss 380 Scania',         prefixo: 1201, modshop: 'Norman Mods' },
    { carro: 'Jumbuss 380 Scania',         prefixo: 1202, modshop: 'Norman Mods' },
    { carro: 'Jumbuss 380 Scania',         prefixo: 1203, modshop: 'Norman Mods' },
    { carro: 'Jumbuss 380 Scania',         prefixo: 1204, modshop: 'Norman Mods' },
    { carro: 'Jumbuss 380 Volvo',          prefixo: 1211, modshop: 'Norman Mods' },
    { carro: 'Jumbuss 380 Volvo',          prefixo: 1212, modshop: 'Norman Mods' },
    { carro: 'Jumbuss 380 Volvo',          prefixo: 1213, modshop: 'Norman Mods' },
    { carro: 'Jumbuss 380 Volvo',          prefixo: 1214, modshop: 'Norman Mods' },
    { carro: 'Jumbuss 380 Volvo',          prefixo: 1215, modshop: 'Norman Mods' },
    { carro: 'NB1 Busscar',               prefixo: 1631, modshop: 'Norman Mods' },
    { carro: 'New G7 1200 Mercedes 6x2',  prefixo: 1181, modshop: 'Norman Mods' },
    { carro: 'New G7 1200 Mercedes 6x2',  prefixo: 1185, modshop: 'Norman Mods' },
    { carro: 'New G7 1200 Mercedes 4x2',  prefixo: 1132, modshop: 'Norman Mods' },
    { carro: 'New G7 1200 Mercedes 4x2',  prefixo: 1165, modshop: 'Norman Mods' },
    { carro: 'New G7 1200 Scania 6x2',    prefixo: 1191, modshop: 'Norman Mods' },
    { carro: 'New G7 1200 Scania 6x2',    prefixo: 1197, modshop: 'Norman Mods' },
    { carro: 'New G7 1200 Scania 6x2',    prefixo: 1196, modshop: 'Norman Mods' },
    { carro: 'New G7 1200 Scania 6x2',    prefixo: 1195, modshop: 'Norman Mods' },
    { carro: 'New G7 1200 Scania 6x2',    prefixo: 1190, modshop: 'Norman Mods' },
    { carro: 'New G7 1200 Scania 4x2',    prefixo: 1175, modshop: 'Norman Mods' },
    { carro: 'New G7 1200 Scania 4x2',    prefixo: 1143, modshop: 'Norman Mods' },
    { carro: 'New G7 1200 Scania 4x2',    prefixo: 1144, modshop: 'Norman Mods' },
    { carro: 'New G7 1200 Scania 4x2',    prefixo: 1176, modshop: 'Norman Mods' },
    { carro: 'New G7 1200 Scania 4x2',    prefixo: 1142, modshop: 'Norman Mods' },

    // B4D
    { carro: 'G7 1350 Mercedes Benz',    prefixo: 1198, modshop: 'B4D' },
    { carro: 'G7 1350 Mercedes Benz',    prefixo: 1199, modshop: 'B4D' },
    { carro: 'Comil 1200 Invictus',      prefixo: 5211, modshop: 'B4D' },
    { carro: 'Comil 1200 Invictus',      prefixo: 5201, modshop: 'B4D' },
    { carro: 'Comil 1200 Invictus',      prefixo: 5221, modshop: 'B4D' },
    { carro: 'Neobus New Road 4x2',      prefixo: 5001, modshop: 'B4D' },
    { carro: 'Neobus New Road 4x2',      prefixo: 5011, modshop: 'B4D' },
    { carro: 'Neobus New Road 4x2',      prefixo: 5021, modshop: 'B4D' },
    { carro: 'Neobus New Road 6x2',      prefixo: 5101, modshop: 'B4D' },
    { carro: 'Neobus New Road 6x2',      prefixo: 5111, modshop: 'B4D' },
    { carro: 'Neobus New Road 6x2',      prefixo: 5121, modshop: 'B4D' },
  ].map((item, i) => ({
    id: i,
    ...item,
    linha: '',
    motorista: '',
    dataInicio: '',
    limpeza: 'nao',
    observacoes: ''
  }));

  // ── Estado local ─────────────────────────────────────────────────
  const STORAGE_KEY = 'gr_onibus_frota_v1';

  function carregarFrota() {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        // Mescla dados da planilha com dados salvos
        return DADOS_PLANILHA.map(base => {
          const salvoItem = parsed.find(s => s.prefixo === base.prefixo && s.carro === base.carro);
          return salvoItem ? { ...base, ...salvoItem } : { ...base };
        }).concat(
          // Adiciona ônibus criados pelo usuário (não existem na planilha)
          parsed.filter(s => s._customizado && !DADOS_PLANILHA.find(b => b.prefixo === s.prefixo && b.carro === s.carro))
        );
      }
    } catch (e) {}
    return DADOS_PLANILHA.map(b => ({ ...b }));
  }

  function salvarFrota(frota) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(frota));
    } catch (e) {}
  }

  let frota = carregarFrota();
  let paginaAtual = 1;
  const POR_PAGINA = 20;
  let modshopFiltro = '';
  let modal = null;

  // ── Init ─────────────────────────────────────────────────────────
  construirAbas();
  atualizar();
  bindEventos();

  // ── Funções ──────────────────────────────────────────────────────

  function bindEventos() {
    document.getElementById('buscaOnibus').addEventListener('input', () => { paginaAtual = 1; atualizar(); });
    document.getElementById('filtroLimpeza').addEventListener('change', () => { paginaAtual = 1; atualizar(); });
    document.getElementById('filtroLinha').addEventListener('change', () => { paginaAtual = 1; atualizar(); });
    document.getElementById('btnNovoOnibus').addEventListener('click', () => abrirModal(null));
    document.getElementById('btnSalvarOnibus').addEventListener('click', salvar);
  }

  function construirAbas() {
    const modshops = ['', ...new Set(DADOS_PLANILHA.map(d => d.modshop))];
    const labels   = { '': 'Todos', 'Modshop': 'Modshop', 'Norman Mods': 'Norman Mods', 'B4D': 'B4D', 'BRT': 'BRT', 'Outro': 'Outro' };
    const cont = document.getElementById('abasModshop');
    cont.innerHTML = modshops.map(ms => `
      <button class="aba-modshop ${ms === '' ? 'ativa' : ''}" data-modshop="${ms}">
        ${labels[ms] || ms}
        <span style="font-size:0.65rem;font-weight:500;opacity:0.7;">
          (${ms === '' ? frota.length : frota.filter(b => b.modshop === ms).length})
        </span>
      </button>
    `).join('');
    cont.querySelectorAll('.aba-modshop').forEach(btn => {
      btn.addEventListener('click', () => {
        cont.querySelectorAll('.aba-modshop').forEach(b => b.classList.remove('ativa'));
        btn.classList.add('ativa');
        modshopFiltro = btn.dataset.modshop;
        paginaAtual = 1;
        atualizar();
      });
    });
  }

  function filtrarFrota() {
    const busca   = document.getElementById('buscaOnibus').value.toLowerCase().trim();
    const limpeza = document.getElementById('filtroLimpeza').value;
    const linha   = document.getElementById('filtroLinha').value;

    return frota.filter(b => {
      if (modshopFiltro && b.modshop !== modshopFiltro) return false;
      if (busca) {
        const texto = `${b.carro} ${b.prefixo} ${b.motorista} ${b.linha}`.toLowerCase();
        if (!texto.includes(busca)) return false;
      }
      if (limpeza === 'sim' && b.limpeza !== 'sim') return false;
      if (limpeza === 'nao' && b.limpeza === 'sim') return false;
      if (linha === 'com_linha' && !b.linha) return false;
      if (linha === 'sem_linha' && b.linha) return false;
      return true;
    });
  }

  function atualizar() {
    const filtrado = filtrarFrota();
    renderizarStats();
    renderizarTabela(filtrado);
    renderizarPaginacao(filtrado.length);
  }

  function renderizarStats() {
    document.getElementById('statTotal').textContent      = frota.length;
    document.getElementById('statComLinha').textContent   = frota.filter(b => b.linha).length;
    document.getElementById('statLimpeza').textContent    = frota.filter(b => b.limpeza === 'sim').length;
    document.getElementById('statComMotorista').textContent = frota.filter(b => b.motorista).length;
  }

  function renderizarTabela(filtrado) {
    const tbody = document.getElementById('corpoTabelaOnibus');
    const inicio = (paginaAtual - 1) * POR_PAGINA;
    const pagina = filtrado.slice(inicio, inicio + POR_PAGINA);

    if (pagina.length === 0) {
      tbody.innerHTML = `<tr class="empty-tabela"><td colspan="9"><i class="fa-solid fa-bus-simple" style="font-size:1.8rem;color:var(--cinza-200);display:block;margin-bottom:10px;"></i>Nenhum ônibus encontrado com os filtros aplicados.</td></tr>`;
      return;
    }

    tbody.innerHTML = pagina.map((b, i) => {
      const modKey = (b.modshop || 'Outro').replace(/\s+/g, '');
      const limpeza = b.limpeza === 'sim'
        ? '<span class="limpeza-sim"><i class="fa-solid fa-triangle-exclamation me-1"></i>Sim</span>'
        : '<span class="limpeza-nao"><i class="fa-solid fa-check me-1"></i>Não</span>';
      const dataFmt = b.dataInicio ? b.dataInicio.split('-').reverse().join('/') : '—';

      return `
        <tr>
          <td><span class="prefixo-tag">${b.prefixo}</span></td>
          <td style="font-weight:500;font-size:0.82rem;">${b.carro}</td>
          <td><span class="modshop-tag modshop-${modKey}">${b.modshop || 'Outro'}</span></td>
          <td><span class="linha-tag">${b.linha || '<span style="color:var(--cinza-400);font-size:0.75rem;font-style:italic;">Sem linha</span>'}</span></td>
          <td style="font-size:0.82rem;">${b.motorista || '<span style="color:var(--cinza-400);">—</span>'}</td>
          <td style="font-size:0.8rem;color:var(--cinza-600);">${dataFmt}</td>
          <td>${limpeza}</td>
          <td style="font-size:0.78rem;color:var(--cinza-600);max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${b.observacoes || ''}">${b.observacoes || '—'}</td>
          <td>
            <div style="display:flex;gap:4px;">
              <button class="btn-acao primario" onclick="editarOnibus(${b.id})"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-acao perigo"   onclick="confirmarExcluir(${b.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderizarPaginacao(total) {
    const totalPaginas = Math.ceil(total / POR_PAGINA);
    const cont = document.getElementById('paginacao');

    if (totalPaginas <= 1) { cont.innerHTML = ''; return; }

    const inicio = (paginaAtual - 1) * POR_PAGINA + 1;
    const fim    = Math.min(paginaAtual * POR_PAGINA, total);

    let btns = `<button ${paginaAtual === 1 ? 'disabled' : ''} onclick="irPagina(${paginaAtual - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;
    for (let p = 1; p <= totalPaginas; p++) {
      if (p === 1 || p === totalPaginas || Math.abs(p - paginaAtual) <= 2) {
        btns += `<button class="${p === paginaAtual ? 'ativo' : ''}" onclick="irPagina(${p})">${p}</button>`;
      } else if (Math.abs(p - paginaAtual) === 3) {
        btns += '<button disabled>…</button>';
      }
    }
    btns += `<button ${paginaAtual === totalPaginas ? 'disabled' : ''} onclick="irPagina(${paginaAtual + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;

    cont.innerHTML = `
      <span class="paginacao-info">Exibindo ${inicio}–${fim} de ${total} ônibus</span>
      <div class="paginacao-btns">${btns}</div>
    `;
  }

  // ── Modal ─────────────────────────────────────────────────────────

  function abrirModal(idx) {
    if (!modal) modal = new bootstrap.Modal(document.getElementById('modalOnibus'));
    document.getElementById('onibusIdx').value = idx !== null ? idx : '';
    document.getElementById('tituloModalOnibus').textContent = idx !== null ? 'Editar Ônibus' : 'Novo Ônibus';

    if (idx !== null) {
      const b = frota.find(x => x.id === idx);
      if (b) {
        document.getElementById('campoCarro').value        = b.carro;
        document.getElementById('campoPrefixo').value      = b.prefixo;
        document.getElementById('campoModshop').value      = b.modshop || 'Modshop';
        document.getElementById('campoLinha').value        = b.linha || '';
        document.getElementById('campoMotorista').value    = b.motorista || '';
        document.getElementById('campoDataInicio').value   = b.dataInicio || '';
        document.getElementById('campoLimpeza').value      = b.limpeza || 'nao';
        document.getElementById('campoObservacoes').value  = b.observacoes || '';
      }
    } else {
      ['campoCarro','campoLinha','campoMotorista','campoDataInicio','campoObservacoes'].forEach(id => {
        document.getElementById(id).value = '';
      });
      document.getElementById('campoPrefixo').value = '';
      document.getElementById('campoModshop').value  = 'Modshop';
      document.getElementById('campoLimpeza').value  = 'nao';
    }

    modal.show();
  }

  function salvar() {
    const carro    = document.getElementById('campoCarro').value.trim();
    const prefixo  = parseInt(document.getElementById('campoPrefixo').value);

    if (!carro || !prefixo) {
      Swal.fire({ icon: 'warning', title: 'Atenção', text: 'Modelo e prefixo são obrigatórios.', confirmButtonColor: '#0B0B0B' });
      return;
    }

    const dados = {
      carro,
      prefixo,
      modshop:     document.getElementById('campoModshop').value,
      linha:       document.getElementById('campoLinha').value.trim(),
      motorista:   document.getElementById('campoMotorista').value.trim(),
      dataInicio:  document.getElementById('campoDataInicio').value,
      limpeza:     document.getElementById('campoLimpeza').value,
      observacoes: document.getElementById('campoObservacoes').value.trim(),
    };

    const idxStr = document.getElementById('onibusIdx').value;
    if (idxStr !== '') {
      const i = frota.findIndex(x => x.id === parseInt(idxStr));
      if (i !== -1) frota[i] = { ...frota[i], ...dados };
    } else {
      const maxId = frota.reduce((m, b) => Math.max(m, b.id), -1);
      frota.push({ id: maxId + 1, _customizado: true, ...dados });
    }

    salvarFrota(frota);
    construirAbas();
    atualizar();
    modal.hide();

    Swal.fire({
      icon: 'success',
      title: 'Salvo!',
      text: 'Ônibus atualizado com sucesso.',
      timer: 1800,
      showConfirmButton: false,
      position: 'bottom-end',
      toast: true
    });
  }

  // ── Globais chamados pelo HTML inline ────────────────────────────
  window.editarOnibus = function(id) { abrirModal(id); };

  window.confirmarExcluir = function(id) {
    const b = frota.find(x => x.id === id);
    if (!b) return;
    Swal.fire({
      icon: 'warning',
      title: 'Remover ônibus?',
      html: `<strong>Prefixo ${b.prefixo}</strong> — ${b.carro}<br><small style="color:#9AA39E;">Esta ação não pode ser desfeita.</small>`,
      showCancelButton: true,
      confirmButtonText: 'Sim, remover',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#FF4D4F',
      cancelButtonColor: '#0B0B0B'
    }).then(res => {
      if (res.isConfirmed) {
        frota = frota.filter(x => x.id !== id);
        salvarFrota(frota);
        construirAbas();
        atualizar();
      }
    });
  };

  window.irPagina = function(p) {
    paginaAtual = p;
    atualizar();
    document.getElementById('tabelaOnibus')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

})();
