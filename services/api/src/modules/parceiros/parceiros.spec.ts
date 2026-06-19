import { BadRequestException } from "@nestjs/common";
import { ParceirosService } from "./parceiros.service";

const mockPrisma = {
  lead: { findMany: jest.fn() },
  mailingContato: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

function makeService() {
  return new ParceirosService(mockPrisma as any);
}

function makeLead(overrides: Record<string, any> = {}) {
  return {
    leadId: "l1",
    usuarioId: "p1",
    clienteNome: "João Silva",
    fonte: "PARCEIRO",
    convertidoEm: null,
    statusUltimo: null,
    criadoEm: new Date("2024-01-01"),
    stage: null,
    ...overrides,
  };
}

describe("ParceirosService — getResumo", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns zero metrics when no leads", async () => {
    mockPrisma.lead.findMany.mockResolvedValue([]);
    const svc = makeService();
    const result = await svc.getResumo("p1");
    expect(result.operacoesAtivas).toBe(0);
    expect(result.taxaAprovacao).toBe(0);
    expect(result.codigoIndicacao).toMatch(/^PARC-[A-Z0-9]+$/);
  });

  it("calculates operacoesAtivas excluding converted leads", async () => {
    mockPrisma.lead.findMany.mockResolvedValue([
      makeLead(),
      makeLead({ leadId: "l2", convertidoEm: new Date() }),
    ]);
    const svc = makeService();
    const result = await svc.getResumo("p1");
    expect(result.operacoesAtivas).toBe(1);
  });

  it("calculates taxaAprovacao as percentage of converted leads", async () => {
    mockPrisma.lead.findMany.mockResolvedValue([
      makeLead(),
      makeLead({ leadId: "l2", convertidoEm: new Date() }),
      makeLead({ leadId: "l3", convertidoEm: new Date() }),
    ]);
    const svc = makeService();
    const result = await svc.getResumo("p1");
    expect(result.taxaAprovacao).toBe(67); // 2/3 ≈ 66.7 → 67
  });

  it("excludes CANCELADO stage from operacoesAtivas", async () => {
    mockPrisma.lead.findMany.mockResolvedValue([
      makeLead({ stage: { nome: "CANCELADO" } }),
    ]);
    const svc = makeService();
    const result = await svc.getResumo("p1");
    expect(result.operacoesAtivas).toBe(0);
  });

  it("generates unique codigoIndicacao per user", async () => {
    mockPrisma.lead.findMany.mockResolvedValue([]);
    const svc = makeService();
    const r1 = await svc.getResumo("aaaaaaaa-bbbb-cccc-dddd-000000000001");
    const r2 = await svc.getResumo("aaaaaaaa-bbbb-cccc-dddd-000000000002");
    expect(r1.codigoIndicacao).not.toBe(r2.codigoIndicacao);
  });
});

describe("ParceirosService — getOperacoes", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns empty array when no leads", async () => {
    mockPrisma.lead.findMany.mockResolvedValue([]);
    const svc = makeService();
    expect(await svc.getOperacoes("p1")).toEqual([]);
  });

  it("maps convertedEm lead to CONCLUIDA status", async () => {
    mockPrisma.lead.findMany.mockResolvedValue([
      makeLead({ convertidoEm: new Date() }),
    ]);
    const svc = makeService();
    const result = await svc.getOperacoes("p1");
    expect(result[0].status).toBe("CONCLUIDA");
  });

  it("maps FECHAMENTO stage to APROVADA", async () => {
    mockPrisma.lead.findMany.mockResolvedValue([
      makeLead({ stage: { nome: "FECHAMENTO" } }),
    ]);
    const svc = makeService();
    const result = await svc.getOperacoes("p1");
    expect(result[0].status).toBe("APROVADA");
  });

  it("maps PROPOSTA stage to EM_ANALISE", async () => {
    mockPrisma.lead.findMany.mockResolvedValue([
      makeLead({ stage: { nome: "PROPOSTA" } }),
    ]);
    const svc = makeService();
    const result = await svc.getOperacoes("p1");
    expect(result[0].status).toBe("EM_ANALISE");
  });

  it("maps CANCELADO stage to RECUSADA", async () => {
    mockPrisma.lead.findMany.mockResolvedValue([
      makeLead({ stage: { nome: "CANCELADO" } }),
    ]);
    const svc = makeService();
    const result = await svc.getOperacoes("p1");
    expect(result[0].status).toBe("RECUSADA");
  });

  it("defaults to INDICADA for unrecognized stage", async () => {
    mockPrisma.lead.findMany.mockResolvedValue([makeLead()]);
    const svc = makeService();
    const result = await svc.getOperacoes("p1");
    expect(result[0].status).toBe("INDICADA");
  });

  it("obfuscates client name to 'Primeiro I.'", async () => {
    mockPrisma.lead.findMany.mockResolvedValue([
      makeLead({ clienteNome: "João Silva" }),
    ]);
    const svc = makeService();
    const result = await svc.getOperacoes("p1");
    expect(result[0].clienteRef).toBe("João S.");
  });

  it("returns single-name client as-is", async () => {
    mockPrisma.lead.findMany.mockResolvedValue([
      makeLead({ clienteNome: "Monônimo" }),
    ]);
    const svc = makeService();
    const result = await svc.getOperacoes("p1");
    expect(result[0].clienteRef).toBe("Monônimo");
  });
});

describe("ParceirosService — getMailing", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns mailing contacts mapped to DTO", async () => {
    mockPrisma.mailingContato.findMany.mockResolvedValue([
      { id: "m1", nome: "Ana", email: "ana@x.com", telefone: "11999", status: "ATIVO", criadoEm: new Date("2024-01-01") },
    ]);
    const svc = makeService();
    const result = await svc.getMailing("p1");
    expect(result[0].id).toBe("m1");
    expect(result[0].email).toBe("ana@x.com");
    expect(result[0].criadoEm).toBe(new Date("2024-01-01").toISOString());
  });
});

describe("ParceirosService — adicionarMailing", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws BadRequestException when nome is empty", async () => {
    const svc = makeService();
    await expect(svc.adicionarMailing("p1", { nome: "  ", email: "x@x.com" })).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException when email is empty", async () => {
    const svc = makeService();
    await expect(svc.adicionarMailing("p1", { nome: "Ana", email: "  " })).rejects.toThrow(BadRequestException);
  });

  it("creates contact with lowercased email", async () => {
    const now = new Date();
    mockPrisma.mailingContato.create.mockResolvedValue({
      id: "m1", nome: "Ana", email: "ana@x.com", telefone: null, status: "ATIVO", criadoEm: now,
    });
    const svc = makeService();
    await svc.adicionarMailing("p1", { nome: "Ana", email: "ANA@X.COM" });
    expect(mockPrisma.mailingContato.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: "ana@x.com" }) }),
    );
  });

  it("returns null telefone as undefined in DTO", async () => {
    const now = new Date();
    mockPrisma.mailingContato.create.mockResolvedValue({
      id: "m1", nome: "Ana", email: "ana@x.com", telefone: null, status: "ATIVO", criadoEm: now,
    });
    const svc = makeService();
    const result = await svc.adicionarMailing("p1", { nome: "Ana", email: "ana@x.com" });
    expect(result.telefone).toBeUndefined();
  });
});
