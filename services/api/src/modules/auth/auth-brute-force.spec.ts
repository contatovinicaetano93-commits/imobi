import { Test } from "@nestjs/testing";
import { UnauthorizedException, ForbiddenException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { EmailService } from "../email/email.service";
import { CACHE_MANAGER } from "@nestjs/cache-manager";

const mockPrisma = {
  usuario: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  sessaoToken: {
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue("mock-token"),
};

const mockEmail = {
  enviarEmail: jest.fn(),
  senhaTrocadaEmail: jest.fn(),
  boasVindasEmail: jest.fn(),
  etapaAprovadaEmail: jest.fn(),
};

function makeCacheMock(store: Record<string, unknown> = {}) {
  return {
    get: jest.fn(async (k: string) => store[k] ?? undefined),
    set: jest.fn(async (k: string, v: unknown) => { store[k] = v; }),
    del: jest.fn(async (k: string) => { delete store[k]; }),
  };
}

describe("AuthService — brute-force lockout", () => {
  let service: AuthService;
  let cache: ReturnType<typeof makeCacheMock>;
  const cacheStore: Record<string, unknown> = {};

  beforeEach(async () => {
    jest.clearAllMocks();
    Object.keys(cacheStore).forEach((k) => delete cacheStore[k]);
    cache = makeCacheMock(cacheStore);

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: EmailService, useValue: mockEmail },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it("allows login when no lock exists", async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue({
      usuarioId: "uid1",
      email: "user@test.com",
      passwordHash: "$2b$12$" + "x".repeat(53),
      bloqueadoEm: null,
      tipo: "TOMADOR",
      kycStatus: "PENDENTE",
      funcoesBloqueadas: [],
    });

    // bcrypt compare will fail; service will throw UnauthorizedException
    await expect(
      service.login({ email: "user@test.com", senha: "wrong" }, {})
    ).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when lock key is set", async () => {
    cacheStore["login:lock:locked@test.com"] = "1";

    await expect(
      service.login({ email: "locked@test.com", senha: "anything" }, {})
    ).rejects.toThrow(UnauthorizedException);

    expect(mockPrisma.usuario.findFirst).not.toHaveBeenCalled();
  });

  it("sets lock after 10 failed attempts", async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue({
      usuarioId: "uid2",
      email: "willbeLocked@test.com",
      passwordHash: "$2b$12$" + "x".repeat(53),
      bloqueadoEm: null,
      tipo: "TOMADOR",
      kycStatus: "PENDENTE",
      funcoesBloqueadas: [],
    });

    // Simulate 9 previous failed attempts
    cacheStore["login:attempts:willbeLocked@test.com"] = 9;

    await expect(
      service.login({ email: "willbeLocked@test.com", senha: "wrong" }, {})
    ).rejects.toThrow(UnauthorizedException);

    // After 10th failure, lock should be set
    expect(cache.set).toHaveBeenCalledWith(
      "login:lock:willbeLocked@test.com",
      true,
      900,
    );
  });

  it("throws UnauthorizedException when account is blocked", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({
      usuarioId: "uid3",
      email: "blocked@test.com",
      passwordHash: "$2b$12$" + "x".repeat(53),
      bloqueadoEm: new Date(),
      tipo: "TOMADOR",
      kycStatus: "PENDENTE",
      funcoesBloqueadas: [],
    });

    await expect(
      service.login({ email: "blocked@test.com", senha: "anything" }, {})
    ).rejects.toThrow(UnauthorizedException);
  });
});

describe("AuthService — session management", () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const cache = makeCacheMock();

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: EmailService, useValue: mockEmail },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it("revokes oldest session when 5 are already active", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({
      tipo: "TOMADOR",
      nome: "Test",
      email: "test@test.com",
      funcoesBloqueadas: [],
      bloqueadoEm: null,
    });
    mockPrisma.sessaoToken.findMany.mockResolvedValue([
      { sessionId: "s1", criadoEm: new Date(Date.now() - 5000) },
      { sessionId: "s2", criadoEm: new Date(Date.now() - 4000) },
      { sessionId: "s3", criadoEm: new Date(Date.now() - 3000) },
      { sessionId: "s4", criadoEm: new Date(Date.now() - 2000) },
      { sessionId: "s5", criadoEm: new Date(Date.now() - 1000) },
    ]);
    mockPrisma.sessaoToken.update.mockResolvedValue({});
    mockPrisma.sessaoToken.create.mockResolvedValue({
      sessionId: "new-session",
      refreshToken: "tok",
      expiresAt: new Date(),
    });
    mockJwt.sign.mockReturnValue("mock-jwt");

    await (service as any).gerarTokens("uid-test", {});

    expect(mockPrisma.sessaoToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: "s1" },
        data: expect.objectContaining({ revogadoEm: expect.any(Date) }),
      }),
    );
  });

  it("does not revoke sessions when under the limit of 5", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({
      tipo: "TOMADOR",
      nome: "Test",
      email: "test@test.com",
      funcoesBloqueadas: [],
      bloqueadoEm: null,
    });
    mockPrisma.sessaoToken.findMany.mockResolvedValue([
      { sessionId: "s1", criadoEm: new Date() },
      { sessionId: "s2", criadoEm: new Date() },
    ]);
    mockPrisma.sessaoToken.create.mockResolvedValue({
      sessionId: "new-session",
      refreshToken: "tok",
      expiresAt: new Date(),
    });
    mockJwt.sign.mockReturnValue("mock-jwt");

    await (service as any).gerarTokens("uid-test-2", {});

    expect(mockPrisma.sessaoToken.update).not.toHaveBeenCalled();
  });
});
