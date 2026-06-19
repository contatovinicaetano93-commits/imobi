import { NotFoundException, BadRequestException } from "@nestjs/common";
import { VistoriaService } from "./vistoria.service";

const mockPrisma = {
  etapaObra: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  etapaAuditLog: { create: jest.fn() },
  liberacaoParcela: { create: jest.fn() },
};

const mockNotificacoes = { criar: jest.fn() };
const mockEmail = { etapaAprovadaEmail: jest.fn() };
const mockPush = { enviarPush: jest.fn() };
const mockQueue = { add: jest.fn() };

function makeService() {
  return new VistoriaService(
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

describe("VistoriaService — aprovar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when etapa not found", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.aprovar("g1", "bad-id")).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException when etapa cannot be approved (already CONCLUIDA)", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa());
    mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 0 });
    const svc = makeService();
    await expect(svc.aprovar("g1", "e1")).rejects.toThrow(BadRequestException);
  });

  it("approves etapa, logs audit, sends notification", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa());
    mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.etapaAuditLog.create.mockResolvedValue({});
    mockNotificacoes.criar.mockResolvedValue({});
    mockPush.enviarPush.mockResolvedValue({});

    const svc = makeService();
    const result = await svc.aprovar("g1", "e1", "tudo ok");
    expect(result).toEqual({ ok: true, etapaId: "e1", status: "CONCLUIDA" });
    expect(mockPrisma.etapaAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ acaoTipo: "APROVADA", usuarioId: "g1" }) }),
    );
    expect(mockNotificacoes.criar).toHaveBeenCalledWith(
      "u1",
      "ETAPA_APROVADA",
      expect.stringContaining("Fundação"),
      expect.any(String),
      expect.any(String),
    );
  });

  it("enqueues liberacao when credito is ATIVO and valorLiberacao > 0", async () => {
    const etapa = makeEtapa({
      percentualObra: 30,
      obra: {
        obraId: "o1", nome: "Casa A", usuarioId: "u1",
        usuario: { nome: "João", email: "j@j.com" },
        credito: { creditoId: "c1", status: "ATIVO", valorAprovado: 100000 },
      },
    });
    mockPrisma.etapaObra.findUnique.mockResolvedValue(etapa);
    mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.etapaAuditLog.create.mockResolvedValue({});
    mockNotificacoes.criar.mockResolvedValue({});
    mockPush.enviarPush.mockResolvedValue({});
    mockEmail.etapaAprovadaEmail.mockResolvedValue({});
    mockPrisma.liberacaoParcela.create.mockResolvedValue({ liberacaoId: "lib1" });
    mockQueue.add.mockResolvedValue({});

    const svc = makeService();
    await svc.aprovar("g1", "e1");

    expect(mockPrisma.liberacaoParcela.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ creditoId: "c1", valor: 30000 }) }),
    );
    expect(mockQueue.add).toHaveBeenCalledWith(
      expect.objectContaining({ creditoId: "c1", etapaId: "e1", valor: 30000 }),
    );
  });

  it("does not enqueue liberacao when credito is SUSPENSO", async () => {
    const etapa = makeEtapa({
      percentualObra: 30,
      obra: {
        obraId: "o1", nome: "Casa A", usuarioId: "u1",
        usuario: { nome: "João", email: "j@j.com" },
        credito: { creditoId: "c1", status: "SUSPENSO", valorAprovado: 100000 },
      },
    });
    mockPrisma.etapaObra.findUnique.mockResolvedValue(etapa);
    mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.etapaAuditLog.create.mockResolvedValue({});
    mockNotificacoes.criar.mockResolvedValue({});
    mockPush.enviarPush.mockResolvedValue({});
    mockEmail.etapaAprovadaEmail.mockResolvedValue({});

    const svc = makeService();
    await svc.aprovar("g1", "e1");
    expect(mockPrisma.liberacaoParcela.create).not.toHaveBeenCalled();
    expect(mockQueue.add).not.toHaveBeenCalled();
  });
});

describe("VistoriaService — listarPendentes", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns paginated data with total and page info", async () => {
    mockPrisma.etapaObra.findMany.mockResolvedValue([{ etapaId: "e1" }]);
    mockPrisma.etapaObra.count.mockResolvedValue(5);
    const svc = makeService();
    const result = await svc.listarPendentes(10, 0);
    expect(result.total).toBe(5);
    expect(result.data).toHaveLength(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it("calculates correct page from offset", async () => {
    mockPrisma.etapaObra.findMany.mockResolvedValue([]);
    mockPrisma.etapaObra.count.mockResolvedValue(0);
    const svc = makeService();
    const result = await svc.listarPendentes(10, 20);
    expect(result.page).toBe(3);
  });
});

describe("VistoriaService — agendar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when etapa not found", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.agendar("g1", "bad-id", "2025-07-01")).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException for invalid date string", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa());
    const svc = makeService();
    await expect(svc.agendar("g1", "e1", "not-a-date")).rejects.toThrow(BadRequestException);
  });

  it("returns ok with ISO date on success", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa());
    mockPrisma.etapaAuditLog.create.mockResolvedValue({});
    mockNotificacoes.criar.mockResolvedValue({});
    const svc = makeService();
    const result = await svc.agendar("g1", "e1", "2025-07-15");
    expect(result.ok).toBe(true);
    expect(result.dataAgendada).toBe(new Date("2025-07-15").toISOString());
  });
});

describe("VistoriaService — rejeitar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when etapa not found", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.rejeitar("g1", "bad-id", "motivo")).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException when etapa status cannot be rejected", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa());
    mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 0 });
    const svc = makeService();
    await expect(svc.rejeitar("g1", "e1", "motivo")).rejects.toThrow(BadRequestException);
  });

  it("rejects etapa, logs audit with motivo, notifies user", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa());
    mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.etapaAuditLog.create.mockResolvedValue({});
    mockNotificacoes.criar.mockResolvedValue({});
    const svc = makeService();
    const result = await svc.rejeitar("g1", "e1", "rachaduras");
    expect(result).toEqual({ ok: true, etapaId: "e1", status: "REPROVADA" });
    expect(mockPrisma.etapaAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ acaoTipo: "REJEITADA", observacoes: "rachaduras" }) }),
    );
    expect(mockNotificacoes.criar).toHaveBeenCalledWith(
      "u1",
      "ETAPA_REPROVADA",
      expect.any(String),
      expect.stringContaining("rachaduras"),
      expect.any(String),
    );
  });
});
