import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ObrasService } from "./obras.service";

const mockPrisma = {
  obra: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  etapaObra: {
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};

describe("ObrasService – ownership & RBAC", () => {
  let service: ObrasService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ObrasService(mockPrisma as any);
  });

  // ─── buscar ───────────────────────────────────────────────────────────────

  describe("buscar", () => {
    const obraOwner = "user-owner";
    const obraRecord = {
      obraId: "obra-1",
      usuarioId: obraOwner,
      etapas: [],
      credito: null,
    };

    beforeEach(() => {
      mockPrisma.obra.findUnique.mockResolvedValue(obraRecord);
    });

    it("allows the obra owner to retrieve their obra", async () => {
      const result = await service.buscar({ id: obraOwner, tipo: "TOMADOR" }, "obra-1");
      expect(result).toEqual(obraRecord);
    });

    it("allows ADMIN to retrieve any obra regardless of ownership", async () => {
      const result = await service.buscar({ id: "admin-id", tipo: "ADMIN" }, "obra-1");
      expect(result).toEqual(obraRecord);
    });

    it("throws ForbiddenException when a different TOMADOR accesses the obra", async () => {
      await expect(
        service.buscar({ id: "attacker-id", tipo: "TOMADOR" }, "obra-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("allows GESTOR to retrieve any obra regardless of ownership (fund oversight)", async () => {
      const result = await service.buscar({ id: "gestor-id", tipo: "GESTOR" }, "obra-1");
      expect(result).toEqual(obraRecord);
    });

    it("throws ForbiddenException when ENGENHEIRO (not owner) accesses the obra directly", async () => {
      await expect(
        service.buscar({ id: "eng-id", tipo: "ENGENHEIRO" }, "obra-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws NotFoundException when obra does not exist", async () => {
      mockPrisma.obra.findUnique.mockResolvedValue(null);
      await expect(
        service.buscar({ id: obraOwner, tipo: "TOMADOR" }, "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── progressoGeral ───────────────────────────────────────────────────────

  describe("progressoGeral", () => {
    const obraOwner = "user-owner";

    beforeEach(() => {
      mockPrisma.obra.findUnique.mockResolvedValue({ usuarioId: obraOwner });
    });

    it("allows the obra owner to see progress", async () => {
      mockPrisma.etapaObra.findMany.mockResolvedValue([
        { status: "CONCLUIDA", percentualObra: 50 },
        { status: "PLANEJADA", percentualObra: 50 },
      ]);
      const pct = await service.progressoGeral({ id: obraOwner, tipo: "TOMADOR" }, "obra-1");
      expect(pct).toBe(50);
    });

    it("allows ADMIN to see progress of any obra", async () => {
      mockPrisma.etapaObra.findMany.mockResolvedValue([]);
      const pct = await service.progressoGeral({ id: "admin-id", tipo: "ADMIN" }, "obra-1");
      expect(pct).toBe(0);
    });

    it("allows GESTOR to see progress of any obra (fund oversight)", async () => {
      mockPrisma.etapaObra.findMany.mockResolvedValue([{ status: "CONCLUIDA", percentualObra: 100 }]);
      const pct = await service.progressoGeral({ id: "gestor-id", tipo: "GESTOR" }, "obra-1");
      expect(pct).toBe(100);
    });

    it("returns 0 when there are no etapas", async () => {
      mockPrisma.etapaObra.findMany.mockResolvedValue([]);
      const pct = await service.progressoGeral({ id: obraOwner, tipo: "TOMADOR" }, "obra-1");
      expect(pct).toBe(0);
    });

    it("returns 100 when all etapas are CONCLUIDA", async () => {
      mockPrisma.etapaObra.findMany.mockResolvedValue([
        { status: "CONCLUIDA", percentualObra: 30 },
        { status: "CONCLUIDA", percentualObra: 70 },
      ]);
      const pct = await service.progressoGeral({ id: obraOwner, tipo: "TOMADOR" }, "obra-1");
      expect(pct).toBe(100);
    });

    it("throws ForbiddenException when non-owner requests progress", async () => {
      await expect(
        service.progressoGeral({ id: "attacker", tipo: "TOMADOR" }, "obra-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws NotFoundException when obra does not exist", async () => {
      mockPrisma.obra.findUnique.mockResolvedValue(null);
      await expect(
        service.progressoGeral({ id: obraOwner, tipo: "TOMADOR" }, "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
