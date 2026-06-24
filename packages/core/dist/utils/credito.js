"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcularParcelaPrice = calcularParcelaPrice;
exports.calcularCustoTotal = calcularCustoTotal;
exports.simularCredito = simularCredito;
exports.gerarCronogramaPagamento = gerarCronogramaPagamento;
exports.resumirCronograma = resumirCronograma;
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
    return { parcelaMensal, totalPago, totalJuros, cet };
}
function roundMoeda(value) {
    return Math.round(value * 100) / 100;
}
/** Amortização constante (SAC simplificado) — fonte única web + API. */
function gerarCronogramaPagamento(input) {
    const { valorPrincipal, taxaMensalDecimal, prazoMeses, dataInicio, parcelasPagas } = input;
    if (prazoMeses <= 0 || valorPrincipal <= 0)
        return [];
    const dataBase = dataInicio ? new Date(dataInicio) : new Date();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amortizacaoFixa = valorPrincipal / prazoMeses;
    let saldoDevedor = valorPrincipal;
    const cronograma = [];
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
        let status = "PENDENTE";
        if (dataPagamento)
            status = "PAGO";
        else if (dataVencimento < hoje)
            status = "ATRASADO";
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
function resumirCronograma(cronograma) {
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
