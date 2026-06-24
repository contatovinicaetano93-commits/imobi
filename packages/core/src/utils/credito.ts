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

export type CronogramaParcelaStatus = "PAGO" | "PENDENTE" | "ATRASADO";

export interface CronogramaParcela {
  parcela: number;
  dataVencimento: string;
  saldoInicial: number;
  juros: number;
  amortizacao: number;
  pagamento: number;
  saldoDevedor: number;
  dataPagamento?: string;
  status: CronogramaParcelaStatus;
}

export interface GerarCronogramaInput {
  valorPrincipal: number;
  taxaMensalDecimal: number;
  prazoMeses: number;
  dataInicio?: string | Date;
  /** Número da parcela → data de pagamento ISO (yyyy-mm-dd). */
  parcelasPagas?: Record<number, string>;
}

function roundMoeda(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Amortização constante (SAC simplificado) — fonte única web + API. */
export function gerarCronogramaPagamento(input: GerarCronogramaInput): CronogramaParcela[] {
  const { valorPrincipal, taxaMensalDecimal, prazoMeses, dataInicio, parcelasPagas } = input;
  if (prazoMeses <= 0 || valorPrincipal <= 0) return [];

  const dataBase = dataInicio ? new Date(dataInicio) : new Date();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const amortizacaoFixa = valorPrincipal / prazoMeses;
  let saldoDevedor = valorPrincipal;
  const cronograma: CronogramaParcela[] = [];

  for (let parcela = 1; parcela <= prazoMeses; parcela++) {
    const dataVencimento = new Date(dataBase);
    dataVencimento.setMonth(dataBase.getMonth() + parcela);
    dataVencimento.setHours(0, 0, 0, 0);

    const saldoInicial = saldoDevedor;
    const juros = saldoInicial * taxaMensalDecimal;
    const amortizacao = Math.min(amortizacaoFixa, saldoInicial);
    const pagamento = amortizacao + juros;
    saldoDevedor = Math.max(0, saldoInicial - amortizacao);

    const dataPagamento = parcelasPagas?.[parcela];
    let status: CronogramaParcelaStatus = "PENDENTE";
    if (dataPagamento) status = "PAGO";
    else if (dataVencimento < hoje) status = "ATRASADO";

    cronograma.push({
      parcela,
      dataVencimento: dataVencimento.toISOString().slice(0, 10),
      saldoInicial: roundMoeda(saldoInicial),
      juros: roundMoeda(juros),
      amortizacao: roundMoeda(amortizacao),
      pagamento: roundMoeda(pagamento),
      saldoDevedor: roundMoeda(saldoDevedor),
      ...(dataPagamento ? { dataPagamento } : {}),
      status,
    });
  }

  return cronograma;
}

export interface CronogramaResumo {
  totalPago: number;
  totalPendente: number;
  totalJuros: number;
  parcelasPagas: number;
  parcelasPendentes: number;
}

export function resumirCronograma(cronograma: CronogramaParcela[]): CronogramaResumo {
  const pagas = cronograma.filter((p) => p.status === "PAGO");
  const pendentes = cronograma.filter((p) => p.status !== "PAGO");
  return {
    totalPago: roundMoeda(pagas.reduce((sum, p) => sum + p.pagamento, 0)),
    totalPendente: roundMoeda(pendentes.reduce((sum, p) => sum + p.pagamento, 0)),
    totalJuros: roundMoeda(cronograma.reduce((sum, p) => sum + p.juros, 0)),
    parcelasPagas: pagas.length,
    parcelasPendentes: pendentes.length,
  };
}
