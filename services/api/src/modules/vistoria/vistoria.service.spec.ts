import { BadRequestException, NotFoundException } from "@nestjs/common";
import { VistoriaService } from "./vistoria.service";

const GESTOR_ID = "gestor-uuid-001";
const ETAPA_ID = "etapa-uuid-001";
const OBRA_ID = "obra-uuid-001";
const CREDITO_ID = "credito-uuid-001";
const LIBERACAO_ID = "liberacao-uuid-001";
const USUARIO_ID = "usuario-uuid-001";

const baseEtapa = {
  etapaId: ETAPA_ID,
  nome: "Estrutura",
  status: "AGUARDANDO_VISTORIA",
  percentualObra: 25,
  obra: {
    obraId: OBRA_ID,
    nome: "Obra Teste",
    usuarioId: USUARIO_ID,
    credito: {
      creditoId: CREDITO_ID,
      status: "ATIVO",
      valorAprovado: 200000,
    },
    usuario: { nome: "Maria Souza", email: "maria@test.com" },
  },
};

function buildService(overrides: {
  etapa?: any;
  evidenciasCount?: number;
  updateManyCount?: number;
  queueAddError?: Error;
} = {}) {
  const etapa = overrides.etapa !== undefined ? overrides.etapa : baseEtapa;
  const evidenciasCount = overrides.evidenciasCount ?? 1;
  const updateManyCount = overrides.updateManyCount ?? 1;

  const prisma = {
    etapaObra: {
      findUnique: jest.fn().mockResolvedValue(etapa),
      updateMany: jest.fn().mockResolvedValue({ count: updateManyCount }),
    },
    evidenciaEtapa: {
      count: jest.fn().mockResolvedValue(evidenciasCount),
    },
    etapaAuditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
    liberacaoParcela: {
      create: jest.fn().mockResolvedValue({
        liberacaoId: LIBERACAO_ID,
        creditoId: CREDITO_ID,
        valor: 50000,
        status: "PENDENTE",
      }),
      update: jest.fn().mockResolvedValue({}),
    },
  } as any;

  const notificacoes = { criar: jest.fn().mockResolvedValue({}) } as any;
  const email = { etapaAprovadaEmail: jest.fn().mockResolvedValue({}) } as any;
  const pushNotificacoes = { enviarPush: jest.fn().mockResolvedValue({}) } as any;

  const liberacaoQueue = {
    add: overrides.queueAddError
      ? jest.fn().mockRejectedValue(overrides.queueAddError)
      : jest.fn().mockResolvedValue({ id: "job-001" }),
  } as any;

  const service = new VistoriaService(prisma, notificacoes, email, pushNotificacoes, liberacaoQueue);
  return { service, prisma, notificacoes, email, liberacaoQueue };
}

// ─── aprovar ─────────────────────────────────────────────────────────────────

describe("VistoriaService.aprovar — caminho feliz", () => {
  it("retorna { ok: true, status: 'CONCLUIDA' }", async () => {
    const { service } = buildService();
    const result = await service.aprovar(GESTOR_ID, ETAPA_ID);
    expect(result).toEqual({ ok: true, etapaId: ETAPA_ID, status: "CONCLUIDA" });
  });

  it("cria liberação com valor correto (25% de 200k = 50k)", async () => {
    const { service, prisma } = buildService();
    await service.aprovar(GESTOR_ID, ETAPA_ID);

    expect(prisma.liberacaoParcela.create).toHaveBeenCalledWith({
      data: { creditoId: CREDITO_ID, valor: 50000, status: "PENDENTE" },
    });
  });

  it("enfileira job com todos os campos", async () => {
    const { service, liberacaoQueue } = buildService();
    await service.aprovar(GESTOR_ID, ETAPA_ID);

    expect(liberacaoQueue.add).toHaveBeenCalledWith({
      creditoId: CREDITO_ID,
      etapaId: ETAPA_ID,
      liberacaoId: LIBERACAO_ID,
      valor: 50000,
    });
  });

  it("cria audit log APROVADA com gestorId e observações", async () => {
    const { service, prisma } = buildService();
    await service.aprovar(GESTOR_ID, ETAPA_ID, "Tudo conforme");

    expect(prisma.etapaAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        etapaId: ETAPA_ID,
        acaoTipo: "APROVADA",
        usuarioId: GESTOR_ID,
        observacoes: "Tudo conforme",
      }),
    });
  });

  it("notifica dono da obra com ETAPA_APROVADA", async () => {
    const { service, notificacoes } = buildService();
    await service.aprovar(GESTOR_ID, ETAPA_ID);

    expect(notificacoes.criar).toHaveBeenCalledWith(
      USUARIO_ID,
      "ETAPA_APROVADA",
      expect.stringContaining("Estrutura"),
      expect.any(String),
      expect.stringContaining(OBRA_ID)
    );
  });
});

