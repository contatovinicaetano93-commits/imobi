import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { DueDiligenceService } from "./due-diligence.service";

// Use string literals to avoid dependency on generated Prisma client
const DueDiligenceStatus = {
  ENVIADO: "ENVIADO",
  EM_ANALISE: "EM_ANALISE",
  APROVADO: "APROVADO",
  REPROVADO: "REPROVADO",
} as const;

const mockPrisma = {
  dueDiligence: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe("DueDiligenceService – ownership & RBAC", () => {
  let service: DueDiligenceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DueDiligenceService(mockPrisma as any);
  });

  const ddRecord = {
    id: "dd-1",
    gestorId: "gestor-owner",
    nomeEmpreendimento: "Empreendimento Test",
    status: DueDiligenceStatus.ENVIADO,
  };

  // ─── buscar ───────────────────────────────────────────────────────────────

  describe("buscar", () => {
    beforeEach(() => {
      mockPrisma.dueDiligence.findUnique.mockResolvedValue(ddRecord);
    });

    it("allows the gestor who created the DD to access it", async () => {
      const result = await service.buscar("dd-1", "gestor-owner", false);
      expect(result).toEqual(ddRecord);
    });

    it("allows ADMIN (isAdmin=true) to access any DD regardless of gestorId", async () => {
      const result = await service.buscar("dd-1", "other-user", true);
      expect(result).toEqual(ddRecord);
    });

    it("throws ForbiddenException when a different gestor accesses a DD they don't own", async () => {
      await expect(service.buscar("dd-1", "another-gestor", false)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("throws ForbiddenException when non-owner non-admin accesses DD", async () => {
      await expect(service.buscar("dd-1", "tomador-id", false)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("throws NotFoundException when DD does not exist", async () => {
      mockPrisma.dueDiligence.findUnique.mockResolvedValue(null);
      await expect(service.buscar("nonexistent", "gestor-owner", false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── listar ───────────────────────────────────────────────────────────────

  describe("listar", () => {
    it("queries only DDs belonging to the given gestorId", async () => {
      mockPrisma.dueDiligence.findMany.mockResolvedValue([]);
      await service.listar("gestor-owner");
      expect(mockPrisma.dueDiligence.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { gestorId: "gestor-owner" },
        }),
      );
    });
  });

  // ─── atualizarStatus ──────────────────────────────────────────────────────

  describe("atualizarStatus", () => {
    it("updates status when DD exists", async () => {
      mockPrisma.dueDiligence.findUnique.mockResolvedValue(ddRecord);
      mockPrisma.dueDiligence.update.mockResolvedValue({
        ...ddRecord,
        status: DueDiligenceStatus.APROVADO,
      });

      const result = await service.atualizarStatus("dd-1", {
        status: DueDiligenceStatus.APROVADO,
      });
      expect(result.status).toBe(DueDiligenceStatus.APROVADO);
    });

    it("throws NotFoundException when DD does not exist", async () => {
      mockPrisma.dueDiligence.findUnique.mockResolvedValue(null);
      await expect(
        service.atualizarStatus("nonexistent", { status: DueDiligenceStatus.APROVADO }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
