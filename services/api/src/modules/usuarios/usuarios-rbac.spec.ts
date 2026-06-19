import { BadRequestException } from "@nestjs/common";
import { UsuariosService } from "./usuarios.service";

const mockPrisma = {
  usuario: {
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  sessaoToken: { deleteMany: jest.fn() },
  notificacao: { deleteMany: jest.fn() },
  usuarioFcmToken: { updateMany: jest.fn(), deleteMany: jest.fn() },
  scoreHistorico: { deleteMany: jest.fn() },
  obra: { deleteMany: jest.fn() },
  credito: { deleteMany: jest.fn() },
  $transaction: jest.fn((fn: any) =>
    fn({
      sessaoToken: { deleteMany: jest.fn() },
      notificacao: { deleteMany: jest.fn() },
      usuarioFcmToken: { deleteMany: jest.fn() },
      scoreHistorico: { deleteMany: jest.fn() },
      obra: { deleteMany: jest.fn() },
      credito: { deleteMany: jest.fn() },
      usuario: { delete: jest.fn() },
    })
  ),
};

const mockQueue = {
  add: jest.fn().mockResolvedValue(undefined),
};

const makeService = () => new UsuariosService(mockPrisma as any, mockQueue as any);

const USER_ID = "user-uuid-1";
const OTHER_ID = "user-uuid-2";

const baseUsuario = {
  usuarioId: USER_ID,
  nome: "Test User",
  cpf: "12345678901",
  email: "test@example.com",
  telefone: "11999999999",
  tipo: "TOMADOR",
  kycStatus: "PENDENTE",
  criadoEm: new Date(),
  atualizadoEm: new Date(),
  deletadoEm: null,
  kycDocumentos: [],
  creditos: [],
  obras: [],
  scoreHistorico: [],
  notificacoes: [],
  fcmTokens: [],
};

describe("UsuariosService – RBAC & data isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── buscarPerfil: always scoped to calling userId ──────────────────────────

  describe("buscarPerfil", () => {
    it("queries Prisma with the calling user's id", async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(baseUsuario);
      await makeService().buscarPerfil(USER_ID);
      expect(mockPrisma.usuario.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuarioId: USER_ID } })
      );
    });

    it("does not query another user's profile when called with USER_ID", async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(baseUsuario);
      await makeService().buscarPerfil(USER_ID);
      const call = mockPrisma.usuario.findUnique.mock.calls[0][0];
      expect(call.where.usuarioId).toBe(USER_ID);
      expect(call.where.usuarioId).not.toBe(OTHER_ID);
    });
  });

  // ─── atualizarPerfil: always scoped to calling userId ───────────────────────

  describe("atualizarPerfil", () => {
    it("updates only the calling user's record", async () => {
      mockPrisma.usuario.update.mockResolvedValue(baseUsuario);
      await makeService().atualizarPerfil(USER_ID, { nome: "Novo Nome" });
      expect(mockPrisma.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuarioId: USER_ID } })
      );
    });
  });

  // ─── meusDados: scoped + CPF masking ────────────────────────────────────────

  describe("meusDados", () => {
    it("queries by the calling user's id", async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(baseUsuario);
      await makeService().meusDados(USER_ID);
      expect(mockPrisma.usuario.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuarioId: USER_ID } })
      );
    });

    it("masks CPF digits in the response", async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(baseUsuario);
      const result = await makeService().meusDados(USER_ID);
      expect(result.usuario.cpf).not.toBe("12345678901");
      expect(result.usuario.cpf).toMatch(/\*/);
    });

    it("throws BadRequestException when user not found", async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);
      await expect(makeService().meusDados(USER_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── marcarDelecao: scoped soft-delete ──────────────────────────────────────

  describe("marcarDelecao", () => {
    it("soft-deletes the calling user's account", async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(baseUsuario);
      mockPrisma.usuario.update.mockResolvedValue({ ...baseUsuario, deletadoEm: new Date() });
      await makeService().marcarDelecao(USER_ID);
      expect(mockPrisma.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuarioId: USER_ID } })
      );
    });

    it("schedules a BullMQ hard-delete job", async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(baseUsuario);
      mockPrisma.usuario.update.mockResolvedValue(baseUsuario);
      await makeService().marcarDelecao(USER_ID);
      expect(mockQueue.add).toHaveBeenCalledWith("hard-delete", { usuarioId: USER_ID }, expect.any(Object));
    });

    it("throws BadRequestException when user not found", async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);
      await expect(makeService().marcarDelecao(USER_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── revogarConsentimento: scoped ───────────────────────────────────────────

  describe("revogarConsentimento", () => {
    it("disables FCM tokens for calling user when tipo is NOTIFICACOES", async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(baseUsuario);
      await makeService().revogarConsentimento(USER_ID, "NOTIFICACOES");
      expect(mockPrisma.usuarioFcmToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuarioId: USER_ID } })
      );
    });

    it("disables FCM tokens when tipo is TUDO", async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(baseUsuario);
      await makeService().revogarConsentimento(USER_ID, "TUDO");
      expect(mockPrisma.usuarioFcmToken.updateMany).toHaveBeenCalled();
    });

    it("does NOT disable FCM tokens when tipo is MARKETING only", async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(baseUsuario);
      await makeService().revogarConsentimento(USER_ID, "MARKETING");
      expect(mockPrisma.usuarioFcmToken.updateMany).not.toHaveBeenCalled();
    });
  });
});
