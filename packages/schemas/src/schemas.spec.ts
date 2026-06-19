import {
  CadastroUsuarioSchema,
  LoginSchema,
  RedefinirSenhaSchema,
  AtualizarUsuarioAdminSchema,
} from "./usuario.schema";
import {
  SimulacaoCreditoSchema,
  SolicitacaoCreditoSchema,
  LiberacaoParcelaSchema,
} from "./credito.schema";
import {
  EnderecoSchema,
  GeolocalizacaoSchema,
  CriarObraSchema,
} from "./obra.schema";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ok<T>(schema: { parse: (v: unknown) => T }, value: unknown): T {
  return schema.parse(value);
}

function fails(schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown): boolean {
  return !schema.safeParse(value).success;
}

// ─── CadastroUsuarioSchema ────────────────────────────────────────────────────

const VALID_CPF = "52998224725"; // mathematically valid CPF
const INVALID_CPF_SAME_DIGITS = "11111111111";
const INVALID_CPF_BAD_CHECK = "52998224726"; // last digit wrong

const validCadastro = {
  nome: "João Silva",
  cpf: VALID_CPF,
  email: "joao@example.com",
  telefone: "11999998888",
  senha: "Senha123",
  consentidoTermos: true,
  consentidoPrivacy: true,
  consentidoKyc: true,
};

describe("CadastroUsuarioSchema — CPF validation", () => {
  it("accepts a mathematically valid CPF", () => {
    expect(() => ok(CadastroUsuarioSchema, validCadastro)).not.toThrow();
  });

  it("rejects CPF with all same digits", () => {
    expect(fails(CadastroUsuarioSchema, { ...validCadastro, cpf: INVALID_CPF_SAME_DIGITS })).toBe(true);
  });

  it("rejects CPF with wrong check digit", () => {
    expect(fails(CadastroUsuarioSchema, { ...validCadastro, cpf: INVALID_CPF_BAD_CHECK })).toBe(true);
  });

  it("rejects CPF with fewer than 11 digits", () => {
    expect(fails(CadastroUsuarioSchema, { ...validCadastro, cpf: "1234567890" })).toBe(true);
  });

  it("rejects CPF with non-numeric characters", () => {
    expect(fails(CadastroUsuarioSchema, { ...validCadastro, cpf: "529.982.247-25" })).toBe(true);
  });
});

describe("CadastroUsuarioSchema — password rules", () => {
  it("accepts a valid password with uppercase + number", () => {
    expect(() => ok(CadastroUsuarioSchema, validCadastro)).not.toThrow();
  });

  it("rejects password shorter than 8 characters", () => {
    expect(fails(CadastroUsuarioSchema, { ...validCadastro, senha: "Ab1" })).toBe(true);
  });

  it("rejects password without uppercase letter", () => {
    expect(fails(CadastroUsuarioSchema, { ...validCadastro, senha: "senha123" })).toBe(true);
  });

  it("rejects password without a number", () => {
    expect(fails(CadastroUsuarioSchema, { ...validCadastro, senha: "SenhaABCD" })).toBe(true);
  });

  it("rejects password exceeding 72 characters", () => {
    expect(fails(CadastroUsuarioSchema, { ...validCadastro, senha: "A1" + "a".repeat(72) })).toBe(true);
  });
});

describe("CadastroUsuarioSchema — LGPD consent", () => {
  it("rejects when consentidoTermos is false", () => {
    expect(fails(CadastroUsuarioSchema, { ...validCadastro, consentidoTermos: false })).toBe(true);
  });

  it("rejects when consentidoPrivacy is false", () => {
    expect(fails(CadastroUsuarioSchema, { ...validCadastro, consentidoPrivacy: false })).toBe(true);
  });

  it("rejects when consentidoKyc is false", () => {
    expect(fails(CadastroUsuarioSchema, { ...validCadastro, consentidoKyc: false })).toBe(true);
  });

  it("defaults consentidoMarketing to false when omitted", () => {
    const result = ok(CadastroUsuarioSchema, validCadastro);
    expect(result.consentidoMarketing).toBe(false);
  });
});

describe("CadastroUsuarioSchema — nome and email", () => {
  it("rejects nome shorter than 3 characters", () => {
    expect(fails(CadastroUsuarioSchema, { ...validCadastro, nome: "Jo" })).toBe(true);
  });

  it("rejects invalid email format", () => {
    expect(fails(CadastroUsuarioSchema, { ...validCadastro, email: "not-an-email" })).toBe(true);
  });

  it("rejects telefone with wrong digit count", () => {
    expect(fails(CadastroUsuarioSchema, { ...validCadastro, telefone: "119999" })).toBe(true);
  });

  it("accepts 10-digit landline telefone", () => {
    expect(() => ok(CadastroUsuarioSchema, { ...validCadastro, telefone: "1133334444" })).not.toThrow();
  });
});

// ─── LoginSchema ──────────────────────────────────────────────────────────────

