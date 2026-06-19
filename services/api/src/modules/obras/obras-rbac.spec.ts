import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ObrasService } from "./obras.service";

const mockTx = {
  $queryRaw: jest.fn().mockResolvedValue([{ valid: true }]),
  obra: { create: jest.fn(), findUnique: jest.fn() },
  etapaObra: { createMany: jest.fn() },
};

const mockPrisma = {
  obra: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
  etapaObra: { findMany: jest.fn() },
  $transaction: jest.fn((fn: any) => fn(mockTx)),
};

const makeService = () => new ObrasService(mockPrisma as any);

const OWNER_ID = "user-owner";
const OTHER_ID = "user-other";
const OBRA_ID = "obra-uuid-1";

const baseObra = {
  obraId: OBRA_ID,
  nome: "Residência Silva",
  status: "EM_EXECUCAO",
  endereco: "Rua A, 1",
  geoLatitude: -23.5,
  geoLongitude: -46.6,
  raioValidacaoMetros: 50,
  usuarioId: OWNER_ID,
  etapas: [],
  credito: null,
};

describe("ObrasService – RBAC & ownership", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── listar: always scoped to calling user ──────────────────────────────────

  describe("listar", () => {
    it("passes the calling user's id as where.usuarioId to Prisma", async () => {
      mockPrisma.obra.findMany.mockResolvedValue([]);
      await makeService().listar(OWNER_ID);
      expect(mockPrisma.obra.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuarioId: OWNER_ID } })
      );
    });

    it("does NOT expose another user's obras when called with a different id", async () => {
      mockPrisma.obra.findMany.mockResolvedValue([]);
      await makeService().listar(OTHER_ID);
      expect(mockPrisma.obra.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuarioId: OTHER_ID } })
      );
      const call = mockPrisma.obra.findMany.mock.calls[0][0];
      expect(call.where.usuarioId).toBe(OTHER_ID);
      expect(call.where.usuarioId).not.toBe(OWNER_ID);
    });

    it("returns list with id (mapped from obraId)", async () => {
      const rawObra = { ...baseObra, etapas: [], credito: null };
      mockPrisma.obra.findMany.mockResolvedValue([rawObra]);
      const result = await makeService().listar(OWNER_ID);
      expect(result[0]).toHaveProperty("id", OBRA_ID);
      expect(result[0]).not.toHaveProperty("obraId");
    });
  });

  // ─── buscar: ownership enforced ─────────────────────────────────────────────

  describe("buscar", () => {
    beforeEach(() => {
      mockPrisma.obra.findUnique.mockResolvedValue({ ...baseObra });
    });

    it("allows owner to access their obra", async () => {
      const result = await makeService().buscar({ id: OWNER_ID, tipo: "TOMADOR" }, OBRA_ID);
      expect(result).toMatchObject({ obraId: OBRA_ID });
    });

    it("throws ForbiddenException when non-owner non-privileged accesses obra", async () => {
      await expect(
        makeService().buscar({ id: OTHER_ID, tipo: "TOMADOR" }, OBRA_ID)
      ).rejects.toThrow(ForbiddenException);
    });

    it("allows ADMIN to access any obra regardless of ownership", async () => {
      const result = await makeService().buscar({ id: OTHER_ID, tipo: "ADMIN" }, OBRA_ID);
      expect(result).toMatchObject({ obraId: OBRA_ID });
    });

    it("allows GESTOR to access any obra regardless of ownership", async () => {
      const result = await makeService().buscar({ id: OTHER_ID, tipo: "GESTOR" }, OBRA_ID);
      expect(result).toMatchObject({ obraId: OBRA_ID });
    });

    it("throws NotFoundException when obra does not exist", async () => {
      mockPrisma.obra.findUnique.mockResolvedValue(null);
      await expect(
        makeService().buscar({ id: OWNER_ID, tipo: "TOMADOR" }, "nonexistent")
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── progressoGeral: same ownership rules as buscar ─────────────────────────

  describe("progressoGeral", () => {
    beforeEach(() => {
      mockPrisma.obra.findUnique.mockResolvedValue({ usuarioId: OWNER_ID });
      mockPrisma.etapaObra.findMany.mockResolvedValue([
        { status: "CONCLUIDA", percentualObra: 30 },
        { status: "PLANEJADA", percentualObra: 70 },
      ]);
    });

    it("throws ForbiddenException when non-owner non-privileged calls progressoGeral", async () => {
      await expect(
        makeService().progressoGeral({ id: OTHER_ID, tipo: "TOMADOR" }, OBRA_ID)
      ).rejects.toThrow(ForbiddenException);
    });

    it("allows ADMIN to access progressoGeral of any obra", async () => {
      const result = await makeService().progressoGeral({ id: OTHER_ID, tipo: "ADMIN" }, OBRA_ID);
      expect(typeof result).toBe("number");
    });

    it("allows obra owner to access progressoGeral", async () => {
      const result = await makeService().progressoGeral({ id: OWNER_ID, tipo: "TOMADOR" }, OBRA_ID);
      expect(result).toBe(30);
    });

    it("throws NotFoundException when obra not found", async () => {
      mockPrisma.obra.findUnique.mockResolvedValue(null);
      await expect(
        makeService().progressoGeral({ id: OWNER_ID, tipo: "TOMADOR" }, "nonexistent")
      ).rejects.toThrow(NotFoundException);
    });

    it("computes correct progress percentage from etapas", async () => {
      const result = await makeService().progressoGeral({ id: OWNER_ID, tipo: "TOMADOR" }, OBRA_ID);
      expect(result).toBe(30);
    });
  });

  // ─── cross-user isolation ───────────────────────────────────────────────────

  describe("cross-user isolation", () => {
    it("separate listar calls for different users hit Prisma with different userId", async () => {
      mockPrisma.obra.findMany.mockResolvedValue([]);
      const svc = makeService();
      await svc.listar("user-A");
      await svc.listar("user-B");
      const calls = mockPrisma.obra.findMany.mock.calls;
      expect(calls[0][0].where.usuarioId).toBe("user-A");
      expect(calls[1][0].where.usuarioId).toBe("user-B");
    });
  });
});
