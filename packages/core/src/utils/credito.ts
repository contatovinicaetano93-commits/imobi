export const TAXA_ANUAL_SIMULACAO_CREDITO = 0.21;
export const TAXA_ANUAL_SIMULACAO_CREDITO_PERCENTUAL = TAXA_ANUAL_SIMULACAO_CREDITO * 100;
export const TAXA_MENSAL_SIMULACAO_CREDITO =
  Math.pow(1 + TAXA_ANUAL_SIMULACAO_CREDITO, 1 / 12) - 1;
export const PRAZO_MIN_SIMULACAO_CREDITO_MESES = 12;
export const PRAZO_MAX_SIMULACAO_CREDITO_MESES = 48;
export const OBSERVACAO_CONDICOES_SIMULACAO =
  "Um colaborador IMOBI pode melhorar as condições de taxa e parcelamento após analisar o seu projeto.";

/**
 * Calcula parcela Price (SAC seria outra função).
 * Retorna parcela mensal em R$.
 */
export function calcularParcelaPrice(
  valorPrincipal: number,
  taxaMensalDecimal: number,
  prazoMeses: number
): number {
  if (!prazoMeses) return 0;
  if (taxaMensalDecimal === 0) return valorPrincipal / prazoMeses;
  const fator =
    Math.pow(1 + taxaMensalDecimal, prazoMeses) /
    (Math.pow(1 + taxaMensalDecimal, prazoMeses) - 1);
  return valorPrincipal * taxaMensalDecimal * fator;
}

export function calcularCustoTotal(
  parcela: number,
  prazoMeses: number,
  valorPrincipal: number
): number {
  return parcela * prazoMeses - valorPrincipal;
}

export interface SimulacaoResult {
  taxaMensal: number;
  taxaAnual: number;
  parcelaMensal: number;
  totalPago: number;
  totalJuros: number;
  cet: number;
  observacao: string;
}

export function simularCredito(
  valorSolicitado: number,
  taxaMensalDecimal: number,
  prazoMeses: number
): SimulacaoResult {
  const parcelaMensal = calcularParcelaPrice(
    valorSolicitado,
    taxaMensalDecimal,
    prazoMeses
  );
  const totalPago = parcelaMensal * prazoMeses;
  const totalJuros = calcularCustoTotal(parcelaMensal, prazoMeses, valorSolicitado);
  const cet = (Math.pow(totalPago / valorSolicitado, 12 / prazoMeses) - 1) * 100;

  return {
    taxaMensal: taxaMensalDecimal,
    taxaAnual: (Math.pow(1 + taxaMensalDecimal, 12) - 1) * 100,
    parcelaMensal,
    totalPago,
    totalJuros,
    cet,
    observacao: OBSERVACAO_CONDICOES_SIMULACAO,
  };
}
