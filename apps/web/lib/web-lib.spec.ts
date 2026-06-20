import { decodeJwtPayload } from "./decode-jwt-payload";
import { normalizeRole, isGestor, ROLE_HOME } from "./role-permissions";
import { normalizeCadastroInput } from "./normalize-cadastro";
import { readApiErrorMessage } from "./read-api-error";

// ─── decodeJwtPayload ──────────────────────────────────────────────────────────

function makeJwt(payload: Record<string, unknown>): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${encoded}.signature`;
}

describe("decodeJwtPayload", () => {
  it("decodes a valid JWT and returns the payload object", () => {
    const token = makeJwt({ sub: "u1", role: "ADMIN", exp: 9999999999 });
    const result = decodeJwtPayload(token);
    expect(result).toEqual({ sub: "u1", role: "ADMIN", exp: 9999999999 });
  });

  it("returns null for a token with fewer than 3 parts", () => {
    expect(decodeJwtPayload("notavalidtoken")).toBeNull();
  });

  it("returns null for a malformed base64 payload", () => {
    expect(decodeJwtPayload("header.!!!invalid!!!.sig")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(decodeJwtPayload("")).toBeNull();
  });

  it("handles base64url characters (- and _) correctly", () => {
    // base64url uses - and _ instead of + and /
    const payload = { role: "GESTOR", nome: "João" };
    const b64url = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const token = `h.${b64url}.s`;
    const result = decodeJwtPayload(token);
    expect(result?.role).toBe("GESTOR");
  });
});

// ─── normalizeRole ────────────────────────────────────────────────────────────

describe("normalizeRole", () => {
  it("returns null for null input", () => {
    expect(normalizeRole(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(normalizeRole(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeRole("")).toBeNull();
  });

  it("normalizes legacy GESTOR_FUNDO alias to GESTOR", () => {
    expect(normalizeRole("GESTOR_FUNDO")).toBe("GESTOR");
  });

  it("passes through valid roles unchanged", () => {
    expect(normalizeRole("ADMIN")).toBe("ADMIN");
    expect(normalizeRole("ENGENHEIRO")).toBe("ENGENHEIRO");
    expect(normalizeRole("TOMADOR")).toBe("TOMADOR");
    expect(normalizeRole("COMERCIAL")).toBe("COMERCIAL");
  });
});

describe("isGestor", () => {
  it("returns true for GESTOR", () => {
    expect(isGestor("GESTOR")).toBe(true);
  });

  it("returns true for legacy GESTOR_FUNDO alias", () => {
    expect(isGestor("GESTOR_FUNDO")).toBe(true);
  });

  it("returns false for ADMIN", () => {
    expect(isGestor("ADMIN")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isGestor(null)).toBe(false);
  });
});

describe("ROLE_HOME", () => {
  it("maps ADMIN to /dashboard/admin", () => {
    expect(ROLE_HOME["ADMIN"]).toBe("/dashboard/admin");
  });

  it("maps GESTOR to /dashboard/gestor", () => {
    expect(ROLE_HOME["GESTOR"]).toBe("/dashboard/gestor");
  });

  it("maps GESTOR_FUNDO (legacy) to /dashboard/gestor", () => {
    expect(ROLE_HOME["GESTOR_FUNDO"]).toBe("/dashboard/gestor");
  });

  it("maps ENGENHEIRO and GESTOR_OBRA both to /dashboard/engenheiro", () => {
    expect(ROLE_HOME["ENGENHEIRO"]).toBe("/dashboard/engenheiro");
    expect(ROLE_HOME["GESTOR_OBRA"]).toBe("/dashboard/engenheiro");
  });

  it("maps COMERCIAL and PARCEIRO both to /dashboard/comercial", () => {
    expect(ROLE_HOME["COMERCIAL"]).toBe("/dashboard/comercial");
    expect(ROLE_HOME["PARCEIRO"]).toBe("/dashboard/comercial");
  });
});

// ─── normalizeCadastroInput ───────────────────────────────────────────────────

describe("normalizeCadastroInput", () => {
  const base = {
    nome: "João",
    email: "JOAO@EXAMPLE.COM",
    cpf: "529.982.247-25",
    telefone: "(11) 99999-8888",
    senha: "Senha123",
    consentidoTermos: true,
    consentidoPrivacy: true,
    consentidoKyc: true,
    consentidoMarketing: false,
  };

  it("lowercases and trims email", () => {
    const result = normalizeCadastroInput(base);
    expect(result.email).toBe("joao@example.com");
  });

  it("strips CPF mask to 11 digits only", () => {
    const result = normalizeCadastroInput(base);
    expect(result.cpf).toBe("52998224725");
  });

  it("strips telefone mask to digits only", () => {
    const result = normalizeCadastroInput(base);
    expect(result.telefone).toBe("11999998888");
  });

  it("truncates CPF to max 11 digits if longer", () => {
    const result = normalizeCadastroInput({ ...base, cpf: "529982247251234" });
    expect(result.cpf).toHaveLength(11);
  });

  it("does not modify other fields", () => {
    const result = normalizeCadastroInput(base);
    expect(result.nome).toBe("João");
    expect(result.senha).toBe("Senha123");
    expect(result.consentidoTermos).toBe(true);
  });
});

// ─── readApiErrorMessage ──────────────────────────────────────────────────────

function makeResponse(body: unknown, status = 400): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("readApiErrorMessage", () => {
  it("extracts string message from JSON body", async () => {
    const res = makeResponse({ message: "E-mail já cadastrado" });
    expect(await readApiErrorMessage(res)).toBe("E-mail já cadastrado");
  });

  it("extracts first element when message is an array", async () => {
    const res = makeResponse({ message: ["campo: obrigatório", "outro erro"] });
    expect(await readApiErrorMessage(res)).toBe("campo: obrigatório");
  });

  it("returns fallback for empty body", async () => {
    const res = new Response(null, { status: 500 });
    const msg = await readApiErrorMessage(res, "Erro genérico");
    expect(msg).toBe("Erro genérico");
  });

  it("returns fallback when message key is missing", async () => {
    const res = makeResponse({ error: "internal" });
    expect(await readApiErrorMessage(res, "Fallback")).toBe("Fallback");
  });

  it("returns fallback for non-JSON body", async () => {
    const res = new Response("Gateway Timeout", { status: 504 });
    expect(await readApiErrorMessage(res, "Timeout")).toBe("Timeout");
  });

  it("uses default fallback text when not provided", async () => {
    const res = new Response(null, { status: 503 });
    const msg = await readApiErrorMessage(res);
    expect(msg).toBe("Erro ao processar resposta");
  });
});
