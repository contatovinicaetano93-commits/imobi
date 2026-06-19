import { BadRequestException, NotFoundException } from "@nestjs/common";
import { VistoriaService } from "./vistoria.service";

const mockPrisma = {
  etapaObra: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  etapaAuditLog: { create: jest.fn() },
  liberacaoParcela: { create: jest.fn() },
};

const mockNotificacoes = { criar: jest.fn().mockResolvedValue(undefined) };
const mockEmail = { etapaAprovadaEmail: jest.fn().mockResolvedValue(undefined) };
const mockPush = { enviarPush: jest.fn().mockResolvedValue(undefined) };
const mockQueue = { add: jest.fn().mockResolvedValue(undefined) };

function makeService() {
  return new VistoriaService(
    mockPrisma as any,
    mockNotificacoes as any,
    mockEmail as any,
    mockPush as any,
    mockQueue as any,
  );
}

describe("VistoriaService — listarPendentes", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns paginated pending etapas", async () => {
    const etapas = [
      { etapaId: "e1", nome: "Fundação", status: "AGUARDANDO_VISTORIA", obra: { obraId: "o1", nome: "Obra A", usuario: { nome: "João", email: "j@t.com" } } },
    ];
    mockPrisma.etapaObra.findMany.mockResolvedValue(etapas);
    mockPrisma.etapaObra.count.mockResolvedValue(1);

    const service = makeService();
    const result = await service.listarPendentes(10, 0);

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(mockPrisma.etapaObra.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "AGUARDANDO_VISTORIA" }, take: 10, skip: 0 })
    );
  });

  it("returns empty data when no pending etapas", async () => {
    mockPrisma.etapaObra.findMany.mockResolvedValue([]);
    mockPrisma.etapaObra.count.mockResolvedValue(0);

    const service = makeService();
    const result = await service.listarPendentes(10, 0);

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

describe("VistoriaService — agendar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates audit log and notifies owner", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue({
      etapaId: "e1",
      nome: "Fundação",
      obra: { usuarioId: "uid1", nome: "Obra A" },
    });
    mockPrisma.etapaAuditLog.create.mockResolvedValue({});
    mockNotificacoes.criar.mockResolvedValue(undefined);

    const service = makeService();
    const data = new Date();
    data.setDate(data.getDate() + 3);

    const result = await service.agendar("gestor-id", "e1", data.toISOString(), "Visita confirmada");

    expect(result.ok).toBe(true);
    expect(result.etapaId).toBe("e1");
    expect(mockPrisma.etapaAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ acaoTipo: "VISTORIA_AGENDADA" }),
      })
    );
    expect(mockNotificacoes.criar).toHaveBeenCalled();
  });

  it("throws NotFoundException when etapa not found", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
    const service = makeService();
    await expect(
      service.agendar("g1", "nonexistent", new Date().toISOString())
    ).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException for invalid date", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue({
      etapaId: "e1",
      nome: "Fundação",
      obra: { usuarioId: "uid1", nome: "Obra A" },
    });
    const service = makeService();
    await expect(
      service.agendar("g1", "e1", "not-a-date")
    ).rejects.toThrow(BadRequestException);
  });
});
