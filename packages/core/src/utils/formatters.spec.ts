import {
  formatarBRL,
  formatarCPF,
  formatarTelefone,
  formatarCEP,
  formatarPercentual,
  formatarArea,
} from "./formatters";

describe("formatarBRL", () => {
  it("formats zero as R$ 0,00", () => {
    expect(formatarBRL(0)).toMatch(/R\$\s?0[,.]00/);
  });

  it("formats 1500 as R$ 1.500,00", () => {
    const result = formatarBRL(1500);
    expect(result).toContain("1");
    expect(result).toContain("500");
    expect(result).toContain("00");
  });

  it("formats negative value with minus sign", () => {
    const result = formatarBRL(-100);
    expect(result).toContain("-");
  });
});

describe("formatarCPF", () => {
  it("formats 11-digit CPF string correctly", () => {
    expect(formatarCPF("12345678901")).toBe("123.456.789-01");
  });
});

describe("formatarTelefone", () => {
  it("formats 11-digit mobile number (5 + 4)", () => {
    const result = formatarTelefone("11999998888");
    expect(result).toBe("(11) 99999-8888");
  });

  it("formats 10-digit landline number (4 + 4)", () => {
    const result = formatarTelefone("1133334444");
    expect(result).toBe("(11) 3333-4444");
  });
});

describe("formatarCEP", () => {
  it("formats 8-digit CEP with hyphen", () => {
    expect(formatarCEP("01310100")).toBe("01310-100");
  });
});

describe("formatarPercentual", () => {
  it("formats with 1 decimal by default", () => {
    expect(formatarPercentual(12.5)).toBe("12.5%");
  });

  it("respects custom decimal places", () => {
    expect(formatarPercentual(3.14159, 2)).toBe("3.14%");
  });

  it("formats integer as X.0%", () => {
    expect(formatarPercentual(10)).toBe("10.0%");
  });
});

describe("formatarArea", () => {
  it("appends m² unit", () => {
    const result = formatarArea(120);
    expect(result).toContain("m²");
    expect(result).toContain("120");
  });
});
