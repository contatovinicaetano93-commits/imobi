import { NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { CreditoService } from "./credito.service";

jest.mock("@imbobi/core", () => ({
  simularCredito: jest.fn((valor: number, taxa: number, prazo: number) => ({
    valorTotal: valor * (1 + taxa * prazo),
    parcelas: prazo,
    valorParcela: (valor * (1 + taxa * prazo)) / prazo,
  })),
}));

const mockPrisma = {
  credito: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  usuario: { findUnique: jest.fn() },
  liberacaoParcela: { findMany: jest.fn() },
};

function makeService() {
  return new CreditoService(mockPrisma as any);
}

describe("CreditoService — simular", () => {
  it("delegates to simularCredito from @imbobi/core", () => {
    const { simularCredito } = require("@imbobi/core");
    const service = makeService();
    const result = service.simular({ valorSolicitado: 100000, prazoMeses: 12 });
    expect(simularCredito).toHaveBeenCalledWith(100000, 0.0099, 12);
    expect(result).toBeDefined();
  });
});

describe("CreditoService — solicitar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates credito with correct defaults when KYC is APROVADO", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({ kycStatus: "APROVADO" });
    const created = { creditoId: "c1", usuarioId: "u1", valorAprovado: 50000 };
    mockPrisma.credito.create.mockResolvedValue(created);
    const service = makeService();
    const result = await service.solicitar("u1", { valorSolicitado: 50000, prazoMeses: 24 });
    expect(result).toEqual(created);
    expect(mockPrisma.credito.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ usuarioId: "u1", valorAprovado: 50000, valorLiberado: 0, taxaMensal: 0.0099, prazoMeses: 24 }),
    });
  });

  it("throws ForbiddenException when KYC is not APROVADO", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({ kycStatus: "PENDENTE" });
    const service = makeService();
    await expect(service.solicitar("u1", { valorSolicitado: 50000, prazoMeses: 24 })).rejects.toThrow(ForbiddenException);
    expect(mockPrisma.credito.create).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when user does not exist", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    const service = makeService();
    await expect(service.solicitar("unknown", { valorSolicitado: 50000, prazoMeses: 24 })).rejects.toThrow(NotFoundException);
  });
});

describe("CreditoService — buscarPorUsuario", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns mapped creditos list for user", async () => {
    mockPrisma.credito.findMany.mockResolvedValue([
      {
        creditoId: "c1",
        usuarioId: "u1",
        valorAprovado: { valueOf: () => 100000 },
        valorLiberado: { valueOf: () => 0 },
        taxaMensal: { valueOf: () => 0.0099 },
        prazoMeses: 12,
        status: "ATIVO",
        criadoEm: new Date("2024-01-01"),
        obras: [{ obraId: "o1", nome: "Casa", status: "EM_ANDAMENTO" }],
        liberacoes: [],
      },
    ]);

    const service = makeService();
    const result = await service.buscarPorUsuario("u1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c1");
    expect(result[0].obras).toHaveLength(1);
    expect(result[0].obras[0].id).toBe("o1");
  });

  it("returns empty array when user has no creditos", async () => {
    mockPrisma.credito.findMany.mockResolvedValue([]);
    const service = makeService();
    const result = await service.buscarPorUsuario("u1");
    expect(result).toEqual([]);
  });
});

describe("CreditoService — extrato", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when credito not found", async () => {
    mockPrisma.credito.findUnique.mockResolvedValue(null);
    const service = makeService();
    await expect(service.extrato("nonexistent", "u1")).rejects.toThrow(NotFoundException);
  });

  it("throws ForbiddenException when user does not own the credito", async () => {
    mockPrisma.credito.findUnique.mockResolvedValue({ creditoId: "c1", usuarioId: "other-user", liberacoes: [] });
    const service = makeService();
    await expect(service.extrato("c1", "u1")).rejects.toThrow(ForbiddenException);
  });

  it("returns extrato with FALHA mapped to FALHOU", async () => {
    mockPrisma.credito.findUnique.mockResolvedValue({
      creditoId: "c1",
      usuarioId: "u1",
      valorAprovado: 100000,
      valorLiberado: 0,
      taxaMensal: 0.0099,
      prazoMeses: 12,
      status: "ATIVO",
      liberacoes: [
        { liberacaoId: "l1", valor: 10000, status: "FALHA", criadoEm: new Date("2024-02-01"), motivo: "Insufficient funds" },
        { liberacaoId: "l2", valor: 20000, status: "LIBERADO", criadoEm: new Date("2024-03-01"), motivo: null },
      ],
    });

    const service = makeService();
    const result = await service.extrato("c1", "u1");

    expect(result.creditoId).toBe("c1");
    expect(result.liberacoes[0].status).toBe("FALHOU");
    expect(result.liberacoes[1].status).toBe("LIBERADO");
  });
});

describe("CreditoService — cancelar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when credito not found", async () => {
    mockPrisma.credito.findUnique.mockResolvedValue(null);
    const service = makeService();
    await expect(service.cancelar("nonexistent")).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException when already CANCELADO", async () => {
    mockPrisma.credito.findUnique.mockResolvedValue({ creditoId: "c1", status: "CANCELADO" });
    const service = makeService();
    await expect(service.cancelar("c1")).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException when status is QUITADO", async () => {
    mockPrisma.credito.findUnique.mockResolvedValue({ creditoId: "c1", status: "QUITADO" });
    const service = makeService();
    await expect(service.cancelar("c1", "motivo")).rejects.toThrow(BadRequestException);
  });

  it("cancels active credito and returns ok", async () => {
    mockPrisma.credito.findUnique.mockResolvedValue({ creditoId: "c1", status: "ATIVO" });
    mockPrisma.credito.update.mockResolvedValue({ creditoId: "c1", status: "CANCELADO" });

    const service = makeService();
    const result = await service.cancelar("c1", "Desistência");

    expect(result.ok).toBe(true);
    expect(result.creditoId).toBe("c1");
    expect(result.motivo).toBe("Desistência");
    expect(mockPrisma.credito.update).toHaveBeenCalledWith({
      where: { creditoId: "c1" },
      data: { status: "CANCELADO" },
    });
  });

  it("returns null motivo when not provided", async () => {
    mockPrisma.credito.findUnique.mockResolvedValue({ creditoId: "c1", status: "ATIVO" });
    mockPrisma.credito.update.mockResolvedValue({});
    const service = makeService();
    const result = await service.cancelar("c1");
    expect(result.motivo).toBeNull();
  });
});
