// =====================================================================
// GR EXPRESSO - Postos e Filiais Credenciados
//
// O motorista pode abastecer ou fazer manutenção NESSES locais sem
// receber penalidade. A verificação é feita por cidade E por nome do
// posto (ambos normalizados: sem acento, minúsculo, espaços colapsados).
//
// Para adicionar novos postos basta inserir na lista abaixo.
// =====================================================================

const REDE_CREDENCIADA = [
  // ── São Paulo ────────────────────────────────────────────────────
  { cidade: 'Americana',              posto: 'Posto 7' },
  { cidade: 'Araraquara',             posto: 'Posto Morada do Sol' },
  { cidade: 'Araraquara',             posto: 'Posto Kambuí' },
  { cidade: 'Catanduva',              posto: 'Filial SP',              filial: true },
  { cidade: 'Itapecerica da Serra',   posto: 'Posto Petrobras SP' },
  { cidade: 'Itapecerica da Serra',   posto: 'Posto Shell' },
  { cidade: 'Rio Claro',              posto: 'Posto Confiante' },
  { cidade: 'São José dos Campos',    posto: 'Posto Ale' },
  { cidade: 'Santos',                 posto: 'Posto Petrobras SP Santos' },
  { cidade: 'São Sebastião',          posto: 'Posto Frango Assado' },

  // ── Rio de Janeiro ───────────────────────────────────────────────
  { cidade: 'Petrópolis',             posto: 'Posto Brasão' },
  { cidade: 'Piraí',                  posto: 'Posto Mamão' },
  { cidade: 'Três Rios',              posto: 'Posto Ipirangão' },

  // ── Minas Gerais ─────────────────────────────────────────────────
  { cidade: 'Juiz de Fora',           posto: 'Posto Ipiranga MG' },
  { cidade: 'Nova Lima',              posto: 'Posto Chefão' },

  // ── Paraná ───────────────────────────────────────────────────────
  { cidade: 'Campina Grande do Sul',  posto: 'Posto O Cupim' },
  { cidade: 'Campina Grande do Sul',  posto: 'Posto Represa' },

  // ── Santa Catarina ───────────────────────────────────────────────
  { cidade: 'Joinville',              posto: 'Posto Petrobras SC' },

  // ── Mato Grosso do Sul ───────────────────────────────────────────
  { cidade: 'Chapadão do Sul',        posto: 'Auto Posto Mirante' },
  { cidade: 'Paranaíba',              posto: 'Posto Trevão' },
  { cidade: 'Ribas do Rio Pardo',     posto: 'Posto Mutum' },

  // ── Goiás ────────────────────────────────────────────────────────
  { cidade: 'Guapó',                  posto: 'Filial GO',              filial: true },
  { cidade: 'Itarumã',                posto: 'Posto Petrobras GO2' },
  { cidade: 'Posselândia',            posto: 'Posto Ipiranga GO1' },
  { cidade: 'Rio Verde',              posto: 'Posto Petrobras GO1' },
];

// -----------------------------------------------------------------------
// Normaliza string: remove acentos, minúsculo, colapsa espaços
// -----------------------------------------------------------------------
function normalizar(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Conjuntos pré-calculados para lookup O(1)
const _cidades = new Set(REDE_CREDENCIADA.map(e => normalizar(e.cidade)));
const _postos  = new Set(REDE_CREDENCIADA.map(e => normalizar(e.posto)));

/**
 * Verifica se um abastecimento é credenciado.
 * Aceita cidade e/ou nome do posto (qualquer um válido libera).
 *
 * @param {string|null} cidade   - Nome da cidade enviado pelo Launcher
 * @param {string|null} nomePosto - Nome do posto enviado pelo Launcher
 * @returns {{ credenciado: boolean, motivo: string }}
 */
function verificarCredenciamento(cidade, nomePosto) {
  const cidadeN = normalizar(cidade);
  const postoN  = normalizar(nomePosto);

  if (cidadeN && _cidades.has(cidadeN)) {
    return { credenciado: true, motivo: `Cidade credenciada: ${cidade}` };
  }

  if (postoN && _postos.has(postoN)) {
    return { credenciado: true, motivo: `Posto credenciado: ${nomePosto}` };
  }

  // Busca parcial: o Launcher às vezes manda "Posto Petrobras SP - km 42"
  for (const entry of REDE_CREDENCIADA) {
    if (postoN && postoN.includes(normalizar(entry.posto))) {
      return { credenciado: true, motivo: `Posto credenciado (parcial): ${entry.posto}` };
    }
    if (cidadeN && cidadeN.includes(normalizar(entry.cidade))) {
      return { credenciado: true, motivo: `Cidade credenciada (parcial): ${entry.cidade}` };
    }
  }

  return {
    credenciado: false,
    motivo: `Local não credenciado — cidade: "${cidade || '?'}", posto: "${nomePosto || '?'}"`,
  };
}

module.exports = { REDE_CREDENCIADA, verificarCredenciamento };
