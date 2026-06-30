// =====================================================================
// GR EXPRESSO - Página: Relatórios Avançados
// =====================================================================

(async function () {
  // Página exclusiva de administrador.
  if (!AuthService.protegerPaginaAdmin()) return;

  montarLayout({
    paginaAtiva: 'relatorios',
    titulo: 'Relatórios Avançados',
    subtitulo: 'Análises de desempenho, custos e lucratividade'
  });

  AOS.init({ duration: 500, once: true });

  await Promise.all([
    carregarLucratividade(),
    carregarDesempenhoMotoristas(),
    carregarCustoPorCaminhao(),
    carregarRotasFrequentes()
  ]);
})();

function formatarMesLabel(mesAno) {
  if (!mesAno) return '';
  const [ano, mes] = mesAno.split('-');
  const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomesMeses[Number(mes) - 1]}/${ano.slice(2)}`;
}

async function carregarLucratividade() {
  try {
    const dados = await ApiService.get('/relatorios/lucratividade?meses=6');
    const ctx = document.getElementById('graficoLucratividade');

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: dados.map((d) => formatarMesLabel(d.mes)),
        datasets: [
          { label: 'Faturamento', data: dados.map((d) => d.faturamento), borderColor: '#A4FF00', backgroundColor: 'rgba(164,255,0,0.12)', tension: 0.35, fill: true, borderWidth: 2.5 },
          { label: 'Despesas + Combustível', data: dados.map((d) => d.despesas + d.combustivel), borderColor: '#FF4D4F', backgroundColor: 'rgba(255,77,79,0.08)', tension: 0.35, fill: true, borderWidth: 2.5 },
          { label: 'Lucro', data: dados.map((d) => d.lucro), borderColor: '#0B3D2E', backgroundColor: 'rgba(11,61,46,0.08)', tension: 0.35, fill: true, borderWidth: 2.5 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
        scales: { y: { ticks: { callback: (v) => `R$ ${v}` }, grid: { color: '#E7EBE9' } }, x: { grid: { display: false } } }
      }
    });
  } catch (erro) {
    console.error('Erro ao carregar lucratividade:', erro);
    UI.estadoErro(document.getElementById('graficoLucratividade').closest('.card-gr__body'), erro.message);
  }
}

async function carregarDesempenhoMotoristas() {
  const corpo = document.getElementById('corpoDesempenhoMotoristas');
  try {
    const dados = await ApiService.get('/relatorios/desempenho-motoristas');

    if (!dados.length) {
      corpo.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Nenhum dado disponível.</td></tr>`;
      return;
    }

    corpo.innerHTML = dados.map((m) => `
      <tr>
        <td class="fw-semibold">${m.apelido || m.nome}</td>
        <td>${m.total_viagens}</td>
        <td>${Formatador.km(m.total_km)}</td>
        <td class="fw-semibold">${Formatador.moeda(m.total_faturado)}</td>
      </tr>
    `).join('');
  } catch (erro) {
    console.error(erro);
    corpo.innerHTML = `<tr><td colspan="4"><div class="estado-vazio"><i class="fa-solid fa-plug-circle-xmark" style="color:var(--perigo)"></i><h4>Erro ao carregar dados</h4><p>${erro.message}</p></div></td></tr>`;
  }
}

async function carregarCustoPorCaminhao() {
  const corpo = document.getElementById('corpoCustoCaminhao');
  try {
    const dados = await ApiService.get('/relatorios/custo-por-caminhao');

    if (!dados.length) {
      corpo.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Nenhum dado disponível.</td></tr>`;
      return;
    }

    corpo.innerHTML = dados.map((c) => `
      <tr>
        <td class="fw-semibold">${c.placa}</td>
        <td>${Formatador.moeda(c.gasto_combustivel)}</td>
        <td>${Formatador.moeda(c.gasto_despesas)}</td>
        <td class="fw-semibold">${Formatador.moeda(c.custo_total)}</td>
      </tr>
    `).join('');
  } catch (erro) {
    console.error(erro);
    corpo.innerHTML = `<tr><td colspan="4"><div class="estado-vazio"><i class="fa-solid fa-plug-circle-xmark" style="color:var(--perigo)"></i><h4>Erro ao carregar dados</h4><p>${erro.message}</p></div></td></tr>`;
  }
}

async function carregarRotasFrequentes() {
  const corpo = document.getElementById('corpoRotasFrequentes');
  try {
    const dados = await ApiService.get('/relatorios/rotas-frequentes?limite=10');

    if (!dados.length) {
      corpo.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Nenhuma viagem concluída ainda.</td></tr>`;
      return;
    }

    corpo.innerHTML = dados.map((r) => `
      <tr>
        <td class="fw-semibold">${r.origem} <i class="fa-solid fa-arrow-right-long mx-1 text-muted" style="font-size:0.7rem;"></i> ${r.destino}</td>
        <td>${r.total_viagens}</td>
        <td>${Formatador.km(r.distancia_media)}</td>
        <td class="fw-semibold">${Formatador.moeda(r.faturamento_total)}</td>
      </tr>
    `).join('');
  } catch (erro) {
    console.error(erro);
    corpo.innerHTML = `<tr><td colspan="4"><div class="estado-vazio"><i class="fa-solid fa-plug-circle-xmark" style="color:var(--perigo)"></i><h4>Erro ao carregar dados</h4><p>${erro.message}</p></div></td></tr>`;
  }
}
