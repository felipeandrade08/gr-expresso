// =====================================================================
// GR EXPRESSO - Rotas: Motoristas
// =====================================================================

const express = require('express');
const router  = express.Router();
const MotoristaController = require('../controllers/MotoristaController');
const RankingController   = require('../controllers/RankingController');
const { exigirAutenticacao, exigirAdmin, exigirAdminOuRH } = require('../middlewares/autenticacao');

// Acessível a qualquer usuário autenticado (admin ou motorista)
router.get('/hall-da-fama',               RankingController.hallDaFama);
router.get('/ranking',                    MotoristaController.ranking);
router.get('/ranking/:id/eventos',        RankingController.historicoEventos);
router.get('/ranking/:id/evolucao',       RankingController.evolucaoMotorista);
router.get('/ranking/evolucao-geral',     RankingController.evolucaoGeral);
router.get('/ranking/:id/multas',         RankingController.multasMotorista);
router.get('/:id',                        MotoristaController.buscarPorId);

// Exclusivo de administrador
// IMPORTANTE: rotas estáticas com DELETE devem vir ANTES de router.delete('/:id')
// para que '/ranking' não seja capturado como um :id
router.delete('/ranking',  exigirAdmin, RankingController.zerarRanking);
router.delete('/ranking/:id', exigirAdmin, RankingController.zerarRankingMotorista);
router.get('/',    exigirAdmin, MotoristaController.listar);
router.post('/',   exigirAdmin, MotoristaController.criar);
router.put('/:id', exigirAdmin, MotoristaController.atualizar);
router.delete('/:id', exigirAdmin, MotoristaController.excluir);

// Foto de perfil — motorista pode atualizar a própria (autenticação exigida; backend valida ownership no futuro)
router.put('/:id/foto', MotoristaController.atualizarFoto);

// Admin pode registrar multa manual
router.post('/:id/multa', exigirAdmin, RankingController.multaManual);

module.exports = router;
