// =====================================================================
// FELIPINHO LAUNCHER - Geração de códigos sequenciais (VG-0001, NF-100001...)
// =====================================================================

/**
 * Gera o próximo código sequencial baseado no último valor numérico encontrado.
 * @param {string} prefixo - ex: 'VG-', 'NF-'
 * @param {string|null} ultimoCodigo - ex: 'VG-0007'
 * @param {number} tamanho - quantidade de dígitos do número (padrão 4)
 */
function proximoCodigo(prefixo, ultimoCodigo, tamanho = 4) {
  let proximoNumero = 1;

  if (ultimoCodigo) {
    const numeroAtual = parseInt(ultimoCodigo.replace(prefixo, ''), 10);
    if (!Number.isNaN(numeroAtual)) {
      proximoNumero = numeroAtual + 1;
    }
  }

  return `${prefixo}${String(proximoNumero).padStart(tamanho, '0')}`;
}

module.exports = { proximoCodigo };
