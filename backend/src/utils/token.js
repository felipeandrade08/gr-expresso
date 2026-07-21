// =====================================================================
// FELIPINHO LAUNCHER - Utilitário de tokens JWT
// =====================================================================

const jwt = require('jsonwebtoken');

// Em produção, defina JWT_SECRET no .env. Como fallback para não travar
// instalações que ainda não configuraram isso, usamos um valor padrão —
// mas isso deve ser trocado em um ambiente de produção real.
const SEGREDO = process.env.JWT_SECRET || 'gr-expresso-segredo-padrao-trocar-em-producao';
const EXPIRACAO = '7d';

function gerarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      tipo: usuario.tipo,
      motorista_id: usuario.motorista_id || null
    },
    SEGREDO,
    { expiresIn: EXPIRACAO }
  );
}

function verificarToken(token) {
  return jwt.verify(token, SEGREDO);
}

module.exports = { gerarToken, verificarToken };
