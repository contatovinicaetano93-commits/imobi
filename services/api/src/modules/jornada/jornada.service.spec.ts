import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { JornadaService } from "./jornada.service";
import { PrismaService } from "../prisma/prisma.service";
import { KycService } from "../kyc/kyc.service";
import { ManagerService } from "../manager/manager.service";

describe("JornadaService", () => {
  let service: JornadaService;

  const prisma = {
    obra: { count: jest.fn() },
    credito: { findMany: jest.fn() },
    etapaObra: { count: jest.fn() },
  };

  const kyc = {
    obterStatus: jest.fn(),
  };

  const manager = {
    obterEstatisticas: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JornadaService,
        { provide: PrismaService, useValue: prisma },
        { provide: KycService, useValue: kyc },
        { provide: ManagerService, useValue: manager },
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
    });

    it("retorna passo KYC quando não aprovado", async () => {
      kyc.obterStatus.mockResolvedValue({ status: "PENDENTE", documentos: [] });

      const j = await service.obter(userId, "TOMADOR");

      expect(j.passoAtual).toBe("kyc");
      expect(j.href).toBe("/dashboard/kyc");
      expect(j.concluido).toBe(false);
    });

    it("retorna obra após KYC aprovado", async () => {
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
        { liberacoes: [{ status: "CONCLUIDA" }] },
      ]);

      const j = await service.obter(userId, "TOMADOR");

      expect(j.passoAtual).toBe("acompanhar");
      expect(j.concluido).toBe(true);
      expect(j.progressoPct).toBe(100);
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
      prisma.obra.count.mockResolvedValue(0);

      await expect(service.assertPodeSolicitarCredito("t1")).rejects.toThrow(
        /Cadastre uma obra/,
      );
    });
  });
});
