import { BadRequestException, NotFoundException } from "@nestjs/common";
import { EngenheirosService } from "./engenheiros.service";

const VISITA_ID = "etapa-uuid-001";
const OBRA_ID = "obra-uuid-001";
const USUARIO_ID = "usuario-uuid-001";

const NOW = new Date("2025-01-01T12:00:00Z");

const baseEtapa = {
  etapaId: VISITA_ID,
  nome: "Fundação",
  status: "AGUARDANDO_VISTORIA",
  atualizadoEm: NOW,
  criadoEm: NOW,
  obra: { obraId: OBRA_ID, nome: "Obra Teste", endereco: "Rua A, 1" },
  evidencias: [],
};

function buildService(overrides: {
  findUniqueEtapa?: any;
  findManyEtapas?: any[];
  updateManyCount?: number;
} = {}) {
  const findUniqueResult =
    overrides.findUniqueEtapa !== undefined ? overrides.findUniqueEtapa : baseEtapa;
  const findManyResult = overrides.findManyEtapas ?? [baseEtapa];
  const updateManyCount = overrides.updateManyCount ?? 1;

  const prisma = {
    etapaObra: {
      findUnique: jest.fn().mockResolvedValue(findUniqueResult),
      findMany: jest.fn().mockResolvedValue(findManyResult),
      updateMany: jest.fn().mockResolvedValue({ count: updateManyCount }),
    },
  };

  const service = Object.create(EngenheirosService.prototype) as EngenheirosService;
  (service as any).prisma = prisma;

  return { service, prisma };
}

// ── listarVisitas ─────────────────────────────────────────────────────

describe("EngenheirosService.listarVisitas", () => {
  it("maps AGUARDANDO_VISTORIA → AGENDADA", async () => {
    const { service } = buildService();
    const result = await service.listarVisitas(USUARIO_ID);
    expect(result[0].status).toBe("AGENDADA");
    expect(result[0].visitaId).toBe(VISITA_ID);
    expect(result[0].obraId).toBe(OBRA_ID);
  });

  it("maps CONCLUIDA → CONCLUIDA", async () => {
    const etapa = { ...baseEtapa, status: "CONCLUIDA" };
    const { service } = buildService({ findManyEtapas: [etapa] });
    const result = await service.listarVisitas(USUARIO_ID);
    expect(result[0].status).toBe("CONCLUIDA");
  });

  it("maps REPROVADA → REPROVADA", async () => {
    const etapa = { ...baseEtapa, status: "REPROVADA" };
    const { service } = buildService({ findManyEtapas: [etapa] });
    const result = await service.listarVisitas(USUARIO_ID);
    expect(result[0].status).toBe("REPROVADA");
  });

  it("returns empty array when no visitas exist", async () => {
    const { service } = buildService({ findManyEtapas: [] });
    const result = await service.listarVisitas(USUARIO_ID);
    expect(result).toEqual([]);
  });

  it("sets observacoes to null and formats dates as ISO strings", async () => {
    const { service } = buildService();
    const [visita] = await service.listarVisitas(USUARIO_ID);
    expect(visita.observacoes).toBeNull();
    expect(visita.dataAgendada).toBe(NOW.toISOString());
    expect(visita.criadoEm).toBe(NOW.toISOString());
  });
});

// ── obterVisita ───────────────────────────────────────────────────────

describe("EngenheirosService.obterVisita", () => {
  it("returns visita for AGUARDANDO_VISTORIA with status AGENDADA", async () => {
    const { service } = buildService();
    const result = await service.obterVisita(VISITA_ID);
    expect(result.status).toBe("AGENDADA");
    expect(result.visitaId).toBe(VISITA_ID);
    expect(result.evidencias).toEqual([]);
  });

  it("returns visita for EM_EXECUCAO with status CONCLUIDA", async () => {
    const etapa = { ...baseEtapa, status: "EM_EXECUCAO" };
    const { service } = buildService({ findUniqueEtapa: etapa });
    const result = await service.obterVisita(VISITA_ID);
    expect(result.status).toBe("CONCLUIDA");
  });

  it("returns visita for REPROVADA with status REPROVADA", async () => {
    const etapa = { ...baseEtapa, status: "REPROVADA" };
    const { service } = buildService({ findUniqueEtapa: etapa });
    const result = await service.obterVisita(VISITA_ID);
    expect(result.status).toBe("REPROVADA");
  });

  it("throws NotFoundException when etapa not found", async () => {
    const { service } = buildService({ findUniqueEtapa: null });
    await expect(service.obterVisita(VISITA_ID)).rejects.toThrow(NotFoundException);
  });

  it("throws NotFoundException for PENDENTE etapa (non-vistoria status)", async () => {
    const etapa = { ...baseEtapa, status: "PENDENTE" };
    const { service } = buildService({ findUniqueEtapa: etapa });
    await expect(service.obterVisita(VISITA_ID)).rejects.toThrow(NotFoundException);
  });

  it("throws NotFoundException for APROVADA etapa", async () => {
    const etapa = { ...baseEtapa, status: "APROVADA" };
    const { service } = buildService({ findUniqueEtapa: etapa });
    await expect(service.obterVisita(VISITA_ID)).rejects.toThrow(NotFoundException);
  });

  it("includes evidencias in the response", async () => {
    const evidencia = { evidenciaId: "ev-001", fotoUrl: "s3://foto", validada: false, criadoEm: NOW };
    const etapa = { ...baseEtapa, evidencias: [evidencia] };
    const { service } = buildService({ findUniqueEtapa: etapa });
    const result = await service.obterVisita(VISITA_ID);
    expect(result.evidencias).toHaveLength(1);
    expect(result.evidencias[0].evidenciaId).toBe("ev-001");
  });
});

