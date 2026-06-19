import { ConflictException, UnauthorizedException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { AuthService } from "./auth.service";

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("$hashed$"),
  compare: jest.fn(),
}));
import * as bcrypt from "bcryptjs";

const mockPrisma = {
  usuario: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  sessaoToken: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue("signed.token"),
};

const mockEmail = {
  recuperacaoSenhaEmail: jest.fn(),
};

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

function makeService() {
  return new AuthService(mockPrisma as any, mockJwt as any, mockEmail as any, mockCache as any);
}

function makeUsuario(overrides: Record<string, any> = {}) {
  return {
    usuarioId: "u1",
    nome: "João",
    email: "joao@test.com",
    cpf: "12345678900",
    passwordHash: "$hashed$",
    tipo: "TOMADOR",
    kycStatus: "PENDENTE",
    bloqueadoEm: null,
    funcoesBloqueadas: [],
    ...overrides,
  };
}

function setupGerarTokens() {
  mockPrisma.usuario.findUnique.mockResolvedValue(makeUsuario());
  mockPrisma.sessaoToken.findMany.mockResolvedValue([]);
  mockPrisma.sessaoToken.create.mockResolvedValue({});
}

describe("AuthService — registrar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws ConflictException when email/CPF already exists", async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue(makeUsuario());
    const svc = makeService();
    await expect(
      svc.registrar({ nome: "João", email: "joao@test.com", cpf: "12345678900", senha: "Abc@1234", telefone: "11999", consentidoTermos: true, consentidoPrivacy: true, consentidoKyc: true }),
    ).rejects.toThrow(ConflictException);
  });

  it("creates user and returns tokens", async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue(null);
    mockPrisma.usuario.create.mockResolvedValue({ usuarioId: "u1", nome: "João", email: "joao@test.com", tipo: "TOMADOR", kycStatus: "PENDENTE" });
    setupGerarTokens();

    const svc = makeService();
    const result = await svc.registrar({ nome: "João", email: "joao@test.com", cpf: "12345678900", senha: "Abc@1234", telefone: "11999", consentidoTermos: true, consentidoPrivacy: true, consentidoKyc: true });
    expect(result.accessToken).toBe("signed.token");
    expect(result.usuario.email).toBe("joao@test.com");
  });
});

describe("AuthService — login", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws UnauthorizedException when account is locked", async () => {
    mockCache.get.mockResolvedValueOnce(true); // lock key
    const svc = makeService();
    await expect(svc.login({ email: "joao@test.com", senha: "Abc@1234" })).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when user not found", async () => {
    mockCache.get.mockResolvedValue(null);
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);
    const svc = makeService();
    await expect(svc.login({ email: "x@x.com", senha: "Abc@1234" })).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when password is wrong", async () => {
    mockCache.get.mockResolvedValue(null);
    mockPrisma.usuario.findUnique.mockResolvedValue(makeUsuario());
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    mockCache.set.mockResolvedValue(undefined);
    const svc = makeService();
    await expect(svc.login({ email: "joao@test.com", senha: "wrong" })).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when account is blocked by admin", async () => {
    mockCache.get.mockResolvedValue(null);
    mockPrisma.usuario.findUnique.mockResolvedValue(makeUsuario({ bloqueadoEm: new Date() }));
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const svc = makeService();
    await expect(svc.login({ email: "joao@test.com", senha: "Abc@1234" })).rejects.toThrow(UnauthorizedException);
  });

  it("returns tokens on successful login", async () => {
    mockCache.get.mockResolvedValue(null);
    mockPrisma.usuario.findUnique.mockResolvedValue(makeUsuario());
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockCache.del.mockResolvedValue(undefined);
    setupGerarTokens();
    const svc = makeService();
    const result = await svc.login({ email: "joao@test.com", senha: "Abc@1234" });
    expect(result.accessToken).toBe("signed.token");
    expect(result.usuario.email).toBe("joao@test.com");
  });
});

