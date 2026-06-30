// =====================================================================
// GR EXPRESSO - Página: Aprovações de Acesso (RH, Diretoria, Admin)
// =====================================================================

let listaPendentesAtual = [];
let listaTodosAtual = [];

(async function () {
  if (!AuthService.ehRH()) {
    window.location.href = 'dashboard.html';
    return;
  }

  montarLayout({
    paginaAtiva: 'aprovacoes',
    titulo: 'Aprovações de Acesso',
    subtitulo: 'Aprove, bloqueie ou dispense motoristas no sistema'
  });

  AOS.init({ duration: 500, once: true });

  document.getElementById('filtroStatusUsuarios').addEventListener('change', carregarTodos);

  await Promise.all([carregarPendentes(), carregarTodos()]);
})();

async function carregarPendentes() {
  const corpo = document.getElementById('corpoTabelaPendentes');
  try {
    const pendentes = await ApiService.get('/auth/usuarios/pendentes');
    listaPendentesAtual = pendentes;
    renderizarResumo(pendentes.length);
    renderizarPendentes(pendentes);
  } catch (erro) {
    corpo.innerHTML = `<tr><td colspan="4"><div class="estado-vazio"><i class="fa-solid fa-plug-circle-xmark" style="color:var(--perigo)"></i><h4>Erro</h4><p>${erro.message}</p></div></td></tr>`;
  }
}

function renderizarResumo(totalPendentes) {
  document.getElementById('gridResumoAprovacoes').innerHTML = `
    <div class="col-md-4">
      <div class="card-indicador">
        <div class="card-indicador__icone bg-alerta"><i class="fa-solid fa-user-clock"></i></div>
        <div class="card-indicador__valor">${totalPendentes}</div>
        <div class="card-indicador__label">Cadastros aguardando aprovação</div>
      </div>
    </div>
  `;
}

function renderizarPendentes(pendentes) {
  const corpo = document.getElementById('corpoTabelaPendentes');

  if (!pendentes.length) {
    corpo.innerHTML = `<tr><td colspan="4"><div class="estado-vazio"><i class="fa-solid fa-circle-check"></i><h4>Tudo em dia!</h4><p>Não há cadastros pendentes.</p></div></td></tr>`;
    return;
  }

  corpo.innerHTML = pendentes.map((u) => `
    <tr>
      <td class="fw-semibold">${u.nome}</td>
      <td>${u.email}</td>
      <td>${Formatador.dataHora(u.criado_em)}</td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn-gr-primario" style="padding:7px 14px;" onclick="decidirUsuario(${u.id}, 'aprovado', '${u.nome.replace(/'/g, "\\'")}')">
            <i class="fa-solid fa-check"></i> Aprovar
          </button>
          <button class="btn-gr-outline" style="padding:7px 14px; border-color:var(--perigo); color:var(--perigo);" onclick="decidirUsuario(${u.id}, 'rejeitado', '${u.nome.replace(/'/g, "\\'")}')">
            <i class="fa-solid fa-xmark"></i> Rejeitar
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function decidirUsuario(id, novoStatus, nome) {
  const confirmado = await Swal.fire({
    title: `${novoStatus === 'aprovado' ? 'Aprovar' : 'Rejeitar'} cadastro?`,
    html: `Confirmar ${novoStatus === 'aprovado' ? 'aprovação' : 'rejeição'} de <b>${nome}</b>?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: novoStatus === 'aprovado' ? 'Sim, aprovar' : 'Sim, rejeitar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: novoStatus === 'aprovado' ? '#0B3D2E' : '#FF4D4F',
    cancelButtonColor: '#9AA39E'
  });

  if (!confirmado.isConfirmed) return;

  try {
    await ApiService.patch(`/auth/usuarios/${id}/status`, { status: novoStatus });
    UI.toastSucesso(novoStatus === 'aprovado' ? 'Acesso aprovado!' : 'Cadastro rejeitado.');
    await Promise.all([carregarPendentes(), carregarTodos()]);
  } catch (erro) {
    UI.toastErro(erro.message);
  }
}

async function carregarTodos() {
  const corpo = document.getElementById('corpoTabelaTodos');
  const status = document.getElementById('filtroStatusUsuarios').value;

  try {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    const usuarios = await ApiService.get(`/auth/usuarios?${params.toString()}`);
    listaTodosAtual = usuarios;
    renderizarTodos(usuarios);
  } catch (erro) {
    corpo.innerHTML = `<tr><td colspan="7"><div class="estado-vazio"><i class="fa-solid fa-plug-circle-xmark" style="color:var(--perigo)"></i><h4>Erro</h4><p>${erro.message}</p></div></td></tr>`;
  }
}

const CARGOS = {
  admin:     { label: 'Administrador', cor: 'var(--verde-limao)', bg: 'rgba(164,255,0,0.12)' },
  diretoria: { label: 'Diretoria',     cor: '#FFB020',            bg: 'rgba(255,176,32,0.12)' },
  rh:        { label: 'RH',            cor: '#5865F2',            bg: 'rgba(88,101,242,0.12)' },
  motorista: { label: 'Motorista',     cor: 'var(--cinza-400)',   bg: 'rgba(154,163,158,0.1)' }
};

