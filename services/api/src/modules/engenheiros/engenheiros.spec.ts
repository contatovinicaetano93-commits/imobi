import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { EngenheirosService } from "./engenheiros.service";

const mockPrisma = {
  etapaObra: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  obra: { findMany: jest.fn() },
  usuario: { findUnique: jest.fn() },
};

function makeService() {
  return new EngenheirosService(mockPrisma as any);
}

function makeEtapa(overrides: Record<string, any> = {}) {
  return {
    etapaId: "e1",
    nome: "Fundação",
    status: "AGUARDANDO_VISTORIA",
    ordem: 1,
    percentualObra: 30,
    valorLiberacao: 10000,
    dataConclusaoPrevista: null,
    dataConclusaoReal: null,
    criadoEm: new Date("2024-01-01"),
    atualizadoEm: new Date("2024-06-01"),
    obra: { obraId: "o1", nome: "Casa Silva", endereco: "Rua A, 100" },
    evidencias: [],
    ...overrides,
  };
}

describe("EngenheirosService — listarVisitas", () => {
  beforeEach(() => jest.clearAllMocks());

  it("maps AGUARDANDO_VISTORIA to AGENDADA", async () => {
    mockPrisma.etapaObra.findMany.mockResolvedValue([makeEtapa({ status: "AGUARDANDO_VISTORIA" })]);
    const svc = makeService();
    const result = await svc.listarVisitas("eng1");
    expect(result[0].status).toBe("AGENDADA");
  });

  it("maps CONCLUIDA to CONCLUIDA", async () => {
    mockPrisma.etapaObra.findMany.mockResolvedValue([makeEtapa({ status: "CONCLUIDA" })]);
    const svc = makeService();
    const result = await svc.listarVisitas("eng1");
    expect(result[0].status).toBe("CONCLUIDA");
  });

  it("maps REPROVADA to REPROVADA", async () => {
    mockPrisma.etapaObra.findMany.mockResolvedValue([makeEtapa({ status: "REPROVADA" })]);
    const svc = makeService();
    const result = await svc.listarVisitas("eng1");
    expect(result[0].status).toBe("REPROVADA");
  });

  it("returns empty array when no etapas match", async () => {
    mockPrisma.etapaObra.findMany.mockResolvedValue([]);
    const svc = makeService();
    const result = await svc.listarVisitas("eng1");
    expect(result).toEqual([]);
  });

  it("exposes obraId, obraNome, etapaNome in response", async () => {
    mockPrisma.etapaObra.findMany.mockResolvedValue([makeEtapa()]);
    const svc = makeService();
    const result = await svc.listarVisitas("eng1");
    expect(result[0].obraId).toBe("o1");
    expect(result[0].obraNome).toBe("Casa Silva");
    expect(result[0].etapaNome).toBe("Fundação");
  });
});

describe("EngenheirosService — obterVisita", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when visita not found", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.obterVisita("bad-id")).rejects.toThrow(NotFoundException);
  });

  it("returns visita with evidencias", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(
      makeEtapa({ evidencias: [{ evidenciaId: "ev1", fotoUrl: "s3://img.jpg", validada: false, criadoEm: new Date() }] }),
    );
    const svc = makeService();
    const result = await svc.obterVisita("e1");
    expect(result.visitaId).toBe("e1");
    expect(result.evidencias).toHaveLength(1);
  });
});

