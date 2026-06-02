"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcularParcelaPrice = calcularParcelaPrice;
exports.calcularCustoTotal = calcularCustoTotal;
exports.simularCredito = simularCredito;
/**
 * Calcula parcela Price (SAC seria outra função).
 * Retorna parcela mensal em R$.
 */
function calcularParcelaPrice(valorPrincipal, taxaMensalDecimal, prazoMeses) {
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
    return { parcelaMensal, totalPago, totalJuros, cet };
}
