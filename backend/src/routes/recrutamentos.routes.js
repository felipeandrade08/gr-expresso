// =====================================================================
// FELIPINHO LAUNCHER - Rotas: Recrutamentos
// =====================================================================

const express = require('express');
const router = express.Router();
const RecrutamentoController = require('../controllers/RecrutamentoController');
const { exigirAutenticacao, exigirAdminOuRH } = require('../middlewares/autenticacao');

// Público — motorista envia formulário antes de criar conta
router.post('/', RecrutamentoController.submeter);

// Protegidas — admin ou RH
router.get('/', exigirAutenticacao, exigirAdminOuRH, RecrutamentoController.listar);
router.patch('/:id/status', exigirAutenticacao, exigirAdminOuRH, RecrutamentoController.atualizarStatus);

module.exports = router;
