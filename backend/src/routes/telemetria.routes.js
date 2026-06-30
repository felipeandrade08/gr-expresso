// =====================================================================
// GR EXPRESSO - Rotas: Telemetria (integração real com o Launcher ETS2)
// Todas exigem usuário autenticado (motorista ou admin) — já garantido
// pelo middleware global aplicado em routes/index.js.
// =====================================================================

const express = require('express');
const router = express.Router();
const TelemetriaController = require('../controllers/TelemetriaController');

router.get('/online', TelemetriaController.listarOnline);
router.get('/meu-status', TelemetriaController.meuStatus);

router.post('/heartbeat', TelemetriaController.heartbeat);
router.post('/viagem/inicio', TelemetriaController.iniciarViagem);
router.post('/viagem/:id/fim', TelemetriaController.finalizarViagem);
router.post('/viagem/:id/nota-fiscal', TelemetriaController.emitirNotaFiscal);
router.post('/abastecimento', TelemetriaController.registrarAbastecimento);
router.post('/multa', TelemetriaController.registrarMulta);
router.post('/manutencao', TelemetriaController.registrarAlertaManutencao);
router.post('/manutencao-servico', TelemetriaController.registrarManutencaoServico);
router.post('/desconectar', TelemetriaController.desconectar);

module.exports = router;
