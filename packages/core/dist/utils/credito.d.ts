/**
 * Calcula parcela Price (SAC seria outra função).
 * Retorna parcela mensal em R$.
 */
export declare function calcularParcelaPrice(valorPrincipal: number, taxaMensalDecimal: number, prazoMeses: number): number;
export declare function calcularCustoTotal(parcela: number, prazoMeses: number, valorPrincipal: number): number;
export interface SimulacaoResult {
    parcelaMensal: number;
    totalPago: number;
    totalJuros: number;
    cet: number;
}
export declare function simularCredito(valorSolicitado: number, taxaMensalDecimal: number, prazoMeses: number): SimulacaoResult;
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
/** Amortização constante (SAC simplificado) — fonte única web + API. */
export declare function gerarCronogramaPagamento(input: GerarCronogramaInput): CronogramaParcela[];
export interface CronogramaResumo {
    totalPago: number;
    totalPendente: number;
    totalJuros: number;
    parcelasPagas: number;
    parcelasPendentes: number;
}
export declare function resumirCronograma(cronograma: CronogramaParcela[]): CronogramaResumo;