describe("AuthService — renovarToken", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws UnauthorizedException when refreshToken is empty", async () => {
    const svc = makeService();
    await expect(svc.renovarToken("")).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when session not found", async () => {
    mockPrisma.sessaoToken.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.renovarToken("bad-token")).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when session is revoked", async () => {
    mockPrisma.sessaoToken.findUnique.mockResolvedValue({ revogadoEm: new Date(), expiresAt: new Date(Date.now() + 99999) });
    const svc = makeService();
    await expect(svc.renovarToken("revoked-token")).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when session is expired", async () => {
    mockPrisma.sessaoToken.findUnique.mockResolvedValue({ revogadoEm: null, expiresAt: new Date(Date.now() - 1000) });
    const svc = makeService();
    await expect(svc.renovarToken("expired-token")).rejects.toThrow(UnauthorizedException);
  });

  it("returns new tokens on valid session", async () => {
    mockPrisma.sessaoToken.findUnique.mockResolvedValue({
      sessionId: "s1",
      usuarioId: "u1",
      revogadoEm: null,
      expiresAt: new Date(Date.now() + 99999),
    });
    mockPrisma.usuario.findUnique.mockResolvedValue({ bloqueadoEm: null });
    mockPrisma.sessaoToken.update.mockResolvedValue({});
    setupGerarTokens();
    const svc = makeService();
    const result = await svc.renovarToken("valid-refresh");
    expect(result.accessToken).toBe("signed.token");
  });
});

describe("AuthService — revogarSessaoEspecifica", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws ForbiddenException when session belongs to another user", async () => {
    mockPrisma.sessaoToken.findUnique.mockResolvedValue({ sessionId: "s1", usuarioId: "other-user" });
    const svc = makeService();
    await expect(svc.revogarSessaoEspecifica("u1", "s1")).rejects.toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when session not found", async () => {
    mockPrisma.sessaoToken.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.revogarSessaoEspecifica("u1", "s1")).rejects.toThrow(ForbiddenException);
  });

  it("revokes session successfully", async () => {
    mockPrisma.sessaoToken.findUnique.mockResolvedValue({ sessionId: "s1", usuarioId: "u1" });
    mockPrisma.sessaoToken.update.mockResolvedValue({});
    const svc = makeService();
    await svc.revogarSessaoEspecifica("u1", "s1");
    expect(mockPrisma.sessaoToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sessionId: "s1" }, data: expect.objectContaining({ revogadoEm: expect.any(Date) }) }),
    );
  });
});

describe("AuthService — esqueceuSenha", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns same message whether user exists or not (no email enumeration)", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    const svc = makeService();
    const result = await svc.esqueceuSenha("notfound@x.com");
    expect(result.message).toContain("Se o email estiver cadastrado");
  });

  it("sends email and stores hashed reset token when user exists", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(makeUsuario());
    mockPrisma.usuario.update.mockResolvedValue({});
    mockEmail.recuperacaoSenhaEmail.mockResolvedValue(undefined);
    const svc = makeService();
    await svc.esqueceuSenha("joao@test.com");
    expect(mockPrisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ passwordResetToken: expect.any(String), passwordResetExpires: expect.any(Date) }) }),
    );
    expect(mockEmail.recuperacaoSenhaEmail).toHaveBeenCalled();
  });
});

describe("AuthService — redefinirSenha", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws BadRequestException for invalid/expired token", async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.redefinirSenha("bad-token", "NewPass@1")).rejects.toThrow(BadRequestException);
  });

  it("updates passwordHash and clears reset token on success", async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue(makeUsuario());
    mockPrisma.usuario.update.mockResolvedValue({});
    const svc = makeService();
    const result = await svc.redefinirSenha("valid-token", "NewPass@1");
    expect(result.message).toContain("Senha redefinida");
    expect(mockPrisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ passwordResetToken: null, passwordResetExpires: null }) }),
    );
  });
});
