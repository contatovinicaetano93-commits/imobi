import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { EtapasService } from "./etapas.service";

const GESTOR_ID = "gestor-uuid-001";
const ETAPA_ID = "etapa-uuid-001";
const OBRA_ID = "obra-uuid-001";
const CREDITO_ID = "credito-uuid-001";
const LIBERACAO_ID = "liberacao-uuid-001";
const USUARIO_ID = "usuario-uuid-001";

const baseEtapa = {
  etapaId: ETAPA_ID,
  nome: "Fundação",
  status: "AGUARDANDO_VISTORIA",
  percentualObra: 30,
  obra: {
    obraId: OBRA_ID,
    nome: "Obra Teste",
    usuarioId: USUARIO_ID,
    credito: {
      creditoId: CREDITO_ID,
      status: "ATIVO",
      valorAprovado: 100000,
    },
    usuario: { nome: "João Silva", email: "joao@test.com" },
  },
};

function buildService(overrides: {
  etapa?: any;
  evidenciasCount?: number;
  updateManyCount?: number;
  liberacaoCreate?: any;
  queueAddError?: Error;
} = {}) {
  const etapa = overrides.etapa !== undefined ? overrides.etapa : baseEtapa;
  const evidenciasCount = overrides.evidenciasCount ?? 1;
  const updateManyCount = overrides.updateManyCount ?? 1;

  const prisma = {
    etapaObra: {
      findUnique: jest.fn().mockResolvedValue(etapa),
      updateMany: jest.fn().mockResolvedValue({ count: updateManyCount }),
      update: jest.fn().mockResolvedValue(etapa),
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
        valor: 30000,
        status: "PENDENTE",
      }),
      update: jest.fn().mockResolvedValue({}),
    },
  } as any;

  const notificacoes = {
    criar: jest.fn().mockResolvedValue({}),
  } as any;

  const email = {
    etapaAprovadaEmail: jest.fn().mockResolvedValue({}),
  } as any;

  const pushNotificacoes = {
    enviarPush: jest.fn().mockResolvedValue({}),
  } as any;

  const liberacaoQueue = {
    add: overrides.queueAddError
      ? jest.fn().mockRejectedValue(overrides.queueAddError)
      : jest.fn().mockResolvedValue({ id: "job-001" }),
  } as any;

  const service = new EtapasService(prisma, notificacoes, email, pushNotificacoes, liberacaoQueue);
  return { service, prisma, notificacoes, email, pushNotificacoes, liberacaoQueue };
}

// ─── aprovar ────────────────────────────────────────────────────────────────

describe("EtapasService.aprovar — caminho feliz", () => {
  it("retorna ok:true quando aprovação é bem-sucedida", async () => {
    const { service } = buildService();
    const result = await service.aprovar(GESTOR_ID, ETAPA_ID);
    expect(result.ok).toBe(true);
  });

  it("cria registro de liberação com valor correto (30% de 100k = 30k)", async () => {
    const { service, prisma } = buildService();
    await service.aprovar(GESTOR_ID, ETAPA_ID);

    expect(prisma.liberacaoParcela.create).toHaveBeenCalledWith({
      data: {
        creditoId: CREDITO_ID,
        valor: 30000,
        status: "PENDENTE",
      },
    });
  });

  it("enfileira job com todos os campos necessários", async () => {
    const { service, liberacaoQueue } = buildService();
    await service.aprovar(GESTOR_ID, ETAPA_ID);

    expect(liberacaoQueue.add).toHaveBeenCalledWith({
      creditoId: CREDITO_ID,
      etapaId: ETAPA_ID,
      liberacaoId: LIBERACAO_ID,
      valor: 30000,
    });
  });

  it("cria audit log com APROVADA e gestorId", async () => {
    const { service, prisma } = buildService();
    await service.aprovar(GESTOR_ID, ETAPA_ID, "Aprovado na vistoria");

    expect(prisma.etapaAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        etapaId: ETAPA_ID,
        acaoTipo: "APROVADA",
        usuarioId: GESTOR_ID,
        observacoes: "Aprovado na vistoria",
      }),
    });
  });

  it("notifica o dono da obra", async () => {
    const { service, notificacoes } = buildService();
    await service.aprovar(GESTOR_ID, ETAPA_ID);

    expect(notificacoes.criar).toHaveBeenCalledWith(
      USUARIO_ID,
      "ETAPA_APROVADA",
      expect.stringContaining("Fundação"),
      expect.any(String),
      expect.stringContaining(OBRA_ID)
    );
  });
});

describe("EtapasService.aprovar — gates de validação", () => {
  it("lança NotFoundException se etapa não existe", async () => {
    const { service } = buildService({ etapa: null });
    await expect(service.aprovar(GESTOR_ID, ETAPA_ID)).rejects.toThrow(NotFoundException);
  });

  it("lança BadRequestException se não há evidência validada", async () => {
    const { service } = buildService({ evidenciasCount: 0 });
    await expect(service.aprovar(GESTOR_ID, ETAPA_ID)).rejects.toThrow(BadRequestException);
  });

  it("NÃO enfileira job quando não há evidência validada", async () => {
    const { service, liberacaoQueue } = buildService({ evidenciasCount: 0 });
    await expect(service.aprovar(GESTOR_ID, ETAPA_ID)).rejects.toThrow();
    expect(liberacaoQueue.add).not.toHaveBeenCalled();
  });
});

