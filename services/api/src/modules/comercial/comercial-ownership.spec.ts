import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ComercialService } from "./comercial.service";

const mockPrisma = {
  pipelineStage: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
  lead: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  leadActivity: { create: jest.fn() },
  conversionScore: { findMany: jest.fn() },
};

const mockScoring = {
  calcularScore: jest.fn(),
  recalcularScoreAposAtividade: jest.fn(),
};

const ownerId = "user-owner";
const otherUserId = "user-other";
const adminId = "user-admin";
const leadId = "lead-1";
const leadRecord = { usuarioId: ownerId };

function makeService() {
  return new ComercialService(mockPrisma as any, mockScoring as any);
}

// ─────────────────────────────────────────────
// listarLeads — scopeUserId filtering
// ─────────────────────────────────────────────
describe("ComercialService – listarLeads scoping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.lead.findMany.mockResolvedValue([]);
    mockPrisma.lead.count.mockResolvedValue(0);
  });

  it("scopes query by usuarioId when scopeUserId is provided", async () => {
    await makeService().listarLeads(20, 0, {}, ownerId);
    expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ usuarioId: ownerId }) })
    );
  });

  it("queries all leads when scopeUserId is undefined (ADMIN)", async () => {
    await makeService().listarLeads(20, 0, {}, undefined);
    expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ usuarioId: expect.anything() }) })
    );
  });
});

// ─────────────────────────────────────────────
// obterLeadDetalhe — ownership
// ─────────────────────────────────────────────
describe("ComercialService – obterLeadDetalhe ownership", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.lead.findUnique.mockResolvedValue({
      leadId,
      usuarioId: ownerId,
      scoreHistorico: [],
      stage: {},
      atividades: [],
      obra: null,
      usuario: null,
    });
  });

  it("returns lead when scopeUserId matches owner", async () => {
    const result = await makeService().obterLeadDetalhe(leadId, ownerId);
    expect(result).not.toBeNull();
  });

  it("returns null when scopeUserId does not match owner", async () => {
    const result = await makeService().obterLeadDetalhe(leadId, otherUserId);
    expect(result).toBeNull();
  });

  it("returns lead when no scopeUserId (ADMIN)", async () => {
    const result = await makeService().obterLeadDetalhe(leadId, undefined);
    expect(result).not.toBeNull();
  });

  it("returns null when lead does not exist", async () => {
    mockPrisma.lead.findUnique.mockResolvedValue(null);
    const result = await makeService().obterLeadDetalhe("nonexistent", ownerId);
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────
// calcularScoreConversao — ownership
// ─────────────────────────────────────────────
describe("ComercialService – calcularScoreConversao ownership", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.lead.findUnique.mockResolvedValue({ usuarioId: ownerId });
    mockScoring.calcularScore.mockResolvedValue({ scoreFinal: 75 });
  });

  it("calculates score when scopeUserId matches owner", async () => {
    const result = await makeService().calcularScoreConversao(leadId, ownerId);
    expect(result).toEqual({ scoreFinal: 75 });
  });

  it("returns null when scopeUserId does not match owner", async () => {
    const result = await makeService().calcularScoreConversao(leadId, otherUserId);
    expect(result).toBeNull();
  });

  it("calculates score without ownership check when no scopeUserId (ADMIN)", async () => {
    const result = await makeService().calcularScoreConversao(leadId, undefined);
    expect(result).toEqual({ scoreFinal: 75 });
    expect(mockPrisma.lead.findUnique).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
// adicionarAtividade — ownership
// ─────────────────────────────────────────────
describe("ComercialService – adicionarAtividade ownership", () => {
  const activityData = { tipo: "NOTE_ADDED", descricao: "Test note" };
  const createdActivity = { atividadeId: "act-1", leadId, usuarioId: ownerId, ...activityData };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.lead.findUnique.mockResolvedValue(leadRecord);
    mockPrisma.leadActivity.create.mockResolvedValue(createdActivity);
    mockScoring.recalcularScoreAposAtividade.mockResolvedValue({ scoreFinal: 80 });
  });

  it("allows owner to add activity", async () => {
    const result = await makeService().adicionarAtividade(leadId, ownerId, activityData, ownerId);
    expect(result.activity).toEqual(createdActivity);
  });

  it("throws ForbiddenException when non-owner tries to add activity", async () => {
    await expect(
      makeService().adicionarAtividade(leadId, otherUserId, activityData, otherUserId)
    ).rejects.toThrow(ForbiddenException);
  });

  it("allows ADMIN to add activity to any lead (no scopeUserId)", async () => {
    const result = await makeService().adicionarAtividade(leadId, adminId, activityData, undefined);
    expect(result.activity).toEqual(createdActivity);
  });

  it("throws NotFoundException when lead does not exist", async () => {
    mockPrisma.lead.findUnique.mockResolvedValue(null);
    await expect(
      makeService().adicionarAtividade("nonexistent", ownerId, activityData, ownerId)
    ).rejects.toThrow(NotFoundException);
  });
});
