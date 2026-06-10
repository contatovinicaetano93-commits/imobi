import { NotFoundException } from "@nestjs/common";
import { ComercialService } from "./comercial.service";

const LEAD_ID = "lead-uuid-001";
const USUARIO_ID = "usuario-uuid-001";
const STAGE_ID = "stage-uuid-001";

const baseStage = {
  stageId: STAGE_ID,
  nome: "PROSPECÇÃO",
  ordem: 1,
  corHex: "#6366f1",
};

const baseLead = {
  leadId: LEAD_ID,
  clienteNome: "Cliente Teste",
  clienteEmail: "cliente@teste.com",
  clienteTelefone: "11999990000",
  clienteCpf: "12345678901",
  fonte: "WEBSITE",
  tipoObra: "residencial",
  segmentoCliente: "NOVO",
  stageId: STAGE_ID,
  usuarioId: USUARIO_ID,
  scoreHistorico: [],
  atividades: [],
};

const scoreResult = {
  scoreFinal: 75,
  probabilidade: 0.8,
  dataEstimada: new Date("2025-02-01T00:00:00Z"),
  fatores: {
    fonteScore: 70,
    tipoObraScore: 85,
    segmentoScore: 70,
    engajamentoScore: 50,
    historicoScore: 50,
  },
};

function buildService(overrides: {
  stages?: any[];
  firstStage?: any;
  lead?: any;
  leads?: any[];
  leadCount?: number;
  scoreAvg?: number | null;
} = {}) {
  const stages = overrides.stages ?? [baseStage];
  const firstStage =
    overrides.firstStage !== undefined ? overrides.firstStage : baseStage;
  const lead = overrides.lead !== undefined ? overrides.lead : baseLead;

  const prisma = {
    pipelineStage: {
      findMany: jest.fn().mockResolvedValue(stages),
      findFirst: jest.fn().mockResolvedValue(firstStage),
      createMany: jest.fn().mockResolvedValue({ count: 5 }),
      upsert: jest.fn().mockResolvedValue(baseStage),
    },
    lead: {
      create: jest.fn().mockResolvedValue(lead),
      findUnique: jest.fn().mockResolvedValue(lead),
      findMany: jest.fn().mockResolvedValue(overrides.leads ?? [baseLead]),
      count: jest.fn().mockResolvedValue(overrides.leadCount ?? 1),
    },
    leadActivity: {
      create: jest.fn().mockResolvedValue({ atividadeId: "atv-001" }),
    },
    conversionScore: {
      aggregate: jest
        .fn()
        .mockResolvedValue({ _avg: { scoreFinal: overrides.scoreAvg ?? null } }),
    },
  };

  const scoringService = {
    calcularScore: jest.fn().mockResolvedValue(scoreResult),
    recalcularScoreAposAtividade: jest.fn().mockResolvedValue(scoreResult),
  };

  const service = Object.create(ComercialService.prototype) as ComercialService;
  (service as any).prisma = prisma;
  (service as any).scoringService = scoringService;

  return { service, prisma, scoringService };
}

// ── listarStages ──────────────────────────────────────────────────────

describe("ComercialService.listarStages", () => {
  it("returns existing stages mapped to the public shape", async () => {
    const { service, prisma } = buildService();
    const result = await service.listarStages();
    expect(result).toEqual([
      { stageId: STAGE_ID, nome: "PROSPECÇÃO", ordem: 1, cor: "#6366f1" },
    ]);
    expect(prisma.pipelineStage.createMany).not.toHaveBeenCalled();
  });

  it("seeds defaults with skipDuplicates when no stages exist", async () => {
    const { service, prisma } = buildService();
    prisma.pipelineStage.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([baseStage]);
    const result = await service.listarStages();
    expect(prisma.pipelineStage.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true })
    );
    expect(result).toHaveLength(1);
  });
});

// ── criarLead ─────────────────────────────────────────────────────────

describe("ComercialService.criarLead", () => {
  const input = {
    clienteNome: "Cliente Teste",
    clienteEmail: "cliente@teste.com",
    clienteTelefone: "11999990000",
    clienteCpf: "12345678901",
    fonte: "WEBSITE",
    tipoObra: "residencial",
    segmentoCliente: "NOVO",
  };

  it("persists tipoObra and clienteCpf", async () => {
    const { service, prisma } = buildService();
    await service.criarLead(USUARIO_ID, input);
    expect(prisma.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tipoObra: "residencial",
          clienteCpf: "12345678901",
          usuarioId: USUARIO_ID,
          stageId: STAGE_ID,
        }),
      })
    );
  });

  it("uses the lowest-ordem stage as initial stage", async () => {
    const { service, prisma } = buildService();
    await service.criarLead(USUARIO_ID, input);
    expect(prisma.pipelineStage.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { ordem: "asc" } })
    );
    expect(prisma.pipelineStage.upsert).not.toHaveBeenCalled();
  });

  it("upserts PROSPECÇÃO when no stage exists (race-safe seed)", async () => {
    const { service, prisma } = buildService({ firstStage: null });
    await service.criarLead(USUARIO_ID, input);
    expect(prisma.pipelineStage.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { nome: "PROSPECÇÃO" } })
    );
  });

  it("returns the lead with the calculated score", async () => {
    const { service, scoringService } = buildService();
    const result = await service.criarLead(USUARIO_ID, input);
    expect(scoringService.calcularScore).toHaveBeenCalledWith(LEAD_ID);
    expect(result.score).toEqual(scoreResult);
  });
});

// ── listarLeads ───────────────────────────────────────────────────────

