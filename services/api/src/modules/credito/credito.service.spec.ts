import { Test, TestingModule } from "@nestjs/testing";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { CreditoService } from "./credito.service";
import { PrismaService } from "../prisma/prisma.service";
import { JornadaService } from "../jornada/jornada.service";
import { jornadaUsuarioCacheKey } from "../jornada/jornada-cache";

describe("CreditoService", () => {
  let service: CreditoService;

  const prisma = {
    credito: { create: jest.fn() },
  };

  const jornada = {
    assertPodeSolicitarCredito: jest.fn().mockResolvedValue(undefined),
  };

  const cache = {
    del: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditoService,
        { provide: PrismaService, useValue: prisma },
        { provide: JornadaService, useValue: jornada },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile();

    service = module.get(CreditoService);
    jest.clearAllMocks();
  });

  describe("solicitar", () => {
    it("invalida cache da jornada após criar crédito", async () => {
      const usuarioId = "u1";
      prisma.credito.create.mockResolvedValue({ creditoId: "c1", usuarioId });

      await service.solicitar(usuarioId, {
        valorSolicitado: 100_000,
        prazoMeses: 24,
      });

      expect(jornada.assertPodeSolicitarCredito).toHaveBeenCalledWith(usuarioId);
      expect(cache.del).toHaveBeenCalledWith("jornada:gestor");
      expect(cache.del).toHaveBeenCalledWith(jornadaUsuarioCacheKey(usuarioId));
    });
  });
});
