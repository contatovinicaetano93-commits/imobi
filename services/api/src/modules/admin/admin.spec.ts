import { NotFoundException, BadRequestException } from "@nestjs/common";
import { AdminService } from "./admin.service";

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("$hashed$"),
  compare: jest.fn(),
}));

const mockPrisma = {
  usuario: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  obra: { count: jest.fn(), findMany: jest.fn() },
  credito: {
    count: jest.fn(),
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
  kycDocumento: { count: jest.fn(), findMany: jest.fn() },
  etapaObra: { count: jest.fn() },
  etapaAuditLog: { findMany: jest.fn() },
  notificacao: { createMany: jest.fn() },
  adminAuditLog: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  sessaoToken: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

function makeService() {
  return new AdminService(mockPrisma as any);
}

describe("AdminService — overview", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns aggregated platform overview metrics", async () => {
    mockPrisma.usuario.count.mockResolvedValue(42);
    mockPrisma.obra.count
      .mockResolvedValueOnce(10)  // obrasAtivas (EM_EXECUCAO)
      .mockResolvedValueOnce(25)  // obrasTotal
      .mockResolvedValueOnce(7);  // visitasAgendadas (obra.count with etapas filter)
    mockPrisma.credito.aggregate.mockResolvedValue({
      _sum: { valorAprovado: 500000, valorLiberado: 200000 },
    });
    mockPrisma.kycDocumento.count.mockResolvedValue(5);
    mockPrisma.etapaObra.count
      .mockResolvedValueOnce(8)   // etapasPendentes (AGUARDANDO_VISTORIA)
      .mockResolvedValueOnce(3);  // filaLiberacao (CONCLUIDA)
    const svc = makeService();
    const result = await svc.overview();
    expect(result.totalUsuarios).toBe(42);
    expect(result.obrasAtivas).toBe(10);
    expect(result.obrasTotal).toBe(25);
    expect(result.creditoAprovado).toBe(500000);
    expect(result.creditoLiberado).toBe(200000);
    expect(result.kycPendentes).toBe(5);
    expect(result.etapasPendentes).toBe(8);
    expect(result.filaLiberacao).toBe(3);
    expect(result.visitasAgendadas).toBe(7);
  });

  it("returns 0 for credito sums when no active creditos", async () => {
    mockPrisma.usuario.count.mockResolvedValue(0);
    mockPrisma.obra.count.mockResolvedValue(0);
    mockPrisma.credito.aggregate.mockResolvedValue({ _sum: { valorAprovado: null, valorLiberado: null } });
    mockPrisma.kycDocumento.count.mockResolvedValue(0);
    mockPrisma.etapaObra.count.mockResolvedValue(0);
    const svc = makeService();
    const result = await svc.overview();
    expect(result.creditoAprovado).toBe(0);
    expect(result.creditoLiberado).toBe(0);
  });
});

describe("AdminService — atividades", () => {
  beforeEach(() => jest.clearAllMocks());

  it("merges and sorts audit logs, kyc docs, and creditos by date", async () => {
    const older = new Date("2025-01-01T10:00:00Z");
    const newer = new Date("2025-06-01T10:00:00Z");

    mockPrisma.etapaAuditLog.findMany.mockResolvedValue([
      { auditId: "a1", acaoTipo: "APROVADA", criadoEm: older, etapa: { nome: "Fundação" } },
    ]);
    mockPrisma.kycDocumento.findMany.mockResolvedValue([
      { kycDocumentoId: "k1", tipo: "RG", criadoEm: newer, usuario: { nome: "Maria" } },
    ]);
    mockPrisma.credito.findMany.mockResolvedValue([]);

    const svc = makeService();
    const result = await svc.atividades(10);
    expect(result).toHaveLength(2);
    // Newer event should come first (sorted desc)
    expect(result[0].id).toBe("k1");
    expect(result[0].tipo).toBe("KYC_ENVIADO");
    expect(result[1].id).toBe("a1");
    expect(result[1].tipo).toBe("ETAPA_APROVADA");
  });

  it("limits result to specified count", async () => {
    const date = new Date();
    mockPrisma.etapaAuditLog.findMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        auditId: `a${i}`, acaoTipo: "APROVADA", criadoEm: new Date(date.getTime() - i * 1000),
        etapa: { nome: "Etapa" },
      })),
    );
    mockPrisma.kycDocumento.findMany.mockResolvedValue([]);
    mockPrisma.credito.findMany.mockResolvedValue([]);

    const svc = makeService();
    const result = await svc.atividades(3);
    expect(result).toHaveLength(3);
  });
});