describe("LoginSchema", () => {
  it("accepts valid email and password", () => {
    expect(() => ok(LoginSchema, { email: "u@u.com", senha: "x" })).not.toThrow();
  });

  it("rejects missing email", () => {
    expect(fails(LoginSchema, { senha: "x" })).toBe(true);
  });

  it("rejects empty senha", () => {
    expect(fails(LoginSchema, { email: "u@u.com", senha: "" })).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(fails(LoginSchema, { email: "not-email", senha: "x" })).toBe(true);
  });
});

// ─── RedefinirSenhaSchema ─────────────────────────────────────────────────────

describe("RedefinirSenhaSchema", () => {
  const validToken = "a".repeat(32);

  it("accepts valid token (32 chars) and strong password", () => {
    expect(() => ok(RedefinirSenhaSchema, { token: validToken, novaSenha: "Senha123" })).not.toThrow();
  });

  it("rejects token shorter than 32 characters", () => {
    expect(fails(RedefinirSenhaSchema, { token: "short", novaSenha: "Senha123" })).toBe(true);
  });

  it("rejects weak password (no uppercase)", () => {
    expect(fails(RedefinirSenhaSchema, { token: validToken, novaSenha: "senha123" })).toBe(true);
  });

  it("rejects weak password (no number)", () => {
    expect(fails(RedefinirSenhaSchema, { token: validToken, novaSenha: "SenhaABCD" })).toBe(true);
  });
});

// ─── SimulacaoCreditoSchema ───────────────────────────────────────────────────

describe("SimulacaoCreditoSchema", () => {
  const validSim = { valorSolicitado: 100_000, prazoMeses: 24, tipoObra: "RESIDENCIAL" };

  it("accepts valid simulation input", () => {
    expect(() => ok(SimulacaoCreditoSchema, validSim)).not.toThrow();
  });

  it("rejects valor below minimum (R$ 10,000)", () => {
    expect(fails(SimulacaoCreditoSchema, { ...validSim, valorSolicitado: 5_000 })).toBe(true);
  });

  it("rejects valor above maximum (R$ 5,000,000)", () => {
    expect(fails(SimulacaoCreditoSchema, { ...validSim, valorSolicitado: 6_000_000 })).toBe(true);
  });

  it.each([12, 24, 36, 60, 120, 180])("accepts valid prazo %d months", (prazo) => {
    expect(fails(SimulacaoCreditoSchema, { ...validSim, prazoMeses: prazo })).toBe(false);
  });

  it("rejects invalid prazo (e.g. 48 months)", () => {
    expect(fails(SimulacaoCreditoSchema, { ...validSim, prazoMeses: 48 })).toBe(true);
  });

  it("rejects invalid tipoObra", () => {
    expect(fails(SimulacaoCreditoSchema, { ...validSim, tipoObra: "INDUSTRIAL" })).toBe(true);
  });
});

// ─── SolicitacaoCreditoSchema ─────────────────────────────────────────────────

describe("SolicitacaoCreditoSchema", () => {
  const validSolicita = {
    valorSolicitado: 200_000,
    prazoMeses: 60,
    tipoObra: "COMERCIAL",
    finalidade: "Construção de galpão comercial",
    rendaMensalDeclarada: 8_000,
  };

  it("accepts valid solicitation input", () => {
    expect(() => ok(SolicitacaoCreditoSchema, validSolicita)).not.toThrow();
  });

  it("rejects finalidade shorter than 10 characters", () => {
    expect(fails(SolicitacaoCreditoSchema, { ...validSolicita, finalidade: "curto" })).toBe(true);
  });

  it("rejects rendaMensalDeclarada below R$ 500", () => {
    expect(fails(SolicitacaoCreditoSchema, { ...validSolicita, rendaMensalDeclarada: 100 })).toBe(true);
  });

  it("accepts optional obraId when provided as valid UUID", () => {
    expect(() => ok(SolicitacaoCreditoSchema, {
      ...validSolicita,
      obraId: "550e8400-e29b-41d4-a716-446655440000",
    })).not.toThrow();
  });

  it("rejects obraId that is not a UUID", () => {
    expect(fails(SolicitacaoCreditoSchema, { ...validSolicita, obraId: "not-a-uuid" })).toBe(true);
  });
});

// ─── LiberacaoParcelaSchema ───────────────────────────────────────────────────

describe("LiberacaoParcelaSchema", () => {
  const valid = {
    creditoId: "550e8400-e29b-41d4-a716-446655440000",
    etapaId: "660e8400-e29b-41d4-a716-446655440001",
    valorLiberacao: 50_000,
  };

  it("accepts valid liberacao input", () => {
    expect(() => ok(LiberacaoParcelaSchema, valid)).not.toThrow();
  });

  it("rejects negative valorLiberacao", () => {
    expect(fails(LiberacaoParcelaSchema, { ...valid, valorLiberacao: -1 })).toBe(true);
  });

  it("rejects creditoId that is not a UUID", () => {
    expect(fails(LiberacaoParcelaSchema, { ...valid, creditoId: "bad-id" })).toBe(true);
  });
});

