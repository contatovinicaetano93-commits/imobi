import { calcularParcelaPrice, calcularCustoTotal, simularCredito } from "./credito";

describe("calcularParcelaPrice", () => {
  it("taxa zero → divide valor pelo prazo", () => {
    expect(calcularParcelaPrice(120_000, 0, 12)).toBeCloseTo(10_000);
  });

  it("prazo zero → retorna 0 sem explodir", () => {
    expect(calcularParcelaPrice(500_000, 0.01, 0)).toBe(0);
  });

  it("PMT clássico: R$100k a 1% a.m. por 12 meses ≈ R$8885", () => {
    expect(calcularParcelaPrice(100_000, 0.01, 12)).toBeCloseTo(8884.88, 0);
  });

  it("PMT referência: R$5M a 8.5% a.a. (0.68% a.m.) por 24 meses", () => {
    const taxaMensal = 8.5 / 100 / 12;
    const parcela = calcularParcelaPrice(5_000_000, taxaMensal, 24);
    expect(parcela).toBeGreaterThan(220_000);
    expect(parcela).toBeLessThan(240_000);
  });

  it("valor máximo IMOBI (R$500M) não produz Infinity", () => {
    const taxaMensal = 8.5 / 100 / 12;
    const parcela = calcularParcelaPrice(500_000_000, taxaMensal, 48);
    expect(Number.isFinite(parcela)).toBe(true);
    expect(parcela).toBeGreaterThan(0);
  });
});

describe("calcularCustoTotal", () => {
  it("juros = parcelas totais menos principal", () => {
    const parcela = calcularParcelaPrice(100_000, 0.01, 12);
    const juros = calcularCustoTotal(parcela, 12, 100_000);
    expect(juros).toBeGreaterThan(0);
    expect(juros).toBeCloseTo(parcela * 12 - 100_000, 0);
  });
});

describe("simularCredito", () => {
  it("retorna campos completos", () => {
    const r = simularCredito(1_000_000, 0.01, 24);
    expect(r).toHaveProperty("parcelaMensal");
    expect(r).toHaveProperty("totalPago");
    expect(r).toHaveProperty("totalJuros");
    expect(r).toHaveProperty("cet");
    expect(r.totalPago).toBeGreaterThan(r.parcelaMensal);
    expect(r.totalJuros).toBeGreaterThan(0);
  });
});
