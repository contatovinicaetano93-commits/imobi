import { BadRequestException, NotFoundException } from "@nestjs/common";
import { VistoriaService } from "./vistoria.service";

const gestorId = "gestor-1";
const etapaId = "etapa-1";
const obraId = "obra-1";

const mockEtapa = (status: string) => ({
  etapaId,
  nome: "Fundação",
  percentualObra: 10,
  status,
  obra: {
    obraId,
    nome: "Obra Teste",
    usuarioId: "usuario-1",
    credito: null,
    usuario: { nome: "João", email: "joao@test.com" },
  },
});

const mockPrisma = {
  etapaObra: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
  etapaAuditLog: { create: jest.fn() },
  liberacaoParcela: { create: jest.fn() },
};

const mockNotificacoes = { criar: jest.fn().mockResolvedValue(undefined) };
const mockEmail = { etapaAprovada: jest.fn().mockResolvedValue(undefined) };
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

describe("VistoriaService – aprovar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.etapaAuditLog.create.mockResolvedValue({});
    mockNotificacoes.criar.mockResolvedValue(undefined);
    mockPush.enviarPush.mockResolvedValue(undefined);
  });

  it("throws NotFoundException when etapa does not exist", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
    await expect(makeService().aprovar(gestorId, etapaId)).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException when etapa is already CONCLUIDA", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(mockEtapa("CONCLUIDA"));
    mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 0 });
    await expect(makeService().aprovar(gestorId, etapaId)).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException when etapa is REPROVADA", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(mockEtapa("REPROVADA"));
    mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 0 });
    await expect(makeService().aprovar(gestorId, etapaId)).rejects.toThrow(BadRequestException);
  });

  it("returns ok:true and status CONCLUIDA on success", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(mockEtapa("AGUARDANDO_VISTORIA"));
    mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 1 });

    const result = await makeService().aprovar(gestorId, etapaId, "Aprovado sem ressalvas");
    expect(result).toEqual({ ok: true, etapaId, status: "CONCLUIDA" });
  });

  it("writes audit log with gestorId on success", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(mockEtapa("EM_EXECUCAO"));
    mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 1 });

    await makeService().aprovar(gestorId, etapaId);

    expect(mockPrisma.etapaAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ etapaId, acaoTipo: "APROVADA", usuarioId: gestorId }),
      })
    );
  });

  it("does not enqueue liberacao when obra has no credito", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(mockEtapa("PLANEJADA"));
    mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 1 });

    await makeService().aprovar(gestorId, etapaId);

    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  it("enqueues liberacao when obra has active credito", async () => {
    const etapaComCredito = {
      ...mockEtapa("AGUARDANDO_VISTORIA"),
      obra: {
        ...mockEtapa("AGUARDANDO_VISTORIA").obra,
        credito: { creditoId: "cred-1", valorAprovado: 100000, status: "ATIVO" },
      },
    };
    mockPrisma.etapaObra.findUnique.mockResolvedValue(etapaComCredito);
    mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.liberacaoParcela.create.mockResolvedValue({ liberacaoId: "lib-1" });

    await makeService().aprovar(gestorId, etapaId);

    expect(mockPrisma.liberacaoParcela.create).toHaveBeenCalled();
    expect(mockQueue.add).toHaveBeenCalled();
  });
});

describe("VistoriaService – rejeitar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.etapaAuditLog.create.mockResolvedValue({});
    mockNotificacoes.criar.mockResolvedValue(undefined);
  });

  it("throws NotFoundException when etapa does not exist", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
    await expect(makeService().rejeitar(gestorId, etapaId, "Pendências construtivas")).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException when etapa is already CONCLUIDA", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(mockEtapa("CONCLUIDA"));
    mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 0 });
    await expect(makeService().rejeitar(gestorId, etapaId, "Erro")).rejects.toThrow(BadRequestException);
  });

  it("returns ok:true and status REPROVADA on success", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(mockEtapa("AGUARDANDO_VISTORIA"));
    mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 1 });

    const result = await makeService().rejeitar(gestorId, etapaId, "Estrutura incorreta");
    expect(result).toEqual({ ok: true, etapaId, status: "REPROVADA" });
  });

  it("writes audit log with motivo on success", async () => {
    const motivo = "Alvenaria fora do padrão";
    mockPrisma.etapaObra.findUnique.mockResolvedValue(mockEtapa("EM_EXECUCAO"));
    mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 1 });

    await makeService().rejeitar(gestorId, etapaId, motivo);

    expect(mockPrisma.etapaAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ acaoTipo: "REJEITADA", usuarioId: gestorId, observacoes: motivo }),
      })
    );
  });
});
