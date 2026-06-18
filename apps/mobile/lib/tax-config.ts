/**
 * Política de juros IMOBI:
 * - Simulação: trava fixa em 1,90% a.m. (pior cenário / parcela máxima)
 * - Comitê: pode aprovar com taxa menor, entre 1,5% e 1,90% a.m.
 */
export const TAXA_MIN = 0.015;
export const TAXA_SIMULACAO = 0.019;
export const TAXA_MAX = TAXA_SIMULACAO;

export function clampTaxaAprovacao(taxa: number): number {
  return Math.min(TAXA_MAX, Math.max(TAXA_MIN, taxa));
}

/** @deprecated use clampTaxaAprovacao */
export function clampTaxa(taxa: number): number {
  return clampTaxaAprovacao(taxa);
}

export function formatTaxaPercent(taxa: number): string {
  return `${(taxa * 100).toFixed(2).replace(".", ",")}% a.m.`;
}

export function formatTaxaSimulacao(): string {
  return formatTaxaPercent(TAXA_SIMULACAO);
}

export function formatTaxaFaixaAprovacao(): string {
  return `${(TAXA_MIN * 100).toFixed(1).replace(".", ",")}% – ${(TAXA_MAX * 100).toFixed(2).replace(".", ",")}% a.m.`;
}

export const MSG_TAXA_SIMULACAO =
  "Simulação na taxa máxima de 1,90% a.m. A taxa aprovada pelo comitê pode ser menor.";

export const MSG_TAXA_VARIA =
  "A taxa varia conforme análise de crédito (1,5% a 1,90% a.m.), mas sua parcela simulada nunca será maior que 1,90%.";
