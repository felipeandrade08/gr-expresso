// =====================================================================
// FELIPINHO LAUNCHER - Página: Notas Fiscais (CRUD + visualização do documento)
// =====================================================================

let modalNota;
let modalVisualizarNota;
let listaNotasAtual = [];

(async function () {
  const ehAdmin = AuthService.ehAdmin();

  montarLayout({
    paginaAtiva: 'notas-fiscais',
    titulo: ehAdmin ? 'Notas Fiscais' : 'Minhas Notas Fiscais',
    subtitulo: ehAdmin
      ? 'Emissão e controle de notas fiscais de frete'
      : 'Notas fiscais geradas automaticamente nas suas viagens'
  });

  AOS.init({ duration: 500, once: true });
  modalNota = new bootstrap.Modal(document.getElementById('modalNota'));
  modalVisualizarNota = new bootstrap.Modal(document.getElementById('modalVisualizarNota'));

  // Motorista comum não emite nota fiscal manualmente: elas são geradas
  // automaticamente pelo sistema ao iniciar uma viagem.
  const btnNovaNota = document.getElementById('btnNovaNota');
  if (!ehAdmin) {
    btnNovaNota.style.display = 'none';
  } else {
    btnNovaNota.addEventListener('click', abrirModalNovo);
  }

  document.getElementById('formNota').addEventListener('submit', salvarNota);
  document.getElementById('campoBusca').addEventListener('input', debounce(carregarNotas, 350));
  document.getElementById('filtroStatus').addEventListener('change', carregarNotas);
  document.getElementById('btnImprimirNota').addEventListener('click', () => window.print());

  const promessas = [carregarNotas()];
  if (ehAdmin) promessas.push(carregarViagensSelect());
  await Promise.all(promessas);
})();

function debounce(fn, atraso) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), atraso); };
}

async function carregarViagensSelect() {
  try {
    const viagens = await ApiService.get('/viagens?status=concluida');
    document.getElementById('campoViagemId').innerHTML = '<option value="">Nenhuma</option>' +
      viagens.map((v) => `<option value="${v.id}">${v.codigo} - ${v.origem} → ${v.destino}</option>`).join('');
  } catch (erro) {
    console.error('Erro ao carregar viagens:', erro);
  }
}

async function carregarNotas() {
  const corpo = document.getElementById('corpoTabelaNotas');
  const busca = document.getElementById('campoBusca').value.trim();
  const status = document.getElementById('filtroStatus').value;

  try {
    const params = new URLSearchParams();
    if (busca) params.set('busca', busca);
    if (status) params.set('status', status);

    const notas = await ApiService.get(`/notas-fiscais?${params.toString()}`);
    listaNotasAtual = notas;
    renderizarTabela(notas);
  } catch (erro) {
    console.error(erro);
    corpo.innerHTML = `<tr><td colspan="7"><div class="estado-vazio"><i class="fa-solid fa-plug-circle-xmark" style="color:var(--perigo)"></i><h4>Erro ao carregar notas fiscais</h4><p>${erro.message}</p></div></td></tr>`;
  }
}

