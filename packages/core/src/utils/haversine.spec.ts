import { calcularDistanciaMetros, estaNoRaio } from "./haversine";

// Known reference: Eiffel Tower → Notre-Dame Cathedral ≈ 2860 m (straight line)
const EIFFEL = { latitude: 48.8584, longitude: 2.2945 };
const NOTRE_DAME = { latitude: 48.853, longitude: 2.3499 };

describe("calcularDistanciaMetros", () => {
  it("returns 0 for the same point", () => {
    expect(calcularDistanciaMetros(EIFFEL, EIFFEL)).toBe(0);
  });

  it("is symmetric — a→b equals b→a", () => {
    const ab = calcularDistanciaMetros(EIFFEL, NOTRE_DAME);
    const ba = calcularDistanciaMetros(NOTRE_DAME, EIFFEL);
    expect(ab).toBeCloseTo(ba, 5);
  });

  it("returns ~4100 m between Eiffel Tower and Notre-Dame (±100 m)", () => {
    const dist = calcularDistanciaMetros(EIFFEL, NOTRE_DAME);
    expect(dist).toBeGreaterThan(4000);
    expect(dist).toBeLessThan(4200);
  });

  it("returns ~111 km per degree of latitude at equator", () => {
    const a = { latitude: 0, longitude: 0 };
    const b = { latitude: 1, longitude: 0 };
    const dist = calcularDistanciaMetros(a, b);
    // 1° lat ≈ 110,574 m
    expect(dist).toBeGreaterThan(110_000);
    expect(dist).toBeLessThan(111_200);
  });

  it("handles antipodal points without NaN (returns ~20,000 km)", () => {
    const north = { latitude: 90, longitude: 0 };
    const south = { latitude: -90, longitude: 0 };
    const dist = calcularDistanciaMetros(north, south);
    expect(Number.isFinite(dist)).toBe(true);
    expect(dist).toBeGreaterThan(19_000_000);
    expect(dist).toBeLessThan(21_000_000);
  });
});

describe("estaNoRaio", () => {
  it("returns true when the two points are the same (distance = 0)", () => {
    expect(estaNoRaio(EIFFEL, EIFFEL, 0)).toBe(true);
  });

  it("returns true when point is within radius", () => {
    // ~4097 m apart, give 5000 m radius
    expect(estaNoRaio(EIFFEL, NOTRE_DAME, 5000)).toBe(true);
  });

  it("returns false when point is outside radius", () => {
    // ~4097 m apart, give 1000 m radius
    expect(estaNoRaio(EIFFEL, NOTRE_DAME, 1000)).toBe(false);
  });

  it("returns true when point is exactly on the boundary (distance === raio)", () => {
    const dist = calcularDistanciaMetros(EIFFEL, NOTRE_DAME);
    expect(estaNoRaio(EIFFEL, NOTRE_DAME, dist)).toBe(true);
  });
});
