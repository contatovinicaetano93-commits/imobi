import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { EtapasService } from "./etapas.service";

const mockPrisma = {
  obra: { findUnique: jest.fn() },
  etapaObra: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  etapaAuditLog: { create: jest.fn() },
  evidenciaEtapa: { count: jest.fn() },
  liberacaoParcela: { create: jest.fn() },
  $transaction: jest.fn(),
};

const mockNotificacoes = { criar: jest.fn() };
const mockEmail = { etapaAprovadaEmail: jest.fn() };
const mockPush = { enviarPush: jest.fn() };
const mockQueue = { add: jest.fn() };

describe("EtapasService – listarPorObra ownership", () => {
  let service: EtapasService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EtapasService(
      mockPrisma as any,
      mockNotificacoes as any,
      mockEmail as any,
      mockPush as any,
      mockQueue as any,
    );
  });

  const obraOwner = "user-owner";
  const obraRecord = { usuarioId: obraOwner };
  const etapas = [{ etapaId: "etapa-1", nome: "Fundação", ordem: 1, evidencias: [] }];

  beforeEach(() => {
    mockPrisma.obra.findUnique.mockResolvedValue(obraRecord);
    mockPrisma.etapaObra.findMany.mockResolvedValue(etapas);
  });

  it("allows obra owner (TOMADOR) to list etapas", async () => {
    const result = await service.listarPorObra("obra-1", { id: obraOwner, tipo: "TOMADOR" });
    expect(result).toEqual(etapas);
  });

  it("throws ForbiddenException when a different TOMADOR tries to list etapas", async () => {
    await expect(
      service.listarPorObra("obra-1", { id: "attacker-id", tipo: "TOMADOR" }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("allows ADMIN to list etapas regardless of ownership", async () => {
    const result = await service.listarPorObra("obra-1", { id: "admin-id", tipo: "ADMIN" });
    expect(result).toEqual(etapas);
  });

  it("allows GESTOR to list etapas regardless of ownership", async () => {
    const result = await service.listarPorObra("obra-1", { id: "gestor-id", tipo: "GESTOR" });
    expect(result).toEqual(etapas);
  });

  it("allows ENGENHEIRO to list etapas regardless of ownership (fund-wide oversight)", async () => {
    const result = await service.listarPorObra("obra-1", { id: "eng-id", tipo: "ENGENHEIRO" });
    expect(result).toEqual(etapas);
  });

  it("throws NotFoundException when obra does not exist", async () => {
    mockPrisma.obra.findUnique.mockResolvedValue(null);
    await expect(
      service.listarPorObra("nonexistent", { id: obraOwner, tipo: "TOMADOR" }),
    ).rejects.toThrow(NotFoundException);
  });
});

describe("EtapasService – atualizarStatus ownership", () => {
  let service: EtapasService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EtapasService(
      mockPrisma as any,
      mockNotificacoes as any,
      mockEmail as any,
      mockPush as any,
      mockQueue as any,
    );
  });

  const obraOwner = "user-owner";
  const etapaRecord = {
    etapaId: "etapa-1",
    obra: { usuarioId: obraOwner },
  };

  beforeEach(() => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(etapaRecord);
    mockPrisma.etapaObra.update.mockResolvedValue({ ...etapaRecord, status: "AGUARDANDO_VISTORIA" });
  });

  it("allows obra owner to submit etapa for vistoria", async () => {
    await expect(
      service.atualizarStatus("etapa-1", "AGUARDANDO_VISTORIA", obraOwner, "TOMADOR"),
    ).resolves.toBeDefined();
  });

  it("throws ForbiddenException when owner sets invalid status", async () => {
    await expect(
      service.atualizarStatus("etapa-1", "CONCLUIDA", obraOwner, "TOMADOR"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when non-owner TOMADOR tries to update status", async () => {
    await expect(
      service.atualizarStatus("etapa-1", "AGUARDANDO_VISTORIA", "attacker-id", "TOMADOR"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("allows ADMIN to set any status", async () => {
    await expect(
      service.atualizarStatus("etapa-1", "CONCLUIDA", "admin-id", "ADMIN"),
    ).resolves.toBeDefined();
  });

  it("allows GESTOR to set any status", async () => {
    await expect(
      service.atualizarStatus("etapa-1", "CONCLUIDA", "gestor-id", "GESTOR"),
    ).resolves.toBeDefined();
  });

  it("throws ForbiddenException when ENGENHEIRO tries to set arbitrary status (not privileged)", async () => {
    await expect(
      service.atualizarStatus("etapa-1", "CONCLUIDA", "eng-id", "ENGENHEIRO"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("throws NotFoundException when etapa does not exist", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
    await expect(
      service.atualizarStatus("nonexistent", "AGUARDANDO_VISTORIA", obraOwner, "TOMADOR"),
    ).rejects.toThrow(NotFoundException);
  });
});
