import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { CreditoService } from "./credito.service";

const mockPrisma = {
  credito: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

describe("CreditoService – ownership & RBAC", () => {
  let service: CreditoService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CreditoService(mockPrisma as any);
  });

  // ─── extrato ──────────────────────────────────────────────────────────────

  describe("extrato", () => {
    const creditoOwner = "user-owner";
    const creditoRecord = {
      creditoId: "cred-1",
      usuarioId: creditoOwner,
      valorAprovado: 100000,
      valorLiberado: 20000,
      taxaMensal: 0.0099,
      prazoMeses: 24,
      status: "ATIVO",
      liberacoes: [],
    };

    beforeEach(() => {
      mockPrisma.credito.findUnique.mockResolvedValue(creditoRecord);
    });

    it("allows the credito owner to access their extrato", async () => {
      const result = await service.extrato("cred-1", creditoOwner);
      expect(result).toHaveProperty("creditoId", "cred-1");
    });

    it("throws ForbiddenException when a different user accesses extrato", async () => {
      await expect(service.extrato("cred-1", "attacker-id")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("throws NotFoundException when credito does not exist", async () => {
      mockPrisma.credito.findUnique.mockResolvedValue(null);
      await expect(service.extrato("nonexistent", creditoOwner)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("includes liberacoes in the extrato response", async () => {
      const creditoWithLib = {
        ...creditoRecord,
        liberacoes: [
          {
            liberacaoId: "lib-1",
            valor: 5000,
            status: "CONCLUIDA",
            criadoEm: new Date("2025-01-01"),
            motivo: null,
          },
        ],
      };
      mockPrisma.credito.findUnique.mockResolvedValue(creditoWithLib);

      const result = await service.extrato("cred-1", creditoOwner);
      expect(result.liberacoes).toHaveLength(1);
      expect(result.liberacoes[0]).toHaveProperty("liberacaoId", "lib-1");
    });

    it("maps FALHA status to FALHOU in extrato", async () => {
      const creditoWithFalha = {
        ...creditoRecord,
        liberacoes: [
          {
            liberacaoId: "lib-2",
            valor: 3000,
            status: "FALHA",
            criadoEm: new Date("2025-02-01"),
            motivo: "Saldo insuficiente",
          },
        ],
      };
      mockPrisma.credito.findUnique.mockResolvedValue(creditoWithFalha);

      const result = await service.extrato("cred-1", creditoOwner);
      expect(result.liberacoes[0].status).toBe("FALHOU");
    });
  });

  // ─── buscarPorUsuario ─────────────────────────────────────────────────────

  describe("buscarPorUsuario", () => {
    it("queries only creditos belonging to the given usuarioId", async () => {
      mockPrisma.credito.findMany.mockResolvedValue([]);
      await service.buscarPorUsuario("user-123");
      expect(mockPrisma.credito.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { usuarioId: "user-123" },
        }),
      );
    });
  });
});
