import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailService } from "../email/email.service";

describe("AdminService", () => {
  let service: AdminService;
  let prisma: PrismaService;
  let notificacoes: NotificacoesService;
  let email: EmailService;

  const mockPrisma = {
    usuario: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    obra: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    credito: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findUnique: jest.fn(),
    },
    liberacaoParcela: {
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    kycDocumento: {
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotificacoes = {
    criar: jest.fn(),
  };

  const mockEmail = {
    kycAprovadoEmail: jest.fn(),
    kycRejeitadoEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificacoesService, useValue: mockNotificacoes },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get<PrismaService>(PrismaService);
    notificacoes = module.get<NotificacoesService>(NotificacoesService);
    email = module.get<EmailService>(EmailService);

    jest.clearAllMocks();
  });

  describe("obterStats", () => {
    it("should return aggregated statistics", async () => {
      mockPrisma.usuario.count.mockResolvedValue(100);
      mockPrisma.usuario.groupBy.mockResolvedValue([
        { tipo: "TOMADOR", _count: 80 },
        { tipo: "ADMIN", _count: 20 },
      ]);
      mockPrisma.obra.count.mockResolvedValue(50);
      mockPrisma.obra.groupBy.mockResolvedValue([
        { status: "EM_EXECUCAO", _count: 30 },
        { status: "CONCLUIDA", _count: 20 },
      ]);
      mockPrisma.credito.count.mockResolvedValue(45);
      mockPrisma.credito.groupBy.mockResolvedValue([
        { status: "ATIVO", _count: 40 },
        { status: "QUITADO", _count: 5 },
      ]);
      mockPrisma.liberacaoParcela.count.mockResolvedValue(10);

      const result = await service.obterStats();

      expect(result.usuarios.total).toBe(100);
      expect(result.usuarios.porTipo.TOMADOR).toBe(80);
      expect(result.obras.total).toBe(50);
      expect(result.creditos.total).toBe(45);
      expect(result.liberacoes.pendentes).toBe(10);
    });
  });

  describe("listarKycPendentes", () => {
    it("should list pending KYC documents with pagination", async () => {
      const mockDocumentos = [
        {
          kycDocumentoId: "doc1",
          usuarioId: "user1",
          usuario: { usuarioId: "user1", nome: "João", email: "joao@test.com", cpf: "123" },
          status: "PENDENTE",
        },
      ];

      mockPrisma.kycDocumento.findMany.mockResolvedValue(mockDocumentos);
      mockPrisma.kycDocumento.count.mockResolvedValue(1);

      const result = await service.listarKycPendentes(0, 20);

      expect(result.documentos).toEqual(mockDocumentos);
      expect(result.total).toBe(1);
      expect(result.pagina).toBe(1);
    });
  });

  describe("aprovarKyc", () => {
    it("should approve KYC for a user", async () => {
      const userId = "user123";
      const mockUser = {
        usuarioId: userId,
        nome: "João Silva",
        email: "joao@test.com",
        kycStatus: "PENDENTE",
      };

      mockPrisma.usuario.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });
      mockNotificacoes.criar.mockResolvedValue({});
      mockEmail.kycAprovadoEmail.mockResolvedValue({});

      await service.aprovarKyc(userId);

      expect(mockPrisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { usuarioId: userId },
        select: expect.any(Object),
      });
      expect(mockNotificacoes.criar).toHaveBeenCalledWith(
        userId,
        "KYC_APROVADO",
        expect.any(String),
        expect.any(String)
      );
    });

    it("should throw error if user not found", async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      await expect(service.aprovarKyc("invalid-id")).rejects.toThrow(BadRequestException);
    });

    it("should throw error if KYC already approved", async () => {
      const userId = "user123";
      mockPrisma.usuario.findUnique.mockResolvedValue({
        usuarioId: userId,
        kycStatus: "APROVADO",
      });

      await expect(service.aprovarKyc(userId)).rejects.toThrow(BadRequestException);
    });
  });

  describe("rejeitarKyc", () => {
    it("should reject KYC with valid reason", async () => {
      const userId = "user123";
      const motivo = "Documentos ilegíveis";
      const mockUser = {
        usuarioId: userId,
        nome: "João Silva",
        email: "joao@test.com",
        kycStatus: "PENDENTE",
      };

      mockPrisma.usuario.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });
      mockNotificacoes.criar.mockResolvedValue({});
      mockEmail.kycRejeitadoEmail.mockResolvedValue({});

      await service.rejeitarKyc(userId, motivo);

      expect(mockPrisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { usuarioId: userId },
        select: expect.any(Object),
      });
      expect(mockNotificacoes.criar).toHaveBeenCalledWith(
        userId,
        "KYC_REJEITADO",
        expect.any(String),
        expect.stringContaining(motivo)
      );
    });

    it("should throw error if reason is empty", async () => {
      await expect(service.rejeitarKyc("user123", "")).rejects.toThrow(BadRequestException);
    });
  });
});
