import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { ObrasService } from "../obras/obras.service";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../../cache.service";

describe("ObrasService", () => {
  let service: ObrasService;
  let prisma: jest.Mocked<PrismaService>;
  let cache: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const prismaMock = {
      obra: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      etapaObra: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const cacheMock = {
      get: jest.fn(),
      set: jest.fn(),
      invalidateUserCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObrasService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: CacheService,
          useValue: cacheMock,
        },
      ],
    }).compile();

    service = module.get<ObrasService>(ObrasService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    cache = module.get(CacheService) as jest.Mocked<CacheService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("criar", () => {
    it("should create a new obra with default etapas", async () => {
      const usuarioId = "user-123";
      const creditoId = "credito-123";
      const input = {
        nome: "Obra Test",
        creditoId,
        endereco: "Rua Test, 123",
        geo: {
          latitude: -23.5505,
          longitude: -46.6333,
          raioValidacaoMetros: 50,
        },
        areaM2: 100,
      };

      const createdObra = {
        obraId: "obra-123",
        usuarioId,
        creditoId,
        nome: input.nome,
        geoLatitude: input.geo.latitude,
        geoLongitude: input.geo.longitude,
        raioValidacaoMetros: input.geo.raioValidacaoMetros,
        areaM2: input.areaM2,
        etapas: [
          { etapaId: "etapa-1", nome: "Fundação", ordem: 1 },
          { etapaId: "etapa-2", nome: "Estrutura", ordem: 2 },
        ],
      };

      prisma.$transaction.mockImplementation(async (cb) => {
        prisma.obra.create.mockResolvedValue({} as any);
        prisma.etapaObra.createMany.mockResolvedValue({ count: 2 } as any);
        prisma.obra.findUnique.mockResolvedValue(createdObra as any);
        return cb({
          obra: {
            create: prisma.obra.create,
            findUnique: prisma.obra.findUnique,
          },
          etapaObra: {
            createMany: prisma.etapaObra.createMany,
          },
        });
      });

      const result = await service.criar(usuarioId, input);

      expect(result.obraId).toBe("obra-123");
      expect(result.etapas).toHaveLength(2);
      expect(cache.invalidateUserCache).toHaveBeenCalledWith(usuarioId);
    });

    it("should use default geo values if not provided", async () => {
      const usuarioId = "user-123";
      const creditoId = "credito-123";
      const input = {
        nome: "Obra Test",
        creditoId,
        endereco: "Rua Test, 123",
        areaM2: 100,
      };

      prisma.$transaction.mockImplementation(async (cb) => {
        prisma.obra.create.mockResolvedValue({} as any);
        prisma.etapaObra.createMany.mockResolvedValue({ count: 2 } as any);
        prisma.obra.findUnique.mockResolvedValue({
          obraId: "obra-123",
          geoLatitude: 0,
          geoLongitude: 0,
          raioValidacaoMetros: 50,
          etapas: [],
        } as any);
        return cb({
          obra: {
            create: prisma.obra.create,
            findUnique: prisma.obra.findUnique,
          },
          etapaObra: {
            createMany: prisma.etapaObra.createMany,
          },
        });
      });

      const result = await service.criar(usuarioId, input);

      expect(result.geoLatitude).toBe(0);
      expect(result.geoLongitude).toBe(0);
      expect(result.raioValidacaoMetros).toBe(50);
    });
  });

  describe("listar", () => {
    it("should return cached obras if available", async () => {
      const usuarioId = "user-123";
      const cachedObras = [
        { obraId: "obra-1", nome: "Obra 1" },
        { obraId: "obra-2", nome: "Obra 2" },
      ];

      cache.get.mockResolvedValue(cachedObras);

      const result = await service.listar(usuarioId);

      expect(result).toEqual(cachedObras);
      expect(prisma.obra.findMany).not.toHaveBeenCalled();
    });

    it("should fetch from database and cache if not cached", async () => {
      const usuarioId = "user-123";
      const obras = [
        {
          obraId: "obra-1",
          nome: "Obra 1",
          etapas: [{ etapaId: "etapa-1", nome: "Fundação" }],
        },
      ];

      cache.get.mockResolvedValue(null);
      prisma.obra.findMany.mockResolvedValue(obras as any);

      const result = await service.listar(usuarioId);

      expect(result).toEqual(obras);
      expect(cache.set).toHaveBeenCalledWith(
        `user:${usuarioId}:obras`,
        obras,
        120,
      );
    });

    it("should return empty array if user has no obras", async () => {
      const usuarioId = "user-123";

      cache.get.mockResolvedValue(null);
      prisma.obra.findMany.mockResolvedValue([]);

      const result = await service.listar(usuarioId);

      expect(result).toHaveLength(0);
    });
  });

  describe("buscar", () => {
    const usuarioId = "user-123";
    const obraId = "obra-123";

    const obra = {
      obraId,
      usuarioId,
      nome: "Obra Test",
      etapas: [
        {
          etapaId: "etapa-1",
          nome: "Fundação",
          evidencias: [
            { evidenciaId: "evid-1", fotoUrl: "https://s3.../1.jpg" },
          ],
        },
      ],
      credito: {
        creditoId: "credito-123",
        valorAprovado: 100000,
        valorLiberado: 50000,
        status: "ATIVO",
      },
    };

    it("should return obra details with authorized access", async () => {
      prisma.obra.findUnique.mockResolvedValue(obra as any);

      const result = await service.buscar(usuarioId, obraId);

      expect(result.obraId).toBe(obraId);
      expect(result.etapas).toBeDefined();
      expect(result.credito).toBeDefined();
    });

    it("should throw NotFoundException if obra not found", async () => {
      prisma.obra.findUnique.mockResolvedValue(null);

      await expect(service.buscar(usuarioId, obraId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.buscar(usuarioId, obraId)).rejects.toThrow(
        "Obra não encontrada",
      );
    });

    it("should throw ForbiddenException if user is not owner", async () => {
      const otherUserId = "user-999";
      prisma.obra.findUnique.mockResolvedValue(obra as any);

      await expect(
        service.buscar(otherUserId, obraId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("progressoGeral", () => {
    const obraId = "obra-123";

    it("should return cached progress if available", async () => {
      cache.get.mockResolvedValue(75);

      const result = await service.progressoGeral(obraId);

      expect(result).toBe(75);
      expect(prisma.etapaObra.findMany).not.toHaveBeenCalled();
    });

    it("should calculate progress from etapas", async () => {
      const etapas = [
        { status: "CONCLUIDA", percentualObra: 25 },
        { status: "CONCLUIDA", percentualObra: 25 },
        { status: "EM_ANDAMENTO", percentualObra: 25 },
        { status: "PENDENTE", percentualObra: 25 },
      ];

      cache.get.mockResolvedValue(null);
      prisma.etapaObra.findMany.mockResolvedValue(etapas as any);

      const result = await service.progressoGeral(obraId);

      expect(result).toBe(50); // 2 de 4 etapas concluídas
      expect(cache.set).toHaveBeenCalledWith(
        `obra:${obraId}:progresso`,
        50,
        60,
      );
    });

    it("should return 0 if no etapas", async () => {
      cache.get.mockResolvedValue(null);
      prisma.etapaObra.findMany.mockResolvedValue([]);

      const result = await service.progressoGeral(obraId);

      expect(result).toBe(0);
    });

    it("should handle all etapas completed", async () => {
      const etapas = [
        { status: "CONCLUIDA", percentualObra: 50 },
        { status: "CONCLUIDA", percentualObra: 50 },
      ];

      cache.get.mockResolvedValue(null);
      prisma.etapaObra.findMany.mockResolvedValue(etapas as any);

      const result = await service.progressoGeral(obraId);

      expect(result).toBe(100);
    });

    it("should handle decimal percentuals correctly", async () => {
      const etapas = [
        { status: "CONCLUIDA", percentualObra: 33.33 },
        { status: "CONCLUIDA", percentualObra: 33.33 },
        { status: "PENDENTE", percentualObra: 33.34 },
      ];

      cache.get.mockResolvedValue(null);
      prisma.etapaObra.findMany.mockResolvedValue(etapas as any);

      const result = await service.progressoGeral(obraId);

      expect(result).toBe(67); // Rounded to nearest integer
    });
  });
});
