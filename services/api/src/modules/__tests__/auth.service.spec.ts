import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import {
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { EncryptionService } from "../../common/encryption.service";
import { userFixtures } from "./fixtures/user.fixture";

// Mock bcryptjs
jest.mock("bcryptjs");

describe("AuthService", () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwt: jest.Mocked<JwtService>;
  let encryption: jest.Mocked<EncryptionService>;

  beforeEach(async () => {
    // Mock dependencies
    const prismaMock = {
      usuario: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      sessaoToken: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const jwtMock = {
      sign: jest.fn(),
      verify: jest.fn(),
      decode: jest.fn(),
    };

    const encryptionMock = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: jwtMock,
        },
        {
          provide: EncryptionService,
          useValue: encryptionMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    jwt = module.get(JwtService) as jest.Mocked<JwtService>;
    encryption = module.get(EncryptionService) as jest.Mocked<EncryptionService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("registrar", () => {
    it("should register a new user successfully", async () => {
      const input = userFixtures.validCadastro;
      const hashedPassword = "hashed_password";

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      prisma.usuario.findFirst.mockResolvedValue(null);
      prisma.usuario.create.mockResolvedValue({
        usuarioId: "user-123",
        nome: input.nome,
        email: input.email,
        tipo: "TOMADOR",
        kycStatus: "PENDENTE",
      } as any);
      jwt.sign.mockReturnValue("token_value");
      encryption.encrypt.mockReturnValue("encrypted_token");
      prisma.sessaoToken.create.mockResolvedValue({} as any);

      const result = await service.registrar(input);

      expect(result).toHaveProperty("usuario");
      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result.usuario.email).toBe(input.email);
      expect(prisma.usuario.create).toHaveBeenCalled();
    });

    it("should throw ConflictException if email already exists", async () => {
      const input = userFixtures.validCadastro;

      prisma.usuario.findFirst.mockResolvedValue({
        usuarioId: "existing-user",
        email: input.email,
      } as any);

      await expect(service.registrar(input)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.registrar(input)).rejects.toThrow(
        "E-mail ou CPF já cadastrado",
      );
    });

    it("should throw ConflictException if CPF already exists", async () => {
      const input = userFixtures.validCadastro;

      prisma.usuario.findFirst.mockResolvedValue({
        usuarioId: "existing-user",
        cpf: input.cpf,
      } as any);

      await expect(service.registrar(input)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should hash password with bcrypt", async () => {
      const input = userFixtures.validCadastro;
      const hashedPassword = "hashed_password";

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      prisma.usuario.findFirst.mockResolvedValue(null);
      prisma.usuario.create.mockResolvedValue({
        usuarioId: "user-123",
        nome: input.nome,
        email: input.email,
        tipo: "TOMADOR",
        kycStatus: "PENDENTE",
      } as any);
      jwt.sign.mockReturnValue("token_value");
      encryption.encrypt.mockReturnValue("encrypted_token");
      prisma.sessaoToken.create.mockResolvedValue({} as any);

      await service.registrar(input);

      expect(bcrypt.hash).toHaveBeenCalledWith(input.senha, 12);
    });
  });

  describe("login", () => {
    it("should login successfully with valid credentials", async () => {
      const input = userFixtures.validLogin;
      const usuario = {
        usuarioId: "user-123",
        nome: "João Silva",
        email: input.email,
        passwordHash: "hashed_password",
        tipo: "TOMADOR",
      };

      prisma.usuario.findUnique.mockResolvedValue(usuario as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwt.sign.mockReturnValue("token_value");
      encryption.encrypt.mockReturnValue("encrypted_token");
      prisma.sessaoToken.create.mockResolvedValue({} as any);

      const result = await service.login(input);

      expect(result).toHaveProperty("usuario");
      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result.usuario.email).toBe(input.email);
    });

    it("should throw UnauthorizedException if user not found", async () => {
      const input = userFixtures.validLogin;

      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(service.login(input)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(input)).rejects.toThrow(
        "Credenciais inválidas",
      );
    });

    it("should throw UnauthorizedException if password is incorrect", async () => {
      const input = userFixtures.validLogin;
      const usuario = {
        usuarioId: "user-123",
        nome: "João Silva",
        email: input.email,
        passwordHash: "hashed_password",
        tipo: "TOMADOR",
      };

      prisma.usuario.findUnique.mockResolvedValue(usuario as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(input)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should compare password with bcrypt", async () => {
      const input = userFixtures.validLogin;
      const usuario = {
        usuarioId: "user-123",
        nome: "João Silva",
        email: input.email,
        passwordHash: "hashed_password",
        tipo: "TOMADOR",
      };

      prisma.usuario.findUnique.mockResolvedValue(usuario as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwt.sign.mockReturnValue("token_value");
      encryption.encrypt.mockReturnValue("encrypted_token");
      prisma.sessaoToken.create.mockResolvedValue({} as any);

      await service.login(input);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        input.senha,
        usuario.passwordHash,
      );
    });
  });

  describe("renovarToken", () => {
    it("should refresh token successfully", async () => {
      const refreshToken = "old_refresh_token";
      const usuarioId = "user-123";

      jwt.verify.mockReturnValue({ sub: usuarioId });

      const sessao = {
        sessionId: "session-123",
        usuarioId,
        refreshToken: "encrypted_token",
        revogadoEm: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      encryption.decrypt.mockReturnValue(refreshToken);
      jwt.sign.mockReturnValue("new_token");

      const transactionCb = jest.fn(async (cb: any) => {
        prisma.sessaoToken.findFirst.mockResolvedValue(sessao as any);
        prisma.sessaoToken.update.mockResolvedValue({} as any);
        prisma.sessaoToken.create.mockResolvedValue({} as any);
        return cb({
          sessaoToken: {
            findFirst: prisma.sessaoToken.findFirst,
            update: prisma.sessaoToken.update,
            create: prisma.sessaoToken.create,
          },
        });
      });

      prisma.$transaction.mockImplementation(transactionCb);

      const result = await service.renovarToken(refreshToken);

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(jwt.verify).toHaveBeenCalledWith(refreshToken);
    });

    it("should throw UnauthorizedException if token is invalid", async () => {
      const refreshToken = "invalid_token";

      jwt.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(service.renovarToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.renovarToken(refreshToken)).rejects.toThrow(
        "Token inválido ou expirado",
      );
    });

    it("should throw UnauthorizedException if token has no subject", async () => {
      const refreshToken = "token_without_sub";

      jwt.verify.mockReturnValue({});

      await expect(service.renovarToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.renovarToken(refreshToken)).rejects.toThrow(
        "Token inválido",
      );
    });
  });

  describe("revogarToken", () => {
    it("should revoke token successfully", async () => {
      const refreshToken = "token_to_revoke";
      const usuarioId = "user-123";

      jwt.decode.mockReturnValue({ sub: usuarioId });
      prisma.sessaoToken.updateMany.mockResolvedValue({ count: 1 } as any);

      await service.revogarToken(refreshToken);

      expect(prisma.sessaoToken.updateMany).toHaveBeenCalledWith({
        where: { usuarioId },
        data: { revogadoEm: expect.any(Date) },
      });
    });

    it("should handle token without subject gracefully", async () => {
      const refreshToken = "invalid_token";

      jwt.decode.mockReturnValue({});

      // Should not throw
      await expect(service.revogarToken(refreshToken)).resolves.toBeUndefined();
      expect(prisma.sessaoToken.updateMany).not.toHaveBeenCalled();
    });
  });
});
