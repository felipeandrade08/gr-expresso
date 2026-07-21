// =====================================================================
// FELIPINHO LAUNCHER - Rotas: Integrações (Telemetria ETS2, TrucksBook, Trucky)
// =====================================================================

const express = require('express');
const router = express.Router();
const IntegracaoController = require('../controllers/IntegracaoController');

router.get('/', IntegracaoController.listar);
router.get('/:nome', IntegracaoController.buscarPorNome);
router.put('/:nome', IntegracaoController.atualizarConfiguracao);
router.post('/:nome/sincronizar', IntegracaoController.sincronizar);

module.exports = router;
