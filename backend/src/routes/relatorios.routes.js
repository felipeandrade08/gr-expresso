// =====================================================================
// FELIPINHO LAUNCHER - Rotas: Relatórios Avançados
// =====================================================================

const express = require('express');
const router = express.Router();
const RelatorioController = require('../controllers/RelatorioController');

router.get('/desempenho-motoristas', RelatorioController.desempenhoMotoristas);
router.get('/custo-por-caminhao', RelatorioController.custoPorCaminhao);
router.get('/lucratividade', RelatorioController.lucratividade);
router.get('/rotas-frequentes', RelatorioController.rotasMaisFrequentes);

module.exports = router;
