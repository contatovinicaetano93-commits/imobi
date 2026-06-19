import {
  calcularParcelaPrice,
  calcularCustoTotal,
  simularCredito,
} from "./credito";

describe("calcularParcelaPrice", () => {
  it("returns 0 when prazoMeses is 0", () => {
    expect(calcularParcelaPrice(100_000, 0.01, 0)).toBe(0);
  });

  it("divides principal evenly when taxa is 0 (interest-free)", () => {
    const parcela = calcularParcelaPrice(120_000, 0, 12);
    expect(parcela).toBeCloseTo(10_000, 5);
  });

  it("computes correct Price amortization parcela at 1% for 12 months", () => {
    // Known formula result: 100000 * 0.01 * (1.01^12) / (1.01^12 - 1)
    const parcela = calcularParcelaPrice(100_000, 0.01, 12);
    // ≈ 8884.88
    expect(parcela).toBeGreaterThan(8880);
    expect(parcela).toBeLessThan(8890);
  });

  it("returns larger parcela for higher taxa at same prazo", () => {
    const low = calcularParcelaPrice(100_000, 0.005, 24);
    const high = calcularParcelaPrice(100_000, 0.02, 24);
    expect(high).toBeGreaterThan(low);
  });

  it("returns larger parcela for shorter prazo at same taxa", () => {
    const long = calcularParcelaPrice(100_000, 0.01, 36);
    const short = calcularParcelaPrice(100_000, 0.01, 12);
    expect(short).toBeGreaterThan(long);
  });

  it("result is finite and positive for typical inputs", () => {
    const parcela = calcularParcelaPrice(200_000, 0.015, 120);
    expect(Number.isFinite(parcela)).toBe(true);
    expect(parcela).toBeGreaterThan(0);
  });
});

describe("calcularCustoTotal", () => {
  it("returns 0 when parcela * prazo equals principal (zero-interest edge case)", () => {
    expect(calcularCustoTotal(10_000, 12, 120_000)).toBe(0);
  });

  it("returns correct total juros for a given parcela", () => {
    // parcela=8884.88, prazo=12, principal=100000 → juros ≈ 6618.56
    const juros = calcularCustoTotal(8884.88, 12, 100_000);
    expect(juros).toBeCloseTo(6618.56, 1);
  });

  it("is always non-negative for valid loan parameters", () => {
    const parcela = calcularParcelaPrice(50_000, 0.01, 24);
    const juros = calcularCustoTotal(parcela, 24, 50_000);
    expect(juros).toBeGreaterThanOrEqual(0);
  });
});

describe("simularCredito", () => {
  it("returns an object with the expected four fields", () => {
    const result = simularCredito(100_000, 0.01, 12);
    expect(result).toHaveProperty("parcelaMensal");
    expect(result).toHaveProperty("totalPago");
    expect(result).toHaveProperty("totalJuros");
    expect(result).toHaveProperty("cet");
  });

  it("totalPago equals parcelaMensal * prazoMeses", () => {
    const result = simularCredito(100_000, 0.01, 12);
    expect(result.totalPago).toBeCloseTo(result.parcelaMensal * 12, 5);
  });

  it("totalJuros equals totalPago minus valorSolicitado", () => {
    const result = simularCredito(100_000, 0.01, 12);
    expect(result.totalJuros).toBeCloseTo(result.totalPago - 100_000, 5);
  });

  it("cet is positive for non-zero taxa", () => {
    const result = simularCredito(100_000, 0.01, 12);
    expect(result.cet).toBeGreaterThan(0);
  });

  it("cet is 0 when taxa is 0 (no interest cost)", () => {
    const result = simularCredito(100_000, 0, 12);
    expect(result.cet).toBeCloseTo(0, 5);
  });

  it("higher taxa produces higher cet", () => {
    const low = simularCredito(100_000, 0.005, 24);
    const high = simularCredito(100_000, 0.02, 24);
    expect(high.cet).toBeGreaterThan(low.cet);
  });

  it("all numeric fields are finite", () => {
    const result = simularCredito(200_000, 0.015, 120);
    expect(Number.isFinite(result.parcelaMensal)).toBe(true);
    expect(Number.isFinite(result.totalPago)).toBe(true);
    expect(Number.isFinite(result.totalJuros)).toBe(true);
    expect(Number.isFinite(result.cet)).toBe(true);
  });
});