describe("EtapasService.aprovar — atomicidade (Bug 5)", () => {
  it("lança BadRequestException se updateMany retornou count=0 (dupla aprovação)", async () => {
    const { service } = buildService({ updateManyCount: 0 });
    await expect(service.aprovar(GESTOR_ID, ETAPA_ID)).rejects.toThrow(BadRequestException);
  });

  it("NÃO cria liberação se updateMany count=0", async () => {
    const { service, prisma } = buildService({ updateManyCount: 0 });
    await expect(service.aprovar(GESTOR_ID, ETAPA_ID)).rejects.toThrow();
    expect(prisma.liberacaoParcela.create).not.toHaveBeenCalled();
  });

  it("usa updateMany com guard de status AGUARDANDO_VISTORIA", async () => {
    const { service, prisma } = buildService();
    await service.aprovar(GESTOR_ID, ETAPA_ID);

    expect(prisma.etapaObra.updateMany).toHaveBeenCalledWith({
      where: { etapaId: ETAPA_ID, status: "AGUARDANDO_VISTORIA" },
      data: expect.objectContaining({ status: "CONCLUIDA" }),
    });
  });
});

describe("EtapasService.aprovar — falha na fila (Bug 5)", () => {
  it("marca liberação como FALHA quando queue.add lança erro", async () => {
    const queueError = new Error("Redis connection lost");
    const { service, prisma } = buildService({ queueAddError: queueError });

    await expect(service.aprovar(GESTOR_ID, ETAPA_ID)).rejects.toThrow("Redis connection lost");

    expect(prisma.liberacaoParcela.update).toHaveBeenCalledWith({
      where: { liberacaoId: LIBERACAO_ID },
      data: { status: "FALHA", processadoEm: expect.any(Date) },
    });
  });

  it("relança o erro original após marcar FALHA", async () => {
    const queueError = new Error("Redis unavailable");
    const { service } = buildService({ queueAddError: queueError });

    await expect(service.aprovar(GESTOR_ID, ETAPA_ID)).rejects.toThrow("Redis unavailable");
  });

  it("NÃO dispara liberação quando crédito não está ATIVO", async () => {
    const etapaComCreditoInativo = {
      ...baseEtapa,
      obra: {
        ...baseEtapa.obra,
        credito: { ...baseEtapa.obra.credito, status: "INADIMPLENTE" },
      },
    };
    const { service, liberacaoQueue, prisma } = buildService({ etapa: etapaComCreditoInativo });
    await service.aprovar(GESTOR_ID, ETAPA_ID);

    expect(liberacaoQueue.add).not.toHaveBeenCalled();
    expect(prisma.liberacaoParcela.create).not.toHaveBeenCalled();
  });

  it("NÃO dispara liberação quando obra não tem crédito associado", async () => {
    const etapaSemCredito = {
      ...baseEtapa,
      obra: { ...baseEtapa.obra, credito: null },
    };
    const { service, liberacaoQueue } = buildService({ etapa: etapaSemCredito });
    await service.aprovar(GESTOR_ID, ETAPA_ID);

    expect(liberacaoQueue.add).not.toHaveBeenCalled();
  });
});

// ─── rejeitar ────────────────────────────────────────────────────────────────

describe("EtapasService.rejeitar — caminho feliz", () => {
  it("retorna ok:true e o motivo", async () => {
    const { service } = buildService();
    const result = await service.rejeitar(GESTOR_ID, ETAPA_ID, "Fotos insuficientes");
    expect(result.ok).toBe(true);
    expect(result.motivo).toBe("Fotos insuficientes");
  });

  it("usa updateMany com guard AGUARDANDO_VISTORIA → REPROVADA", async () => {
    const { service, prisma } = buildService();
    await service.rejeitar(GESTOR_ID, ETAPA_ID, "Motivo qualquer");

    expect(prisma.etapaObra.updateMany).toHaveBeenCalledWith({
      where: { etapaId: ETAPA_ID, status: "AGUARDANDO_VISTORIA" },
      data: { status: "REPROVADA" },
    });
  });

  it("cria audit log com REJEITADA e gestorId", async () => {
    const { service, prisma } = buildService();
    await service.rejeitar(GESTOR_ID, ETAPA_ID, "Erro na estrutura");

    expect(prisma.etapaAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        etapaId: ETAPA_ID,
        acaoTipo: "REJEITADA",
        usuarioId: GESTOR_ID,
        observacoes: "Erro na estrutura",
      }),
    });
  });

  it("notifica o dono da obra com ETAPA_REPROVADA", async () => {
    const { service, notificacoes } = buildService();
    await service.rejeitar(GESTOR_ID, ETAPA_ID, "Problema estrutural");

    expect(notificacoes.criar).toHaveBeenCalledWith(
      USUARIO_ID,
      "ETAPA_REPROVADA",
      expect.any(String),
      expect.stringContaining("Problema estrutural"),
      expect.any(String)
    );
  });
});