function badgeCargo(tipo) {
  const c = CARGOS[tipo] || CARGOS.motorista;
  return `<span style="font-size:0.72rem;font-weight:700;padding:3px 10px;border-radius:99px;background:${c.bg};color:${c.cor};border:1px solid ${c.cor}30;">${c.label}</span>`;
}

function renderizarTodos(usuarios) {
  const corpo = document.getElementById('corpoTabelaTodos');
  const ehDiretoria = AuthService.ehDiretoria();

  if (!usuarios.length) {
    corpo.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Nenhum usuário encontrado.</td></tr>`;
    return;
  }

  corpo.innerHTML = usuarios.map((u) => {
    const statusMap = { aprovado: 'ativo', rejeitado: 'cancelada', pendente: 'pendente', bloqueado: 'suspenso', dispensado: 'inativo' };

    const acoesCargo = ehDiretoria && u.tipo !== 'admin' ? `
      <select class="campo-input" style="padding:5px 10px;font-size:0.76rem;width:140px;margin-bottom:0;"
              onchange="alterarCargo(${u.id}, this.value, '${u.nome.replace(/'/g, "\\'")}')">
        <option value="motorista" ${u.tipo === 'motorista' ? 'selected' : ''}>Motorista</option>
        <option value="rh"        ${u.tipo === 'rh'        ? 'selected' : ''}>RH</option>
        <option value="diretoria" ${u.tipo === 'diretoria' ? 'selected' : ''}>Diretoria</option>
      </select>
    ` : '';

    const acoesStatus = u.tipo !== 'admin' ? `
      <div class="d-flex gap-1 flex-wrap mt-1">
        ${u.status !== 'bloqueado' ? `<button class="btn btn-sm btn-warning" onclick="alterarStatus(${u.id},'bloqueado','${u.nome.replace(/'/g, "\\'")}')"><i class="fa-solid fa-ban"></i> Bloquear</button>` : ''}
        ${u.status === 'bloqueado' ? `<button class="btn btn-sm btn-success" onclick="alterarStatus(${u.id},'aprovado','${u.nome.replace(/'/g, "\\'")}')"><i class="fa-solid fa-unlock"></i> Desbloquear</button>` : ''}
        ${ehDiretoria && u.status !== 'dispensado' ? `<button class="btn btn-sm btn-danger" onclick="alterarStatus(${u.id},'dispensado','${u.nome.replace(/'/g, "\\'")}')"><i class="fa-solid fa-door-open"></i> Dispensar</button>` : ''}
      </div>
    ` : '<span class="text-muted" style="font-size:0.76rem;">Protegido</span>';

    const nivelMotorista = u.motorista_nivel ? `
      <div style="font-size:0.7rem;color:${u.motorista_nivel === 'novato' ? '#FFB020' : 'var(--verde-limao)'};margin-top:2px;">
        <i class="fa-solid ${u.motorista_nivel === 'novato' ? 'fa-seedling' : 'fa-star'}"></i>
        ${u.motorista_nivel === 'novato' ? `Novato — ${Number(u.motorista_total_km || 0).toFixed(0)} / 10.000 km` : 'Motorista'}
      </div>` : '';

    return `
      <tr>
        <td>
          <div class="fw-semibold">${u.nome}</div>
          ${nivelMotorista}
        </td>
        <td style="font-size:0.84rem;">${u.email}</td>
        <td>${badgeCargo(u.tipo)}</td>
        <td>${Formatador.badgeStatus(statusMap[u.status] || u.status)}</td>
        <td style="font-size:0.8rem;">${u.ultimo_login ? Formatador.dataHora(u.ultimo_login) : 'Nunca'}</td>
        <td>${acoesCargo}</td>
        <td>${acoesStatus}</td>
      </tr>
    `;
  }).join('');
}

async function alterarCargo(id, novoCargo, nome) {
  try {
    await ApiService.patch(`/auth/usuarios/${id}/cargo`, { tipo: novoCargo });
    UI.toastSucesso(`Cargo de ${nome} atualizado para ${CARGOS[novoCargo]?.label || novoCargo}!`);
    await carregarTodos();
  } catch (e) {
    UI.toastErro(e.message);
  }
}

async function alterarStatus(id, status, nome) {
  const labelsAcao = { bloqueado: 'Bloquear', aprovado: 'Desbloquear', dispensado: 'Dispensar' };
  const { isConfirmed } = await Swal.fire({
    title: `${labelsAcao[status] || status} motorista?`,
    html: `Confirmar ação em <b>${nome}</b>?`,
    icon: status === 'dispensado' ? 'warning' : 'question',
    showCancelButton: true,
    confirmButtonText: labelsAcao[status] || status,
    cancelButtonText: 'Cancelar',
    confirmButtonColor: status === 'aprovado' ? '#0B3D2E' : '#dc3545'
  });

  if (!isConfirmed) return;

  try {
    await ApiService.patch(`/auth/usuarios/${id}/status`, { status });
    UI.toastSucesso('Status atualizado com sucesso!');
    await Promise.all([carregarPendentes(), carregarTodos()]);
  } catch (e) {
    UI.toastErro(e.message);
  }
}

function mapStatusUsuario(status) {
  if (status === 'aprovado') return 'ativo';
  if (status === 'rejeitado') return 'cancelada';
  return 'pendente';
}
