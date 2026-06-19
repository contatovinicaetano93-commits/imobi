import { BadRequestException } from "@nestjs/common";
import { UsuariosService } from "./usuarios.service";

const mockPrisma = {
  usuario: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  usuarioFcmToken: { updateMany: jest.fn() },
  $transaction: jest.fn(),
};

const mockQueue = { add: jest.fn() };

function makeService() {
  return new UsuariosService(mockPrisma as any, mockQueue as any);
}

function makeUsuario(overrides: Record<string, any> = {}) {
  return {
    usuarioId: "u1",
    nome: "João Silva",
    cpf: "12345678900",
    email: "joao@test.com",
    telefone: "11987654321",
    tipo: "TOMADOR",
    kycStatus: "PENDENTE",
    criadoEm: new Date("2024-01-01"),
    atualizadoEm: new Date("2024-06-01"),
    deletadoEm: null,
    ...overrides,
  };
}

describe("UsuariosService — buscarPerfil", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns user profile", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(makeUsuario());
    const svc = makeService();
    const result = await svc.buscarPerfil("u1");
    expect(result?.usuarioId).toBe("u1");
  });

  it("returns null when user not found", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    const svc = makeService();
    expect(await svc.buscarPerfil("bad-id")).toBeNull();
  });
});

describe("UsuariosService — atualizarPerfil", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates and returns new profile", async () => {
    const updated = makeUsuario({ nome: "João Atualizado" });
    mockPrisma.usuario.update.mockResolvedValue(updated);
    const svc = makeService();
    const result = await svc.atualizarPerfil("u1", { nome: "João Atualizado" });
    expect(result.nome).toBe("João Atualizado");
    expect(mockPrisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { usuarioId: "u1" },
        data: expect.objectContaining({ nome: "João Atualizado" }),
      }),
    );
  });
});

describe("UsuariosService — meusDados", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws BadRequestException when user not found", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.meusDados("bad-id")).rejects.toThrow(BadRequestException);
  });

  it("masks CPF with asterisks", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(
      makeUsuario({ kycDocumentos: [], creditos: [], obras: [] }),
    );
    const svc = makeService();
    const result = await svc.meusDados("u1");
    expect(result.usuario.cpf).not.toBe("12345678900");
    expect(result.usuario.cpf).toContain("*");
  });

  it("masks telefone with asterisks", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(
      makeUsuario({ kycDocumentos: [], creditos: [], obras: [] }),
    );
    const svc = makeService();
    const result = await svc.meusDados("u1");
    expect(result.usuario.telefone).toContain("*");
  });

  it("returns all sub-arrays", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(
      makeUsuario({ kycDocumentos: [{ kycDocumentoId: "k1" }], creditos: [], obras: [] }),
    );
    const svc = makeService();
    const result = await svc.meusDados("u1");
    expect(result.documentosKyc).toHaveLength(1);
    expect(result.dataExporte).toBeInstanceOf(Date);
  });
});

describe("UsuariosService — marcarDelecao", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws BadRequestException when user not found", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.marcarDelecao("bad-id")).rejects.toThrow(BadRequestException);
  });

  it("marks deletadoEm and enqueues hard-delete job with 30-day delay", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(makeUsuario());
    mockPrisma.usuario.update.mockResolvedValue({});
    mockQueue.add.mockResolvedValue({});
    const svc = makeService();
    const result = await svc.marcarDelecao("u1");
    expect(mockPrisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletadoEm: expect.any(Date) }) }),
    );
    expect(mockQueue.add).toHaveBeenCalledWith("hard-delete", { usuarioId: "u1" }, expect.objectContaining({ delay: 30 * 24 * 60 * 60 * 1000 }));
    expect(result.gracePeriodDays).toBe(30);
  });
});

describe("UsuariosService — exportarDados", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws BadRequestException when user not found", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.exportarDados("bad-id")).rejects.toThrow(BadRequestException);
  });

  it("returns complete unmasked data with dataExporte ISO string", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(
      makeUsuario({ kycDocumentos: [], creditos: [], obras: [], scoreHistorico: [], notificacoes: [], fcmTokens: [] }),
    );
    const svc = makeService();
    const result = await svc.exportarDados("u1");
    expect(result.usuario.cpf).toBe("12345678900");
    expect(typeof result.dataExporte).toBe("string");
  });
});

describe("UsuariosService — revogarConsentimento", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws BadRequestException when user not found", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.revogarConsentimento("bad-id", "TUDO")).rejects.toThrow(BadRequestException);
  });

  it("disables FCM tokens when tipo is NOTIFICACOES", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(makeUsuario());
    mockPrisma.usuarioFcmToken.updateMany.mockResolvedValue({ count: 2 });
    const svc = makeService();
    await svc.revogarConsentimento("u1", "NOTIFICACOES");
    expect(mockPrisma.usuarioFcmToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuarioId: "u1" }, data: { ativo: false } }),
    );
  });

  it("disables FCM tokens when tipo is TUDO", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(makeUsuario());
    mockPrisma.usuarioFcmToken.updateMany.mockResolvedValue({ count: 1 });
    const svc = makeService();
    await svc.revogarConsentimento("u1", "TUDO");
    expect(mockPrisma.usuarioFcmToken.updateMany).toHaveBeenCalled();
  });

  it("does not touch FCM tokens when tipo is MARKETING", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(makeUsuario());
    const svc = makeService();
    await svc.revogarConsentimento("u1", "MARKETING");
    expect(mockPrisma.usuarioFcmToken.updateMany).not.toHaveBeenCalled();
  });
});
