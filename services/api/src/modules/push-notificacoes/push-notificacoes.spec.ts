import { PushNotificacoesService } from "./push-notificacoes.service";

const mockSendEachForMulticast = jest.fn();
const mockMessaging = { sendEachForMulticast: mockSendEachForMulticast };

jest.mock("firebase-admin", () => ({
  apps: [],
  initializeApp: jest.fn(),
  messaging: jest.fn(),
  credential: { cert: jest.fn().mockReturnValue({}) },
}));

import * as admin from "firebase-admin";

const mockPrisma = {
  usuarioFcmToken: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
  },
};

function makeServiceWithMessaging() {
  (admin.messaging as jest.Mock).mockReturnValue(mockMessaging);
  return new PushNotificacoesService(mockPrisma as any);
}

function makeServiceNoMessaging() {
  (admin.messaging as jest.Mock).mockImplementation(() => { throw new Error("Firebase not configured"); });
  return new PushNotificacoesService(mockPrisma as any);
}

describe("PushNotificacoesService — getTemplate", () => {
  it("returns ETAPA_APROVADA template with interpolated data", () => {
    const svc = makeServiceWithMessaging();
    const t = svc.getTemplate("ETAPA_APROVADA", { etapaNome: "Fundação", obraNome: "Casa A" });
    expect(t.titulo).toBe("Etapa Aprovada!");
    expect(t.mensagem).toContain("Fundação");
    expect(t.mensagem).toContain("Casa A");
    expect(t.tipo).toBe("ETAPA_APROVADA");
  });

  it("returns KYC_REJEITADO template with motivo", () => {
    const svc = makeServiceWithMessaging();
    const t = svc.getTemplate("KYC_REJEITADO", { motivo: "Documento ilegível" });
    expect(t.mensagem).toContain("Documento ilegível");
  });

  it("returns GERAL fallback for unknown tipo", () => {
    const svc = makeServiceWithMessaging();
    const t = svc.getTemplate("GERAL");
    expect(t.tipo).toBe("GERAL");
    expect(t.titulo).toBe("Notificação");
  });
});

describe("PushNotificacoesService — enviarPush (no messaging)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns true and skips Firebase when messaging is null", async () => {
    const svc = makeServiceNoMessaging();
    const result = await svc.enviarPush({ usuarioId: "u1", titulo: "Teste", mensagem: "Msg", tipo: "GERAL" });
    expect(result).toBe(true);
    expect(mockPrisma.usuarioFcmToken.findMany).not.toHaveBeenCalled();
  });
});

describe("PushNotificacoesService — enviarPush (with messaging)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns true when user has no active FCM tokens", async () => {
    mockPrisma.usuarioFcmToken.findMany.mockResolvedValue([]);
    const svc = makeServiceWithMessaging();
    const result = await svc.enviarPush({ usuarioId: "u1", titulo: "Teste", mensagem: "Msg", tipo: "GERAL" });
    expect(result).toBe(true);
    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  it("sends multicast and returns true on success", async () => {
    mockPrisma.usuarioFcmToken.findMany.mockResolvedValue([{ token: "tok1" }, { token: "tok2" }]);
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 2,
      responses: [{ success: true }, { success: true }],
    });
    const svc = makeServiceWithMessaging();
    const result = await svc.enviarPush({ usuarioId: "u1", titulo: "Etapa", mensagem: "Aprovada", tipo: "ETAPA_APROVADA" });
    expect(result).toBe(true);
    expect(mockPrisma.usuarioFcmToken.updateMany).not.toHaveBeenCalled();
  });

  it("deactivates failed tokens after partial failure", async () => {
    mockPrisma.usuarioFcmToken.findMany.mockResolvedValue([{ token: "tok1" }, { token: "tok2" }]);
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 1,
      responses: [{ success: true }, { success: false }],
    });
    mockPrisma.usuarioFcmToken.updateMany.mockResolvedValue({});
    const svc = makeServiceWithMessaging();
    await svc.enviarPush({ usuarioId: "u1", titulo: "T", mensagem: "M", tipo: "GERAL" });
    expect(mockPrisma.usuarioFcmToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { token: { in: ["tok2"] } }, data: { ativo: false } }),
    );
  });

  it("returns false when Firebase throws", async () => {
    mockPrisma.usuarioFcmToken.findMany.mockResolvedValue([{ token: "tok1" }]);
    mockSendEachForMulticast.mockRejectedValue(new Error("Firebase quota exceeded"));
    const svc = makeServiceWithMessaging();
    const result = await svc.enviarPush({ usuarioId: "u1", titulo: "T", mensagem: "M", tipo: "GERAL" });
    expect(result).toBe(false);
  });
});

describe("PushNotificacoesService — registrarToken", () => {
  beforeEach(() => jest.clearAllMocks());

  it("upserts FCM token as active", async () => {
    mockPrisma.usuarioFcmToken.upsert.mockResolvedValue({});
    const svc = makeServiceWithMessaging();
    await svc.registrarToken("u1", "new-fcm-token");
    expect(mockPrisma.usuarioFcmToken.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { usuarioId_token: { usuarioId: "u1", token: "new-fcm-token" } },
        create: expect.objectContaining({ usuarioId: "u1", token: "new-fcm-token", ativo: true }),
        update: expect.objectContaining({ ativo: true }),
      }),
    );
  });
});

describe("PushNotificacoesService — desregistrarToken", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sets ativo=false for the specified token", async () => {
    mockPrisma.usuarioFcmToken.updateMany.mockResolvedValue({});
    const svc = makeServiceWithMessaging();
    await svc.desregistrarToken("u1", "old-fcm-token");
    expect(mockPrisma.usuarioFcmToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuarioId: "u1", token: "old-fcm-token" }, data: { ativo: false } }),
    );
  });
});
