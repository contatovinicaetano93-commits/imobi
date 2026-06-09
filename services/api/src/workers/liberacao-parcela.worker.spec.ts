import { LiberacaoParcelaWorker } from "./liberacao-parcela.worker";

const CREDITO_ID = "credito-uuid-001";
const ETAPA_ID = "etapa-uuid-001";
const LIBERACAO_ID = "liberacao-uuid-001";
const USUARIO_ID = "usuario-uuid-001";
const OBRA_ID = "obra-uuid-001";
const VALOR = 50000;

const baseCredito = {
  creditoId: CREDITO_ID,
  usuarioId: USUARIO_ID,
  valorLiberado: 0,
  usuario: { nome: "João Silva", email: "joao@test.com" },
  obras: [{ obraId: OBRA_ID, nome: "Obra Teste" }],
};

const baseLiberacaoPendente = {
  liberacaoId: LIBERACAO_ID,
  creditoId: CREDITO_ID,
  valor: VALOR,
  status: "PENDENTE",
};

function makeJob(data: object = {}) {
  return {
    data: { creditoId: CREDITO_ID, etapaId: ETAPA_ID, liberacaoId: LIBERACAO_ID, valor: VALOR, ...data },
    id: "job-001",
  } as any;
}

function buildWorker(overrides: {
  liberacao?: any;
  credito?: any;
  txLiberacao?: any;
  txProcessed?: boolean;
} = {}) {
  const liberacao = overrides.liberacao !== undefined ? overrides.liberacao : baseLiberacaoPendente;
  const credito = overrides.credito !== undefined ? overrides.credito : baseCredito;

  // Inside-transaction liberacao (second check)
  const txLiberacao = overrides.txLiberacao !== undefined
    ? overrides.txLiberacao
    : baseLiberacaoPendente;

  const tx = {
    liberacaoParcela: {
      findUnique: jest.fn().mockResolvedValue(txLiberacao),
      update: jest.fn().mockResolvedValue({}),
    },
    credito: {
      update: jest.fn().mockResolvedValue({}),
    },
  };

  const prisma = {
    liberacaoParcela: {
      findUnique: jest.fn().mockResolvedValue(liberacao),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    credito: {
      findUnique: jest.fn().mockResolvedValue(credito),
    },
    $transaction: jest.fn().mockImplementation(async (fn: (tx: any) => Promise<void>) => {
      await fn(tx);
    }),
  } as any;

  const notificacoes = { criar: jest.fn().mockResolvedValue({}) } as any;
  const email = { parcelaLiberadaEmail: jest.fn().mockResolvedValue({}) } as any;
  const pushNotificacoes = { enviarPush: jest.fn().mockResolvedValue({}) } as any;

  const worker = new LiberacaoParcelaWorker(prisma, notificacoes, email, pushNotificacoes);
  return { worker, prisma, tx, notificacoes, email, pushNotificacoes };
}

// ─── handle — caminho feliz ───────────────────────────────────────────────────

describe("LiberacaoParcelaWorker.handle — caminho feliz", () => {
  it("executa a transaction sem lançar erro", async () => {
    const { worker } = buildWorker();
    await expect(worker.handle(makeJob())).resolves.not.toThrow();
  });

  it("incrementa valorLiberado no crédito dentro da transaction", async () => {
    const { worker, tx } = buildWorker();
    await worker.handle(makeJob());

    expect(tx.credito.update).toHaveBeenCalledWith({
      where: { creditoId: CREDITO_ID },
      data: { valorLiberado: { increment: VALOR } },
    });
  });

  it("marca liberação como CONCLUIDA dentro da transaction", async () => {
    const { worker, tx } = buildWorker();
    await worker.handle(makeJob());

    expect(tx.liberacaoParcela.update).toHaveBeenCalledWith({
      where: { liberacaoId: LIBERACAO_ID },
      data: { status: "CONCLUIDA", processadoEm: expect.any(Date) },
    });
  });

  it("notifica usuário com PARCELA_LIBERADA após a transaction", async () => {
    const { worker, notificacoes } = buildWorker();
    await worker.handle(makeJob());

    expect(notificacoes.criar).toHaveBeenCalledWith(
      USUARIO_ID,
      "PARCELA_LIBERADA",
      expect.any(String),
      expect.stringContaining("Obra Teste"),
      expect.stringContaining(OBRA_ID)
    );
  });

  it("notificação usa fallback 'sua obra' quando obra não existe no crédito", async () => {
    const { worker, notificacoes } = buildWorker({
      credito: { ...baseCredito, obras: [] },
    });
    await worker.handle(makeJob());

    expect(notificacoes.criar).toHaveBeenCalledWith(
      USUARIO_ID,
      "PARCELA_LIBERADA",
      expect.any(String),
      expect.stringContaining("sua obra"),
      "/dashboard"
    );
  });
});

// ─── handle — idempotência ────────────────────────────────────────────────────

describe("LiberacaoParcelaWorker.handle — idempotência", () => {
  it("retorna sem fazer nada se liberação já está CONCLUIDA (pre-check)", async () => {
    const { worker, prisma, tx } = buildWorker({
      liberacao: { ...baseLiberacaoPendente, status: "CONCLUIDA" },
    });
    await worker.handle(makeJob());

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.credito.update).not.toHaveBeenCalled();
  });

  it("retorna sem fazer nada se liberação não existe (pre-check)", async () => {
    const { worker, prisma } = buildWorker({ liberacao: null });
    await worker.handle(makeJob());

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("NÃO notifica se liberação já estava CONCLUIDA no pre-check", async () => {
    const { worker, notificacoes } = buildWorker({
      liberacao: { ...baseLiberacaoPendente, status: "CONCLUIDA" },
    });
    await worker.handle(makeJob());

    expect(notificacoes.criar).not.toHaveBeenCalled();
  });

  it("NÃO notifica se liberação foi processada por outro worker durante a transaction (processed=false)", async () => {
    // liberacao está PENDENTE no pre-check mas CONCLUIDA quando a TX a lê
    const { worker, notificacoes } = buildWorker({
      txLiberacao: { ...baseLiberacaoPendente, status: "CONCLUIDA" },
    });
    await worker.handle(makeJob());

    expect(notificacoes.criar).not.toHaveBeenCalled();
  });

  it("NÃO incrementa crédito se liberação foi processada durante a transaction", async () => {
    const { worker, tx } = buildWorker({
      txLiberacao: { ...baseLiberacaoPendente, status: "CONCLUIDA" },
    });
    await worker.handle(makeJob());

    expect(tx.credito.update).not.toHaveBeenCalled();
  });
});

// ─── handle — falhas ─────────────────────────────────────────────────────────

describe("LiberacaoParcelaWorker.handle — falhas", () => {
  it("relança erro se crédito não existe (BullMQ vai marcar o job como failed)", async () => {
    const { worker } = buildWorker({ credito: null });
    await expect(worker.handle(makeJob())).rejects.toThrow(/Crédito .* não encontrado/);
  });

  it("NÃO notifica se crédito não existe", async () => {
    const { worker, notificacoes } = buildWorker({ credito: null });
    await expect(worker.handle(makeJob())).rejects.toThrow();
    expect(notificacoes.criar).not.toHaveBeenCalled();
  });

  it("relança erro de transaction para que BullMQ tente novamente", async () => {
    const { worker, prisma } = buildWorker();
    prisma.$transaction.mockRejectedValueOnce(new Error("deadlock detected"));

    await expect(worker.handle(makeJob())).rejects.toThrow("deadlock detected");
  });
});

// ─── onFailed ─────────────────────────────────────────────────────────────────

describe("LiberacaoParcelaWorker.onFailed", () => {
  it("marca liberação como FALHA com guard de status PENDENTE", async () => {
    const { worker, prisma } = buildWorker();
    await (worker as any).onFailed(makeJob(), new Error("timeout"));

    // aguarda a promise interna (onFailed é fire-and-forget mas em testes precisamos drenar)
    await new Promise((r) => setImmediate(r));

    expect(prisma.liberacaoParcela.updateMany).toHaveBeenCalledWith({
      where: { liberacaoId: LIBERACAO_ID, status: "PENDENTE" },
      data: { status: "FALHA", processadoEm: expect.any(Date) },
    });
  });

  it("usa status guard PENDENTE para não sobrescrever CONCLUIDA (crash-before-ACK)", async () => {
    const { worker, prisma } = buildWorker();
    await (worker as any).onFailed(makeJob(), new Error("crash"));
    await new Promise((r) => setImmediate(r));

    const call = prisma.liberacaoParcela.updateMany.mock.calls[0][0];
    expect(call.where).toMatchObject({ status: "PENDENTE" });
  });

  it("notifica usuário com PARCELA_FALHA", async () => {
    const { worker, notificacoes } = buildWorker();
    await (worker as any).onFailed(makeJob(), new Error("erro"));
    await new Promise((r) => setImmediate(r));

    expect(notificacoes.criar).toHaveBeenCalledWith(
      USUARIO_ID,
      "PARCELA_FALHA",
      expect.any(String),
      expect.stringContaining("Obra Teste"),
      expect.any(String)
    );
  });

  it("NÃO lança erro se crédito não existe no onFailed (fire-and-forget seguro)", async () => {
    const { worker, prisma } = buildWorker({ credito: null });
    // onFailed não deve propagar erros — worker já encerrou
    await expect(
      (async () => {
        (worker as any).onFailed(makeJob(), new Error("erro original"));
        await new Promise((r) => setImmediate(r));
      })()
    ).resolves.not.toThrow();
  });
});