describe("VistoriaService.aprovar — gates de validação", () => {
  it("lança NotFoundException se etapa não existe", async () => {
    const { service } = buildService({ etapa: null });
    await expect(service.aprovar(GESTOR_ID, ETAPA_ID)).rejects.toThrow(NotFoundException);
  });

  it("lança BadRequestException se não há evidência validada", async () => {
    const { service } = buildService({ evidenciasCount: 0 });
    await expect(service.aprovar(GESTOR_ID, ETAPA_ID)).rejects.toThrow(BadRequestException);
  });

  it("NÃO enfileira quando não há evidência validada", async () => {
    const { service, liberacaoQueue } = buildService({ evidenciasCount: 0 });
    await expect(service.aprovar(GESTOR_ID, ETAPA_ID)).rejects.toThrow();
    expect(liberacaoQueue.add).not.toHaveBeenCalled();
  });
});

describe("VistoriaService.aprovar — atomicidade", () => {
  it("lança BadRequestException se updateMany count=0 (dupla aprovação)", async () => {
    const { service } = buildService({ updateManyCount: 0 });
    await expect(service.aprovar(GESTOR_ID, ETAPA_ID)).rejects.toThrow(BadRequestException);
  });

  it("NÃO cria liberação se updateMany count=0", async () => {
    const { service, prisma } = buildService({ updateManyCount: 0 });
    await expect(service.aprovar(GESTOR_ID, ETAPA_ID)).rejects.toThrow();
    expect(prisma.liberacaoParcela.create).not.toHaveBeenCalled();
  });

  it("usa updateMany com guard AGUARDANDO_VISTORIA", async () => {
    const { service, prisma } = buildService();
    await service.aprovar(GESTOR_ID, ETAPA_ID);

    expect(prisma.etapaObra.updateMany).toHaveBeenCalledWith({
      where: { etapaId: ETAPA_ID, status: "AGUARDANDO_VISTORIA" },
      data: expect.objectContaining({ status: "CONCLUIDA" }),
    });
  });
});

describe("VistoriaService.aprovar — falha na fila (Bug 8)", () => {
  it("marca liberação como FALHA quando queue.add lança erro", async () => {
    const { service, prisma } = buildService({ queueAddError: new Error("Redis down") });

    await expect(service.aprovar(GESTOR_ID, ETAPA_ID)).rejects.toThrow("Redis down");

    expect(prisma.liberacaoParcela.update).toHaveBeenCalledWith({
      where: { liberacaoId: LIBERACAO_ID },
      data: { status: "FALHA", processadoEm: expect.any(Date) },
    });
  });

  it("relança o erro original após marcar FALHA", async () => {
    const { service } = buildService({ queueAddError: new Error("Redis timeout") });
    await expect(service.aprovar(GESTOR_ID, ETAPA_ID)).rejects.toThrow("Redis timeout");
  });

  it("NÃO dispara liberação quando crédito não está ATIVO", async () => {
    const etapaInativa = {
      ...baseEtapa,
      obra: { ...baseEtapa.obra, credito: { ...baseEtapa.obra.credito, status: "SUSPENSO" } },
    };
    const { service, liberacaoQueue, prisma } = buildService({ etapa: etapaInativa });
    await service.aprovar(GESTOR_ID, ETAPA_ID);

    expect(liberacaoQueue.add).not.toHaveBeenCalled();
    expect(prisma.liberacaoParcela.create).not.toHaveBeenCalled();
  });

  it("NÃO dispara liberação quando valorLiberacao = 0 (etapa sem percentual)", async () => {
    const etapaZero = { ...baseEtapa, percentualObra: 0 };
    const { service, liberacaoQueue, prisma } = buildService({ etapa: etapaZero });
    await service.aprovar(GESTOR_ID, ETAPA_ID);

    expect(liberacaoQueue.add).not.toHaveBeenCalled();
    expect(prisma.liberacaoParcela.create).not.toHaveBeenCalled();
  });

  it("NÃO dispara liberação quando obra não tem crédito", async () => {
    const etapaSemCredito = { ...baseEtapa, obra: { ...baseEtapa.obra, credito: null } };
    const { service, liberacaoQueue } = buildService({ etapa: etapaSemCredito });
    await service.aprovar(GESTOR_ID, ETAPA_ID);

    expect(liberacaoQueue.add).not.toHaveBeenCalled();
  });
});

