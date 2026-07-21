// =====================================================================
// FELIPINHO LAUNCHER - Índice central de rotas da API
// =====================================================================

const express = require('express');
const router = express.Router();
const { exigirAutenticacao, exigirAdmin, exigirAdminOuRH } = require('../middlewares/autenticacao');

// Rota de verificação de saúde da API (pública, sem autenticação)
router.get('/health', (req, res) => {
  res.json({ sucesso: true, mensagem: 'FELIPINHO LAUNCHER API está operacional.', timestamp: new Date().toISOString() });
});

// Rota pública de recrutamento (motoristas enviam antes de ter conta)
router.use('/recrutamentos', require('./recrutamentos.routes'));

// Rotas de autenticação (algumas públicas, outras autenticadas - ver auth.routes.js)
router.use('/auth', require('./auth.routes'));

// Rota pública de estatísticas para tela de login
router.get('/stats-publicas', async (req, res) => {
  try {
    const { pool } = require('../config/database');
    const [[viagens]] = await pool.query(`SELECT COUNT(*) AS total FROM viagens`);
    const [[motoristas]] = await pool.query(`SELECT COUNT(*) AS total FROM motoristas WHERE status = 'ativo'`);
    res.json({ sucesso: true, dados: { total_viagens: viagens.total, motoristas_ativos: motoristas.total } });
  } catch (e) {
    res.json({ sucesso: false, dados: { total_viagens: 0, motoristas_ativos: 0 } });
  }
});

// A partir daqui, todas as rotas exigem usuário autenticado e aprovado.
router.use(exigirAutenticacao);

// Módulos compartilhados entre admin e motorista
router.use('/viagens', require('./viagens.routes'));
router.use('/abastecimentos', require('./abastecimentos.routes'));
router.use('/manutencoes', require('./manutencoes.routes'));
router.use('/notificacoes', require('./notificacoes.routes'));
router.use('/notas-fiscais', require('./notasFiscais.routes'));
router.use('/motoristas', require('./motoristas.routes'));
router.use('/telemetria', require('./telemetria.routes'));

// Listagem de caminhões e reboques: qualquer usuário autenticado pode consultar
// (necessário para preencher selects em Nova Viagem e Novo Abastecimento).
// As operações de criação, edição e exclusão continuam protegidas por exigirAdminOuRH
// (registradas logo abaixo via router.use completo).
const CaminhaoController = require('../controllers/CaminhaoController');
const ReboqueController = require('../controllers/ReboqueController');
router.get('/caminhoes', CaminhaoController.listar);
router.get('/reboques', ReboqueController.listar);

// Módulos exclusivos de administrador/diretoria
router.use('/dashboard', exigirAdminOuRH, require('./dashboard.routes'));
router.use('/caminhoes', exigirAdminOuRH, require('./caminhoes.routes'));
router.use('/reboques', exigirAdminOuRH, require('./reboques.routes'));
router.use('/despesas', exigirAdminOuRH, require('./despesas.routes'));
router.use('/financeiro', exigirAdminOuRH, require('./financeiro.routes'));
router.use('/relatorios', exigirAdminOuRH, require('./relatorios.routes'));
router.use('/integracoes', exigirAdmin, require('./integracoes.routes'));

module.exports = router;
