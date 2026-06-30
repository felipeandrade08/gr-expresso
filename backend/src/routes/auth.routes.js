// =====================================================================
// GR EXPRESSO - Rotas: Autenticação
// =====================================================================

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { exigirAutenticacao, exigirAdmin, exigirDiretoriaOuAdmin, exigirAdminOuRH } = require('../middlewares/autenticacao');

// Públicas
router.post('/registrar', AuthController.registrar);
router.post('/login', AuthController.login);

// Autenticadas
router.get('/meu-perfil', exigirAutenticacao, AuthController.meuPerfil);

// Admin/Diretoria/RH — gestão de usuários
router.get('/usuarios', exigirAutenticacao, exigirAdminOuRH, AuthController.listarTodos);
router.get('/usuarios/pendentes', exigirAutenticacao, exigirAdminOuRH, AuthController.listarPendentes);
router.patch('/usuarios/:id/status', exigirAutenticacao, exigirAdminOuRH, AuthController.atualizarStatus);

// Somente Admin/Diretoria podem alterar cargo
router.patch('/usuarios/:id/cargo', exigirAutenticacao, exigirDiretoriaOuAdmin, AuthController.atualizarCargo);
router.delete('/usuarios/:id', exigirAutenticacao, exigirDiretoriaOuAdmin, AuthController.excluir);

module.exports = router;
