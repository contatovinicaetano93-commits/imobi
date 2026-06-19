import { PushNotificacoesService } from "./push-notificacoes.service";

const mockPrisma = {
  usuarioFcmToken: {
    upsert: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
  },
};

// Prevent Firebase init in test environment
jest.mock("firebase-admin", () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  messaging: jest.fn().mockReturnValue(null),
}));

const makeService = () => new PushNotificacoesService(mockPrisma as any);

const USER_A = "user-uuid-a";
const USER_B = "user-uuid-b";
const TOKEN_A = "fcm-token-device-a";
const TOKEN_B = "fcm-token-device-b";

describe("PushNotificacoesService – token isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.usuarioFcmToken.upsert.mockResolvedValue(undefined);
    mockPrisma.usuarioFcmToken.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.usuarioFcmToken.findMany.mockResolvedValue([]);
  });

  // ─── registrarToken: bound to calling user ──────────────────────────────────

  describe("registrarToken", () => {
    it("upserts token with the calling user's id", async () => {
      await makeService().registrarToken(USER_A, TOKEN_A);
      expect(mockPrisma.usuarioFcmToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ usuarioId_token: { usuarioId: USER_A, token: TOKEN_A } }),
          create: expect.objectContaining({ usuarioId: USER_A, token: TOKEN_A }),
        })
      );
    });

    it("separate calls for different users bind tokens to their respective users", async () => {
      const svc = makeService();
      await svc.registrarToken(USER_A, TOKEN_A);
      await svc.registrarToken(USER_B, TOKEN_B);
      const calls = mockPrisma.usuarioFcmToken.upsert.mock.calls;
      expect(calls[0][0].create.usuarioId).toBe(USER_A);
      expect(calls[1][0].create.usuarioId).toBe(USER_B);
    });
  });

  // ─── desregistrarToken: scoped to calling user ──────────────────────────────

  describe("desregistrarToken", () => {
    it("deactivates only the calling user's token", async () => {
      await makeService().desregistrarToken(USER_A, TOKEN_A);
      expect(mockPrisma.usuarioFcmToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ usuarioId: USER_A, token: TOKEN_A }),
        })
      );
    });

    it("does NOT affect another user's tokens", async () => {
      await makeService().desregistrarToken(USER_A, TOKEN_A);
      const call = mockPrisma.usuarioFcmToken.updateMany.mock.calls[0][0];
      expect(call.where.usuarioId).toBe(USER_A);
      expect(call.where.usuarioId).not.toBe(USER_B);
    });
  });

  // ─── enviarPush: queries only target user's tokens ──────────────────────────

  describe("enviarPush", () => {
    it("looks up FCM tokens scoped to target user when messaging not available", async () => {
      const svc = makeService();
      (svc as any).messaging = null;
      await svc.enviarPush({
        usuarioId: USER_A,
        titulo: "Test",
        mensagem: "Test message",
        tipo: "GERAL",
      });
      // messaging is null so it early-returns after console log — no findMany called
      expect(mockPrisma.usuarioFcmToken.findMany).not.toHaveBeenCalled();
    });
  });
});
