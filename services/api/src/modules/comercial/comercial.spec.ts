import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { ComercialService } from "./comercial.service";

const mockPrisma = {
  pipelineStage: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  lead: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  conversionScore: {
    findMany: jest.fn(),
  },
  leadActivity: {
    create: jest.fn(),
  },
};

const mockScoring = {
  calcularScore: jest.fn(),
  recalcularScoreAposAtividade: jest.fn(),
};

function makeService() {
  return new ComercialService(mockPrisma as any, mockScoring as any);
}

function makeStage(overrides: Record<string, any> = {}) {
  return { stageId: "s1", nome: "PROSPECÇÃO", ordem: 1, corHex: "#6366f1", ...overrides };
}

function makeLead(overrides: Record<string, any> = {}) {
  return {
    leadId: "l1",
    clienteNome: "João",
    clienteEmail: "j@j.com",
    clienteTelefone: "11999",
    stageId: "s1",
    usuarioId: "u1",
    scoreHistorico: [],
    ...overrides,
  };
}

describe("ComercialService — listarStages", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns existing stages mapped to dto", async () => {
    mockPrisma.pipelineStage.findMany.mockResolvedValue([makeStage()]);
    const svc = makeService();
    const result = await svc.listarStages();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ stageId: "s1", nome: "PROSPECÇÃO", ordem: 1, cor: "#6366f1" });
  });

  it("seeds 5 default stages when none exist", async () => {
    mockPrisma.pipelineStage.findMany.mockResolvedValue([]);
    mockPrisma.pipelineStage.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ stageId: `s-${data.ordem}`, ...data }),
    );
    const svc = makeService();
    const result = await svc.listarStages();
    expect(result).toHaveLength(5);
    expect(mockPrisma.pipelineStage.create).toHaveBeenCalledTimes(5);
    expect(result[0].nome).toBe("PROSPECÇÃO");
    expect(result[4].nome).toBe("FECHAMENTO");
  });
});

describe("ComercialService — capturaPublica", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates lead with WEBSITE fonte using existing stage", async () => {
    mockPrisma.pipelineStage.findFirst.mockResolvedValue(makeStage());
    mockPrisma.lead.create.mockResolvedValue({ leadId: "l1" });
    const svc = makeService();
    const result = await svc.capturaPublica({ clienteNome: "João", clienteEmail: "j@j.com", clienteTelefone: "11999" });
    expect(result.leadId).toBe("l1");
    const callData = mockPrisma.lead.create.mock.calls[0][0].data;
    expect(callData.fonte).toBe("WEBSITE");
    expect(callData.stageId).toBe("s1");
    expect(callData.condicoes).toBeNull();
  });

  it("creates stage when none exists and formats optional extras", async () => {
    mockPrisma.pipelineStage.findFirst.mockResolvedValue(null);
    mockPrisma.pipelineStage.create.mockResolvedValue(makeStage());
    mockPrisma.lead.create.mockResolvedValue({ leadId: "l1" });
    const svc = makeService();
    await svc.capturaPublica({ clienteNome: "João", clienteEmail: "j@j.com", clienteTelefone: "11999", empresa: "Acme", cargo: "CEO" });
    expect(mockPrisma.pipelineStage.create).toHaveBeenCalled();
    const callData = mockPrisma.lead.create.mock.calls[0][0].data;
    expect(callData.condicoes).toContain("Empresa: Acme");
    expect(callData.condicoes).toContain("Cargo: CEO");
  });
});

describe("ComercialService — criarLead", () => {
  beforeEach(() => jest.clearAllMocks());

  it("uses existing stage and calculates score", async () => {
    mockPrisma.pipelineStage.findFirst.mockResolvedValue(makeStage());
    mockPrisma.lead.create.mockResolvedValue(makeLead());
    mockScoring.calcularScore.mockResolvedValue(80);
    const svc = makeService();
    const result = await svc.criarLead("u1", { clienteNome: "João", clienteEmail: "j@j.com", clienteTelefone: "11999", fonte: "GESTOR", segmentoCliente: "NOVO" });
    expect(result.score).toBe(80);
    expect(mockScoring.calcularScore).toHaveBeenCalledWith("l1");
  });

  it("seeds stage when none exists", async () => {
    mockPrisma.pipelineStage.findFirst.mockResolvedValue(null);
    mockPrisma.pipelineStage.create.mockResolvedValue(makeStage());
    mockPrisma.lead.create.mockResolvedValue(makeLead());
    mockScoring.calcularScore.mockResolvedValue(50);
    const svc = makeService();
    await svc.criarLead("u1", { clienteNome: "João", clienteEmail: "j@j.com", clienteTelefone: "11999", fonte: "GESTOR", segmentoCliente: "NOVO" });
    expect(mockPrisma.pipelineStage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ nome: "PROSPECÇÃO" }) }),
    );
  });
});

