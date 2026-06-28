import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { getQueueToken } from "@nestjs/bull";
import { KycService } from "./kyc.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { PushNotificacoesService } from "../push-notificacoes/push-notificacoes.service";
import { StorageService } from "../storage/storage.service";
import { QUEUE_KYC_NOTIFY } from "../../common/constants";

describe("KycService", () => {
  let service: KycService;

  const prisma = {
    usuario: { findUnique: jest.fn(), update: jest.fn() },
    kycDocumento: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    kycAuditLog: { create: jest.fn() },
  };

  const storage = {
    useS3: jest.fn().mockReturnValue(false),
    assertStorageAvailable: jest.fn(),
    isLocalKey: jest.fn((key: string) => key.startsWith("local:kyc/")),
    uploadKycDocument: jest.fn().mockResolvedValue({
      key: "local:kyc/u1/RG_FRENTE/abc.jpg",
      url: "local:kyc/u1/RG_FRENTE/abc.jpg",
    }),
    readLocalFile: jest.fn(),
    getSignedUrl: jest.fn(),
  };

  const cache = {
    del: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificacoesService, useValue: { criar: jest.fn() } },
        { provide: getQueueToken(QUEUE_KYC_NOTIFY), useValue: { add: jest.fn() } },
        { provide: PushNotificacoesService, useValue: { enviarPush: jest.fn() } },
        { provide: StorageService, useValue: storage },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile();

    service = module.get(KycService);
    jest.clearAllMocks();
    storage.useS3.mockReturnValue(false);
  });

  describe("uploadDocumentoArquivo", () => {
    it("rejeita tipo inválido", async () => {
      prisma.usuario.findUnique.mockResolvedValue({ usuarioId: "u1" });

      await expect(
        service.uploadDocumentoArquivo("u1", "RG", Buffer.from("x"), "image/jpeg"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejeita mime inválido", async () => {
      prisma.usuario.findUnique.mockResolvedValue({ usuarioId: "u1" });

      await expect(
        service.uploadDocumentoArquivo("u1", "RG_FRENTE", Buffer.from("x"), "text/plain"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejeita arquivo maior que 10MB", async () => {
      prisma.usuario.findUnique.mockResolvedValue({ usuarioId: "u1" });
      const big = Buffer.alloc(10 * 1024 * 1024 + 1);

      await expect(
        service.uploadDocumentoArquivo("u1", "RG_FRENTE", big, "image/jpeg"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("persiste documento com chave local quando S3 desligado", async () => {
      prisma.usuario.findUnique.mockResolvedValue({ usuarioId: "u1" });
      prisma.kycDocumento.create.mockResolvedValue({
        kycDocumentoId: "d1",
        usuarioId: "u1",
        tipo: "RG_FRENTE",
        url: "local:kyc/u1/RG_FRENTE/abc.jpg",
        status: "PENDENTE",
      });

      const doc = await service.uploadDocumentoArquivo(
        "u1",
        "RG_FRENTE",
        Buffer.from("fake"),
        "image/jpeg",
      );

      expect(storage.uploadKycDocument).toHaveBeenCalled();
      expect(doc.url).toContain("/arquivo");
      expect(cache.del).toHaveBeenCalled();
    });
  });

  describe("uploadDocumento (deprecated)", () => {
    it("rejeita URL mock", async () => {
      await expect(
        service.uploadDocumento("u1", "RG_FRENTE", "https://s3.example.com/x.jpg"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("verificarKycCompleto", () => {
    it("exige os 4 tipos aprovados", async () => {
      prisma.kycDocumento.findMany.mockResolvedValue([
        { tipo: "RG_FRENTE", status: "APROVADO" },
        { tipo: "RG_VERSO", status: "APROVADO" },
        { tipo: "SELFIE", status: "APROVADO" },
        { tipo: "COMPROVANTE", status: "PENDENTE" },
      ]);

      const { completo } = await service.verificarKycCompleto("u1");
      expect(completo).toBe(false);
      expect(prisma.usuario.update).not.toHaveBeenCalled();
    });

    it("marca usuário APROVADO quando completo", async () => {
      prisma.kycDocumento.findMany.mockResolvedValue([
        { tipo: "RG_FRENTE", status: "APROVADO" },
        { tipo: "RG_VERSO", status: "APROVADO" },
        { tipo: "SELFIE", status: "APROVADO" },
        { tipo: "COMPROVANTE", status: "APROVADO" },
      ]);

      const { completo } = await service.verificarKycCompleto("u1");
      expect(completo).toBe(true);
      expect(prisma.usuario.update).toHaveBeenCalledWith({
        where: { usuarioId: "u1" },
        data: { kycStatus: "APROVADO" },
      });
    });
  });
});
