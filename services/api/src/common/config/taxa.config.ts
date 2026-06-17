/** Política de taxa IMOBI — simulação fixa 1,90%, comitê pode reduzir até 1,5% */
export const TAXA_MIN = 0.015;
export const TAXA_SIMULACAO = 0.019;
export const TAXA_MAX = TAXA_SIMULACAO;

export function getTaxaSimulacao(): number {
  return TAXA_SIMULACAO;
}

/** Simulação sempre usa a trava máxima */
export function getTaxaReferencia(): number {
  return TAXA_SIMULACAO;
}

export function clampTaxaAprovacao(taxa: number): number {
  return Math.min(TAXA_MAX, Math.max(TAXA_MIN, taxa));
}

export function getTaxaPolitica() {
  return {
    taxaSimulacao: TAXA_SIMULACAO,
    minAprovacao: TAXA_MIN,
    maxSimulacao: TAXA_MAX,
    faixaAprovacao: `${(TAXA_MIN * 100).toFixed(1)}% – ${(TAXA_MAX * 100).toFixed(2)}%`,
    mensagem:
      "Simulação trava em 1,90% a.m. O comitê pode aprovar com taxa menor, nunca maior.",
  };
}

/** Mantido por compatibilidade — retorna política (somente leitura) */
export function getTaxaFaixa() {
  const p = getTaxaPolitica();
  return {
    min: p.minAprovacao,
    max: p.maxSimulacao,
    atual: p.taxaSimulacao,
    padrao: p.taxaSimulacao,
    ...p,
  };
}
