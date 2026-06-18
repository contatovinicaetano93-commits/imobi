export declare function calcularTaxaPorScoreEPrazo(score: number, prazoMeses: number): number | null;
export declare function calcularParcelaPrice(valorPrincipal: number, taxaMensalDecimal: number, prazoMeses: number): number;
export interface SimulacaoResult {
    taxaMensalDecimal: number;
    taxaMensalPercent: number;
    feeEstruturacao: number;
    feeEstruturacaoPercent: number;
    valorSolicitado: number;
    parcelaMensal: number;
    totalPago: number;
    totalJuros: number;
    cetAnual: number;
    exemploTranche: {
        valorBruto: number;
        feeTranche7pct: number;
        valorLiquidoRecebido: number;
    };
    avisoSeguro: string;
}
export declare function simularCredito(valorSolicitado: number, taxaMensalDecimal: number, prazoMeses: number): SimulacaoResult;
export declare function calcularFeesTranche(valorBruto: number): {
    feeTranche: number;
    valorLiquido: number;
};
