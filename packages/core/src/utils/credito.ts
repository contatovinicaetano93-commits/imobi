/**
 * Calcula parcela Price (SAC seria outra função).
 * Retorna parcela mensal em R$.
 */
export function calcularParcelaPrice(
  valorPrincipal: number,
  taxaMensalDecimal: number,
  prazoMeses: number
): number {
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
  parcelaMensal: number;
  totalPago: number;
  totalJuros: number;
  cet: number;
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

  return { parcelaMensal, totalPago, totalJuros, cet };
}
