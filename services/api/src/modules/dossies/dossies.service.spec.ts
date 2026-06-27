import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import {
  DueDiligenceStatus,
  DossieChecklistItemStatus,
  EstagioObraDossie,
} from "@prisma/client";
import { DossiesService } from "./dossies.service";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

describe("DossiesService", () => {
  let service: DossiesService;

  const tx = {
    dueDiligence: {
      create: jest.fn(),
      update: jest.fn(),
    },
    dossieChecklistItem: {
      updateMany: jest.fn(),
    },
    dossieAuditLog: {
      create: jest.fn(),
    },
  };

  const prisma = {
    dueDiligence: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    obra: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
  };

  const cache = {
    del: jest.fn().mockResolvedValue(undefined),
  };

  const dossieBase = {
    id: "d1",
    usuarioId: "t1",
    gestorId: null,
    estagioObra: EstagioObraDossie.NOVO,
    nomeEmpreendimento: "Residencial Teste",
    percentualFisico: 0,
    dataBase: new Date("2026-06-01"),
    payload: {},
    status: DueDiligenceStatus.RASCUNHO,
    checklistItens: [
      {
        id: "c1",
        itemId: "1",
        titulo: "Matrícula",
        obrigatorio: true,
        status: DossieChecklistItemStatus.ENVIADO,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DossiesService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: { assertStorageAvailable: jest.fn() } },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile();

    service = module.get(DossiesService);
    jest.clearAllMocks();
  });

  describe("checklistTemplate", () => {
    it("retorna itens para estágio NOVO", () => {
      const result = service.checklistTemplate("NOVO");
      expect(result.estagio).toBe("NOVO");
      expect(result.itens.length).toBeGreaterThan(0);
      expect(result.estagiosDisponiveis.length).toBe(3);
    });
  });

  describe("criar", () => {
    it("cria dossiê com checklist seed", async () => {
      tx.dueDiligence.create.mockResolvedValue({
        ...dossieBase,
        checklistItens: dossieBase.checklistItens,
      });
      tx.dossieAuditLog.create.mockResolvedValue({});

      const result = await service.criar("t1", {
        estagioObra: "NOVO",
        nomeEmpreendimento: "Residencial Teste",
      });

      expect(result.nomeEmpreendimento).toBe("Residencial Teste");
      expect(tx.dueDiligence.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            usuarioId: "t1",
            status: DueDiligenceStatus.RASCUNHO,
          }),
        }),
      );
    });
  });

  describe("assertPodeAcessar / buscar", () => {
    it("tomador acessa próprio dossiê", async () => {
      prisma.dueDiligence.findUnique.mockResolvedValue({
        ...dossieBase,
        checklistItens: [],
        obra: null,
      });

      const result = await service.buscar("d1", "t1", "TOMADOR");
      expect(result.id).toBe("d1");
    });

    it("tomador não acessa dossiê alheio", async () => {
      prisma.dueDiligence.findUnique.mockResolvedValue({
        ...dossieBase,
        usuarioId: "outro",
        checklistItens: [],
      });

      await expect(service.buscar("d1", "t1", "TOMADOR")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("gestor acessa qualquer dossiê", async () => {
      prisma.dueDiligence.findUnique.mockResolvedValue({
        ...dossieBase,
        usuarioId: "outro",
        checklistItens: [],
        obra: null,
      });

      const result = await service.buscar("d1", "g1", "GESTOR");
      expect(result.id).toBe("d1");
    });
  });

  describe("assertPodeEditar", () => {
    it("gestor não pode editar", async () => {
      prisma.dueDiligence.findUnique.mockResolvedValue({
        ...dossieBase,
        checklistItens: dossieBase.checklistItens,
      });

      await expect(
        service.atualizar("d1", "g1", "GESTOR", { nomeEmpreendimento: "X" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("bloqueia edição fora de RASCUNHO", async () => {
      prisma.dueDiligence.findUnique.mockResolvedValue({
        ...dossieBase,
        status: DueDiligenceStatus.ENVIADO,
        checklistItens: dossieBase.checklistItens,
      });

      await expect(
        service.atualizar("d1", "t1", "TOMADOR", { nomeEmpreendimento: "X" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("enviar", () => {
    it("bloqueia envio com checklist obrigatório pendente", async () => {
      prisma.dueDiligence.findUnique.mockResolvedValue({
        ...dossieBase,
        checklistItens: [
          {
            itemId: "1",
            titulo: "Matrícula",
            obrigatorio: true,
            status: DossieChecklistItemStatus.PENDENTE,
          },
        ],
      });

      await expect(service.enviar("d1", "t1", "TOMADOR")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("envia quando checklist completo e data-base ok", async () => {
      prisma.dueDiligence.findUnique.mockResolvedValue({
        ...dossieBase,
        checklistItens: dossieBase.checklistItens,
      });
      tx.dueDiligence.update.mockResolvedValue({
        ...dossieBase,
        status: DueDiligenceStatus.ENVIADO,
        checklistItens: dossieBase.checklistItens,
        obra: null,
      });
      tx.dossieAuditLog.create.mockResolvedValue({});

      const result = await service.enviar("d1", "t1", "TOMADOR");
      expect(result.status).toBe(DueDiligenceStatus.ENVIADO);
      expect(cache.del).toHaveBeenCalled();
    });
  });

  describe("atualizarStatus", () => {
    it("rejeita transição inválida", async () => {
      prisma.dueDiligence.findUnique.mockResolvedValue({
        ...dossieBase,
        status: DueDiligenceStatus.RASCUNHO,
      });

      await expect(
        service.atualizarStatus("d1", "a1", { status: "APROVADO" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("admin move ENVIADO → EM_ANALISE", async () => {
      prisma.dueDiligence.findUnique.mockResolvedValue({
        ...dossieBase,
        status: DueDiligenceStatus.ENVIADO,
      });
      tx.dueDiligence.update.mockResolvedValue({
        ...dossieBase,
        status: DueDiligenceStatus.EM_ANALISE,
        checklistItens: [],
        obra: null,
      });
      tx.dossieAuditLog.create.mockResolvedValue({});

      const result = await service.atualizarStatus("d1", "a1", {
        status: "EM_ANALISE",
      });
      expect(result.status).toBe(DueDiligenceStatus.EM_ANALISE);
    });
  });

  describe("temDossieAprovado", () => {
    it("retorna true quando há dossiê aprovado", async () => {
      prisma.dueDiligence.count.mockResolvedValue(1);
      await expect(service.temDossieAprovado("t1")).resolves.toBe(true);
    });

    it("retorna false quando não há", async () => {
      prisma.dueDiligence.count.mockResolvedValue(0);
      await expect(service.temDossieAprovado("t1")).resolves.toBe(false);
    });
  });

  describe("buscar — not found", () => {
    it("404 quando dossiê não existe", async () => {
      prisma.dueDiligence.findUnique.mockResolvedValue(null);
      await expect(service.buscar("x", "t1", "TOMADOR")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
