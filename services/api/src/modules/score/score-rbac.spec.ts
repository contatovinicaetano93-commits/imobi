import { ScoreService } from "./score.service";

const mockPrisma = {
  obra: { findMany: jest.fn() },
  credito: { findMany: jest.fn() },
  usuario: { findUnique: jest.fn() },
  scoreHistorico: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

const makeService = () => new ScoreService(mockPrisma as any);

describe("ScoreService – data scoping", () => {
  let service: ScoreService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = makeService();

    mockPrisma.obra.findMany.mockResolvedValue([]);
    mockPrisma.credito.findMany.mockResolvedValue([]);
    mockPrisma.usuario.findUnique.mockResolvedValue({
      criadoEm: new Date(),
      kycStatus: "PENDENTE",
    });
    mockPrisma.scoreHistorico.findFirst.mockResolvedValue(null);
    mockPrisma.scoreHistorico.create.mockResolvedValue({});
    mockPrisma.scoreHistorico.findMany.mockResolvedValue([]);
  });

  // ─── buscarScoreAtual ─────────────────────────────────────────────────────

  describe("buscarScoreAtual", () => {
    it("scopes obra query to the requesting user", async () => {
      await service.buscarScoreAtual("user-123");
      expect(mockPrisma.obra.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuarioId: "user-123" } }),
      );
    });

    it("scopes credito query to the requesting user", async () => {
      await service.buscarScoreAtual("user-123");
      expect(mockPrisma.credito.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuarioId: "user-123" } }),
      );
    });

    it("looks up KYC status for the requesting user only", async () => {
      await service.buscarScoreAtual("user-123");
      expect(mockPrisma.usuario.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuarioId: "user-123" } }),
      );
    });

    it("scopes scoreHistorico lookup to the requesting user", async () => {
      await service.buscarScoreAtual("user-123");
      expect(mockPrisma.scoreHistorico.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuarioId: "user-123" } }),
      );
    });

    it("does not leak data across users (different IDs produce independent queries)", async () => {
      await service.buscarScoreAtual("user-A");
      await service.buscarScoreAtual("user-B");

      const obraCalls = mockPrisma.obra.findMany.mock.calls;
      expect(obraCalls[0][0]).toMatchObject({ where: { usuarioId: "user-A" } });
      expect(obraCalls[1][0]).toMatchObject({ where: { usuarioId: "user-B" } });
    });

    it("saves new score to historico scoped to the requesting user", async () => {
      await service.buscarScoreAtual("user-123");
      expect(mockPrisma.scoreHistorico.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ usuarioId: "user-123" }),
        }),
      );
    });

    it("does not create duplicate historico when stored score matches calculated score", async () => {
      mockPrisma.scoreHistorico.findFirst.mockResolvedValue({ score: 600 });
      await service.buscarScoreAtual("user-123");
      expect(mockPrisma.scoreHistorico.create).not.toHaveBeenCalled();
    });

    it("returns a numeric score", async () => {
      const score = await service.buscarScoreAtual("user-123");
      expect(typeof score).toBe("number");
    });
  });

  // ─── buscarHistorico ──────────────────────────────────────────────────────

  describe("buscarHistorico", () => {
    it("scopes historico query to the requesting user", async () => {
      await service.buscarHistorico("user-123");
      expect(mockPrisma.scoreHistorico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuarioId: "user-123" } }),
      );
    });

    it("respects the limit parameter", async () => {
      await service.buscarHistorico("user-123", 6);
      expect(mockPrisma.scoreHistorico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 6 }),
      );
    });

    it("orders by criadoEm descending", async () => {
      await service.buscarHistorico("user-123");
      expect(mockPrisma.scoreHistorico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { criadoEm: "desc" } }),
      );
    });

    it("does not cross user boundaries", async () => {
      await service.buscarHistorico("user-X");
      const call = mockPrisma.scoreHistorico.findMany.mock.calls[0][0];
      expect(call.where.usuarioId).toBe("user-X");
      expect(call.where.usuarioId).not.toBe("user-Y");
    });
  });
});
