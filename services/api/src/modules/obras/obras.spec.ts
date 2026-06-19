import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { ObrasService } from "./obras.service";

const mockPrisma = {
  obra: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  etapaObra: {
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};

function makeService() {
  return new ObrasService(mockPrisma as any);
}

function makeObra(overrides: Record<string, any> = {}) {
  return {
    obraId: "o1",
    usuarioId: "u1",
    nome: "Casa Silva",
    status: "EM_ANDAMENTO",
    endereco: "Rua A, 100",
    geoLatitude: -23.5,
    geoLongitude: -46.6,
    raioValidacaoMetros: 50,
    criadoEm: new Date(),
    credito: null,
    etapas: [],
    ...overrides,
  };
}

describe("ObrasService — listar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns empty array when user has no obras", async () => {
    mockPrisma.obra.findMany.mockResolvedValue([]);
    const service = makeService();
    const result = await service.listar("u1");
    expect(result).toEqual([]);
  });

  it("calculates progresso = 0 when no etapas", async () => {
    mockPrisma.obra.findMany.mockResolvedValue([makeObra()]);
    const service = makeService();
    const result = await service.listar("u1");
    expect(result[0].progresso).toBe(0);
  });

  it("calculates progresso = 50 when half of etapas concluded", async () => {
    mockPrisma.obra.findMany.mockResolvedValue([
      makeObra({
        etapas: [
          { etapaId: "e1", nome: "Fundação", status: "CONCLUIDA", ordem: 1, percentualObra: { valueOf: () => 50 }, valorLiberacao: { valueOf: () => 0 } },
          { etapaId: "e2", nome: "Estrutura", status: "PENDENTE",  ordem: 2, percentualObra: { valueOf: () => 50 }, valorLiberacao: { valueOf: () => 0 } },
        ],
      }),
    ]);
    const service = makeService();
    const result = await service.listar("u1");
    expect(result[0].progresso).toBe(50);
  });

  it("calculates progresso = 100 when all etapas concluded", async () => {
    mockPrisma.obra.findMany.mockResolvedValue([
      makeObra({
        etapas: [
          { etapaId: "e1", nome: "Fundação", status: "CONCLUIDA", ordem: 1, percentualObra: { valueOf: () => 100 }, valorLiberacao: { valueOf: () => 0 } },
        ],
      }),
    ]);
    const service = makeService();
    const result = await service.listar("u1");
    expect(result[0].progresso).toBe(100);
  });

  it("maps credito data when present", async () => {
    mockPrisma.obra.findMany.mockResolvedValue([
      makeObra({
        credito: {
          creditoId: "c1",
          valorAprovado: { valueOf: () => 100000 },
          valorLiberado: { valueOf: () => 50000 },
          status: "ATIVO",
        },
      }),
    ]);
    const service = makeService();
    const result = await service.listar("u1");
    expect(result[0].credito?.id).toBe("c1");
    expect(result[0].credito?.valorAprovado).toBe(100000);
  });
});

describe("ObrasService — buscar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when obra not found", async () => {
    mockPrisma.obra.findUnique.mockResolvedValue(null);
    const service = makeService();
    await expect(service.buscar({ id: "u1", tipo: "TOMADOR" }, "nonexistent")).rejects.toThrow(NotFoundException);
  });

  it("throws ForbiddenException when user does not own the obra", async () => {
    mockPrisma.obra.findUnique.mockResolvedValue({ ...makeObra(), usuarioId: "other-user", etapas: [], credito: null });
    const service = makeService();
    await expect(service.buscar({ id: "u1", tipo: "TOMADOR" }, "o1")).rejects.toThrow(ForbiddenException);
  });

  it("returns obra when user owns it", async () => {
    const obra = { ...makeObra(), etapas: [], credito: null };
    mockPrisma.obra.findUnique.mockResolvedValue(obra);
    const service = makeService();
    const result = await service.buscar({ id: "u1", tipo: "TOMADOR" }, "o1");
    expect(result.obraId).toBe("o1");
  });

  it("allows ADMIN to view any obra", async () => {
    const obra = { ...makeObra(), usuarioId: "someone-else", etapas: [], credito: null };
    mockPrisma.obra.findUnique.mockResolvedValue(obra);
    const service = makeService();
    const result = await service.buscar({ id: "admin1", tipo: "ADMIN" }, "o1");
    expect(result.obraId).toBe("o1");
  });

  it("allows GESTOR to view any obra", async () => {
    const obra = { ...makeObra(), usuarioId: "someone-else", etapas: [], credito: null };
    mockPrisma.obra.findUnique.mockResolvedValue(obra);
    const service = makeService();
    const result = await service.buscar({ id: "gestor1", tipo: "GESTOR" }, "o1");
    expect(result.obraId).toBe("o1");
  });
});

describe("ObrasService — progressoGeral", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when obra not found", async () => {
    mockPrisma.obra.findUnique.mockResolvedValue(null);
    const service = makeService();
    await expect(service.progressoGeral({ id: "u1", tipo: "TOMADOR" }, "nonexistent")).rejects.toThrow(NotFoundException);
  });

  it("throws ForbiddenException for unauthorized user", async () => {
    mockPrisma.obra.findUnique.mockResolvedValue({ usuarioId: "other" });
    const service = makeService();
    await expect(service.progressoGeral({ id: "u1", tipo: "TOMADOR" }, "o1")).rejects.toThrow(ForbiddenException);
  });

  it("returns 0 when no etapas", async () => {
    mockPrisma.obra.findUnique.mockResolvedValue({ usuarioId: "u1" });
    mockPrisma.etapaObra.findMany.mockResolvedValue([]);
    const service = makeService();
    const result = await service.progressoGeral({ id: "u1", tipo: "TOMADOR" }, "o1");
    expect(result).toBe(0);
  });

  it("returns correct progresso percentage", async () => {
    mockPrisma.obra.findUnique.mockResolvedValue({ usuarioId: "u1" });
    mockPrisma.etapaObra.findMany.mockResolvedValue([
      { status: "CONCLUIDA", percentualObra: { valueOf: () => 30 } },
      { status: "CONCLUIDA", percentualObra: { valueOf: () => 20 } },
      { status: "PENDENTE",  percentualObra: { valueOf: () => 50 } },
    ]);
    const service = makeService();
    const result = await service.progressoGeral({ id: "u1", tipo: "TOMADOR" }, "o1");
    expect(result).toBe(50);
  });
});
