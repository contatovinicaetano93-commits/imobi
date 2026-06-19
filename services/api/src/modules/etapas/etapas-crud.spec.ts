import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { EtapasService } from "./etapas.service";

const mockPrisma = {
  etapaObra: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  etapaAuditLog: { create: jest.fn() },
  obra: { findUnique: jest.fn() },
  evidenciaEtapa: { count: jest.fn() },
  liberacaoParcela: { create: jest.fn() },
};

const mockNotificacoes = { criar: jest.fn().mockResolvedValue(undefined) };
const mockEmail = { etapaAprovadaEmail: jest.fn().mockResolvedValue(undefined) };
const mockPush = { enviarPush: jest.fn().mockResolvedValue(undefined) };
const mockQueue = { add: jest.fn().mockResolvedValue(undefined) };

function makeService() {
  return new EtapasService(
    mockPrisma as any,
    mockNotificacoes as any,
    mockEmail as any,
    mockPush as any,
    mockQueue as any,
  );
}

describe("EtapasService — atualizar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates etapa fields and creates audit log", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue({ etapaId: "e1", status: "EM_EXECUCAO" });
    mockPrisma.etapaObra.update.mockResolvedValue({ etapaId: "e1", nome: "Nova Fundação" });
    mockPrisma.etapaAuditLog.create.mockResolvedValue({});

    const service = makeService();
    const result = await service.atualizar("e1", { nome: "Nova Fundação" }, "admin-id");

    expect(mockPrisma.etapaObra.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { etapaId: "e1" }, data: { nome: "Nova Fundação" } })
    );
    expect(mockPrisma.etapaAuditLog.create).toHaveBeenCalled();
    expect(result).toEqual({ etapaId: "e1", nome: "Nova Fundação" });
  });

  it("throws NotFoundException when etapa not found", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
    const service = makeService();
    await expect(service.atualizar("nonexistent", { nome: "X" }, "admin-id")).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException when etapa is CONCLUIDA", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue({ etapaId: "e1", status: "CONCLUIDA" });
    const service = makeService();
    await expect(service.atualizar("e1", { nome: "X" }, "admin-id")).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException for invalid date", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue({ etapaId: "e1", status: "PLANEJADA" });
    const service = makeService();
    await expect(
      service.atualizar("e1", { dataPlanejadaConclusao: "not-a-date" }, "admin-id")
    ).rejects.toThrow(BadRequestException);
  });
});

describe("EtapasService — deletar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("deletes PLANEJADA etapa and creates audit log", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue({ etapaId: "e1", status: "PLANEJADA" });
    mockPrisma.etapaObra.delete.mockResolvedValue({});
    mockPrisma.etapaAuditLog.create.mockResolvedValue({});

    const service = makeService();
    const result = await service.deletar("e1", "admin-id");

    expect(result.ok).toBe(true);
    expect(mockPrisma.etapaObra.delete).toHaveBeenCalledWith({ where: { etapaId: "e1" } });
    expect(mockPrisma.etapaAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ acaoTipo: "EXCLUIDA" }) })
    );
  });

  it("throws NotFoundException when etapa not found", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
    const service = makeService();
    await expect(service.deletar("nonexistent", "admin-id")).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException when etapa is not PLANEJADA", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue({ etapaId: "e1", status: "EM_EXECUCAO" });
    const service = makeService();
    await expect(service.deletar("e1", "admin-id")).rejects.toThrow(BadRequestException);
  });
});

describe("EtapasService — listarPorObra", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns etapas for obra owner", async () => {
    mockPrisma.obra.findUnique.mockResolvedValue({ usuarioId: "uid1" });
    mockPrisma.etapaObra.findMany.mockResolvedValue([
      { etapaId: "e1", nome: "Fundação", status: "PLANEJADA", ordem: 1, evidencias: [] },
    ]);

    const service = makeService();
    const result = await service.listarPorObra("o1", { id: "uid1", tipo: "TOMADOR" });

    expect(result).toHaveLength(1);
    expect(mockPrisma.etapaObra.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { obraId: "o1" } })
    );
  });

  it("throws ForbiddenException when non-owner non-privileged user tries to access", async () => {
    mockPrisma.obra.findUnique.mockResolvedValue({ usuarioId: "other-user" });
    const service = makeService();
    await expect(
      service.listarPorObra("o1", { id: "uid1", tipo: "TOMADOR" })
    ).rejects.toThrow(ForbiddenException);
  });

  it("throws NotFoundException when obra not found", async () => {
    mockPrisma.obra.findUnique.mockResolvedValue(null);
    const service = makeService();
    await expect(service.listarPorObra("nonexistent", { id: "uid1", tipo: "TOMADOR" })).rejects.toThrow(NotFoundException);
  });
});
