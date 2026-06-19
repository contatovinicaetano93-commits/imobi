import { ScoreService } from "./score.service";

const mockPrisma = {
  obra: { findMany: jest.fn() },
  credito: { findMany: jest.fn() },
  usuario: { findUnique: jest.fn() },
  scoreHistorico: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

function makeService() {
  return new ScoreService(mockPrisma as any);
}

function setupBaseUser(kycStatus = "PENDENTE") {
  mockPrisma.usuario.findUnique.mockImplementation(({ where, select }: any) => {
    if (select?.criadoEm) return Promise.resolve({ criadoEm: new Date() });
    if (select?.kycStatus) return Promise.resolve({ kycStatus });
    return Promise.resolve(null);
  });
}

describe("ScoreService — obterNivel", () => {
  it.each([
    [800, "Excelente"],
    [650, "Bom"],
    [450, "Regular"],
    [449, "Iniciante"],
  ])("score %i → nivel %s", (score, expectedNivel) => {
    const service = makeService();
    const result = service.obterNivel(score);
    expect(result.nivel).toBe(expectedNivel);
    expect(result.cor).toBeDefined();
    expect(result.descricao).toBeDefined();
  });
});

describe("ScoreService — calcularScore", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns base score 600 for new user with no obras and no creditos", async () => {
    mockPrisma.obra.findMany.mockResolvedValue([]);
    mockPrisma.credito.findMany.mockResolvedValue([]);
    setupBaseUser();

    const service = makeService();
    const score = await service.calcularScore("u1");

    expect(score).toBe(600);
  });

  it("adds up to 200 KYC bonus for APROVADO users", async () => {
    mockPrisma.obra.findMany.mockResolvedValue([]);
    mockPrisma.credito.findMany.mockResolvedValue([]);
    setupBaseUser("APROVADO");

    const service = makeService();
    const score = await service.calcularScore("u1");

    expect(score).toBe(800);
  });

  it("adds up to 200 for credit history without delays (ATIVO/QUITADO)", async () => {
    mockPrisma.obra.findMany.mockResolvedValue([]);
    mockPrisma.credito.findMany.mockResolvedValue([
      { status: "ATIVO" },
      { status: "QUITADO" },
      { status: "VENCIDO" },
    ]);
    setupBaseUser();

    const service = makeService();
    const score = await service.calcularScore("u1");

    expect(score).toBe(800);
  });

  it("adds 300 when all obras are CONCLUIDA (100% completion rate)", async () => {
    mockPrisma.obra.findMany.mockResolvedValue([
      { status: "CONCLUIDA", etapas: [] },
      { status: "CONCLUIDA", etapas: [] },
    ]);
    mockPrisma.credito.findMany.mockResolvedValue([]);
    setupBaseUser();

    const service = makeService();
    const score = await service.calcularScore("u1");

    expect(score).toBe(900);
  });

  it("adds on-time bonus for obras concluidas within dataPrevista", async () => {
    const prevista = new Date("2024-06-01");
    const real = new Date("2024-05-28");
    mockPrisma.obra.findMany.mockResolvedValue([
      {
        status: "CONCLUIDA",
        etapas: [
          { dataConclusaoPrevista: prevista, dataConclusaoReal: real },
        ],
      },
    ]);
    mockPrisma.credito.findMany.mockResolvedValue([]);
    setupBaseUser();

    const service = makeService();
    const score = await service.calcularScore("u1");

    expect(score).toBeGreaterThan(600 + 300);
  });

  it("caps score at 1000", async () => {
    mockPrisma.obra.findMany.mockResolvedValue([
      { status: "CONCLUIDA", etapas: [] },
      { status: "CONCLUIDA", etapas: [] },
      { status: "CONCLUIDA", etapas: [] },
      { status: "CONCLUIDA", etapas: [] },
    ]);
    mockPrisma.credito.findMany.mockResolvedValue([
      { status: "ATIVO" }, { status: "ATIVO" },
    ]);
    setupBaseUser("APROVADO");

    const service = makeService();
    const score = await service.calcularScore("u1");

    expect(score).toBeLessThanOrEqual(1000);
  });
});

describe("ScoreService — buscarScoreAtual", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates historico entry when score differs from last", async () => {
    mockPrisma.obra.findMany.mockResolvedValue([]);
    mockPrisma.credito.findMany.mockResolvedValue([]);
    setupBaseUser();
    mockPrisma.scoreHistorico.findFirst.mockResolvedValue({ score: 500 });
    mockPrisma.scoreHistorico.create.mockResolvedValue({});

    const service = makeService();
    await service.buscarScoreAtual("u1");

    expect(mockPrisma.scoreHistorico.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ usuarioId: "u1", motivo: "Cálculo automático" }) })
    );
  });

  it("does NOT create historico entry when score is unchanged", async () => {
    mockPrisma.obra.findMany.mockResolvedValue([]);
    mockPrisma.credito.findMany.mockResolvedValue([]);
    setupBaseUser();
    mockPrisma.scoreHistorico.findFirst.mockResolvedValue({ score: 600 });
    mockPrisma.scoreHistorico.create.mockResolvedValue({});

    const service = makeService();
    await service.buscarScoreAtual("u1");

    expect(mockPrisma.scoreHistorico.create).not.toHaveBeenCalled();
  });
});

describe("ScoreService — buscarHistorico", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns paginated history", async () => {
    const items = [{ scoreHistoricoId: "h1", score: 750 }];
    mockPrisma.scoreHistorico.findMany.mockResolvedValue(items);
    const service = makeService();
    const result = await service.buscarHistorico("u1", 5, 0);
    expect(result).toEqual(items);
    expect(mockPrisma.scoreHistorico.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5, skip: 0 })
    );
  });
});

describe("ScoreService — contarHistorico", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns count of historico entries", async () => {
    mockPrisma.scoreHistorico.count.mockResolvedValue(42);
    const service = makeService();
    const result = await service.contarHistorico("u1");
    expect(result).toBe(42);
  });
});
