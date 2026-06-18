import { NotificacoesService } from "./notificacoes.service";

const mockPrisma = {
  notificacao: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const makeService = () => new NotificacoesService(mockPrisma as any);

describe("NotificacoesService – data scoping", () => {
  let service: NotificacoesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = makeService();

    mockPrisma.notificacao.findMany.mockResolvedValue([]);
    mockPrisma.notificacao.count.mockResolvedValue(0);
    mockPrisma.notificacao.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.notificacao.deleteMany.mockResolvedValue({ count: 1 });
  });

  // ─── listar ───────────────────────────────────────────────────────────────

  describe("listar", () => {
    it("scopes findMany to the requesting user", async () => {
      await service.listar("user-123");
      expect(mockPrisma.notificacao.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuarioId: "user-123" } }),
      );
    });

    it("scopes count to the requesting user", async () => {
      await service.listar("user-123");
      expect(mockPrisma.notificacao.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuarioId: "user-123" } }),
      );
    });

    it("returns {notificacoes, total} shape", async () => {
      mockPrisma.notificacao.findMany.mockResolvedValue([{ notificacaoId: "n-1" }]);
      mockPrisma.notificacao.count.mockResolvedValue(1);
      const result = await service.listar("user-123");
      expect(result).toHaveProperty("notificacoes");
      expect(result).toHaveProperty("total");
    });

    it("forwards limit and offset to Prisma", async () => {
      await service.listar("user-123", 5, 10);
      expect(mockPrisma.notificacao.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5, skip: 10 }),
      );
    });

    it("does not cross user boundaries", async () => {
      await service.listar("user-A");
      await service.listar("user-B");
      const calls = mockPrisma.notificacao.findMany.mock.calls;
      expect(calls[0][0].where.usuarioId).toBe("user-A");
      expect(calls[1][0].where.usuarioId).toBe("user-B");
    });
  });

  // ─── marcarComoLida ───────────────────────────────────────────────────────

  describe("marcarComoLida", () => {
    it("includes both notificacaoId AND usuarioId in where clause", async () => {
      await service.marcarComoLida("user-123", "notif-1");
      expect(mockPrisma.notificacao.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { notificacaoId: "notif-1", usuarioId: "user-123" },
        }),
      );
    });

    it("prevents cross-user mark: different user cannot mark another's notification", async () => {
      await service.marcarComoLida("attacker-id", "notif-1");
      expect(mockPrisma.notificacao.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ usuarioId: "attacker-id" }),
        }),
      );
      const call = mockPrisma.notificacao.updateMany.mock.calls[0][0];
      expect(call.where.usuarioId).not.toBe("user-123");
    });

    it("sets lida=true", async () => {
      await service.marcarComoLida("user-123", "notif-1");
      expect(mockPrisma.notificacao.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lida: true }),
        }),
      );
    });
  });

  // ─── marcarTudasComoLidas ─────────────────────────────────────────────────

  describe("marcarTudasComoLidas", () => {
    it("scopes update to the requesting user only", async () => {
      await service.marcarTudasComoLidas("user-123");
      expect(mockPrisma.notificacao.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ usuarioId: "user-123" }),
        }),
      );
    });

    it("only marks unread notifications", async () => {
      await service.marcarTudasComoLidas("user-123");
      expect(mockPrisma.notificacao.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ lida: false }),
        }),
      );
    });
  });

  // ─── deletar ──────────────────────────────────────────────────────────────

  describe("deletar", () => {
    it("includes both notificacaoId AND usuarioId in where clause", async () => {
      await service.deletar("user-123", "notif-1");
      expect(mockPrisma.notificacao.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { notificacaoId: "notif-1", usuarioId: "user-123" },
        }),
      );
    });

    it("prevents cross-user deletion: attacker cannot delete another user's notification", async () => {
      await service.deletar("attacker-id", "notif-1");
      const call = mockPrisma.notificacao.deleteMany.mock.calls[0][0];
      expect(call.where.usuarioId).toBe("attacker-id");
      expect(call.where.usuarioId).not.toBe("user-123");
    });
  });

  // ─── contarNaoLidas ───────────────────────────────────────────────────────

  describe("contarNaoLidas", () => {
    it("scopes count to the requesting user", async () => {
      await service.contarNaoLidas("user-123");
      expect(mockPrisma.notificacao.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuarioId: "user-123", lida: false } }),
      );
    });

    it("returns a number", async () => {
      mockPrisma.notificacao.count.mockResolvedValue(3);
      const result = await service.contarNaoLidas("user-123");
      expect(result).toBe(3);
    });
  });
});
