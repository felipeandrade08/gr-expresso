// =====================================================================
// FELIPINHO LAUNCHER - Página: Mapa das Entregas (Leaflet)
// =====================================================================

const CORES_STATUS_MAPA = {
  agendada: '#FFB020', em_andamento: '#3AA6FF', concluida: '#D4A017', cancelada: '#FF4D4F'
};

(async function () {
  montarLayout({
    paginaAtiva: 'mapa',
    titulo: 'Mapa das Entregas',
    subtitulo: 'Visualização geográfica das rotas registradas'
  });

  AOS.init({ duration: 500, once: true });

  const mapa = L.map('mapaEntregas', { scrollWheelZoom: true }).setView([50.1, 10.4], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(mapa);

  try {
    const viagens = await ApiService.get('/viagens/mapa?limite=50');

    if (!viagens.length) {
      exibirMensagemSemDados(mapa);
      return;
    }

    const grupoLimites = [];

    viagens.forEach((v) => {
      const cor = CORES_STATUS_MAPA[v.status] || '#9AA39E';

      const origem = [Number(v.origem_lat), Number(v.origem_lng)];
      const destino = [Number(v.destino_lat), Number(v.destino_lng)];

      L.circleMarker(origem, { radius: 7, color: '#0B0B0B', fillColor: cor, fillOpacity: 0.9, weight: 2 })
        .addTo(mapa)
        .bindPopup(`<b>${v.codigo}</b><br>Origem: ${v.origem}<br>Motorista: ${v.motorista_nome}`);

      L.circleMarker(destino, { radius: 7, color: '#0B0B0B', fillColor: cor, fillOpacity: 0.9, weight: 2 })
        .addTo(mapa)
        .bindPopup(`<b>${v.codigo}</b><br>Destino: ${v.destino}<br>Status: ${Formatador.statusLabel(v.status)}`);

      L.polyline([origem, destino], { color: cor, weight: 2.5, opacity: 0.7, dashArray: '6 8' }).addTo(mapa);

      grupoLimites.push(origem, destino);
    });

    if (grupoLimites.length) {
      mapa.fitBounds(grupoLimites, { padding: [40, 40] });
    }
  } catch (erro) {
    console.error(erro);
    UI.toastErro(erro.message);
    exibirMensagemSemDados(mapa);
  }
})();

function exibirMensagemSemDados(mapa) {
  const aviso = L.control({ position: 'topright' });
  aviso.onAdd = function () {
    const div = L.DomUtil.create('div');
    div.style.cssText = 'background:white; padding:10px 16px; border-radius:10px; box-shadow:0 4px 16px rgba(0,0,0,0.12); font-size:0.82rem; max-width:220px;';
    div.innerHTML = '<i class="fa-solid fa-circle-info" style="color:#3AA6FF;"></i> Nenhuma viagem com coordenadas cadastradas ainda.';
    return div;
  };
  aviso.addTo(mapa);
}
