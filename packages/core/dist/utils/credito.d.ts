export declare const TAXA_ANUAL_SIMULACAO_CREDITO = 0.21;
export declare const TAXA_ANUAL_SIMULACAO_CREDITO_PERCENTUAL: number;
export declare const TAXA_MENSAL_SIMULACAO_CREDITO: number;
export declare const PRAZO_MIN_SIMULACAO_CREDITO_MESES = 12;
export declare const PRAZO_MAX_SIMULACAO_CREDITO_MESES = 48;
export declare const OBSERVACAO_CONDICOES_SIMULACAO = "Um colaborador IMOBI pode melhorar as condi\u00E7\u00F5es de taxa e parcelamento ap\u00F3s analisar o seu projeto.";
/**
 * Calcula parcela Price (SAC seria outra função).
 * Retorna parcela mensal em R$.
 */
export declare function calcularParcelaPrice(valorPrincipal: number, taxaMensalDecimal: number, prazoMeses: number): number;
export declare function calcularCustoTotal(parcela: number, prazoMeses: number, valorPrincipal: number): number;
export interface SimulacaoResult {
    taxaMensal: number;
    taxaAnual: number;
    parcelaMensal: number;
    totalPago: number;
    totalJuros: number;
    cet: number;
    observacao: string;
}
export declare function simularCredito(valorSolicitado: number, taxaMensalDecimal: number, prazoMeses: number): SimulacaoResult;
