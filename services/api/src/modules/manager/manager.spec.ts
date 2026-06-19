import { ForbiddenException } from "@nestjs/common";
import { ManagerService } from "./manager.service";

const mockPrisma = {
  usuario: { findUnique: jest.fn() },
  etapaObra: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  kycDocumento: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  credito: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  obra: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  etapaAuditLog: { findMany: jest.fn() },
  kycAuditLog: { findMany: jest.fn() },
};

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
};

function makeService() {
  return new ManagerService(mockPrisma as any, mockCache as any);
}

describe("ManagerService — verificarPermissao", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws ForbiddenException when user is not found", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.verificarPermissao("u1")).rejects.toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when user is TOMADOR", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({ tipo: "TOMADOR" });
    const svc = makeService();
    await expect(svc.verificarPermissao("u1")).rejects.toThrow(ForbiddenException);
  });

  it("resolves for GESTOR", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({ tipo: "GESTOR" });
    const svc = makeService();
    await expect(svc.verificarPermissao("u1")).resolves.not.toThrow();
  });
});

describe("ManagerService — obterEstatisticas", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns cached value when cache hit", async () => {
    const cached = { filaAprovacoes: 5, filaKyc: 2, creditosAtivos: 10, obrasAtivas: 3 };
    mockCache.get.mockResolvedValue(cached);
    const svc = makeService();
    const result = await svc.obterEstatisticas();
    expect(result).toEqual(cached);
    expect(mockPrisma.etapaObra.count).not.toHaveBeenCalled();
  });

  it("queries DB on cache miss and caches result", async () => {
    mockCache.get.mockResolvedValue(null);
    mockPrisma.etapaObra.count.mockResolvedValue(4);
    mockPrisma.kycDocumento.count.mockResolvedValue(2);
    mockPrisma.credito.count.mockResolvedValue(8);
    mockPrisma.obra.count.mockResolvedValue(6);

    const svc = makeService();
    const result = await svc.obterEstatisticas();

    expect(result).toEqual({ filaAprovacoes: 4, filaKyc: 2, creditosAtivos: 8, obrasAtivas: 6 });
    expect(mockCache.set).toHaveBeenCalled();
  });
});

describe("ManagerService — listarEtapasPendentes", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns cached result on hit", async () => {
    const cached = { etapas: [], total: 0 };
    mockCache.get.mockResolvedValue(cached);
    const svc = makeService();
    const result = await svc.listarEtapasPendentes();
    expect(result).toEqual(cached);
    expect(mockPrisma.etapaObra.findMany).not.toHaveBeenCalled();
  });

  it("queries DB and maps etapas on cache miss", async () => {
    mockCache.get.mockResolvedValue(null);
    const etapa = {
      etapaId: "e1", nome: "Fundação", ordem: 1,
      percentualObra: 30, valorLiberacao: 10000, criadoEm: new Date(),
      evidencias: [],
      obra: {
        obraId: "o1", nome: "Casa A", endereco: "Rua X",
        usuario: { usuarioId: "u1", nome: "João", email: "j@j.com", cpf: "000" },
        credito: null,
      },
    };
    mockPrisma.etapaObra.findMany.mockResolvedValue([etapa]);
    mockPrisma.etapaObra.count.mockResolvedValue(1);

    const svc = makeService();
    const result = await svc.listarEtapasPendentes(20, 0);

    expect(result.total).toBe(1);
    expect(result.etapas).toHaveLength(1);
    expect(result.etapas[0].etapaId).toBe("e1");
    expect(result.etapas[0].obra.obraId).toBe("o1");
    expect(mockCache.set).toHaveBeenCalled();
  });

  it("applies status filter 'todas' (no status where clause)", async () => {
    mockCache.get.mockResolvedValue(null);
    mockPrisma.etapaObra.findMany.mockResolvedValue([]);
    mockPrisma.etapaObra.count.mockResolvedValue(0);

    const svc = makeService();
    await svc.listarEtapasPendentes(20, 0, { status: "todas" });

    const call = mockPrisma.etapaObra.findMany.mock.calls[0][0];
    expect(call.where.status).toBeUndefined();
  });
});

describe("ManagerService — listarKycPendentes", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns from cache on hit", async () => {
    const cached = { documentos: [], total: 0 };
    mockCache.get.mockResolvedValue(cached);
    const svc = makeService();
    const result = await svc.listarKycPendentes();
    expect(result).toEqual(cached);
  });

  it("queries and returns documents with total", async () => {
    mockCache.get.mockResolvedValue(null);
    mockPrisma.kycDocumento.findMany.mockResolvedValue([{ kycDocumentoId: "k1" }]);
    mockPrisma.kycDocumento.count.mockResolvedValue(1);

    const svc = makeService();
    const result = await svc.listarKycPendentes(10, 0);
    expect(result.total).toBe(1);
    expect(result.documentos).toHaveLength(1);
  });
});

describe("ManagerService — obterEtapaDetalhe", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns null when etapa not found", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
    const svc = makeService();
    const result = await svc.obterEtapaDetalhe("bad-id");
    expect(result).toBeNull();
  });

  it("converts Decimal values to numbers", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue({
      etapaId: "e1", nome: "Fundação", valorLiberacao: 15000,
      obra: {
        obraId: "o1", nome: "Casa A", endereco: "Rua X",
        usuario: { usuarioId: "u1", nome: "João", email: "j@j.com", cpf: "000" },
        credito: {
          creditoId: "c1",
          valorAprovado: 100000,
          valorLiberado: 50000,
          status: "ATIVO",
        },
      },
      evidencias: [],
    });

    const svc = makeService();
    const result = await svc.obterEtapaDetalhe("e1");
    expect(typeof result?.valorLiberacao).toBe("number");
    expect(typeof result?.obra.credito?.valorAprovado).toBe("number");
  });
});

describe("ManagerService — obterEtapaAuditLog", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns mapped audit log entries", async () => {
    mockPrisma.etapaAuditLog.findMany.mockResolvedValue([
      {
        auditId: "a1",
        acaoTipo: "APROVADO",
        observacoes: "OK",
        criadoEm: new Date(),
        usuario: { usuarioId: "u1", nome: "Gestor", email: "g@g.com" },
      },
    ]);

    const svc = makeService();
    const result = await svc.obterEtapaAuditLog("e1");
    expect(result).toHaveLength(1);
    expect(result[0].acaoTipo).toBe("APROVADO");
    expect(result[0].gerenciador).toBe("Gestor");
    expect(result[0].gerenciadorEmail).toBe("g@g.com");
  });
});

describe("ManagerService — obterKycAuditLog", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns mapped KYC audit log entries", async () => {
    mockPrisma.kycAuditLog.findMany.mockResolvedValue([
      {
        auditId: "a2",
        acaoTipo: "REPROVADO",
        motivo: "Documento ilegível",
        criadoEm: new Date(),
        usuario: { usuarioId: "u1", nome: "Gestor", email: "g@g.com" },
      },
    ]);

    const svc = makeService();
    const result = await svc.obterKycAuditLog("k1");
    expect(result[0].motivo).toBe("Documento ilegível");
    expect(result[0].acaoTipo).toBe("REPROVADO");
  });
});
