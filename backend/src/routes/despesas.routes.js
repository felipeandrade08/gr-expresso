// =====================================================================
// FELIPINHO LAUNCHER - Rotas: Despesas
// =====================================================================

const express = require('express');
const router = express.Router();
const DespesaController = require('../controllers/DespesaController');

router.get('/total-por-categoria', DespesaController.totalPorCategoria);
router.get('/', DespesaController.listar);
router.get('/:id', DespesaController.buscarPorId);
router.post('/', DespesaController.criar);
router.put('/:id', DespesaController.atualizar);
router.delete('/:id', DespesaController.excluir);

module.exports = router;
