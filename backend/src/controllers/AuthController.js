// =====================================================================
// GR EXPRESSO - Controller: Autenticação
// =====================================================================

const bcrypt = require('bcryptjs');
const UsuarioModel = require('../models/UsuarioModel');
const { gerarToken } = require('../utils/token');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso, criado, erro, naoEncontrado, requisicaoInvalida } = require('../utils/respostaPadrao');

function sanitizarUsuario(usuario) {
  if (!usuario) return null;
  const { senha_hash, ...resto } = usuario;
  return resto;
}

const AuthController = {
  registrar: asyncHandler(async (req, res) => {
    const { nome, email, senha, telefone, cnh } = req.body;

    if (!nome || !email || !senha) {
      return requisicaoInvalida(res, 'Os campos "nome", "email" e "senha" são obrigatórios.');
    }

    if (senha.length < 6) {
      return requisicaoInvalida(res, 'A senha deve ter pelo menos 6 caracteres.');
    }

    const existente = await UsuarioModel.buscarPorEmail(email);
    if (existente) {
      return erro(res, 'Já existe uma conta cadastrada com este e-mail.', 409);
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    // Motorista que se cadastra pelo sistema entra como "novato"
    const usuario = await UsuarioModel.criarComMotorista({ nome, email, senhaHash, telefone, cnh, nivel: 'novato' });

    return criado(res, sanitizarUsuario(usuario),
      'Cadastro realizado com sucesso! Sua conta está aguardando aprovação.');
  }),

  login: asyncHandler(async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return requisicaoInvalida(res, 'Informe e-mail e senha.');
    }

    const usuario = await UsuarioModel.buscarPorEmail(email);
    if (!usuario) {
      return erro(res, 'E-mail ou senha incorretos.', 401);
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaConfere) {
      return erro(res, 'E-mail ou senha incorretos.', 401);
    }

    if (usuario.status === 'pendente') {
      return erro(res, 'Sua conta ainda está aguardando aprovação.', 403);
    }

    if (usuario.status === 'rejeitado') {
      return erro(res, 'Seu cadastro não foi aprovado. Fale com o administrador.', 403);
    }

    if (usuario.status === 'bloqueado') {
      return erro(res, 'Sua conta está bloqueada. Entre em contato com o administrador.', 403);
    }

    // Verifica se o motorista vinculado foi desativado
    if (usuario.motorista_id) {
      const { pool } = require('../config/database');
      const [[mot]] = await pool.query(
        "SELECT status FROM motoristas WHERE id = ?", [usuario.motorista_id]
      );
      if (mot && mot.status === 'inativo') {
        return erro(res, 'Seu cadastro de motorista está inativo. Entre em contato com o administrador.', 403);
      }
    }

    await UsuarioModel.registrarLogin(usuario.id);

    const token = gerarToken(usuario);
    return sucesso(res, { token, usuario: sanitizarUsuario(usuario) }, 'Login realizado com sucesso.');
  }),

  meuPerfil: asyncHandler(async (req, res) => {
    const usuario = await UsuarioModel.buscarPorId(req.usuario.id);
    if (!usuario) return naoEncontrado(res, 'Usuário não encontrado.');
    return sucesso(res, sanitizarUsuario(usuario));
  }),

  listarPendentes: asyncHandler(async (req, res) => {
    const pendentes = await UsuarioModel.listarPendentes();
    return sucesso(res, pendentes);
  }),

  listarTodos: asyncHandler(async (req, res) => {
    const { status, tipo } = req.query;
    const usuarios = await UsuarioModel.listarTodos({ status, tipo });
    return sucesso(res, usuarios);
  }),

  atualizarStatus: asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!['aprovado', 'rejeitado', 'pendente', 'bloqueado', 'dispensado'].includes(status)) {
      return requisicaoInvalida(res, 'Status inválido.');
    }

    const existente = await UsuarioModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Usuário não encontrado.');

    const usuario = await UsuarioModel.atualizarStatus(req.params.id, status);
    return sucesso(res, sanitizarUsuario(usuario), 'Status atualizado.');
  }),

  /** [ADMIN/DIRETORIA] Altera o tipo/cargo de um usuário */
  atualizarCargo: asyncHandler(async (req, res) => {
    const { tipo } = req.body;
    if (!['admin', 'diretoria', 'rh', 'motorista'].includes(tipo)) {
      return requisicaoInvalida(res, 'Cargo inválido. Use: admin, diretoria, rh ou motorista.');
    }

    const existente = await UsuarioModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Usuário não encontrado.');

    await UsuarioModel.atualizarCargo(req.params.id, tipo);
    const usuario = await UsuarioModel.buscarPorId(req.params.id);
    return sucesso(res, sanitizarUsuario(usuario), 'Cargo atualizado com sucesso.');
  }),

  excluir: asyncHandler(async (req, res) => {
    const existente = await UsuarioModel.buscarPorId(req.params.id);
    if (!existente) return naoEncontrado(res, 'Usuário não encontrado.');

    await UsuarioModel.excluir(req.params.id);
    return sucesso(res, null, 'Usuário removido com sucesso.');
  })
};

module.exports = AuthController;