describe("ComercialService.listarLeads", () => {
  it("returns leads with pagination metadata", async () => {
    const { service } = buildService({ leadCount: 50 });
    const result = await service.listarLeads(20, 40);
    expect(result.total).toBe(50);
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(20);
  });

  it("clamps limit to at least 1 (no division by zero)", async () => {
    const { service, prisma } = buildService();
    const result = await service.listarLeads(0, 0);
    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1 })
    );
    expect(result.page).toBe(1);
    expect(Number.isFinite(result.page)).toBe(true);
  });

  it("clamps limit to MAX_PAGE_SIZE (100)", async () => {
    const { service, prisma } = buildService();
    await service.listarLeads(9999, 0);
    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it("defaults NaN limit/offset to sane values", async () => {
    const { service, prisma } = buildService();
    const result = await service.listarLeads(NaN, NaN);
    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20, skip: 0 })
    );
    expect(result.page).toBe(1);
  });

  it("clamps negative offset to 0", async () => {
    const { service, prisma } = buildService();
    await service.listarLeads(20, -5);
    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0 })
    );
  });

  it("applies searchTerm as case-insensitive OR filter", async () => {
    const { service, prisma } = buildService();
    await service.listarLeads(20, 0, { searchTerm: "maria" });
    const where = prisma.lead.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { clienteNome: { contains: "maria", mode: "insensitive" } },
      { clienteEmail: { contains: "maria", mode: "insensitive" } },
      { clienteTelefone: { contains: "maria", mode: "insensitive" } },
    ]);
  });

  it("applies score range filter on scoreHistorico", async () => {
    const { service, prisma } = buildService();
    await service.listarLeads(20, 0, { scoreMin: 50, scoreMax: 90 });
    const where = prisma.lead.findMany.mock.calls[0][0].where;
    expect(where.scoreHistorico).toEqual({
      some: { scoreFinal: { gte: 50, lte: 90 } },
    });
  });
});

// ── obterLeadDetalhe ──────────────────────────────────────────────────

describe("ComercialService.obterLeadDetalhe", () => {
  it("throws NotFoundException when lead does not exist", async () => {
    const { service } = buildService({ lead: null });
    await expect(service.obterLeadDetalhe(LEAD_ID)).rejects.toThrow(
      NotFoundException
    );
  });

  it("selects only safe usuario fields (no passwordHash)", async () => {
    const { service, prisma } = buildService();
    await service.obterLeadDetalhe(LEAD_ID);
    const include = prisma.lead.findUnique.mock.calls[0][0].include;
    expect(include.usuario).toEqual({
      select: { usuarioId: true, nome: true, email: true },
    });
    expect(include.obra).toEqual({
      select: { obraId: true, nome: true },
    });
  });

  it("exposes the latest score as scoreBreakdown", async () => {
    const score = { scoreId: "s1", scoreFinal: 80 };
    const lead = { ...baseLead, scoreHistorico: [score, { scoreId: "s0" }] };
    const { service } = buildService({ lead });
    const result = await service.obterLeadDetalhe(LEAD_ID);
    expect(result.scoreBreakdown).toBe(score);
  });

  it("sets scoreBreakdown to null when there is no history", async () => {
    const { service } = buildService();
    const result = await service.obterLeadDetalhe(LEAD_ID);
    expect(result.scoreBreakdown).toBeNull();
  });
});

// ── adicionarAtividade ────────────────────────────────────────────────

describe("ComercialService.adicionarAtividade", () => {
  const input = { tipo: "NOTE_ADDED", descricao: "Cliente respondeu email" };

  it("throws NotFoundException when lead does not exist", async () => {
    const { service, prisma } = buildService({ lead: null });
    await expect(
      service.adicionarAtividade(LEAD_ID, USUARIO_ID, input)
    ).rejects.toThrow(NotFoundException);
    expect(prisma.leadActivity.create).not.toHaveBeenCalled();
  });

  it("creates the activity and recalculates the score", async () => {
    const { service, prisma, scoringService } = buildService();
    const result = await service.adicionarAtividade(LEAD_ID, USUARIO_ID, input);
    expect(prisma.leadActivity.create).toHaveBeenCalledWith({
      data: {
        leadId: LEAD_ID,
        usuarioId: USUARIO_ID,
        tipo: "NOTE_ADDED",
        descricao: "Cliente respondeu email",
      },
    });
    expect(scoringService.recalcularScoreAposAtividade).toHaveBeenCalledWith(LEAD_ID);
    expect(result.updatedScore).toEqual(scoreResult);
  });
});

// ── obterDashboardStats ───────────────────────────────────────────────

describe("ComercialService.obterDashboardStats", () => {
  it("computes avgScore via aggregate instead of loading all rows", async () => {
    const { service, prisma } = buildService({ scoreAvg: 72.4, leadCount: 10 });
    const result = await service.obterDashboardStats();
    expect(prisma.conversionScore.aggregate).toHaveBeenCalledWith({
      _avg: { scoreFinal: true },
    });
    expect(result.avgScore).toBe(72);
  });

  it("returns avgScore 0 when there are no scores", async () => {
    const { service } = buildService({ scoreAvg: null });
    const result = await service.obterDashboardStats();
    expect(result.avgScore).toBe(0);
  });

  it("returns conversionRate 0 when there are no leads", async () => {
    const { service } = buildService({ leadCount: 0 });
    const result = await service.obterDashboardStats();
    expect(result.conversionRate).toBe(0);
  });

  it("computes conversionRate as highScoreLeads / totalLeads", async () => {
    const { service, prisma } = buildService();
    // lead.count is called 3x: total, thisWeek, highScore
    prisma.lead.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(3);
    const result = await service.obterDashboardStats();
    expect(result.totalLeads).toBe(10);
    expect(result.leadsThisWeek).toBe(4);
    expect(result.conversionRate).toBe(30);
  });
});
