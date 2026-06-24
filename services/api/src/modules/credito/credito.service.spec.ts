import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { CreditoService } from "./credito.service";
import { PrismaService } from "../prisma/prisma.service";
import { JornadaService } from "../jornada/jornada.service";
import { jornadaUsuarioCacheKey } from "../jornada/jornada-cache";

describe("CreditoService", () => {
  let service: CreditoService;

  const prisma = {
    credito: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
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

  describe("extrato", () => {
    const creditoBase = {
      creditoId: "c1",
      usuarioId: "u1",
      valorAprovado: 100_000,
      valorLiberado: 50_000,
      taxaMensal: 0.0099,
      prazoMeses: 12,
      status: "ATIVO",
      criadoEm: new Date("2026-01-15T10:00:00Z"),
      liberacoes: [
        {
          liberacaoId: "l1",
          valor: 25_000,
          status: "CONCLUIDA",
          criadoEm: new Date("2026-02-01"),
          processadoEm: new Date("2026-02-01"),
          motivo: null,
        },
      ],
    };

    it("retorna cronograma e campos do extrato", async () => {
      prisma.credito.findUnique.mockResolvedValue(creditoBase);

      const extrato = await service.extrato("c1", "u1");

      expect(extrato.creditoId).toBe("c1");
      expect(extrato.valorSolicitado).toBe(100_000);
      expect(extrato.cronograma).toHaveLength(12);
      expect(extrato.resumo.parcelasPagas).toBe(1);
      expect(extrato.criadoEm).toBeDefined();
    });

    it("nega acesso a outro usuário", async () => {
      prisma.credito.findUnique.mockResolvedValue(creditoBase);

      await expect(service.extrato("c1", "outro")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("404 quando crédito não existe", async () => {
      prisma.credito.findUnique.mockResolvedValue(null);

      await expect(service.extrato("x", "u1")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