// ─── EnderecoSchema ───────────────────────────────────────────────────────────

describe("EnderecoSchema", () => {
  const validEndereco = {
    logradouro: "Rua das Flores",
    numero: "123",
    bairro: "Centro",
    cidade: "São Paulo",
    uf: "SP",
    cep: "01310100",
  };

  it("accepts valid Brazilian address", () => {
    expect(() => ok(EnderecoSchema, validEndereco)).not.toThrow();
  });

  it("rejects UF with more than 2 characters", () => {
    expect(fails(EnderecoSchema, { ...validEndereco, uf: "SPA" })).toBe(true);
  });

  it("rejects CEP with non-numeric characters", () => {
    expect(fails(EnderecoSchema, { ...validEndereco, cep: "01310-100" })).toBe(true);
  });

  it("rejects CEP with wrong length", () => {
    expect(fails(EnderecoSchema, { ...validEndereco, cep: "0131010" })).toBe(true);
  });
});

// ─── GeolocalizacaoSchema ─────────────────────────────────────────────────────

describe("GeolocalizacaoSchema", () => {
  const validGeo = { latitude: -23.5505, longitude: -46.6333 };

  it("accepts valid São Paulo coordinates", () => {
    expect(() => ok(GeolocalizacaoSchema, validGeo)).not.toThrow();
  });

  it("rejects latitude out of range (>90)", () => {
    expect(fails(GeolocalizacaoSchema, { ...validGeo, latitude: 91 })).toBe(true);
  });

  it("rejects longitude out of range (<-180)", () => {
    expect(fails(GeolocalizacaoSchema, { ...validGeo, longitude: -181 })).toBe(true);
  });

  it("rejects raioValidacaoMetros below 20 m", () => {
    expect(fails(GeolocalizacaoSchema, { ...validGeo, raioValidacaoMetros: 10 })).toBe(true);
  });

  it("rejects raioValidacaoMetros above 500 m", () => {
    expect(fails(GeolocalizacaoSchema, { ...validGeo, raioValidacaoMetros: 501 })).toBe(true);
  });

  it("defaults raioValidacaoMetros to 80 when not provided", () => {
    const result = ok(GeolocalizacaoSchema, validGeo);
    expect(result.raioValidacaoMetros).toBe(80);
  });
});

// ─── CriarObraSchema — date refinement ───────────────────────────────────────

describe("CriarObraSchema — date validation", () => {
  const validObra = {
    nome: "Obra Teste",
    endereco: {
      logradouro: "Rua das Flores",
      numero: "1",
      bairro: "Centro",
      cidade: "SP",
      uf: "SP",
      cep: "01310100",
    },
    geo: { latitude: -23.55, longitude: -46.63 },
    areaM2: 150,
    dataConclusaoPrevistaISO: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  };

  it("accepts obra without optional datainicioISO", () => {
    expect(() => ok(CriarObraSchema, validObra)).not.toThrow();
  });

  it("accepts obra when conclusao is after inicio", () => {
    const inicio = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const conclusao = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    expect(() => ok(CriarObraSchema, { ...validObra, datainicioISO: inicio, dataConclusaoPrevistaISO: conclusao })).not.toThrow();
  });

  it("rejects obra when conclusao is before inicio", () => {
    const inicio = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const conclusao = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(fails(CriarObraSchema, { ...validObra, datainicioISO: inicio, dataConclusaoPrevistaISO: conclusao })).toBe(true);
  });

  it("rejects areaM2 above 100,000 m²", () => {
    expect(fails(CriarObraSchema, { ...validObra, areaM2: 100_001 })).toBe(true);
  });
});

// ─── AtualizarUsuarioAdminSchema ──────────────────────────────────────────────

describe("AtualizarUsuarioAdminSchema", () => {
  it("accepts an empty object (all fields are optional)", () => {
    expect(() => ok(AtualizarUsuarioAdminSchema, {})).not.toThrow();
  });

  it("accepts valid tipo change", () => {
    expect(() => ok(AtualizarUsuarioAdminSchema, { tipo: "ENGENHEIRO" })).not.toThrow();
  });

  it("rejects invalid tipo", () => {
    expect(fails(AtualizarUsuarioAdminSchema, { tipo: "SUPERADMIN" })).toBe(true);
  });

  it("rejects novaSenha without uppercase", () => {
    expect(fails(AtualizarUsuarioAdminSchema, { novaSenha: "fraca123" })).toBe(true);
  });

  it("accepts bloqueado: true", () => {
    expect(() => ok(AtualizarUsuarioAdminSchema, { bloqueado: true })).not.toThrow();
  });

  it("accepts funcoesBloqueadas array with valid funções", () => {
    expect(() => ok(AtualizarUsuarioAdminSchema, { funcoesBloqueadas: ["obras", "credito"] })).not.toThrow();
  });

  it("rejects funcoesBloqueadas with invalid função name", () => {
    expect(fails(AtualizarUsuarioAdminSchema, { funcoesBloqueadas: ["invalid-feature"] })).toBe(true);
  });
});
