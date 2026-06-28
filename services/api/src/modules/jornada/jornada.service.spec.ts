import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { JornadaService } from "./jornada.service";
import { PrismaService } from "../prisma/prisma.service";
import { KycService } from "../kyc/kyc.service";
import { ManagerService } from "../manager/manager.service";
import { DossiesService } from "../dossies/dossies.service";
import { JORNADA_CACHE_TTL_MS, jornadaUsuarioCacheKey } from "./jornada-cache";

describe("JornadaService", () => {
  let service: JornadaService;

  const prisma = {
    obra: { count: jest.fn() },
    credito: { findMany: jest.fn() },
    etapaObra: { count: jest.fn() },
    dueDiligence: { findFirst: jest.fn() },
    solicitacaoCredito: { findFirst: jest.fn() },
  };

  const kyc = {
    obterStatus: jest.fn(),
  };

  const manager = {
    obterEstatisticas: jest.fn(),
  };

  const dossies = {
    temDossieAprovado: jest.fn(),
  };

  const cache = {
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JornadaService,
        { provide: PrismaService, useValue: prisma },
        { provide: KycService, useValue: kyc },
        { provide: ManagerService, useValue: manager },
        { provide: DossiesService, useValue: dossies },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile();

    service = module.get(JornadaService);
    jest.clearAllMocks();
  });

  describe("obter — gestor", () => {
    it("prioriza fila KYC", async () => {
      manager.obterEstatisticas.mockResolvedValue({ filaKyc: 3, filaAprovacoes: 5 });

      const j = await service.obter("g1", "GESTOR");

      expect(j.passoAtual).toBe("gestor_kyc");
      expect(j.href).toBe("/dashboard/gestor/kyc");
      expect(j.fila).toEqual({ kyc: 3, etapas: 5 });
    });

    it("aponta etapas quando KYC zerado", async () => {
      manager.obterEstatisticas.mockResolvedValue({ filaKyc: 0, filaAprovacoes: 2 });

      const j = await service.obter("g1", "GESTOR");

      expect(j.passoAtual).toBe("gestor_etapas");
      expect(j.href).toBe("/dashboard/gestor/etapas");
    });

    it("marca concluído quando filas zeradas", async () => {
      manager.obterEstatisticas.mockResolvedValue({ filaKyc: 0, filaAprovacoes: 0 });

      const j = await service.obter("g1", "GESTOR");

      expect(j.passoAtual).toBe("gestor_ok");
      expect(j.concluido).toBe(true);
      expect(j.progressoPct).toBe(100);
    });
  });

  describe("obter — tomador", () => {
    const userId = "t1";

    beforeEach(() => {
      prisma.obra.count.mockResolvedValue(0);
      prisma.credito.findMany.mockResolvedValue([]);
      prisma.etapaObra.count.mockResolvedValue(0);
      prisma.dueDiligence.findFirst.mockResolvedValue(null);
      prisma.solicitacaoCredito.findFirst.mockResolvedValue(null);
      dossies.temDossieAprovado.mockResolvedValue(true);
    });

    it("retorna passo KYC quando não aprovado", async () => {
      kyc.obterStatus.mockResolvedValue({ status: "PENDENTE", documentos: [] });

      const j = await service.obter(userId, "TOMADOR");

      expect(j.passoAtual).toBe("kyc");
      expect(j.href).toBe("/dashboard/kyc");
      expect(j.concluido).toBe(false);
    });

    it("retorna viabilidade após KYC aprovado sem dossiê", async () => {
      kyc.obterStatus.mockResolvedValue({ status: "APROVADO", documentos: [] });
      dossies.temDossieAprovado.mockResolvedValue(false);

      const j = await service.obter(userId, "TOMADOR");

      expect(j.passoAtual).toBe("viabilidade");
      expect(j.href).toBe("/dashboard/proposta-credito");
    });

    it("retorna obra após KYC e dossiê aprovados", async () => {
      kyc.obterStatus.mockResolvedValue({ status: "APROVADO", documentos: [] });

      const j = await service.obter(userId, "TOMADOR");

      expect(j.passoAtual).toBe("obra");
      expect(j.href).toBe("/dashboard/obras/nova");
    });

    it("retorna crédito com obra cadastrada", async () => {
      kyc.obterStatus.mockResolvedValue({ status: "APROVADO", documentos: [] });
      prisma.obra.count.mockResolvedValue(1);

      const j = await service.obter(userId, "TOMADOR");

      expect(j.passoAtual).toBe("credito");
      expect(j.href).toBe("/dashboard/credito/solicitar");
    });

    it("retorna acompanhar com liberação concluída", async () => {
      kyc.obterStatus.mockResolvedValue({ status: "APROVADO", documentos: [] });
      prisma.obra.count.mockResolvedValue(1);
      prisma.credito.findMany.mockResolvedValue([
        { status: "ATIVO", liberacoes: [{ status: "CONCLUIDA" }] },
      ]);

      const j = await service.obter(userId, "TOMADOR");

      expect(j.passoAtual).toBe("acompanhar");
      expect(j.concluido).toBe(true);
      expect(j.progressoPct).toBe(100);
    });
  });

  describe("cache", () => {
    it("reutiliza resposta em cache para tomador", async () => {
      const cached = {
        perfil: "tomador" as const,
        passoAtual: "kyc" as const,
        titulo: "cached",
        descricao: "",
        href: "/dashboard/kyc",
        concluido: false,
        passosConcluidos: 0,
        totalPassos: 6,
        progressoPct: 0,
      };
      cache.get.mockResolvedValueOnce(cached);

      const j = await service.obter("t1", "TOMADOR");

      expect(j.titulo).toBe("cached");
      expect(kyc.obterStatus).not.toHaveBeenCalled();
    });

    it("grava no cache após calcular", async () => {
      kyc.obterStatus.mockResolvedValue({ status: "PENDENTE", documentos: [] });
      prisma.obra.count.mockResolvedValue(0);
      prisma.credito.findMany.mockResolvedValue([]);
      prisma.etapaObra.count.mockResolvedValue(0);
      prisma.solicitacaoCredito.findFirst.mockResolvedValue(null);
      cache.get.mockResolvedValueOnce(undefined);

      await service.obter("t1", "TOMADOR");

      expect(cache.set).toHaveBeenCalledWith(
        jornadaUsuarioCacheKey("t1"),
        expect.objectContaining({ passoAtual: "kyc" }),
        JORNADA_CACHE_TTL_MS,
      );
    });
  });

  describe("assertPodeSolicitarCredito", () => {
    it("bloqueia sem KYC aprovado", async () => {
      kyc.obterStatus.mockResolvedValue({ status: "PENDENTE" });

      await expect(service.assertPodeSolicitarCredito("t1")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("bloqueia sem obra", async () => {
      kyc.obterStatus.mockResolvedValue({ status: "APROVADO" });
      dossies.temDossieAprovado.mockResolvedValue(true);
      prisma.obra.count.mockResolvedValue(0);

      await expect(service.assertPodeSolicitarCredito("t1")).rejects.toThrow(
        /Cadastre uma obra/,
      );
    });

    it("bloqueia sem dossiê aprovado", async () => {
      kyc.obterStatus.mockResolvedValue({ status: "APROVADO" });
      dossies.temDossieAprovado.mockResolvedValue(false);

      await expect(service.assertPodeSolicitarCredito("t1")).rejects.toThrow(
        /dossiê de viabilidade/,
      );
    });
  });

  describe("assertPodeCadastrarObra", () => {
    it("bloqueia sem KYC aprovado", async () => {
      kyc.obterStatus.mockResolvedValue({ status: "PENDENTE" });

      await expect(service.assertPodeCadastrarObra("t1")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("bloqueia sem dossiê aprovado", async () => {
      kyc.obterStatus.mockResolvedValue({ status: "APROVADO" });
      dossies.temDossieAprovado.mockResolvedValue(false);

      await expect(service.assertPodeCadastrarObra("t1")).rejects.toThrow(
        /dossiê de viabilidade/,
      );
    });
  });
});
