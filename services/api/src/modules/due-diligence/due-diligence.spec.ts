import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { DueDiligenceService } from "./due-diligence.service";

const mockPrisma = {
  dueDiligence: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

function makeService() {
  return new DueDiligenceService(mockPrisma as any);
}

function makeDd(overrides: Record<string, any> = {}) {
  return {
    id: "dd1",
    gestorId: "g1",
    nomeEmpreendimento: "Residencial Sol",
    tipologia: "RESIDENCIAL",
    status: "ENVIADO",
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...overrides,
  };
}

describe("DueDiligenceService — criar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates due diligence with ENVIADO status", async () => {
    mockPrisma.dueDiligence.create.mockResolvedValue(makeDd());
    const svc = makeService();
    await svc.criar("g1", { nomeEmpreendimento: "Residencial Sol", payload: {} });
    expect(mockPrisma.dueDiligence.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "ENVIADO", gestorId: "g1" }) }),
    );
  });

  it("sets optional fields to null when not provided", async () => {
    mockPrisma.dueDiligence.create.mockResolvedValue(makeDd());
    const svc = makeService();
    await svc.criar("g1", { nomeEmpreendimento: "A", payload: {} });
    const call = mockPrisma.dueDiligence.create.mock.calls[0][0];
    expect(call.data.tipologia).toBeNull();
    expect(call.data.totalUnidades).toBeNull();
  });
});

describe("DueDiligenceService — listar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns due diligences scoped to gestor", async () => {
    mockPrisma.dueDiligence.findMany.mockResolvedValue([makeDd()]);
    const svc = makeService();
    const result = await svc.listar("g1");
    expect(mockPrisma.dueDiligence.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { gestorId: "g1" } }),
    );
    expect(result).toHaveLength(1);
  });
});

describe("DueDiligenceService — buscar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when dd not found", async () => {
    mockPrisma.dueDiligence.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.buscar("bad-id", "g1", false)).rejects.toThrow(NotFoundException);
  });

  it("throws ForbiddenException when non-admin accesses another gestor's dd", async () => {
    mockPrisma.dueDiligence.findUnique.mockResolvedValue(makeDd({ gestorId: "other-gestor" }));
    const svc = makeService();
    await expect(svc.buscar("dd1", "g1", false)).rejects.toThrow(ForbiddenException);
  });

  it("allows admin to access any dd", async () => {
    mockPrisma.dueDiligence.findUnique.mockResolvedValue(makeDd({ gestorId: "other-gestor" }));
    const svc = makeService();
    const result = await svc.buscar("dd1", "g1", true);
    expect(result.id).toBe("dd1");
  });

  it("allows gestor to access their own dd", async () => {
    mockPrisma.dueDiligence.findUnique.mockResolvedValue(makeDd());
    const svc = makeService();
    const result = await svc.buscar("dd1", "g1", false);
    expect(result.id).toBe("dd1");
  });
});

describe("DueDiligenceService — atualizarStatus", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when dd not found", async () => {
    mockPrisma.dueDiligence.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.atualizarStatus("bad-id", { status: "APROVADO" as any })).rejects.toThrow(NotFoundException);
  });

  it("updates status", async () => {
    mockPrisma.dueDiligence.findUnique.mockResolvedValue(makeDd());
    mockPrisma.dueDiligence.update.mockResolvedValue(makeDd({ status: "APROVADO" }));
    const svc = makeService();
    const result = await svc.atualizarStatus("dd1", { status: "APROVADO" as any });
    expect(mockPrisma.dueDiligence.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "dd1" }, data: { status: "APROVADO" } }),
    );
    expect(result.status).toBe("APROVADO");
  });
});
