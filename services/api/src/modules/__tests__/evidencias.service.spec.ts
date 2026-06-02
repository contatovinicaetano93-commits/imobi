import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { EvidenciasService } from "../evidencias/evidencias.service";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

describe("EvidenciasService", () => {
  let service: EvidenciasService;
  let prisma: jest.Mocked<PrismaService>;
  let storage: jest.Mocked<StorageService>;

  beforeEach(async () => {
    const prismaMock = {
      etapaObra: {
        findUnique: jest.fn(),
      },
      evidenciaEtapa: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const storageMock = {
      upload: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidenciasService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: StorageService,
          useValue: storageMock,
        },
      ],
    }).compile();

    service = module.get<EvidenciasService>(EvidenciasService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    storage = module.get(StorageService) as jest.Mocked<StorageService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("upload", () => {
    const usuarioId = "user-123";
    const etapaId = "etapa-123";
    const obraId = "obra-123";
    const fileBuffer = Buffer.from("fake image content");
    const mimeType = "image/jpeg";

    const uploadInput = {
      etapaId,
      latitude: -23.5505,
      longitude: -46.6333,
      accuracyMetros: 10,
      descricao: "Test evidence",
    };

    const etapaWithObra = {
      etapaId,
      obra: {
        obraId,
        usuarioId,
        geoLatitude: -23.5505,
        geoLongitude: -46.6333,
        raioValidacaoMetros: 50,
      },
    };

    it("should upload evidence successfully with valid data", async () => {
      prisma.etapaObra.findUnique.mockResolvedValue(etapaWithObra as any);
      prisma.$queryRaw.mockResolvedValue([{ dentro: true }]);
      storage.upload.mockResolvedValue({ url: "https://s3.../evidence.jpg" });
      prisma.evidenciaEtapa.create.mockResolvedValue({
        evidenciaId: "evid-123",
        etapaId,
        obraId,
        fotoUrl: "https://s3.../evidence.jpg",
        latCaptura: uploadInput.latitude,
        lngCaptura: uploadInput.longitude,
        accuracyMetros: uploadInput.accuracyMetros,
        distanciaObra: 0,
        observacao: uploadInput.descricao,
      } as any);

      const result = await service.upload(
        usuarioId,
        uploadInput,
        fileBuffer,
        mimeType,
      );

      expect(result.evidenciaId).toBe("evid-123");
      expect(storage.upload).toHaveBeenCalledWith(
        fileBuffer,
        mimeType,
        etapaId,
      );
      expect(prisma.evidenciaEtapa.create).toHaveBeenCalled();
    });

    it("should reject invalid image format", async () => {
      const invalidMimeType = "application/pdf";

      await expect(
        service.upload(usuarioId, uploadInput, fileBuffer, invalidMimeType),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.upload(usuarioId, uploadInput, fileBuffer, invalidMimeType),
      ).rejects.toThrow("Invalid image format");
    });

    it("should reject file exceeding 10MB", async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

      await expect(
        service.upload(usuarioId, uploadInput, largeBuffer, mimeType),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.upload(usuarioId, uploadInput, largeBuffer, mimeType),
      ).rejects.toThrow("exceeds 10MB");
    });

    it("should reject GPS accuracy > 15 meters", async () => {
      const badAccuracyInput = {
        ...uploadInput,
        accuracyMetros: 20, // Exceeds 15m limit
      };

      await expect(
        service.upload(usuarioId, badAccuracyInput, fileBuffer, mimeType),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.upload(usuarioId, badAccuracyInput, fileBuffer, mimeType),
      ).rejects.toThrow("Precisão GPS insuficiente");
    });

    it("should reject if etapa not found", async () => {
      prisma.etapaObra.findUnique.mockResolvedValue(null);

      await expect(
        service.upload(usuarioId, uploadInput, fileBuffer, mimeType),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.upload(usuarioId, uploadInput, fileBuffer, mimeType),
      ).rejects.toThrow("Etapa não encontrada");
    });

    it("should reject if user is not obra owner", async () => {
      const otherUserId = "user-999";
      prisma.etapaObra.findUnique.mockResolvedValue(etapaWithObra as any);

      await expect(
        service.upload(otherUserId, uploadInput, fileBuffer, mimeType),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.upload(otherUserId, uploadInput, fileBuffer, mimeType),
      ).rejects.toThrow("Acesso negado");
    });

    it("should reject location outside geofence", async () => {
      prisma.etapaObra.findUnique.mockResolvedValue(etapaWithObra as any);
      prisma.$queryRaw.mockResolvedValue([{ dentro: false }]);

      await expect(
        service.upload(usuarioId, uploadInput, fileBuffer, mimeType),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.upload(usuarioId, uploadInput, fileBuffer, mimeType),
      ).rejects.toThrow("Localização inválida");
    });
  });

  describe("listarPorEtapa", () => {
    it("should list evidence by etapa", async () => {
      const etapaId = "etapa-123";
      const evidencias = [
        {
          evidenciaId: "evid-1",
          etapaId,
          fotoUrl: "https://s3.../1.jpg",
          criadoEm: new Date(),
        },
        {
          evidenciaId: "evid-2",
          etapaId,
          fotoUrl: "https://s3.../2.jpg",
          criadoEm: new Date(),
        },
      ];

      prisma.evidenciaEtapa.findMany.mockResolvedValue(evidencias as any);

      const result = await service.listarPorEtapa(etapaId);

      expect(result).toHaveLength(2);
      expect(prisma.evidenciaEtapa.findMany).toHaveBeenCalledWith({
        where: { etapaId },
        orderBy: { criadoEm: "desc" },
      });
    });

    it("should return empty array if no evidence", async () => {
      const etapaId = "etapa-123";
      prisma.evidenciaEtapa.findMany.mockResolvedValue([]);

      const result = await service.listarPorEtapa(etapaId);

      expect(result).toHaveLength(0);
    });
  });

  describe("listarPorEtapaComValidacao", () => {
    const etapaId = "etapa-123";
    const usuarioId = "user-123";
    const obraId = "obra-123";

    it("should allow obra owner to view evidence", async () => {
      const etapa = {
        etapaId,
        obra: { usuarioId },
      };

      prisma.etapaObra.findUnique.mockResolvedValue(etapa as any);
      prisma.evidenciaEtapa.findMany.mockResolvedValue([]);

      const result = await service.listarPorEtapaComValidacao(
        usuarioId,
        "TOMADOR",
        etapaId,
      );

      expect(result).toBeDefined();
      expect(prisma.evidenciaEtapa.findMany).toHaveBeenCalled();
    });

    it("should allow ADMIN to view evidence", async () => {
      const etapa = {
        etapaId,
        obra: { usuarioId: "other-user" },
      };

      prisma.etapaObra.findUnique.mockResolvedValue(etapa as any);
      prisma.evidenciaEtapa.findMany.mockResolvedValue([]);

      const result = await service.listarPorEtapaComValidacao(
        "admin-user",
        "ADMIN",
        etapaId,
      );

      expect(result).toBeDefined();
    });

    it("should allow GESTOR_OBRA to view evidence", async () => {
      const etapa = {
        etapaId,
        obra: { usuarioId: "other-user" },
      };

      prisma.etapaObra.findUnique.mockResolvedValue(etapa as any);
      prisma.evidenciaEtapa.findMany.mockResolvedValue([]);

      const result = await service.listarPorEtapaComValidacao(
        "gestor-user",
        "GESTOR_OBRA",
        etapaId,
      );

      expect(result).toBeDefined();
    });

    it("should reject unauthorized access", async () => {
      const etapa = {
        etapaId,
        obra: { usuarioId: "other-user" },
      };

      prisma.etapaObra.findUnique.mockResolvedValue(etapa as any);

      await expect(
        service.listarPorEtapaComValidacao("unauthorized-user", "TOMADOR", etapaId),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should reject if etapa not found", async () => {
      prisma.etapaObra.findUnique.mockResolvedValue(null);

      await expect(
        service.listarPorEtapaComValidacao(usuarioId, "TOMADOR", etapaId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("validar", () => {
    it("should validate evidence successfully", async () => {
      const evidenciaId = "evid-123";
      const gestorId = "gestor-123";

      prisma.evidenciaEtapa.findUnique.mockResolvedValue({
        evidenciaId,
      } as any);
      prisma.evidenciaEtapa.update.mockResolvedValue({
        evidenciaId,
        validada: true,
        observacao: "Approved",
      } as any);

      const result = await service.validar(
        gestorId,
        evidenciaId,
        true,
        "Approved",
      );

      expect(result.validada).toBe(true);
      expect(prisma.evidenciaEtapa.update).toHaveBeenCalledWith({
        where: { evidenciaId },
        data: { validada: true, observacao: "Approved" },
      });
    });

    it("should reject evidence", async () => {
      const evidenciaId = "evid-123";
      const gestorId = "gestor-123";

      prisma.evidenciaEtapa.findUnique.mockResolvedValue({
        evidenciaId,
      } as any);
      prisma.evidenciaEtapa.update.mockResolvedValue({
        evidenciaId,
        validada: false,
        observacao: "Rejected",
      } as any);

      const result = await service.validar(
        gestorId,
        evidenciaId,
        false,
        "Rejected",
      );

      expect(result.validada).toBe(false);
    });

    it("should throw NotFoundException if evidence not found", async () => {
      const evidenciaId = "nonexistent";
      const gestorId = "gestor-123";

      prisma.evidenciaEtapa.findUnique.mockResolvedValue(null);

      await expect(
        service.validar(gestorId, evidenciaId, true),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.validar(gestorId, evidenciaId, true),
      ).rejects.toThrow("Evidência não encontrada");
    });
  });
});
