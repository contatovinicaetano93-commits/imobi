import { NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { EtapasService } from "./etapas.service";

const mockPrisma = {
  etapaObra: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
  evidenciaEtapa: { count: jest.fn() },
  etapaAuditLog: { create: jest.fn() },
  liberacaoParcela: { create: jest.fn() },
};

const mockNotificacoes = { criar: jest.fn() };
const mockEmail = { etapaAprovada: jest.fn().mockResolvedValue({}) };
const mockPush = { enviarPush: jest.fn() };
const mockQueue = { add: jest.fn() };

function makeService() {
  return new EtapasService(
    mockPrisma as any,
    mockNotificacoes as any,
    mockEmail as any,
    mockPush as any,
    mockQueue as any,
  );
}

function makeEtapa(overrides: Record<string, any> = {}) {
  return {
    etapaId: "e1",
    nome: "Fundação",
    status: "AGUARDANDO_VISTORIA",
    percentualObra: 30,
    obra: {
      obraId: "o1",
      nome: "Casa A",
      usuarioId: "u1",
      usuario: { nome: "João", email: "j@j.com" },
      credito: null,
    },
    ...overrides,
  };
}

describe("EtapasService — aprovar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when etapa not found", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.aprovar("g1", "bad-id")).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException when no validated evidencias", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa());
    mockPrisma.evidenciaEtapa.count.mockResolvedValue(0);
    const svc = makeService();
    await expect(svc.aprovar("g1", "e1")).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException when etapa is not in AGUARDANDO_VISTORIA", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa());
    mockPrisma.evidenciaEtapa.count.mockResolvedValue(1);
    mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 0 });
    const svc = makeService();
    await expect(svc.aprovar("g1", "e1")).rejects.toThrow(BadRequestException);
  });

  it("approves etapa and creates audit log", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa());
    mockPrisma.evidenciaEtapa.count.mockResolvedValue(1);
    mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.etapaAuditLog.create.mockResolvedValue({});
    mockNotificacoes.criar.mockResolvedValue({});
    mockPush.enviarPush.mockResolvedValue({});
    const svc = makeService();
    const result = await svc.aprovar("g1", "e1", "ok");
    expect(result).toEqual({ ok: true, observacao: "ok" });
    expect(mockPrisma.etapaAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ acaoTipo: "APROVADA", usuarioId: "g1" }) }),
    );
  });

  it("enqueues liberacao when credito is ATIVO", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(
      makeEtapa({
        percentualObra: 40,
        obra: {
          obraId: "o1", nome: "Casa A", usuarioId: "u1",
          usuario: { nome: "João", email: "j@j.com" },
          credito: { creditoId: "c1", status: "ATIVO", valorAprovado: 100000 },
        },
      }),
    );
    mockPrisma.evidenciaEtapa.count.mockResolvedValue(1);
    mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.etapaAuditLog.create.mockResolvedValue({});
    mockNotificacoes.criar.mockResolvedValue({});
    mockPush.enviarPush.mockResolvedValue({});
    mockEmail.etapaAprovada.mockResolvedValue({});
    mockPrisma.liberacaoParcela.create.mockResolvedValue({ liberacaoId: "lib1" });
    mockQueue.add.mockResolvedValue({});
    const svc = makeService();
    await svc.aprovar("g1", "e1");
    expect(mockPrisma.liberacaoParcela.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ valor: 40000 }) }),
    );
  });
});

describe("EtapasService — rejeitar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when etapa not found", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.rejeitar("g1", "bad-id", "motivo")).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException when etapa is not AGUARDANDO_VISTORIA", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa({ status: "CONCLUIDA" }));
    mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 0 });
    const svc = makeService();
    await expect(svc.rejeitar("g1", "e1", "motivo")).rejects.toThrow(BadRequestException);
  });

  it("rejects etapa and notifies user with motivo", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa());
    mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.etapaAuditLog.create.mockResolvedValue({});
    mockNotificacoes.criar.mockResolvedValue({});
    const svc = makeService();
    const result = await svc.rejeitar("g1", "e1", "rachaduras");
    expect(result).toEqual({ ok: true, motivo: "rachaduras" });
    expect(mockNotificacoes.criar).toHaveBeenCalledWith(
      "u1", "ETAPA_REPROVADA", expect.any(String), expect.stringContaining("rachaduras"), expect.any(String),
    );
  });
});

describe("EtapasService — atualizarStatus", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when etapa not found", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.atualizarStatus("bad-id", "AGUARDANDO_VISTORIA", "u1", "TOMADOR")).rejects.toThrow(NotFoundException);
  });

  it("throws ForbiddenException when TOMADOR doesn't own the obra", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa({ obra: { usuarioId: "other", obraId: "o1", nome: "A" } }));
    const svc = makeService();
    await expect(svc.atualizarStatus("e1", "AGUARDANDO_VISTORIA", "u1", "TOMADOR")).rejects.toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when TOMADOR tries to set non-vistoria status", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa());
    const svc = makeService();
    await expect(svc.atualizarStatus("e1", "CONCLUIDA", "u1", "TOMADOR")).rejects.toThrow(ForbiddenException);
  });

  it("allows GESTOR to set any status", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa());
    mockPrisma.etapaObra.update.mockResolvedValue({ etapaId: "e1" });
    const svc = makeService();
    await svc.atualizarStatus("e1", "CONCLUIDA", "g1", "GESTOR");
    expect(mockPrisma.etapaObra.update).toHaveBeenCalled();
  });
});

describe("EtapasService — atualizar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when etapa not found", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.atualizar("bad-id", { nome: "X" }, "u1")).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException when etapa is CONCLUIDA", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa({ status: "CONCLUIDA" }));
    const svc = makeService();
    await expect(svc.atualizar("e1", { nome: "X" }, "u1")).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException for invalid date", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa({ status: "PLANEJADA" }));
    const svc = makeService();
    await expect(svc.atualizar("e1", { dataPlanejadaConclusao: "not-a-date" }, "u1")).rejects.toThrow(BadRequestException);
  });

  it("updates fields and creates audit log", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa({ status: "PLANEJADA" }));
    mockPrisma.etapaAuditLog.create.mockResolvedValue({});
    mockPrisma.etapaObra.update.mockResolvedValue({ etapaId: "e1" });
    const svc = makeService();
    await svc.atualizar("e1", { nome: "Novo Nome", ordem: 2 }, "u1");
    const updateCall = mockPrisma.etapaObra.update.mock.calls[0][0];
    expect(updateCall.data.nome).toBe("Novo Nome");
    expect(updateCall.data.ordem).toBe(2);
    expect(mockPrisma.etapaAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ acaoTipo: "ATUALIZADA" }) }),
    );
  });
});
