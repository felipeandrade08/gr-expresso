// =====================================================================
// FELIPINHO LAUNCHER - Página: Login / Cadastro
// =====================================================================

(function () {
  // Se já está logado, vai direto para o dashboard certo.
  if (AuthService.estaAutenticado()) {
    window.location.href = 'dashboard.html';
    return;
  }

  document.getElementById('linkIrParaCadastro').addEventListener('click', (e) => {
    e.preventDefault();
    mostrarTela('telaCadastro');
  });

  document.getElementById('linkIrParaLogin').addEventListener('click', (e) => {
    e.preventDefault();
    mostrarTela('telaLogin');
  });

  document.getElementById('btnVoltarParaLoginDeAguardando').addEventListener('click', () => {
    mostrarTela('telaLogin');
  });

  document.getElementById('formLogin').addEventListener('submit', fazerLogin);
  document.getElementById('formCadastro').addEventListener('submit', fazerCadastro);
})();

function mostrarTela(idTela) {
  document.querySelectorAll('.alternar-tela').forEach((el) => el.classList.remove('ativa'));
  document.getElementById(idTela).classList.add('ativa');
}

async function fazerLogin(evento) {
  evento.preventDefault();

  const email = document.getElementById('campoEmailLogin').value.trim();
  const senha = document.getElementById('campoSenhaLogin').value;
  const botao = document.getElementById('btnEntrar');

  botao.disabled = true;
  botao.innerHTML = 'Entrando... <i class="fa-solid fa-spinner fa-spin"></i>';

  try {
    const resultado = await ApiService.post('/auth/login', { email, senha });
    AuthService.salvarSessao(resultado.token, resultado.usuario);
    window.location.href = 'dashboard.html';
  } catch (erro) {
    console.error(erro);
    Swal.fire({
      icon: 'error',
      title: 'Não foi possível entrar',
      text: erro.message,
      confirmButtonColor: '#0B0B0B'
    });
    botao.disabled = false;
    botao.innerHTML = 'Entrar no sistema <i class="fa-solid fa-arrow-right"></i>';
  }
}

async function fazerCadastro(evento) {
  evento.preventDefault();

  const nome = document.getElementById('campoNomeCadastro').value.trim();
  const email = document.getElementById('campoEmailCadastro').value.trim();
  const telefone = document.getElementById('campoTelefoneCadastro').value.trim();
  const cnh = document.getElementById('campoCnhCadastro').value.trim();
  const senha = document.getElementById('campoSenhaCadastro').value;
  const botao = document.getElementById('btnCadastrar');

  if (senha.length < 6) {
    Swal.fire({
      icon: 'warning',
      title: 'Senha muito curta',
      text: 'A senha precisa ter pelo menos 6 caracteres.',
      confirmButtonColor: '#0B0B0B'
    });
    return;
  }

  botao.disabled = true;
  botao.innerHTML = 'Enviando... <i class="fa-solid fa-spinner fa-spin"></i>';

  try {
    await ApiService.post('/auth/registrar', { nome, email, senha, telefone, cnh });
    document.getElementById('formCadastro').reset();
    mostrarTela('telaAguardando');
  } catch (erro) {
    console.error(erro);
    Swal.fire({
      icon: 'error',
      title: 'Não foi possível concluir o cadastro',
      text: erro.message,
      confirmButtonColor: '#0B0B0B'
    });
  } finally {
    botao.disabled = false;
    botao.innerHTML = 'Criar minha conta <i class="fa-solid fa-user-plus"></i>';
  }
}
