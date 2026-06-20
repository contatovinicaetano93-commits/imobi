import { ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { EtapasService } from "./etapas.service";

const mockPrisma = {
  obra: { findUnique: jest.fn() },
  etapaObra: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  evidenciaEtapa: { count: jest.fn() },
  etapaAuditLog: { create: jest.fn() },
  liberacaoParcela: { create: jest.fn() },
};

const mockNotificacoes = { criar: jest.fn().mockResolvedValue(undefined) };
const mockEmail = { etapaAprovada: jest.fn().mockResolvedValue(undefined) };
const mockPush = { enviarPush: jest.fn().mockResolvedValue(undefined) };
const mockQueue = { add: jest.fn().mockResolvedValue(undefined) };

const makeService = () =>
  new EtapasService(
    mockPrisma as any,
    mockNotificacoes as any,
    mockEmail as any,
    mockPush as any,
    mockQueue as any,
  );

const OBRA_OWNER = "user-owner";

const mockEtapaComObra = (creditoStatus?: string) => ({
  etapaId: "etapa-1",
  nome: "Fundação",
  percentualObra: 30,
  status: "AGUARDANDO_VISTORIA",
  obra: {
    obraId: "obra-1",
    nome: "Residência Silva",
    usuarioId: OBRA_OWNER,
    credito: creditoStatus
      ? { creditoId: "credito-1", valorAprovado: 100000, status: creditoStatus }
      : null,
    usuario: { nome: "João Silva", email: "joao@example.com" },
  },
});

describe("EtapasService – RBAC & ownership", () => {
  let service: EtapasService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = makeService();
  });

  // ─── listarPorObra ────────────────────────────────────────────────────────

  describe("listarPorObra", () => {
    const obraRecord = { usuarioId: OBRA_OWNER };

    beforeEach(() => {
      mockPrisma.obra.findUnique.mockResolvedValue(obraRecord);
      mockPrisma.etapaObra.findMany.mockResolvedValue([]);
    });

    it("throws NotFoundException when obra does not exist", async () => {
      mockPrisma.obra.findUnique.mockResolvedValue(null);
      await expect(
        service.listarPorObra("nonexistent", { id: OBRA_OWNER, tipo: "TOMADOR" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("allows the obra owner to list etapas", async () => {
      await expect(
        service.listarPorObra("obra-1", { id: OBRA_OWNER, tipo: "TOMADOR" }),
      ).resolves.toBeDefined();
    });

    it("throws ForbiddenException when a non-owner TOMADOR requests etapas", async () => {
      await expect(
        service.listarPorObra("obra-1", { id: "attacker-id", tipo: "TOMADOR" }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("allows ADMIN to list etapas of any obra", async () => {
      await expect(
        service.listarPorObra("obra-1", { id: "admin-id", tipo: "ADMIN" }),
      ).resolves.toBeDefined();
    });

    it("allows GESTOR to list etapas of any obra", async () => {
      await expect(
        service.listarPorObra("obra-1", { id: "gestor-id", tipo: "GESTOR" }),
      ).resolves.toBeDefined();
    });

    it("allows ENGENHEIRO to list etapas of any obra", async () => {
      await expect(
        service.listarPorObra("obra-1", { id: "eng-id", tipo: "ENGENHEIRO" }),
      ).resolves.toBeDefined();
    });
  });

  // ─── atualizarStatus ──────────────────────────────────────────────────────

  describe("atualizarStatus", () => {
    const etapaComObra = {
      etapaId: "etapa-1",
      obra: { obraId: "obra-1", usuarioId: OBRA_OWNER },
    };

    beforeEach(() => {
      mockPrisma.etapaObra.findUnique.mockResolvedValue(etapaComObra);
      mockPrisma.etapaObra.update.mockResolvedValue({ ...etapaComObra, status: "AGUARDANDO_VISTORIA" });
    });

    it("throws NotFoundException when etapa does not exist", async () => {
      mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
      await expect(
        service.atualizarStatus("nonexistent", "AGUARDANDO_VISTORIA", OBRA_OWNER, "TOMADOR"),
      ).rejects.toThrow(NotFoundException);
    });

    it("allows the obra owner to submit etapa for vistoria", async () => {
      await expect(
        service.atualizarStatus("etapa-1", "AGUARDANDO_VISTORIA", OBRA_OWNER, "TOMADOR"),
      ).resolves.toBeDefined();
    });

    it("throws ForbiddenException when TOMADOR tries to set status other than AGUARDANDO_VISTORIA", async () => {
      await expect(
        service.atualizarStatus("etapa-1", "CONCLUIDA", OBRA_OWNER, "TOMADOR"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws ForbiddenException when non-owner TOMADOR tries to update status", async () => {
      await expect(
        service.atualizarStatus("etapa-1", "AGUARDANDO_VISTORIA", "attacker-id", "TOMADOR"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("allows GESTOR to set any status regardless of ownership", async () => {
      await expect(
        service.atualizarStatus("etapa-1", "CONCLUIDA", "gestor-id", "GESTOR"),
      ).resolves.toBeDefined();
    });

    it("allows ADMIN to set any status", async () => {
      await expect(
        service.atualizarStatus("etapa-1", "REPROVADA", "admin-id", "ADMIN"),
      ).resolves.toBeDefined();
    });
  });

  // ─── aprovar ──────────────────────────────────────────────────────────────

  describe("aprovar", () => {
    beforeEach(() => {
      mockPrisma.etapaObra.findUnique.mockResolvedValue(mockEtapaComObra("ATIVO"));
      mockPrisma.evidenciaEtapa.count.mockResolvedValue(1);
      mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.etapaAuditLog.create.mockResolvedValue({});
      mockPrisma.liberacaoParcela.create.mockResolvedValue({ liberacaoId: "lib-1" });
    });

    it("throws NotFoundException when etapa does not exist", async () => {
      mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
      await expect(service.aprovar("gestor-id", "nonexistent")).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when etapa has no validated evidencias", async () => {
      mockPrisma.evidenciaEtapa.count.mockResolvedValue(0);
      await expect(service.aprovar("gestor-id", "etapa-1")).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when etapa is not in AGUARDANDO_VISTORIA status", async () => {
      mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.aprovar("gestor-id", "etapa-1")).rejects.toThrow(BadRequestException);
    });

    it("returns ok:true on successful approval", async () => {
      const result = await service.aprovar("gestor-id", "etapa-1", "Tudo certo");
      expect(result).toEqual({ ok: true, observacao: "Tudo certo" });
    });

    it("writes audit log entry on approval", async () => {
      await service.aprovar("gestor-id", "etapa-1");
      expect(mockPrisma.etapaAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ acaoTipo: "APROVADA", usuarioId: "gestor-id" }),
        }),
      );
    });

    it("enqueues parcel release when credito is ATIVO", async () => {
      await service.aprovar("gestor-id", "etapa-1");
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({ creditoId: "credito-1" }),
      );
    });

    it("does not enqueue parcel release when obra has no credito", async () => {
      mockPrisma.etapaObra.findUnique.mockResolvedValue(mockEtapaComObra());
      await service.aprovar("gestor-id", "etapa-1");
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("does not enqueue parcel release when credito is SUSPENSO", async () => {
      mockPrisma.etapaObra.findUnique.mockResolvedValue(mockEtapaComObra("SUSPENSO"));
      await service.aprovar("gestor-id", "etapa-1");
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("notifies the obra owner on approval", async () => {
      await service.aprovar("gestor-id", "etapa-1");
      expect(mockNotificacoes.criar).toHaveBeenCalledWith(
        OBRA_OWNER,
        "ETAPA_APROVADA",
        expect.any(String),
        expect.any(String),
        expect.any(String),
      );
    });
  });

  // ─── rejeitar ─────────────────────────────────────────────────────────────

  describe("rejeitar", () => {
    beforeEach(() => {
      mockPrisma.etapaObra.findUnique.mockResolvedValue(mockEtapaComObra());
      mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.etapaAuditLog.create.mockResolvedValue({});
    });

    it("throws NotFoundException when etapa does not exist", async () => {
      mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
      await expect(service.rejeitar("gestor-id", "nonexistent", "Foto ilegível")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws BadRequestException when etapa is not in AGUARDANDO_VISTORIA status", async () => {
      mockPrisma.etapaObra.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.rejeitar("gestor-id", "etapa-1", "motivo")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("returns ok:true with motivo on successful rejection", async () => {
      const result = await service.rejeitar("gestor-id", "etapa-1", "Foto ilegível");
      expect(result).toEqual({ ok: true, motivo: "Foto ilegível" });
    });

    it("writes audit log with REJEITADA and motivo", async () => {
      await service.rejeitar("gestor-id", "etapa-1", "Foto ilegível");
      expect(mockPrisma.etapaAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            acaoTipo: "REJEITADA",
            usuarioId: "gestor-id",
            observacoes: "Foto ilegível",
          }),
        }),
      );
    });

    it("notifies the obra owner with ETAPA_REPROVADA and motivo", async () => {
      await service.rejeitar("gestor-id", "etapa-1", "Foto ilegível");
      expect(mockNotificacoes.criar).toHaveBeenCalledWith(
        OBRA_OWNER,
        "ETAPA_REPROVADA",
        expect.any(String),
        expect.stringContaining("Foto ilegível"),
        expect.any(String),
      );
    });
  });
});