describe("EtapasService.rejeitar — validações", () => {
  it("lança NotFoundException se etapa não existe", async () => {
    const { service } = buildService({ etapa: null });
    await expect(service.rejeitar(GESTOR_ID, ETAPA_ID, "motivo")).rejects.toThrow(NotFoundException);
  });

  it("lança BadRequestException se etapa não está AGUARDANDO_VISTORIA (dupla rejeição)", async () => {
    const { service } = buildService({ updateManyCount: 0 });
    await expect(service.rejeitar(GESTOR_ID, ETAPA_ID, "motivo")).rejects.toThrow(BadRequestException);
  });

  it("NÃO cria liberação ao rejeitar", async () => {
    const { service, liberacaoQueue } = buildService();
    await service.rejeitar(GESTOR_ID, ETAPA_ID, "motivo");
    expect(liberacaoQueue.add).not.toHaveBeenCalled();
  });
});

// ─── listarPorObra — IDOR guard (Bug: missing ownership check) ───────────────

function buildServiceWithObra(obraOwner: string | null) {
  const prisma = {
    etapaObra: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    obra: {
      findUnique: jest.fn().mockResolvedValue(
        obraOwner !== null ? { usuarioId: obraOwner } : null
      ),
    },
  } as any;

  const service = new EtapasService(
    prisma,
    { criar: jest.fn() } as any,
    { etapaAprovadaEmail: jest.fn() } as any,
    { enviarPush: jest.fn() } as any,
    { add: jest.fn() } as any
  );
  return { service, prisma };
}

describe("EtapasService.listarPorObra — IDOR guard", () => {
  it("retorna etapas quando o usuário é o dono da obra", async () => {
    const { service } = buildServiceWithObra(USUARIO_ID);
    await expect(service.listarPorObra(OBRA_ID, USUARIO_ID, false)).resolves.toEqual([]);
  });

  it("lança ForbiddenException quando o usuário não é dono da obra", async () => {
    const { service } = buildServiceWithObra("outro-usuario-uuid");
    await expect(service.listarPorObra(OBRA_ID, USUARIO_ID, false)).rejects.toThrow(ForbiddenException);
  });

  it("lança NotFoundException quando a obra não existe (não-manager)", async () => {
    const { service } = buildServiceWithObra(null);
    await expect(service.listarPorObra(OBRA_ID, USUARIO_ID, false)).rejects.toThrow(NotFoundException);
  });

  it("NÃO verifica dono quando isManager=true (ADMIN/GESTOR bypass)", async () => {
    const { service, prisma } = buildServiceWithObra("qualquer-dono");
    await service.listarPorObra(OBRA_ID, GESTOR_ID, true);
    expect(prisma.obra.findUnique).not.toHaveBeenCalled();
    expect(prisma.etapaObra.findMany).toHaveBeenCalled();
  });
});

// ─── atualizarStatus — state machine guard (Bug: bare update, no transition guard) ──

function buildServiceForStatus(updateManyCount = 1) {
  const prisma = {
    etapaObra: {
      updateMany: jest.fn().mockResolvedValue({ count: updateManyCount }),
    },
  } as any;

  const service = new EtapasService(
    prisma,
    { criar: jest.fn() } as any,
    { etapaAprovadaEmail: jest.fn() } as any,
    { enviarPush: jest.fn() } as any,
    { add: jest.fn() } as any
  );
  return { service, prisma };
}

describe("EtapasService.atualizarStatus — state machine guard", () => {
  it("permite PLANEJADA → EM_EXECUCAO usando updateMany com allowedFrom", async () => {
    const { service, prisma } = buildServiceForStatus(1);
    await service.atualizarStatus(ETAPA_ID, "EM_EXECUCAO");
    expect(prisma.etapaObra.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ etapaId: ETAPA_ID }),
      })
    );
  });

  it("lança BadRequestException quando transição não é permitida (count=0)", async () => {
    const { service } = buildServiceForStatus(0);
    await expect(service.atualizarStatus(ETAPA_ID, "CONCLUIDA")).rejects.toThrow(BadRequestException);
  });

  it("lança BadRequestException para status de destino inválido", async () => {
    const { service } = buildServiceForStatus(1);
    await expect(service.atualizarStatus(ETAPA_ID, "INVALIDO")).rejects.toThrow(BadRequestException);
  });

  it("PLANEJADA reset: usa notIn CONCLUIDA em vez de lista positiva", async () => {
    const { service, prisma } = buildServiceForStatus(1);
    await service.atualizarStatus(ETAPA_ID, "PLANEJADA");
    expect(prisma.etapaObra.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { notIn: ["CONCLUIDA"] } }),
      })
    );
  });

  it("PLANEJADA reset: lança BadRequestException se etapa já está CONCLUIDA (count=0)", async () => {
    const { service } = buildServiceForStatus(0);
    await expect(service.atualizarStatus(ETAPA_ID, "PLANEJADA")).rejects.toThrow(BadRequestException);
  });
});
