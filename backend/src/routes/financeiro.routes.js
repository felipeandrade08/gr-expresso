// =====================================================================
// GR EXPRESSO - Rotas: Financeiro
// =====================================================================

const express = require('express');
const router = express.Router();
const FinanceiroController = require('../controllers/FinanceiroController');

router.get('/resumo', FinanceiroController.resumo);
router.get('/fluxo-por-mes', FinanceiroController.fluxoPorMes);
router.get('/', FinanceiroController.listar);
router.get('/:id', FinanceiroController.buscarPorId);
router.post('/', FinanceiroController.criar);
router.put('/:id', FinanceiroController.atualizar);
router.delete('/:id', FinanceiroController.excluir);

module.exports = router;
