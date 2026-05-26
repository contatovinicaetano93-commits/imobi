import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./audit.service";
import { UsuarioTipo, AcaoAudit } from "@prisma/client";

describe("Audit Service (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let auditService: AuditService;
  let gestorId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    auditService = moduleFixture.get<AuditService>(AuditService);
    await app.init();

    const gestor = await prisma.usuario.create({
      data: {
        nome: "Audit Test Gestor",
        cpf: `1112223334${Math.floor(Math.random() * 100)}`,
        email: `audit-test-${Date.now()}@example.com`,
        telefone: "11999999997",
        passwordHash: "$2b$10$test",
        tipo: UsuarioTipo.GESTOR_OBRA,
      },
    });
    gestorId = gestor.usuarioId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("AuditService.registrar", () => {
    it("should register an approval action", async () => {
      const entidadeId = "test-etapa-123";
      const dados = {
        etapaNome: "Fundação",
        obraId: "obra-123",
      };

      await auditService.registrar(gestorId, AcaoAudit.ETAPA_APROVADA, "ETAPA", entidadeId, dados);

      const logs = await prisma.auditLog.findMany({
        where: { gestorId, entidadeId },
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[logs.length - 1].acao).toBe(AcaoAudit.ETAPA_APROVADA);
      expect(logs[logs.length - 1].entidade).toBe("ETAPA");
    });

    it("should register a rejection action", async () => {
      const entidadeId = "test-kyc-123";
      const dados = {
        tipo: "RG",
        usuarioId: "user-123",
        motivo: "Documento ilegível",
      };

      await auditService.registrar(gestorId, AcaoAudit.KYC_REJEITADO, "KYC", entidadeId, dados);

      const logs = await prisma.auditLog.findMany({
        where: { gestorId, entidadeId },
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[logs.length - 1].acao).toBe(AcaoAudit.KYC_REJEITADO);
    });
  });

  describe("AuditService.listarPorGestor", () => {
    it("should list audit logs for a specific gestor", async () => {
      for (let i = 0; i < 3; i++) {
        await auditService.registrar(
          gestorId,
          AcaoAudit.ETAPA_APROVADA,
          "ETAPA",
          `etapa-${i}`,
          { etapaNome: `Etapa ${i}` }
        );
      }

      const logs = await auditService.listarPorGestor(gestorId, 10, 0);

      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.every((log) => log.gestorId === gestorId)).toBe(true);
    });

    it("should support pagination", async () => {
      const page1 = await auditService.listarPorGestor(gestorId, 2, 0);
      const page2 = await auditService.listarPorGestor(gestorId, 2, 2);

      expect(page1.length).toBeLessThanOrEqual(2);
      expect(page2.length).toBeLessThanOrEqual(2);
    });
  });

  describe("AuditService.listarPorEntidade", () => {
    it("should list audit logs for a specific entity", async () => {
      const entidadeId = "test-entity-xyz";

      for (let i = 0; i < 2; i++) {
        await auditService.registrar(
          gestorId,
          AcaoAudit.ETAPA_APROVADA,
          "ETAPA",
          entidadeId,
          { index: i }
        );
      }

      const logs = await auditService.listarPorEntidade("ETAPA", entidadeId);

      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs.every((log) => log.entidadeId === entidadeId)).toBe(true);
    });

    it("should return empty array for non-existent entity", async () => {
      const logs = await auditService.listarPorEntidade("ETAPA", "non-existent-id");
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBe(0);
    });
  });

  describe("Audit Trail Integrity", () => {
    it("should record all required audit fields", async () => {
      const entidadeId = "complete-audit-test";

      await auditService.registrar(gestorId, AcaoAudit.KYC_APROVADO, "KYC", entidadeId, {
        type: "document_approval",
      });

      const logs = await prisma.auditLog.findMany({
        where: { entidadeId },
        orderBy: { criadoEm: "desc" },
        take: 1,
      });

      const log = logs[0];
      expect(log.auditId).toBeDefined();
      expect(log.gestorId).toBe(gestorId);
      expect(log.acao).toBe(AcaoAudit.KYC_APROVADO);
      expect(log.entidade).toBe("KYC");
      expect(log.entidadeId).toBe(entidadeId);
      expect(log.criadoEm).toBeDefined();
    });
  });
});