// ─── rejeitar ─────────────────────────────────────────────────────────────────

describe("VistoriaService.rejeitar — caminho feliz", () => {
  it("retorna { ok: true, status: 'REPROVADA' }", async () => {
    const { service } = buildService();
    const result = await service.rejeitar(GESTOR_ID, ETAPA_ID, "Estrutura fora do projeto");
    expect(result).toEqual({ ok: true, etapaId: ETAPA_ID, status: "REPROVADA" });
  });

  it("usa updateMany com status in STATUSES_VISTORIAVEL", async () => {
    const { service, prisma } = buildService();
    await service.rejeitar(GESTOR_ID, ETAPA_ID, "motivo");

    expect(prisma.etapaObra.updateMany).toHaveBeenCalledWith({
      where: {
        etapaId: ETAPA_ID,
        status: { in: expect.arrayContaining(["PLANEJADA", "EM_EXECUCAO", "AGUARDANDO_VISTORIA"]) },
      },
      data: { status: "REPROVADA" },
    });
  });

  it("cria audit log REJEITADA com motivo", async () => {
    const { service, prisma } = buildService();
    await service.rejeitar(GESTOR_ID, ETAPA_ID, "Problema estrutural");

    expect(prisma.etapaAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        etapaId: ETAPA_ID,
        acaoTipo: "REJEITADA",
        usuarioId: GESTOR_ID,
        observacoes: "Problema estrutural",
      }),
    });
  });

  it("notifica dono com ETAPA_REPROVADA e inclui motivo", async () => {
    const { service, notificacoes } = buildService();
    await service.rejeitar(GESTOR_ID, ETAPA_ID, "Erro na fundação");

    expect(notificacoes.criar).toHaveBeenCalledWith(
      USUARIO_ID,
      "ETAPA_REPROVADA",
      expect.any(String),
      expect.stringContaining("Erro na fundação"),
      expect.any(String)
    );
  });

  it("NÃO cria liberação ao rejeitar", async () => {
    const { service, liberacaoQueue, prisma } = buildService();
    await service.rejeitar(GESTOR_ID, ETAPA_ID, "motivo");

    expect(liberacaoQueue.add).not.toHaveBeenCalled();
    expect(prisma.liberacaoParcela.create).not.toHaveBeenCalled();
  });
});

describe("VistoriaService.rejeitar — validações", () => {
  it("lança NotFoundException se etapa não existe", async () => {
    const { service } = buildService({ etapa: null });
    await expect(service.rejeitar(GESTOR_ID, ETAPA_ID, "motivo")).rejects.toThrow(NotFoundException);
  });

  it("lança BadRequestException se updateMany count=0 (etapa já concluída)", async () => {
    const { service } = buildService({ updateManyCount: 0 });
    await expect(service.rejeitar(GESTOR_ID, ETAPA_ID, "motivo")).rejects.toThrow(BadRequestException);
  });

  it("NÃO cria audit log se etapa não pode ser rejeitada (count=0)", async () => {
    const { service, prisma } = buildService({ updateManyCount: 0 });
    await expect(service.rejeitar(GESTOR_ID, ETAPA_ID, "motivo")).rejects.toThrow();
    expect(prisma.etapaAuditLog.create).not.toHaveBeenCalled();
  });
});
