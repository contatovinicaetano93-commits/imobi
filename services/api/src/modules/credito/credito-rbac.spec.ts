import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { CreditoService } from "./credito.service";

const mockPrisma = {
  credito: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

const makeService = () => new CreditoService(mockPrisma as any);

const USER_A = "user-uuid-a";
const USER_B = "user-uuid-b";
const CREDITO_ID = "credito-uuid-1";

const baseCredito = {
  creditoId: CREDITO_ID,
  usuarioId: USER_A,
  valorAprovado: 100000,
  valorLiberado: 0,
  taxaMensal: 0.0099,
  prazoMeses: 120,
  status: "ATIVO",
  criadoEm: new Date(),
  obras: [],
  liberacoes: [],
};

describe("CreditoService – RBAC & ownership", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── buscarPorUsuario: always scoped ────────────────────────────────────────

  describe("buscarPorUsuario", () => {
    it("passes calling user's id as where.usuarioId to Prisma", async () => {
      mockPrisma.credito.findMany.mockResolvedValue([]);
      await makeService().buscarPorUsuario(USER_A);
      expect(mockPrisma.credito.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuarioId: USER_A } })
      );
    });

    it("returns list items with id (mapped from creditoId)", async () => {
      mockPrisma.credito.findMany.mockResolvedValue([baseCredito]);
      const result = await makeService().buscarPorUsuario(USER_A);
      expect(result[0]).toHaveProperty("id", CREDITO_ID);
      expect(result[0]).not.toHaveProperty("creditoId");
    });

    it("does NOT expose another user's credits when called with a different id", async () => {
      mockPrisma.credito.findMany.mockResolvedValue([]);
      await makeService().buscarPorUsuario(USER_B);
      const call = mockPrisma.credito.findMany.mock.calls[0][0];
      expect(call.where.usuarioId).toBe(USER_B);
      expect(call.where.usuarioId).not.toBe(USER_A);
    });

    it("calls Prisma with separate ids in cross-user isolation scenario", async () => {
      mockPrisma.credito.findMany.mockResolvedValue([]);
      const svc = makeService();
      await svc.buscarPorUsuario("user-A");
      await svc.buscarPorUsuario("user-B");
      const calls = mockPrisma.credito.findMany.mock.calls;
      expect(calls[0][0].where.usuarioId).toBe("user-A");
      expect(calls[1][0].where.usuarioId).toBe("user-B");
    });
  });

  // ─── extrato: ownership enforced ────────────────────────────────────────────

  describe("extrato", () => {
    it("returns extrato when calling user owns the credit", async () => {
      mockPrisma.credito.findUnique.mockResolvedValue({ ...baseCredito, liberacoes: [] });
      const result = await makeService().extrato(CREDITO_ID, USER_A);
      expect(result).toHaveProperty("creditoId", CREDITO_ID);
    });

    it("throws ForbiddenException when user does not own the credit", async () => {
      mockPrisma.credito.findUnique.mockResolvedValue({ ...baseCredito, liberacoes: [] });
      await expect(
        makeService().extrato(CREDITO_ID, USER_B)
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws NotFoundException when creditoId does not exist", async () => {
      mockPrisma.credito.findUnique.mockResolvedValue(null);
      await expect(
        makeService().extrato("nonexistent-id", USER_A)
      ).rejects.toThrow(NotFoundException);
    });

    it("queries Prisma by creditoId (not usuarioId) for extrato lookup", async () => {
      mockPrisma.credito.findUnique.mockResolvedValue({ ...baseCredito, liberacoes: [] });
      await makeService().extrato(CREDITO_ID, USER_A);
      expect(mockPrisma.credito.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { creditoId: CREDITO_ID } })
      );
    });

    it("maps liberacao FALHA status to FALHOU in response", async () => {
      const creditoWithFalha = {
        ...baseCredito,
        liberacoes: [{
          liberacaoId: "lib-1",
          valor: 10000,
          status: "FALHA",
          criadoEm: new Date(),
          motivo: "Etapa reprovada",
        }],
      };
      mockPrisma.credito.findUnique.mockResolvedValue(creditoWithFalha);
      const result = await makeService().extrato(CREDITO_ID, USER_A);
      expect(result.liberacoes[0].status).toBe("FALHOU");
    });
  });

  // ─── simular: no ownership (pure calculation) ───────────────────────────────

  describe("simular", () => {
    it("returns simulation result with expected fields", () => {
      const result = makeService().simular({
        valorSolicitado: 100000,
        prazoMeses: 120,
        tipoObra: "RESIDENCIAL",
      });
      expect(result).toHaveProperty("parcelaMensal");
      expect(result).toHaveProperty("totalPago");
      expect(result).toHaveProperty("totalJuros");
    });
  });
});