function renderizarTabela(notas) {
  const corpo = document.getElementById('corpoTabelaNotas');
  const ehAdmin = AuthService.ehAdmin();

  if (!notas.length) {
    corpo.innerHTML = `<tr><td colspan="7">
      <div class="estado-vazio">
        <i class="fa-solid fa-file-invoice"></i>
        <h4>Nenhuma nota fiscal ${ehAdmin ? 'emitida' : 'ainda'}</h4>
        <p>${ehAdmin ? 'Emita a primeira nota fiscal da transportadora.' : 'Suas notas fiscais aparecem aqui assim que você iniciar uma viagem.'}</p>
        ${ehAdmin ? '<button class="btn-gr-primario" onclick="abrirModalNovo()"><i class="fa-solid fa-plus"></i> Emitir Nota Fiscal</button>' : ''}
      </div>
    </td></tr>`;
    return;
  }

  corpo.innerHTML = notas.map((n) => `
    <tr class="linha-clicavel" onclick="visualizarNota(${n.id})">
      <td class="fw-semibold">${n.numero}</td>
      <td>${n.cliente}</td>
      <td>${n.viagem_codigo ? `${n.viagem_codigo} (${n.origem} → ${n.destino})` : '—'}</td>
      <td class="fw-semibold">${Formatador.moeda(n.valor_total)}</td>
      <td>${Formatador.data(n.data_emissao)}</td>
      <td>${Formatador.badgeStatus(n.status)}</td>
      <td>
        <div class="d-flex gap-2" onclick="event.stopPropagation()">
          <button class="btn-gr-icone" onclick="visualizarNota(${n.id})" title="Visualizar"><i class="fa-solid fa-eye"></i></button>
          ${ehAdmin ? `
            <button class="btn-gr-icone" onclick="editarNota(${n.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-gr-icone perigo" onclick="excluirNota(${n.id}, '${n.numero}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

// =====================================================================
// VISUALIZAÇÃO DO DOCUMENTO (nota fiscal "real")
// =====================================================================

const LABEL_STATUS_NOTA = { emitida: 'Emitida', paga: 'Paga', pendente: 'Pendente', cancelada: 'Cancelada' };
const COR_FAIXA_STATUS = {
  emitida: { bg: 'rgba(58,166,255,0.12)', cor: '#1A77C9' },
  paga: { bg: 'rgba(46,204,113,0.14)', cor: '#1E9E58' },
  pendente: { bg: 'rgba(255,176,32,0.16)', cor: '#B8780A' },
  cancelada: { bg: 'rgba(255,77,79,0.12)', cor: '#D6393B' }
};

function visualizarNota(id) {
  const nota = listaNotasAtual.find((x) => x.id === id);
  if (!nota) return;

  document.getElementById('documentoNotaFiscal').innerHTML = montarDocumentoNota(nota);
  modalVisualizarNota.show();
}

function gerarCodigoAutorizacao(nota) {
  // Código de autorização "fake" mas com aparência real, derivado de
  // dados estáveis da própria nota (mesmo número sempre gera o mesmo código).
  const base = `${nota.numero}${nota.id}${nota.valor_total}`.replace(/\D/g, '');
  const blocos = [];
  for (let i = 0; i < 6; i++) {
    const trecho = (base + '000000000000').substring(i * 6, i * 6 + 6);
    blocos.push(trecho.padEnd(6, '0'));
  }
  return blocos.join(' ');
}

function montarDocumentoNota(nota) {
  const corFaixa = COR_FAIXA_STATUS[nota.status] || COR_FAIXA_STATUS.pendente;
  const cancelada = nota.status === 'cancelada';
  const dataEmissaoFormatada = Formatador.dataHora(nota.data_emissao);
  const codigoAutorizacao = gerarCodigoAutorizacao(nota);
  const rota = nota.viagem_codigo ? `${nota.origem} → ${nota.destino}` : 'Carga avulsa (sem viagem vinculada)';

  // Código de barras simulado (44 dígitos, padrão visual DANFE)
  const chaveAcesso = (codigoAutorizacao.replace(/\s/g, '') + '000000000000').substring(0, 44);
  const chaveFormatada = chaveAcesso.match(/.{1,4}/g).join(' ');

  // Dados extras da viagem (podem vir nulos em notas manuais)
  const distancia   = nota.distancia_km  ? `${Number(nota.distancia_km).toFixed(0)} km`  : '—';
  const pesoCarga   = nota.peso_carga    ? `${Number(nota.peso_carga).toLocaleString('pt-BR')} kg` : '—';
  const placa       = nota.caminhao_placa || '—';
  const motoristaNome = nota.motorista_nome || nota.cliente || '—';

  return `
    <div class="nota-documento animate__animated animate__fadeIn">
      ${cancelada ? '<div class="nota-watermark-cancelada">Cancelada</div>' : ''}

      <!-- CABEÇALHO DANFE -->
      <div class="nf-danfe-header">
        <div class="nf-danfe-emitente">
          <div class="nf-danfe-logo-wrap">
            <img src="img/logo/logo-gr-expresso.png" alt="FELIPINHO LAUNCHER" class="nf-danfe-logo">
          </div>
          <div class="nf-danfe-emitente-info">
            <div class="nf-danfe-emitente-nome">FELIPINHO LAUNCHER TRANSPORTES LTDA</div>
            <div class="nf-danfe-emitente-end">Rod, Washington Luiz, 1000 &bull; Catanduva, SP &bull; CEP 79000-000</div>
            <div class="nf-danfe-emitente-end">CNPJ: 40.250.045/0001-10 &bull; IE: 101.523.061.780</div>
            <div class="nf-danfe-emitente-end">Fone: (16) 4090-2210 &bull; grexpresso4@gmail.com.br</div>
          </div>
        </div>
        <div class="nf-danfe-titulo-wrap">
          <div class="nf-danfe-titulo">NOTA FISCAL DE<br>SERVIÇO DE TRANSPORTE</div>
          <div class="nf-danfe-numero-serie">
            <div class="nf-danfe-numero-label">N°</div>
            <div class="nf-danfe-numero-valor">${nota.numero}</div>
            <div class="nf-danfe-numero-label" style="margin-top:6px;">SÉRIE</div>
            <div class="nf-danfe-numero-valor">001</div>
          </div>
          <div class="nf-danfe-status-badge" style="background:${corFaixa.bg}; color:${corFaixa.cor};">
            ${LABEL_STATUS_NOTA[nota.status] || nota.status}
          </div>
        </div>
      </div>

      <!-- CHAVE DE ACESSO -->
      <div class="nf-chave-wrap">
        <div class="nf-chave-label">CHAVE DE ACESSO</div>
        <div class="nf-chave-valor">${chaveFormatada}</div>
        <div class="nf-barcode-svg">
          ${gerarBarcodeSVG(chaveAcesso)}
        </div>
      </div>

      <!-- BLOCO DESTINATÁRIO -->
      <div class="nf-secao-titulo">DESTINATÁRIO / REMETENTE</div>
      <div class="nf-grid-4">
        <div class="nf-campo nf-col-2">
          <div class="nf-label">NOME / RAZÃO SOCIAL</div>
          <div class="nf-valor">${nota.cliente}</div>
        </div>
        <div class="nf-campo">
          <div class="nf-label">CNPJ / CPF</div>
          <div class="nf-valor">${nota.cnpj_cpf || '000.000.000-00'}</div>
        </div>
        <div class="nf-campo">
          <div class="nf-label">DATA DE EMISSÃO</div>
          <div class="nf-valor">${dataEmissaoFormatada}</div>
        </div>
      </div>

      <!-- BLOCO TRANSPORTE -->
      <div class="nf-secao-titulo">DADOS DO TRANSPORTE</div>
      <div class="nf-grid-4">
        <div class="nf-campo nf-col-2">
          <div class="nf-label">ROTA (ORIGEM → DESTINO)</div>
          <div class="nf-valor">${rota}</div>
        </div>
        <div class="nf-campo">
          <div class="nf-label">N° VIAGEM</div>
          <div class="nf-valor">${nota.viagem_codigo || '—'}</div>
        </div>
        <div class="nf-campo">
          <div class="nf-label">PLACA DO VEÍCULO</div>
          <div class="nf-valor">${placa}</div>
        </div>
        <div class="nf-campo">
          <div class="nf-label">MOTORISTA</div>
          <div class="nf-valor">${motoristaNome}</div>
        </div>
        <div class="nf-campo">
          <div class="nf-label">DISTÂNCIA PERCORRIDA</div>
          <div class="nf-valor">${distancia}</div>
        </div>
        <div class="nf-campo">
          <div class="nf-label">PESO DA CARGA</div>
          <div class="nf-valor">${pesoCarga}</div>
        </div>
        <div class="nf-campo">
          <div class="nf-label">TIPO DE CARGA</div>
          <div class="nf-valor">${nota.descricao_carga || 'Carga geral'}</div>
        </div>
      </div>

      <!-- TABELA ITENS -->
      <div class="nf-secao-titulo">DISCRIMINAÇÃO DOS SERVIÇOS</div>
      <table class="nf-tabela">
        <thead>
          <tr>
            <th style="width:50%">DESCRIÇÃO DO SERVIÇO</th>
            <th style="width:15%">QTD</th>
            <th style="width:15%">UNID</th>
            <th style="width:20%;text-align:right">VALOR (R$)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Frete rodoviário — ${nota.descricao_carga || 'Carga geral'}<br>
              <span style="font-size:0.75rem;color:#666;">Rota: ${rota}</span></td>
            <td>1</td>
            <td>SERVIÇO</td>
            <td style="text-align:right;font-weight:600">${Formatador.moeda(nota.valor_total)}</td>
          </tr>
        </tbody>
      </table>

      <!-- CÁLCULO DO IMPOSTO / TOTAIS -->
      <div class="nf-grid-totais">
        <div class="nf-imposto-wrap">
          <div class="nf-secao-titulo" style="margin-top:0">CÁLCULO DO IMPOSTO</div>
          <div class="nf-grid-imp">
            <div class="nf-campo-imp"><div class="nf-label">BASE CÁLC. ICMS</div><div class="nf-valor">${Formatador.moeda(nota.valor_total)}</div></div>
            <div class="nf-campo-imp"><div class="nf-label">VALOR ICMS (12%)</div><div class="nf-valor">${Formatador.moeda(nota.valor_total * 0.12)}</div></div>
            <div class="nf-campo-imp"><div class="nf-label">ISS (0%)</div><div class="nf-valor">R$ 0,00</div></div>
            <div class="nf-campo-imp"><div class="nf-label">DESC. / ABAT.</div><div class="nf-valor">R$ 0,00</div></div>
          </div>
        </div>
        <div class="nf-totais-wrap">
          <div class="nf-totais-linha"><span>Subtotal</span><span>${Formatador.moeda(nota.valor_total)}</span></div>
          <div class="nf-totais-linha"><span>Descontos</span><span>R$ 0,00</span></div>
          <div class="nf-totais-linha nf-totais-grand">
            <span>VALOR TOTAL DA NOTA</span>
            <span>${Formatador.moeda(nota.valor_total)}</span>
          </div>
        </div>
      </div>

      ${nota.observacoes ? `
        <div class="nf-secao-titulo">OBSERVAÇÕES / INFORMAÇÕES COMPLEMENTARES</div>
        <div class="nf-obs">${nota.observacoes}</div>
      ` : ''}

      <!-- RODAPÉ DANFE -->
      <div class="nf-rodape">
        <div class="nf-rodape-col">
          <div class="nf-label">CONSULTE AUTENTICIDADE</div>
          <div class="nf-rodape-chave">${chaveFormatada}</div>
        </div>
        <div class="nf-rodape-col" style="text-align:right">
          <div class="nf-label">EMITIDO POR</div>
          <div class="nf-valor" style="font-size:0.8rem">FELIPINHO LAUNCHER TRANSPORTES LTDA</div>
          <div class="nf-label" style="margin-top:6px">PROTOCOLO DE AUTORIZAÇÃO</div>
          <div class="nf-valor" style="font-size:0.72rem;font-family:monospace">${codigoAutorizacao}</div>
        </div>
      </div>

    </div>
  `;
}

function gerarBarcodeSVG(chave) {
  // Gera um SVG de barras simulando código de barras do tipo Code-128
  // (visual apenas — as barras são derivadas dos dígitos da chave)
  const W = 340, H = 36;
  const digits = (chave + '0000000000000000000000000000000000000000000').substring(0, 44);
  let bars = '';
  let x = 0;
  const totalBars = 88;
  const barW = W / totalBars;
  for (let i = 0; i < totalBars; i++) {
    const d = parseInt(digits[Math.floor(i / 2)] || '0', 10);
    // Alternância de barras claras/escuras derivada dos dígitos
    const escura = (i % 2 === 0) ? (d > 4) : (d <= 4);
    if (escura) {
      bars += `<rect x="${(x).toFixed(2)}" y="0" width="${(barW - 0.3).toFixed(2)}" height="${H}" fill="#111"/>`;
    }
    x += barW;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bars}</svg>`;
}

// =====================================================================
// CRIAÇÃO / EDIÇÃO (apenas admin)
// =====================================================================

function abrirModalNovo() {
  document.getElementById('formNota').reset();
  document.getElementById('notaId').value = '';
  document.getElementById('tituloModalNota').textContent = 'Emitir Nota Fiscal';
  document.getElementById('campoStatus').value = 'pendente';
  document.getElementById('campoDataEmissao').value = new Date().toISOString().split('T')[0];
  modalNota.show();
}

function editarNota(id) {
  const n = listaNotasAtual.find((x) => x.id === id);
  if (!n) return;

  document.getElementById('notaId').value = n.id;
  document.getElementById('campoCliente').value = n.cliente || '';
  document.getElementById('campoCnpjCpf').value = n.cnpj_cpf || '';
  document.getElementById('campoViagemId').value = n.viagem_id || '';
  document.getElementById('campoDescricaoCarga').value = n.descricao_carga || '';
  document.getElementById('campoValorTotal').value = n.valor_total || '';
  document.getElementById('campoDataEmissao').value = n.data_emissao ? n.data_emissao.split('T')[0] : '';
  document.getElementById('campoStatus').value = n.status || 'pendente';
  document.getElementById('campoObservacoes').value = n.observacoes || '';
  document.getElementById('tituloModalNota').textContent = `Editar Nota ${n.numero}`;

  modalNota.show();
}

async function salvarNota(evento) {
  evento.preventDefault();
  const id = document.getElementById('notaId').value;

  const dados = {
    cliente: document.getElementById('campoCliente').value.trim(),
    cnpj_cpf: document.getElementById('campoCnpjCpf').value.trim(),
    viagem_id: document.getElementById('campoViagemId').value || null,
    descricao_carga: document.getElementById('campoDescricaoCarga').value.trim(),
    valor_total: document.getElementById('campoValorTotal').value,
    data_emissao: document.getElementById('campoDataEmissao').value,
    status: document.getElementById('campoStatus').value,
    observacoes: document.getElementById('campoObservacoes').value.trim()
  };

  try {
    if (id) {
      await ApiService.put(`/notas-fiscais/${id}`, dados);
      UI.toastSucesso('Nota fiscal atualizada com sucesso!');
    } else {
      await ApiService.post('/notas-fiscais', dados);
      UI.toastSucesso('Nota fiscal emitida com sucesso!');
    }
    modalNota.hide();
    await carregarNotas();
  } catch (erro) {
    console.error(erro);
    UI.toastErro(erro.message);
  }
}

async function excluirNota(id, numero) {
  const confirmado = await UI.confirmarExclusao(`a nota fiscal <b>${numero}</b>`);
  if (!confirmado) return;

  try {
    await ApiService.delete(`/notas-fiscais/${id}`);
    UI.toastSucesso('Nota fiscal excluída com sucesso.');
    await carregarNotas();
  } catch (erro) {
    console.error(erro);
    UI.toastErro(erro.message);
  }
}
