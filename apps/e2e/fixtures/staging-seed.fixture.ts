/**
 * IDs canônicos do `pnpm seed:staging:obra` (obra idempotente — estáveis entre runs).
 * Fallback quando a API staging está em rate limit durante a suite E2E completa.
 */
export const STAGING_OBRA_VISTORIA = {
  obraId: 'f3ab9bd7-4ae9-431c-afdc-b54f8c78dc2f',
  etapaId: '6143143c-bdca-4533-85b5-238415158bec',
  obraNome: 'Residencial Gralha Azul — Torre A',
  etapaNome: 'Estrutura',
} as const;
