// =====================================================================
// GR EXPRESSO - Rotas: Reboques
// =====================================================================

const express = require('express');
const router = express.Router();
const ReboqueController = require('../controllers/ReboqueController');

router.get('/', ReboqueController.listar);
router.get('/:id', ReboqueController.buscarPorId);
router.post('/', ReboqueController.criar);
router.put('/:id', ReboqueController.atualizar);
router.delete('/:id', ReboqueController.excluir);

module.exports = router;
