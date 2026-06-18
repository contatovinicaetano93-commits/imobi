const FEE_ESTRUTURACAO = 0.03;
const FEE_TRANCHE = 0.07;

// Matriz taxa mensal (%) por faixa de score e prazo em meses
const TAXA_MATRIX: { scoreMin: number; scoreMax: number; taxas: number[] }[] = [
  { scoreMin: 800, scoreMax: 1000, taxas: [1.40, 1.50, 1.60, 1.70] },
  { scoreMin: 600, scoreMax: 799,  taxas: [1.55, 1.65, 1.70, 1.75] },
  { scoreMin: 400, scoreMax: 599,  taxas: [1.70, 1.75, 1.80, 1.85] },
  { scoreMin: 200, scoreMax: 399,  taxas: [1.85, 1.85, 1.85, 1.85] },
];

function prazoIndex(prazoMeses: number): number {
  if (prazoMeses <= 12) return 0;
  if (prazoMeses <= 24) return 1;
  if (prazoMeses <= 36) return 2;
  return 3;
}

export function calcularTaxaPorScoreEPrazo(
  score: number,
  prazoMeses: number,
): number | null {
  const idx = prazoIndex(prazoMeses);
  for (const faixa of TAXA_MATRIX) {
    if (score >= faixa.scoreMin && score <= faixa.scoreMax) {
      return faixa.taxas[idx] / 100;
    }
  }
  return null; // score < 200 = reprovado
}

export function calcularParcelaPrice(
  valorPrincipal: number,
  taxaMensalDecimal: number,
  prazoMeses: number,
): number {
  if (!prazoMeses) return 0;
  if (taxaMensalDecimal === 0) return valorPrincipal / prazoMeses;
  const fator =
    Math.pow(1 + taxaMensalDecimal, prazoMeses) /
    (Math.pow(1 + taxaMensalDecimal, prazoMeses) - 1);
  return valorPrincipal * taxaMensalDecimal * fator;
}

export interface SimulacaoResult {
  // Taxas aplicadas
  taxaMensalDecimal: number;
  taxaMensalPercent: number;
  // Fees
  feeEstruturacao: number;
  feeEstruturacaoPercent: number;
  // Valores
  valorSolicitado: number;
  parcelaMensal: number;
  totalPago: number;
  totalJuros: number;
  cetAnual: number;
  // Exemplo por tranche (assumindo 5 tranches iguais)
  exemploTranche: {
    valorBruto: number;
    feeTranche7pct: number;
    valorLiquidoRecebido: number;
  };
  // Aviso seguro
  avisoSeguro: string;
}

export function simularCredito(
  valorSolicitado: number,
  taxaMensalDecimal: number,
  prazoMeses: number,
): SimulacaoResult {
  const feeEstruturacao = valorSolicitado * FEE_ESTRUTURACAO;
  const parcelaMensal = calcularParcelaPrice(valorSolicitado, taxaMensalDecimal, prazoMeses);
  const totalPago = parcelaMensal * prazoMeses;
  const totalJuros = totalPago - valorSolicitado;
  const cetAnual = (Math.pow(totalPago / valorSolicitado, 12 / prazoMeses) - 1) * 100;

  const valorTranche = valorSolicitado / 5;
  const feeTranche7pct = valorTranche * FEE_TRANCHE;

  return {
    taxaMensalDecimal,
    taxaMensalPercent: taxaMensalDecimal * 100,
    feeEstruturacao,
    feeEstruturacaoPercent: FEE_ESTRUTURACAO * 100,
    valorSolicitado,
    parcelaMensal,
    totalPago,
    totalJuros,
    cetAnual,
    exemploTranche: {
      valorBruto: valorTranche,
      feeTranche7pct,
      valorLiquidoRecebido: valorTranche - feeTranche7pct,
    },
    avisoSeguro:
      "Seguro de obra obrigatório (+1% a.m. sobre o saldo devedor) — apólice a contratar separadamente.",
  };
}

export function calcularFeesTranche(valorBruto: number): {
  feeTranche: number;
  valorLiquido: number;
} {
  const feeTranche = valorBruto * FEE_TRANCHE;
  return { feeTranche, valorLiquido: valorBruto - feeTranche };
}
