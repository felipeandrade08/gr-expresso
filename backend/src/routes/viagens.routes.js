// =====================================================================
// GR EXPRESSO - Rotas: Viagens
// =====================================================================

const express = require('express');
const router = express.Router();
const ViagemController = require('../controllers/ViagemController');

router.get('/mapa', ViagemController.mapaEntregas);
router.get('/', ViagemController.listar);
router.get('/:id', ViagemController.buscarPorId);
router.post('/', ViagemController.criar);
router.put('/:id', ViagemController.atualizar);
router.patch('/:id/status', ViagemController.atualizarStatus);
router.delete('/:id', ViagemController.excluir);

module.exports = router;
