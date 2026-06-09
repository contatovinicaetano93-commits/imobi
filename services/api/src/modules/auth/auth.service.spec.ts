import { UnauthorizedException, ConflictException, BadRequestException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { JwtStrategy } from "./jwt.strategy";
import { AuthService } from "./auth.service";

// ─── JwtStrategy ─────────────────────────────────────────────────────────────

const USUARIO_ID = "user-uuid-001";
const USUARIO_DB = { usuarioId: USUARIO_ID, tipo: "TOMADOR" };

function buildStrategy(usuario: any = USUARIO_DB) {
  const prisma = {
    usuario: {
      findUnique: jest.fn().mockResolvedValue(usuario),
    },
  } as any;

  // Bypass PassportStrategy constructor — it calls super() which needs JWT_SECRET
  const strategy = Object.create(JwtStrategy.prototype) as JwtStrategy;
  (strategy as any).prisma = prisma;

  return { strategy, prisma };
}

describe("JwtStrategy.validate — Bug 6: refresh token não deve funcionar como access token", () => {
  it("lança UnauthorizedException quando payload.type === 'refresh'", async () => {
    const { strategy } = buildStrategy();
    await expect(
      strategy.validate({ sub: USUARIO_ID, type: "refresh" })
    ).rejects.toThrow(UnauthorizedException);
  });

  it("NÃO consulta o banco se payload.type === 'refresh'", async () => {
    const { strategy, prisma } = buildStrategy();
    await expect(strategy.validate({ sub: USUARIO_ID, type: "refresh" })).rejects.toThrow();
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
  });

  it("aceita access token sem campo type (payload legado)", async () => {
    const { strategy } = buildStrategy();
    const result = await strategy.validate({ sub: USUARIO_ID });
    expect(result).toEqual({ id: USUARIO_ID, tipo: "TOMADOR" });
  });

  it("aceita access token com type: 'access' (futuro explícito)", async () => {
    const { strategy } = buildStrategy();
    const result = await strategy.validate({ sub: USUARIO_ID, type: "access" });
    expect(result).toEqual({ id: USUARIO_ID, tipo: "TOMADOR" });
  });

  it("lança UnauthorizedException se usuário não existe no banco", async () => {
    const { strategy } = buildStrategy(null);
    await expect(strategy.validate({ sub: "ghost-uuid" })).rejects.toThrow(UnauthorizedException);
  });

  it("retorna { id, tipo } para access token válido de usuário existente", async () => {
    const { strategy } = buildStrategy({ usuarioId: USUARIO_ID, tipo: "ADMIN" });
    const result = await strategy.validate({ sub: USUARIO_ID });
    expect(result).toEqual({ id: USUARIO_ID, tipo: "ADMIN" });
  });
});

// ─── AuthService ─────────────────────────────────────────────────────────────

const HASH_SENHA = bcrypt.hashSync("Senha@123", 1); // rounds=1 para rapidez em testes

const baseUsuarioDB = {
  usuarioId: USUARIO_ID,
  nome: "João Silva",
  email: "joao@test.com",
  cpf: "12345678900",
  telefone: "11999990000",
  passwordHash: HASH_SENHA,
  tipo: "TOMADOR",
  kycStatus: "PENDENTE",
};

function buildAuthService(overrides: {
  usuarioExiste?: any;
  usuarioPorEmail?: any;
  sessao?: any;
} = {}) {
  const prisma = {
    usuario: {
      findFirst: jest.fn().mockResolvedValue(overrides.usuarioExiste ?? null),
      findUnique: jest.fn().mockResolvedValue(overrides.usuarioPorEmail ?? null),
      create: jest.fn().mockResolvedValue({
        usuarioId: USUARIO_ID,
        nome: "João Silva",
        email: "joao@test.com",
        tipo: "TOMADOR",
        kycStatus: "PENDENTE",
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    sessaoToken: {
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn().mockResolvedValue(
        overrides.sessao !== undefined
          ? overrides.sessao
          : {
              sessionId: "sess-001",
              usuarioId: USUARIO_ID,
              refreshToken: "rt-abc",
              revogadoEm: null,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            }
      ),
    },
  } as any;

  const jwt = {
    sign: jest.fn().mockImplementation((payload: any, opts: any) => {
      const type = payload.type ?? "access";
      return `fake-${type}-token-${opts?.expiresIn ?? "?"}`;
    }),
  } as any;

  const email = {
    recuperacaoSenhaEmail: jest.fn().mockResolvedValue({}),
  } as any;

  const service = new AuthService(prisma, jwt, email);
  return { service, prisma, jwt, email };
}

describe("AuthService.registrar", () => {
  it("lança ConflictException se email/CPF já existe", async () => {
    const { service } = buildAuthService({ usuarioExiste: baseUsuarioDB });
    await expect(
      service.registrar({
        nome: "João",
        email: "joao@test.com",
        cpf: "12345678900",
        telefone: "11999990000",
        senha: "Senha@123",
        tipo: "TOMADOR",
        consentidoTermos: true,
        consentidoPrivacy: true,
        consentidoKyc: true,
      } as any)
    ).rejects.toThrow(ConflictException);
  });

  it("retorna accessToken e refreshToken após cadastro bem-sucedido", async () => {
    const { service } = buildAuthService();
    const result = await service.registrar({
      nome: "João",
      email: "joao@test.com",
      cpf: "12345678900",
      telefone: "11999990000",
      senha: "Senha@123",
      tipo: "TOMADOR",
      consentidoTermos: true,
      consentidoPrivacy: true,
      consentidoKyc: true,
    } as any);
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });
});

describe("AuthService.login", () => {
  it("lança UnauthorizedException se usuário não existe", async () => {
    const { service } = buildAuthService({ usuarioPorEmail: null });
    await expect(service.login({ email: "nobody@test.com", senha: "Senha@123" })).rejects.toThrow(
      UnauthorizedException
    );
  });

  it("lança UnauthorizedException se senha está errada", async () => {
    const { service } = buildAuthService({ usuarioPorEmail: baseUsuarioDB });
    await expect(service.login({ email: "joao@test.com", senha: "senhaErrada" })).rejects.toThrow(
      UnauthorizedException
    );
  });

  it("retorna accessToken e refreshToken para credenciais corretas", async () => {
    const { service } = buildAuthService({ usuarioPorEmail: baseUsuarioDB });
    const result = await service.login({ email: "joao@test.com", senha: "Senha@123" });
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.usuario.usuarioId).toBe(USUARIO_ID);
  });

  it("accessToken e refreshToken são tokens distintos", async () => {
    const { service } = buildAuthService({ usuarioPorEmail: baseUsuarioDB });
    const result = await service.login({ email: "joao@test.com", senha: "Senha@123" });
    expect(result.accessToken).not.toBe(result.refreshToken);
  });

  it("token de acesso assina sem type; refresh assina com type: 'refresh'", async () => {
    const { service, jwt } = buildAuthService({ usuarioPorEmail: baseUsuarioDB });
    await service.login({ email: "joao@test.com", senha: "Senha@123" });

    const calls: Array<[object, object]> = jwt.sign.mock.calls;
    const accessCall = calls.find(([payload]: [any, any]) => !payload.type);
    const refreshCall = calls.find(([payload]: [any, any]) => payload.type === "refresh");

    expect(accessCall).toBeDefined();
    expect(refreshCall).toBeDefined();
  });
});

describe("AuthService.renovarToken", () => {
  it("lança UnauthorizedException se sessão não existe", async () => {
    const { service } = buildAuthService({ sessao: null });
    await expect(service.renovarToken("rt-inexistente")).rejects.toThrow(UnauthorizedException);
  });

  it("lança UnauthorizedException se sessão já foi revogada", async () => {
    const { service } = buildAuthService({
      sessao: {
        sessionId: "sess-001",
        usuarioId: USUARIO_ID,
        refreshToken: "rt-abc",
        revogadoEm: new Date(Date.now() - 1000),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    await expect(service.renovarToken("rt-abc")).rejects.toThrow(UnauthorizedException);
  });

  it("lança UnauthorizedException se sessão expirou", async () => {
    const { service } = buildAuthService({
      sessao: {
        sessionId: "sess-001",
        usuarioId: USUARIO_ID,
        refreshToken: "rt-abc",
        revogadoEm: null,
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    await expect(service.renovarToken("rt-abc")).rejects.toThrow(UnauthorizedException);
  });

  it("revoga a sessão atual (token rotation — impede reutilização do mesmo refresh)", async () => {
    const { service, prisma } = buildAuthService();
    await service.renovarToken("rt-abc");
    expect(prisma.sessaoToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ revogadoEm: expect.any(Date) }),
      })
    );
  });

  it("retorna novos accessToken e refreshToken após renovação bem-sucedida", async () => {
    const { service } = buildAuthService();
    const result = await service.renovarToken("rt-abc");
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });
});

describe("AuthService.esqueceuSenha — prevenção de enumeração de usuários", () => {
  it("retorna a mesma mensagem quando usuário NÃO existe (não vaza se email está cadastrado)", async () => {
    const { service } = buildAuthService({ usuarioPorEmail: null });
    const result = await service.esqueceuSenha("naocadastrado@test.com");
    expect(result.message).toMatch(/se o email estiver cadastrado/i);
  });

  it("retorna a mesma mensagem quando usuário EXISTE (resposta indistinguível)", async () => {
    const { service } = buildAuthService({ usuarioPorEmail: baseUsuarioDB });
    const result = await service.esqueceuSenha("joao@test.com");
    expect(result.message).toMatch(/se o email estiver cadastrado/i);
  });

  it("NÃO envia email quando usuário não existe", async () => {
    const { service, email } = buildAuthService({ usuarioPorEmail: null });
    await service.esqueceuSenha("ghost@test.com");
    expect(email.recuperacaoSenhaEmail).not.toHaveBeenCalled();
  });

  it("salva token hasheado no banco, não o token cru", async () => {
    const { service, prisma } = buildAuthService({ usuarioPorEmail: baseUsuarioDB });
    await service.esqueceuSenha("joao@test.com");

    const updateCall = prisma.usuario.update.mock.calls[0][0];
    const salvo = updateCall.data.passwordResetToken as string;

    // O token que foi enviado por email é o cru — mas o banco deve ter o hash SHA-256
    const emailCall = (service as any)["email"].recuperacaoSenhaEmail.mock.calls[0];
    const tokenCru = emailCall[2] as string;
    const hashEsperado = crypto.createHash("sha256").update(tokenCru).digest("hex");

    expect(salvo).toBe(hashEsperado);
    expect(salvo).not.toBe(tokenCru);
  });
});
