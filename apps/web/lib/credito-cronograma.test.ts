import assert from "node:assert/strict";
import {
  gerarCronogramaPagamento,
  resumirCronograma,
} from "@imbobi/core";

const cronograma = gerarCronogramaPagamento({
  valorPrincipal: 100_000,
  taxaMensalDecimal: 0.0099,
  prazoMeses: 12,
  dataInicio: "2026-01-15",
});

assert.equal(cronograma.length, 12, "deve gerar 12 parcelas");
assert.equal(cronograma[0].parcela, 1);
assert.ok(cronograma[0].pagamento > cronograma[0].amortizacao, "pagamento inclui juros");
assert.equal(cronograma[11].saldoDevedor, 0, "última parcela zera saldo");

const comPagas = gerarCronogramaPagamento({
  valorPrincipal: 50_000,
  taxaMensalDecimal: 0.01,
  prazoMeses: 6,
  dataInicio: "2026-01-01",
  parcelasPagas: { 1: "2026-02-15", 2: "2026-03-15" },
});
assert.equal(comPagas.filter((p) => p.status === "PAGO").length, 2);

const resumo = resumirCronograma(comPagas);
assert.ok(resumo.totalPago > 0);
assert.equal(resumo.parcelasPagas, 2);
assert.equal(resumo.parcelasPendentes, 4);

assert.deepEqual(
  gerarCronogramaPagamento({
    valorPrincipal: 0,
    taxaMensalDecimal: 0.01,
    prazoMeses: 12,
  }),
  [],
);

console.log("credito-cronograma.test.ts — OK");
