"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OBSERVACAO_CONDICOES_SIMULACAO = exports.PRAZO_MAX_SIMULACAO_CREDITO_MESES = exports.PRAZO_MIN_SIMULACAO_CREDITO_MESES = exports.TAXA_MENSAL_SIMULACAO_CREDITO = exports.TAXA_ANUAL_SIMULACAO_CREDITO_PERCENTUAL = exports.TAXA_ANUAL_SIMULACAO_CREDITO = void 0;
exports.calcularParcelaPrice = calcularParcelaPrice;
exports.calcularCustoTotal = calcularCustoTotal;
exports.simularCredito = simularCredito;
exports.TAXA_ANUAL_SIMULACAO_CREDITO = 0.21;
exports.TAXA_ANUAL_SIMULACAO_CREDITO_PERCENTUAL = exports.TAXA_ANUAL_SIMULACAO_CREDITO * 100;
exports.TAXA_MENSAL_SIMULACAO_CREDITO = Math.pow(1 + exports.TAXA_ANUAL_SIMULACAO_CREDITO, 1 / 12) - 1;
exports.PRAZO_MIN_SIMULACAO_CREDITO_MESES = 12;
exports.PRAZO_MAX_SIMULACAO_CREDITO_MESES = 48;
exports.OBSERVACAO_CONDICOES_SIMULACAO = "Um colaborador IMOBI pode melhorar as condições de taxa e parcelamento após analisar o seu projeto.";
/**
 * Calcula parcela Price (SAC seria outra função).
 * Retorna parcela mensal em R$.
 */
function calcularParcelaPrice(valorPrincipal, taxaMensalDecimal, prazoMeses) {
    if (!prazoMeses)
        return 0;
    if (taxaMensalDecimal === 0)
        return valorPrincipal / prazoMeses;
    const fator = Math.pow(1 + taxaMensalDecimal, prazoMeses) /
        (Math.pow(1 + taxaMensalDecimal, prazoMeses) - 1);
    return valorPrincipal * taxaMensalDecimal * fator;
}
function calcularCustoTotal(parcela, prazoMeses, valorPrincipal) {
    return parcela * prazoMeses - valorPrincipal;
}
function simularCredito(valorSolicitado, taxaMensalDecimal, prazoMeses) {
    const parcelaMensal = calcularParcelaPrice(valorSolicitado, taxaMensalDecimal, prazoMeses);
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
        observacao: exports.OBSERVACAO_CONDICOES_SIMULACAO,
    };
}
