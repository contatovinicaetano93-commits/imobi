import { LiberacaoParcelaWorker } from "./liberacao-parcela.worker";
import { ExcluirUsuarioWorker } from "./excluir-usuario.worker";

// ─── Shared mocks ─────────────────────────────────────────────────────────────

const mockPrisma = {
  liberacaoParcela: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  credito: { findUnique: jest.fn(), update: jest.fn() },
  sessaoToken: { deleteMany: jest.fn() },
  notificacao: { deleteMany: jest.fn() },
  usuarioFcmToken: { deleteMany: jest.fn() },
  scoreHistorico: { deleteMany: jest.fn() },
  obra: { deleteMany: jest.fn() },
  usuario: { findUnique: jest.fn(), delete: jest.fn() },
  $transaction: jest.fn(),
};

const mockNotificacoes = { criar: jest.fn() };
const mockEmail = { parcelaLiberadaEmail: jest.fn(), contaExcluida: jest.fn() };
const mockPush = { enviarPush: jest.fn() };

function makeJob<T>(data: T, id = "job-1"): any {
  return { id, data };
}

// ─── LiberacaoParcelaWorker ───────────────────────────────────────────────────

function makeLiberacaoWorker() {
  return new LiberacaoParcelaWorker(
    mockPrisma as any,
    mockNotificacoes as any,
    mockEmail as any,
    mockPush as any,
  );
}

describe("LiberacaoParcelaWorker — handle", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns early when liberacao is already processed (idempotency)", async () => {
    mockPrisma.liberacaoParcela.findUnique.mockResolvedValue({ status: "CONCLUIDA" });
    const worker = makeLiberacaoWorker();
    await worker.handle(makeJob({ creditoId: "c1", liberacaoId: "lib1", valor: 10000 }));
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns early when liberacao not found", async () => {
    mockPrisma.liberacaoParcela.findUnique.mockResolvedValue(null);
    const worker = makeLiberacaoWorker();
    await worker.handle(makeJob({ creditoId: "c1", liberacaoId: "lib1", valor: 10000 }));
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("throws when credito not found", async () => {
    mockPrisma.liberacaoParcela.findUnique.mockResolvedValue({ status: "PENDENTE" });
    mockPrisma.credito.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementation(async (fn: Function) => fn(mockPrisma));
    const worker = makeLiberacaoWorker();
    await expect(
      worker.handle(makeJob({ creditoId: "bad-c", liberacaoId: "lib1", valor: 10000 })),
    ).rejects.toThrow("Crédito bad-c não encontrado");
  });

  it("increments valorLiberado and sets status CONCLUIDA on success", async () => {
    mockPrisma.liberacaoParcela.findUnique.mockResolvedValue({ status: "PENDENTE" });
    mockPrisma.credito.findUnique.mockResolvedValue({
      creditoId: "c1", usuarioId: "u1",
      usuario: { nome: "João", email: "j@j.com" },
      obras: [{ obraId: "o1", nome: "Casa A" }],
    });
    mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
      mockPrisma.liberacaoParcela.findUnique.mockResolvedValueOnce({ status: "PENDENTE" });
      mockPrisma.credito.update.mockResolvedValue({});
      mockPrisma.liberacaoParcela.update.mockResolvedValue({});
      await fn(mockPrisma);
    });
    mockNotificacoes.criar.mockResolvedValue({});
    mockPush.enviarPush.mockResolvedValue(true);
    mockEmail.parcelaLiberadaEmail.mockResolvedValue(true);

    const worker = makeLiberacaoWorker();
    await worker.handle(makeJob({ creditoId: "c1", liberacaoId: "lib1", valor: 50000 }));

    expect(mockPrisma.credito.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { valorLiberado: { increment: 50000 } } }),
    );
    expect(mockPrisma.liberacaoParcela.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CONCLUIDA" }) }),
    );
    expect(mockNotificacoes.criar).toHaveBeenCalledWith(
      "u1", "PARCELA_LIBERADA", expect.any(String), expect.any(String), expect.any(String),
    );
  });
});

describe("LiberacaoParcelaWorker — onFailed", () => {
  beforeEach(() => jest.clearAllMocks());

  it("marks liberacao as FALHA and notifies user", async () => {
    mockPrisma.credito.findUnique.mockResolvedValue({
      creditoId: "c1", usuarioId: "u1",
      obras: [{ obraId: "o1", nome: "Casa A" }],
    });
    mockPrisma.liberacaoParcela.updateMany.mockResolvedValue({});
    mockNotificacoes.criar.mockResolvedValue({});

    const worker = makeLiberacaoWorker();
    worker.onFailed(makeJob({ creditoId: "c1", liberacaoId: "lib1", valor: 0 }), new Error("DB timeout"));

    // Give the async operations inside onFailed time to run
    await new Promise((r) => setTimeout(r, 10));

    expect(mockPrisma.liberacaoParcela.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { liberacaoId: "lib1", status: "PENDENTE" }, data: { status: "FALHA", processadoEm: expect.any(Date) } }),
    );
  });
});

// ─── ExcluirUsuarioWorker ─────────────────────────────────────────────────────

function makeExcluirWorker() {
  return new ExcluirUsuarioWorker(mockPrisma as any, mockEmail as any);
}

describe("ExcluirUsuarioWorker — handle", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns early when user not found", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    const worker = makeExcluirWorker();
    await worker.handle(makeJob({ usuarioId: "bad-id" }));
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns early when grace period not elapsed (less than 30 days)", async () => {
    const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    mockPrisma.usuario.findUnique.mockResolvedValue({
      email: "j@j.com", nome: "João", deletadoEm: recentDate,
    });
    const worker = makeExcluirWorker();
    await worker.handle(makeJob({ usuarioId: "u1" }));
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("performs hard deletion after 30-day grace period and sends confirmation email", async () => {
    const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
    mockPrisma.usuario.findUnique.mockResolvedValue({
      email: "j@j.com", nome: "João", deletadoEm: oldDate,
    });
    mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
      mockPrisma.sessaoToken.deleteMany.mockResolvedValue({});
      mockPrisma.notificacao.deleteMany.mockResolvedValue({});
      mockPrisma.usuarioFcmToken.deleteMany.mockResolvedValue({});
      mockPrisma.scoreHistorico.deleteMany.mockResolvedValue({});
      mockPrisma.obra.deleteMany.mockResolvedValue({});
      mockPrisma.credito.deleteMany = jest.fn().mockResolvedValue({});
      mockPrisma.usuario.delete.mockResolvedValue({});
      await fn(mockPrisma);
    });
    mockEmail.contaExcluida.mockResolvedValue(true);

    const worker = makeExcluirWorker();
    await worker.handle(makeJob({ usuarioId: "u1" }));

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.usuario.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuarioId: "u1" } }),
    );
    // Email is fire-and-forget (.catch), give it time
    await new Promise((r) => setTimeout(r, 10));
    expect(mockEmail.contaExcluida).toHaveBeenCalledWith("João", "j@j.com");
  });

  it("throws and re-throws transaction errors for retry", async () => {
    const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
    mockPrisma.usuario.findUnique.mockResolvedValue({
      email: "j@j.com", nome: "João", deletadoEm: oldDate,
    });
    mockPrisma.$transaction.mockRejectedValue(new Error("DB constraint error"));

    const worker = makeExcluirWorker();
    await expect(worker.handle(makeJob({ usuarioId: "u1" }))).rejects.toThrow("DB constraint error");
  });
});
