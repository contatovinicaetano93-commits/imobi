import { Test } from "@nestjs/testing";
import { CreditoService } from "./credito.service";
import { PrismaService } from "../prisma/prisma.service";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";

const mockPrisma = {
  credito: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  liberacaoParcela: {
    findMany: jest.fn(),
  },
};

describe("CreditoService — liberacoes + cancelar", () => {
  let service: CreditoService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CreditoService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(CreditoService);
  });

  describe("liberacoes", () => {
    it("returns liberacoes for own credit", async () => {
      mockPrisma.credito.findUnique.mockResolvedValue({ usuarioId: "uid1" });
      mockPrisma.liberacaoParcela.findMany.mockResolvedValue([
        { liberacaoId: "l1", valor: 5000, status: "PROCESSADO", processadoEm: new Date(), motivo: null, criadoEm: new Date() },
      ]);

      const result = await service.liberacoes("cred-1", "uid1");
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].valor).toBe(5000);
    });

    it("throws ForbiddenException for another user's credit", async () => {
      mockPrisma.credito.findUnique.mockResolvedValue({ usuarioId: "uid-other" });
      await expect(service.liberacoes("cred-1", "uid-me")).rejects.toThrow(ForbiddenException);
    });

    it("throws NotFoundException when credit not found", async () => {
      mockPrisma.credito.findUnique.mockResolvedValue(null);
      await expect(service.liberacoes("nonexistent", "uid1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("cancelar", () => {
    it("cancels an active credit", async () => {
      mockPrisma.credito.findUnique.mockResolvedValue({ creditoId: "c1", status: "ATIVO" });
      mockPrisma.credito.update.mockResolvedValue({ creditoId: "c1", status: "CANCELADO" });

      const result = await service.cancelar("c1", "Solicitado pelo tomador");
      expect(result).toEqual({ ok: true, creditoId: "c1", motivo: "Solicitado pelo tomador" });
      expect(mockPrisma.credito.update).toHaveBeenCalledWith({
        where: { creditoId: "c1" },
        data: { status: "CANCELADO" },
      });
    });

    it("throws BadRequestException when already cancelled", async () => {
      mockPrisma.credito.findUnique.mockResolvedValue({ creditoId: "c2", status: "CANCELADO" });
      await expect(service.cancelar("c2")).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when credit is already paid off", async () => {
      mockPrisma.credito.findUnique.mockResolvedValue({ creditoId: "c3", status: "QUITADO" });
      await expect(service.cancelar("c3")).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundException when credit not found", async () => {
      mockPrisma.credito.findUnique.mockResolvedValue(null);
      await expect(service.cancelar("nonexistent")).rejects.toThrow(NotFoundException);
    });
  });
});
