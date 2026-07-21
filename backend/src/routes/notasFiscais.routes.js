// =====================================================================
// FELIPINHO LAUNCHER - Rotas: Notas Fiscais
// =====================================================================

const express = require('express');
const router = express.Router();
const NotaFiscalController = require('../controllers/NotaFiscalController');

router.get('/', NotaFiscalController.listar);
router.get('/:id', NotaFiscalController.buscarPorId);
router.post('/', NotaFiscalController.criar);
router.put('/:id', NotaFiscalController.atualizar);
router.delete('/:id', NotaFiscalController.excluir);

module.exports = router;