describe("ComercialService — listarLeads", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns leads with correct pagination metadata", async () => {
    mockPrisma.lead.findMany.mockResolvedValue([makeLead()]);
    mockPrisma.lead.count.mockResolvedValue(25);
    const svc = makeService();
    const result = await svc.listarLeads(10, 20);
    expect(result.total).toBe(25);
    expect(result.page).toBe(3); // Math.floor(20/10) + 1 = 3
    expect(result.pageSize).toBe(10);
    expect(result.leads).toHaveLength(1);
  });

  it("scopes query by usuarioId when scopeUserId provided", async () => {
    mockPrisma.lead.findMany.mockResolvedValue([]);
    mockPrisma.lead.count.mockResolvedValue(0);
    const svc = makeService();
    await svc.listarLeads(20, 0, undefined, "u1");
    expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ usuarioId: "u1" }) }),
    );
  });
});

describe("ComercialService — obterLeadDetalhe", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns null when lead not found", async () => {
    mockPrisma.lead.findUnique.mockResolvedValue(null);
    const svc = makeService();
    const result = await svc.obterLeadDetalhe("bad-id");
    expect(result).toBeNull();
  });

  it("returns null when scopeUserId does not match lead owner", async () => {
    mockPrisma.lead.findUnique.mockResolvedValue(makeLead({ usuarioId: "other" }));
    const svc = makeService();
    const result = await svc.obterLeadDetalhe("l1", "u1");
    expect(result).toBeNull();
  });

  it("returns lead with scoreBreakdown from latest history entry", async () => {
    const scoreEntry = { scoreFinal: 80, criadoEm: new Date() };
    mockPrisma.lead.findUnique.mockResolvedValue(makeLead({ scoreHistorico: [scoreEntry] }));
    const svc = makeService();
    const result = await svc.obterLeadDetalhe("l1");
    expect(result?.scoreBreakdown).toBe(scoreEntry);
  });
});

describe("ComercialService — adicionarAtividade", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when lead not found", async () => {
    mockPrisma.lead.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.adicionarAtividade("bad-id", "u1", {})).rejects.toThrow(NotFoundException);
  });

  it("throws ForbiddenException when scopeUserId doesn't match lead owner", async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({ usuarioId: "other" });
    const svc = makeService();
    await expect(svc.adicionarAtividade("l1", "u1", {}, "u1")).rejects.toThrow(ForbiddenException);
  });

  it("creates activity and recalculates score", async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({ usuarioId: "u1" });
    mockPrisma.leadActivity.create.mockResolvedValue({ activityId: "a1" });
    mockScoring.recalcularScoreAposAtividade.mockResolvedValue(90);
    const svc = makeService();
    const result = await svc.adicionarAtividade("l1", "u1", { tipo: "CALL", descricao: "Called" });
    expect(result.updatedScore).toBe(90);
    expect(mockScoring.recalcularScoreAposAtividade).toHaveBeenCalledWith("l1");
  });
});

describe("ComercialService — obterDashboardStats", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns zero avgScore when no scores exist", async () => {
    mockPrisma.lead.count
      .mockResolvedValueOnce(10)  // totalLeads
      .mockResolvedValueOnce(3)   // leadsThisWeek
      .mockResolvedValueOnce(2);  // highScoreLeads
    mockPrisma.conversionScore.findMany.mockResolvedValue([]);
    const svc = makeService();
    const result = await svc.obterDashboardStats();
    expect(result.avgScore).toBe(0);
    expect(result.totalLeads).toBe(10);
    expect(result.conversionRate).toBe(20); // Math.round(2/10*100)
  });

  it("calculates avgScore as rounded mean of all scores", async () => {
    mockPrisma.lead.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3);
    mockPrisma.conversionScore.findMany.mockResolvedValue([
      { scoreFinal: 60 }, { scoreFinal: 80 }, { scoreFinal: 100 },
    ]);
    const svc = makeService();
    const result = await svc.obterDashboardStats();
    expect(result.avgScore).toBe(80); // Math.round((60+80+100)/3)
  });
});
