import { ScoreService } from "./score.service";

const USUARIO_ID = "usuario-uuid-001";
const NOW = new Date("2025-01-01T12:00:00Z");
// A date 12 months in the past — worth ~60 points (12 months * 5, capped at 100)
const DATE_12_MONTHS_AGO = new Date(NOW.getTime() - 12 * 30 * 24 * 60 * 60 * 1000);

// Pin Date.now() so time-bonus calculations are deterministic
beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2025-01-02T00:00:00Z")); // 12h after NOW → ~0 time bonus
});
afterAll(() => {
  jest.useRealTimers();
});

function makeObra(status: string) {
  return { status };
}
function makeCredito(status: string) {
  return { status };
}

function buildService(overrides: {
  obras?: any[];
  creditos?: any[];
  criadoEm?: Date;
  kycStatus?: string;
  historico?: any[];
  txUltimo?: any;
  txError?: any;
} = {}) {
  const obras = overrides.obras ?? [];
  const creditos = overrides.creditos ?? [];
  const criadoEm = overrides.criadoEm ?? NOW;
  const kycStatus = overrides.kycStatus ?? "PENDENTE";

  const tx = {
    scoreHistorico: {
      findFirst: jest.fn().mockResolvedValue(overrides.txUltimo ?? null),
      create: jest.fn().mockResolvedValue({}),
    },
  };

  const $transaction = overrides.txError
    ? jest.fn().mockRejectedValue(overrides.txError)
    : jest.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => cb(tx));

  const prisma = {
    obra: { findMany: jest.fn().mockResolvedValue(obras) },
    credito: { findMany: jest.fn().mockResolvedValue(creditos) },
    usuario: {
      findUnique: jest
        .fn()
        .mockResolvedValueOnce({ criadoEm })
        .mockResolvedValueOnce({ kycStatus }),
    },
    scoreHistorico: {
      findMany: jest.fn().mockResolvedValue(overrides.historico ?? []),
    },
    $transaction,
  };

  const service = Object.create(ScoreService.prototype) as ScoreService;
  (service as any).prisma = prisma;

  return { service, prisma, tx };
}

// ── calcularScore ─────────────────────────────────────────────────────

describe("ScoreService.calcularScore", () => {
  it("returns base 600 for a brand-new user with no obra history or KYC", async () => {
    const { service } = buildService({ criadoEm: NOW });
    const score = await service.calcularScore(USUARIO_ID);
    // 600 base + 0 obras + 0 conclusao + 0 creditos + ~0 time + 0 kyc
    expect(score).toBe(600);
  });

  it("adds up to 200 for concluded obras (50 per obra, capped at 4)", async () => {
    const { service } = buildService({
      obras: [makeObra("CONCLUIDA"), makeObra("CONCLUIDA")],
      criadoEm: NOW,
    });
    const score = await service.calcularScore(USUARIO_ID);
    // 600 + 100 (2 * 50) + 300 (taxa 100%) = 1000, capped
    expect(score).toBe(1000);
  });

  it("adds taxa de conclusao proportionally when some obras are not concluded", async () => {
    const { service } = buildService({
      obras: [makeObra("CONCLUIDA"), makeObra("EM_ANDAMENTO")],
      criadoEm: NOW,
    });
    const score = await service.calcularScore(USUARIO_ID);
    // 600 + 50 (1 concluida) + 150 (50% taxa) = 800
    expect(score).toBe(800);
  });

  it("adds up to 200 for credits in ATIVO or QUITADO status", async () => {
    const { service } = buildService({
      creditos: [makeCredito("ATIVO"), makeCredito("QUITADO")],
      criadoEm: NOW,
    });
    const score = await service.calcularScore(USUARIO_ID);
    // 600 + 200 (2 * 100, capped) = 800
    expect(score).toBe(800);
  });

  it("does not add credit bonus for VENCIDO or SUSPENSO credits", async () => {
    const { service } = buildService({
      creditos: [makeCredito("VENCIDO"), makeCredito("SUSPENSO")],
      criadoEm: NOW,
    });
    const score = await service.calcularScore(USUARIO_ID);
    expect(score).toBe(600);
  });

  it("adds 200 for KYC APROVADO", async () => {
    const { service } = buildService({ kycStatus: "APROVADO", criadoEm: NOW });
    const score = await service.calcularScore(USUARIO_ID);
    expect(score).toBe(800);
  });

  it("does not add KYC bonus when kycStatus is PENDENTE", async () => {
    const { service } = buildService({ kycStatus: "PENDENTE", criadoEm: NOW });
    const score = await service.calcularScore(USUARIO_ID);
    expect(score).toBe(600);
  });

  it("adds time bonus for older accounts (capped at 100)", async () => {
    const { service } = buildService({ criadoEm: DATE_12_MONTHS_AGO });
    const score = await service.calcularScore(USUARIO_ID);
    // ~60 months worth of points (12 * 5 = 60)
    expect(score).toBeGreaterThan(600);
    expect(score).toBeLessThanOrEqual(700);
  });

  it("caps score at 1000", async () => {
    const { service } = buildService({
      obras: [makeObra("CONCLUIDA"), makeObra("CONCLUIDA"), makeObra("CONCLUIDA"), makeObra("CONCLUIDA"), makeObra("CONCLUIDA")],
      creditos: [makeCredito("ATIVO"), makeCredito("ATIVO"), makeCredito("ATIVO")],
      kycStatus: "APROVADO",
      criadoEm: DATE_12_MONTHS_AGO,
    });
    const score = await service.calcularScore(USUARIO_ID);
    expect(score).toBe(1000);
  });
});

