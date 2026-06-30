const express = require('express');
const router  = express.Router();
const { NotificacaoController } = require('../controllers/NotificacaoController');

router.get('/stream',    NotificacaoController.stream);
router.get('/pendentes', NotificacaoController.contarPendentes);

module.exports = router;
