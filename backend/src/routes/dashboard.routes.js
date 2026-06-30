// =====================================================================
// GR EXPRESSO - Rotas: Dashboard
// =====================================================================

const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');

router.get('/resumo', DashboardController.resumoCompleto);
router.get('/indicadores', DashboardController.indicadores);
router.get('/faturamento-por-mes', DashboardController.faturamentoPorMes);
router.get('/viagens-por-status', DashboardController.viagensPorStatus);
router.get('/ultimas-viagens', DashboardController.ultimasViagens);
router.get('/top-motoristas', DashboardController.topMotoristas);
router.get('/alertas', DashboardController.alertas);

module.exports = router;