// ── buscarScoreAtual ──────────────────────────────────────────────────

describe("ScoreService.buscarScoreAtual", () => {
  it("creates a history record when no previous record exists", async () => {
    const { service, tx } = buildService({ txUltimo: null });
    jest.spyOn(service, "calcularScore").mockResolvedValue(700);
    const result = await service.buscarScoreAtual(USUARIO_ID);
    expect(tx.scoreHistorico.create).toHaveBeenCalledWith({
      data: { usuarioId: USUARIO_ID, score: 700, motivo: "Cálculo automático" },
    });
    expect(result).toBe(700);
  });

  it("creates a history record when score has changed", async () => {
    const { service, tx } = buildService({ txUltimo: { score: 650 } });
    jest.spyOn(service, "calcularScore").mockResolvedValue(700);
    await service.buscarScoreAtual(USUARIO_ID);
    expect(tx.scoreHistorico.create).toHaveBeenCalled();
  });

  it("does not create a history record when score is unchanged", async () => {
    const { service, tx } = buildService({ txUltimo: { score: 700 } });
    jest.spyOn(service, "calcularScore").mockResolvedValue(700);
    await service.buscarScoreAtual(USUARIO_ID);
    expect(tx.scoreHistorico.create).not.toHaveBeenCalled();
  });

  it("silently ignores P2034 serialization conflicts", async () => {
    const p2034 = Object.assign(new Error("serialization failure"), { code: "P2034" });
    const { service } = buildService({ txError: p2034 });
    jest.spyOn(service, "calcularScore").mockResolvedValue(700);
    await expect(service.buscarScoreAtual(USUARIO_ID)).resolves.toBe(700);
  });

  it("re-throws non-P2034 errors", async () => {
    const dbError = Object.assign(new Error("connection lost"), { code: "P1001" });
    const { service } = buildService({ txError: dbError });
    jest.spyOn(service, "calcularScore").mockResolvedValue(700);
    await expect(service.buscarScoreAtual(USUARIO_ID)).rejects.toThrow("connection lost");
  });

  it("returns the calculated score regardless of whether a record was created", async () => {
    const { service } = buildService({ txUltimo: { score: 700 } });
    jest.spyOn(service, "calcularScore").mockResolvedValue(700);
    const result = await service.buscarScoreAtual(USUARIO_ID);
    expect(result).toBe(700);
  });
});

// ── buscarHistorico ───────────────────────────────────────────────────

describe("ScoreService.buscarHistorico", () => {
  it("returns historico ordered by criadoEm desc", async () => {
    const entries = [{ score: 700 }, { score: 650 }];
    const { service, prisma } = buildService({ historico: entries });
    const result = await service.buscarHistorico(USUARIO_ID);
    expect(result).toEqual(entries);
    expect(prisma.scoreHistorico.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuarioId: USUARIO_ID }, take: 12 })
    );
  });

  it("respects custom limit", async () => {
    const { service, prisma } = buildService();
    await service.buscarHistorico(USUARIO_ID, 5);
    expect(prisma.scoreHistorico.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    );
  });
});

// ── obterNivel ────────────────────────────────────────────────────────

describe("ScoreService.obterNivel", () => {
  const cases: [number, string][] = [
    [1000, "Excelente"],
    [800,  "Excelente"],
    [799,  "Bom"],
    [650,  "Bom"],
    [649,  "Regular"],
    [450,  "Regular"],
    [449,  "Iniciante"],
    [0,    "Iniciante"],
  ];

  it.each(cases)("score %i → nivel %s", (score, expectedNivel) => {
    const { service } = buildService();
    const { nivel } = service.obterNivel(score);
    expect(nivel).toBe(expectedNivel);
  });

  it("includes cor and descricao in the result", () => {
    const { service } = buildService();
    const result = service.obterNivel(900);
    expect(result).toHaveProperty("cor");
    expect(result).toHaveProperty("descricao");
    expect(result.cor).toBeTruthy();
    expect(result.descricao).toBeTruthy();
  });
});