describe("AdminService — listarUsuarios", () => {
  beforeEach(() => jest.clearAllMocks());

  it("maps usuarioId to id and includes totals", async () => {
    mockPrisma.usuario.findMany.mockResolvedValue([
      {
        usuarioId: "u1",
        nome: "João",
        email: "j@j.com",
        telefone: "11999",
        tipo: "TOMADOR",
        kycStatus: "PENDENTE",
        bloqueadoEm: null,
        funcoesBloqueadas: [],
        criadoEm: new Date(),
        _count: { obras: 2, creditos: 1 },
      },
    ]);
    const svc = makeService();
    const result = await svc.listarUsuarios();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("u1");
    expect(result[0].totalObras).toBe(2);
    expect(result[0].totalCreditos).toBe(1);
    expect((result[0] as any).usuarioId).toBeUndefined();
    expect((result[0] as any)._count).toBeUndefined();
  });
});

describe("AdminService — metricas", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns platform-wide metrics with 30-day user growth", async () => {
    mockPrisma.$transaction.mockResolvedValue([
      100,  // totalUsuarios
      15,   // novosUltimos30Dias
      50,   // totalObras
      20,   // obrasEmExecucao
      30,   // totalCreditos
      25,   // creditosAprovados
      5,    // creditosAguardando
      8,    // kycPendentes
      { _sum: { valorLiberado: 750000 } }, // valorTotalLiberadoAgg
    ]);
    const svc = makeService();
    const result = await svc.metricas();
    expect(result.totalUsuarios).toBe(100);
    expect(result.novosUltimos30Dias).toBe(15);
    expect(result.creditosAprovados).toBe(25);
    expect(result.valorTotalLiberado).toBe(750000);
  });

  it("returns 0 for valorTotalLiberado when no liberacoes", async () => {
    mockPrisma.$transaction.mockResolvedValue([0, 0, 0, 0, 0, 0, 0, 0, { _sum: { valorLiberado: null } }]);
    const svc = makeService();
    const result = await svc.metricas();
    expect(result.valorTotalLiberado).toBe(0);
  });
});

describe("AdminService — listarSessoesUsuario", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when user not found", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.listarSessoesUsuario("bad-id")).rejects.toThrow(NotFoundException);
  });

  it("returns active non-expired sessions", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({ usuarioId: "u1" });
    mockPrisma.sessaoToken.findMany.mockResolvedValue([
      { sessionId: "s1", userAgent: "Mozilla", ip: "1.2.3.4", criadoEm: new Date(), expiresAt: new Date(Date.now() + 99999) },
    ]);
    const svc = makeService();
    const result = await svc.listarSessoesUsuario("u1");
    expect(result.total).toBe(1);
    expect(result.data[0].sessionId).toBe("s1");
  });
});

describe("AdminService — broadcastNotificacao", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates notifications for all active users and logs audit", async () => {
    mockPrisma.usuario.findMany.mockResolvedValue([{ usuarioId: "u1" }, { usuarioId: "u2" }]);
    mockPrisma.notificacao.createMany.mockResolvedValue({});
    mockPrisma.adminAuditLog.create.mockResolvedValue({});
    const svc = makeService();
    const result = await svc.broadcastNotificacao("Alerta", "Sistema em manutenção", "SISTEMA", undefined, "admin1");
    expect(result.enviadas).toBe(2);
    expect(result.ok).toBe(true);
    expect(mockPrisma.notificacao.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.arrayContaining([
        expect.objectContaining({ usuarioId: "u1", tipo: "SISTEMA" }),
        expect.objectContaining({ usuarioId: "u2", tipo: "SISTEMA" }),
      ]) }),
    );
    expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ acaoTipo: "BROADCAST_NOTIFICACAO", adminId: "admin1" }) }),
    );
  });

  it("coerces unknown tipo to SISTEMA", async () => {
    mockPrisma.usuario.findMany.mockResolvedValue([{ usuarioId: "u1" }]);
    mockPrisma.notificacao.createMany.mockResolvedValue({});
    mockPrisma.adminAuditLog.create.mockResolvedValue({});
    const svc = makeService();
    await svc.broadcastNotificacao("T", "M", "TIPO_INVALIDO", undefined, "admin1");
    const createData = mockPrisma.notificacao.createMany.mock.calls[0][0].data;
    expect(createData[0].tipo).toBe("SISTEMA");
  });
});

describe("AdminService — listarObras", () => {
  beforeEach(() => jest.clearAllMocks());

  it("maps obraId to id and includes tomador name", async () => {
    mockPrisma.obra.findMany.mockResolvedValue([
      { obraId: "o1", nome: "Casa A", status: "EM_EXECUCAO", usuario: { nome: "João" }, etapas: [] },
    ]);
    const svc = makeService();
    const result = await svc.listarObras(20, 0);
    expect(result[0].id).toBe("o1");
    expect(result[0].tomador).toBe("João");
    expect((result[0] as any).obraId).toBeUndefined();
  });
});