// ── atualizarVisita ───────────────────────────────────────────────────

describe("EngenheirosService.atualizarVisita", () => {
  it("INICIADA transition calls updateMany with from AGUARDANDO_VISTORIA and target EM_EXECUCAO", async () => {
    const emExecucaoEtapa = { ...baseEtapa, status: "EM_EXECUCAO" };
    const { service, prisma } = buildService({ findUniqueEtapa: emExecucaoEtapa });
    await service.atualizarVisita(USUARIO_ID, VISITA_ID, { status: "INICIADA" });
    expect(prisma.etapaObra.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          etapaId: VISITA_ID,
          status: { in: ["AGUARDANDO_VISTORIA"] },
        }),
        data: { status: "EM_EXECUCAO" },
      })
    );
  });

  it("CONCLUIDA transition calls updateMany with from EM_EXECUCAO and target CONCLUIDA", async () => {
    const concluidaEtapa = { ...baseEtapa, status: "CONCLUIDA" };
    const { service, prisma } = buildService({ findUniqueEtapa: concluidaEtapa });
    await service.atualizarVisita(USUARIO_ID, VISITA_ID, { status: "CONCLUIDA" });
    expect(prisma.etapaObra.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          etapaId: VISITA_ID,
          status: { in: ["EM_EXECUCAO"] },
        }),
        data: { status: "CONCLUIDA" },
      })
    );
  });

  it("throws BadRequestException when updateMany affects 0 rows (wrong source status)", async () => {
    const { service } = buildService({ updateManyCount: 0 });
    await expect(
      service.atualizarVisita(USUARIO_ID, VISITA_ID, { status: "INICIADA" })
    ).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException for unknown status value", async () => {
    const { service } = buildService();
    await expect(
      service.atualizarVisita(USUARIO_ID, VISITA_ID, { status: "INVALIDO" })
    ).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException with message 'Status inválido.' for unknown status", async () => {
    const { service } = buildService();
    await expect(
      service.atualizarVisita(USUARIO_ID, VISITA_ID, { status: "REJEITADA" })
    ).rejects.toThrow("Status inválido.");
  });

  it("no-status payload: returns visita when etapa exists", async () => {
    const { service, prisma } = buildService();
    const result = await service.atualizarVisita(USUARIO_ID, VISITA_ID, {});
    // findUnique called twice: once for existence check, once inside obterVisita
    expect(prisma.etapaObra.findUnique).toHaveBeenCalledTimes(2);
    expect(result.visitaId).toBe(VISITA_ID);
  });

  it("no-status payload: throws NotFoundException when etapa does not exist", async () => {
    const { service } = buildService({ findUniqueEtapa: null });
    await expect(
      service.atualizarVisita(USUARIO_ID, VISITA_ID, {})
    ).rejects.toThrow(NotFoundException);
  });

  it("does not call updateMany when no status is provided", async () => {
    const { service, prisma } = buildService();
    await service.atualizarVisita(USUARIO_ID, VISITA_ID, {});
    expect(prisma.etapaObra.updateMany).not.toHaveBeenCalled();
  });

  it("returns the updated visita after a successful transition", async () => {
    const emExecucaoEtapa = { ...baseEtapa, status: "EM_EXECUCAO" };
    const { service } = buildService({ findUniqueEtapa: emExecucaoEtapa });
    const result = await service.atualizarVisita(USUARIO_ID, VISITA_ID, { status: "INICIADA" });
    expect(result.visitaId).toBe(VISITA_ID);
  });
});
