// =====================================================================
// FELIPINHO LAUNCHER - Rotas: Manutenções
// =====================================================================

const express = require('express');
const router  = express.Router();
const C       = require('../controllers/ManutencaoController');

router.get('/filiais-credenciadas',  C.listarFiliaisCredenciadas);
router.get('/total-por-mes',         C.totalPorMes);
router.get('/pendentes',             C.listarPendentes);
router.get('/',                      C.listar);
router.get('/:id',                   C.buscarPorId);
router.post('/',                     C.criar);
router.delete('/:id',                C.excluir);

// Motorista preenche cidade + local de manutenção pendente
router.patch('/:id/resolver-pendente', C.resolverPendente);

// Admin regulariza (penaliza ou libera)
router.patch('/:id/regularizar',       C.regularizarPendente);

module.exports = router;
