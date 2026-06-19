import { BadRequestException } from "@nestjs/common";
import { ParceirosService } from "./parceiros.service";

const mockPrisma = {
  lead: { findMany: jest.fn() },
  mailingContato: { findMany: jest.fn(), create: jest.fn() },
};

const makeService = () => new ParceirosService(mockPrisma as any);

const PARCEIRO_A = "parceiro-uuid-a";
const PARCEIRO_B = "parceiro-uuid-b";

describe("ParceirosService – data isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.lead.findMany.mockResolvedValue([]);
    mockPrisma.mailingContato.findMany.mockResolvedValue([]);
  });

  // ─── getResumo: scoped to calling user ──────────────────────────────────────

  describe("getResumo", () => {
    it("queries leads scoped to calling user's id", async () => {
      await makeService().getResumo(PARCEIRO_A);
      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ usuarioId: PARCEIRO_A }),
        })
      );
    });

    it("does NOT expose PARCEIRO_B's leads when called with PARCEIRO_A", async () => {
      await makeService().getResumo(PARCEIRO_A);
      const call = mockPrisma.lead.findMany.mock.calls[0][0];
      expect(call.where.usuarioId).toBe(PARCEIRO_A);
      expect(call.where.usuarioId).not.toBe(PARCEIRO_B);
    });

    it("generates a unique codigoIndicacao based on usuarioId", async () => {
      const result = await makeService().getResumo(PARCEIRO_A);
      expect(result.codigoIndicacao).toMatch(/^PARC-/);
    });

    it("returns 0 taxaAprovacao when no leads exist", async () => {
      const result = await makeService().getResumo(PARCEIRO_A);
      expect(result.taxaAprovacao).toBe(0);
    });
  });

  // ─── getOperacoes: scoped, obfuscates client name ───────────────────────────

  describe("getOperacoes", () => {
    it("queries leads scoped to calling user", async () => {
      await makeService().getOperacoes(PARCEIRO_A);
      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ usuarioId: PARCEIRO_A }),
        })
      );
    });

    it("obfuscates client names in response", async () => {
      mockPrisma.lead.findMany.mockResolvedValue([{
        leadId: "lead-1",
        clienteNome: "João da Silva",
        convertidoEm: null,
        criadoEm: new Date(),
        statusUltimo: "QUALIFICACAO",
        stage: null,
      }]);
      const result = await makeService().getOperacoes(PARCEIRO_A);
      expect(result[0].clienteRef).not.toBe("João da Silva");
      expect(result[0].clienteRef).toMatch(/João/);
    });
  });

  // ─── getMailing: scoped ──────────────────────────────────────────────────────

  describe("getMailing", () => {
    it("queries mailing scoped to calling user", async () => {
      await makeService().getMailing(PARCEIRO_A);
      expect(mockPrisma.mailingContato.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuarioId: PARCEIRO_A } })
      );
    });

    it("two separate calls use different ids", async () => {
      const svc = makeService();
      await svc.getMailing("user-A");
      await svc.getMailing("user-B");
      expect(mockPrisma.mailingContato.findMany.mock.calls[0][0].where.usuarioId).toBe("user-A");
      expect(mockPrisma.mailingContato.findMany.mock.calls[1][0].where.usuarioId).toBe("user-B");
    });
  });

  // ─── adicionarMailing: scoped create ────────────────────────────────────────

  describe("adicionarMailing", () => {
    it("creates mailing contact scoped to calling user", async () => {
      mockPrisma.mailingContato.create.mockResolvedValue({
        id: "c-1", nome: "Lead", email: "lead@ex.com", telefone: null,
        status: "ATIVO", criadoEm: new Date(), usuarioId: PARCEIRO_A,
      });
      await makeService().adicionarMailing(PARCEIRO_A, { nome: "Lead", email: "lead@ex.com" });
      expect(mockPrisma.mailingContato.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ usuarioId: PARCEIRO_A }) })
      );
    });

    it("throws BadRequestException when nome is empty", async () => {
      await expect(
        makeService().adicionarMailing(PARCEIRO_A, { nome: "", email: "a@b.com" })
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when email is empty", async () => {
      await expect(
        makeService().adicionarMailing(PARCEIRO_A, { nome: "Test", email: "" })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
