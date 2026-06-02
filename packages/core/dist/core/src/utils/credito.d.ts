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