describe("EngenheirosService — atualizarVisita", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when etapa not found", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValueOnce(null);
    const svc = makeService();
    await expect(svc.atualizarVisita("eng1", "bad-id", {})).rejects.toThrow(NotFoundException);
  });

  it("throws ForbiddenException when user not found", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValueOnce(makeEtapa());
    mockPrisma.usuario.findUnique.mockResolvedValueOnce(null);
    const svc = makeService();
    await expect(svc.atualizarVisita("bad-user", "e1", {})).rejects.toThrow(ForbiddenException);
  });

  it("maps CONCLUIDA status to Prisma CONCLUIDA", async () => {
    mockPrisma.etapaObra.findUnique
      .mockResolvedValueOnce(makeEtapa())
      .mockResolvedValueOnce(makeEtapa({ status: "CONCLUIDA" }));
    mockPrisma.usuario.findUnique.mockResolvedValue({ usuarioId: "eng1" });
    mockPrisma.etapaObra.update.mockResolvedValue({});
    const svc = makeService();
    await svc.atualizarVisita("eng1", "e1", { status: "CONCLUIDA" });
    expect(mockPrisma.etapaObra.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "CONCLUIDA" } }),
    );
  });

  it("maps INICIADA status to EM_EXECUCAO", async () => {
    mockPrisma.etapaObra.findUnique
      .mockResolvedValueOnce(makeEtapa())
      .mockResolvedValueOnce(makeEtapa({ status: "EM_EXECUCAO" }));
    mockPrisma.usuario.findUnique.mockResolvedValue({ usuarioId: "eng1" });
    mockPrisma.etapaObra.update.mockResolvedValue({});
    const svc = makeService();
    await svc.atualizarVisita("eng1", "e1", { status: "INICIADA" });
    expect(mockPrisma.etapaObra.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "EM_EXECUCAO" } }),
    );
  });

  it("does not include status in update when not provided", async () => {
    mockPrisma.etapaObra.findUnique
      .mockResolvedValueOnce(makeEtapa())
      .mockResolvedValueOnce(makeEtapa());
    mockPrisma.usuario.findUnique.mockResolvedValue({ usuarioId: "eng1" });
    mockPrisma.etapaObra.update.mockResolvedValue({});
    const svc = makeService();
    await svc.atualizarVisita("eng1", "e1", {});
    expect(mockPrisma.etapaObra.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: {} }),
    );
  });
});

describe("EngenheirosService — financeiro", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns empty array when no obras", async () => {
    mockPrisma.obra.findMany.mockResolvedValue([]);
    const svc = makeService();
    const result = await svc.financeiro("eng1");
    expect(result).toEqual([]);
  });

  it("calculates progresso correctly", async () => {
    mockPrisma.obra.findMany.mockResolvedValue([
      {
        obraId: "o1",
        nome: "Casa A",
        etapas: [
          { nome: "E1", status: "CONCLUIDA", valorLiberacao: 40000 },
          { nome: "E2", status: "EM_EXECUCAO", valorLiberacao: 60000 },
        ],
      },
    ]);
    const svc = makeService();
    const result = await svc.financeiro("eng1");
    expect(result[0].progresso).toBe(40);
    expect(result[0].valorTotal).toBe(100000);
    expect(result[0].valorExecutado).toBe(40000);
  });

  it("returns progresso 0 when no etapas are CONCLUIDA", async () => {
    mockPrisma.obra.findMany.mockResolvedValue([
      {
        obraId: "o1",
        nome: "Casa B",
        etapas: [{ nome: "E1", status: "AGUARDANDO_VISTORIA", valorLiberacao: 50000 }],
      },
    ]);
    const svc = makeService();
    const result = await svc.financeiro("eng1");
    expect(result[0].progresso).toBe(0);
  });

  it("returns progresso 0 when valorTotal is 0", async () => {
    mockPrisma.obra.findMany.mockResolvedValue([
      { obraId: "o1", nome: "Casa C", etapas: [] },
    ]);
    const svc = makeService();
    const result = await svc.financeiro("eng1");
    expect(result[0].progresso).toBe(0);
  });

  it("splits material (56%) and mao-de-obra (44%)", async () => {
    mockPrisma.obra.findMany.mockResolvedValue([
      {
        obraId: "o1",
        nome: "Casa D",
        etapas: [{ nome: "E1", status: "CONCLUIDA", valorLiberacao: 100000 }],
      },
    ]);
    const svc = makeService();
    const result = await svc.financeiro("eng1");
    expect(result[0].valorMaterial).toBe(56000);
    expect(result[0].valorMaoDeObra).toBe(44000);
  });
});
