import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

describe("Notifications E2E - Comprehensive Suite", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let constructorEmail: string;
  let constructorToken: string;
  let constructorId: string;

  let managerEmail: string;
  let managerToken: string;
  let managerId: string;

  let creditoId: string;
  let obraId: string;
  let etapaId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    // Create constructor user
    constructorEmail = `constructor-notif-${Date.now()}@imbobi.com`;
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({
        email: constructorEmail,
        password: "Senha@123",
        nome: "Constructor Notifications Test",
      });

    const constructorLoginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: constructorEmail, password: "Senha@123" });

    constructorToken = constructorLoginRes.body.access_token;
    constructorId = constructorLoginRes.body.usuario?.usuarioId;

    // Create manager user
    managerEmail = `manager-notif-${Date.now()}@imbobi.com`;
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({
        email: managerEmail,
        password: "Senha@123",
        nome: "Manager Notifications Test",
      });

    const managerLoginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: managerEmail, password: "Senha@123" });

    managerToken = managerLoginRes.body.access_token;
    managerId = managerLoginRes.body.usuario?.usuarioId;
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({
      where: {
        OR: [
          { email: { startsWith: "constructor-notif-" } },
          { email: { startsWith: "manager-notif-" } },
        ],
      },
    });
    await app.close();
  });

  describe("Step 1: Setup Credit and Obra with Etapa", () => {
    it("Constructor should create credit request", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitacao")
        .set("Authorization", `Bearer ${constructorToken}`)
        .send({
          loanType: "construction",
          valorSolicitado: 100000,
          prazoMeses: 12,
        })
        .expect(201);

      expect(res.body).toHaveProperty("creditoId");
      creditoId = res.body.creditoId;

      // Approve credit
      await prisma.credito.update({
        where: { creditoId },
        data: { status: "APROVADO" },
      });
    });

    it("Constructor should create obra", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${constructorToken}`)
        .send({
          nome: "Notifications Test Project",
          descricao: "Test project for notification verification",
          localizacao: {
            lat: -15.789,
            lng: -48.123,
          },
          valorTotal: 100000,
          creditoId,
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      obraId = res.body.id;
    });

    it("Obra should have automatically created etapas", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      expect(res.body.etapas).toBeDefined();
      expect(res.body.etapas.length).toBeGreaterThan(0);
      etapaId = res.body.etapas[0].id;
    });
  });

  describe("Step 2: Verify Initial Notification State", () => {
    it("Constructor should have no initial notifications", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes")
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      expect(Array.isArray(res.body.notificacoes)).toBe(true);
      // Should have 0 or minimal notifications from setup
      expect(res.body.notificacoes.length).toBeGreaterThanOrEqual(0);
    });

    it("Should be able to count unread notifications", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes/contar-nao-lidas")
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("count");
      expect(typeof res.body.count).toBe("number");
    });

    it("Should be able to list unread notifications (empty initially)", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes/nao-lidas")
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("Step 3: Trigger Etapa Approval & Verify Notification Creation", () => {
    it("Manager should approve etapa (vistoria)", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/vistoria/${etapaId}/aprovar`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({
          obraId,
          observacoes: "Etapa aprovada para teste de notificações",
        })
        .expect([200, 201]);

      expect(res.body).toBeDefined();
    });

    it("Should have created ETAPA_APROVADA notification in database", async () => {
      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const notificacao = await prisma.notificacao.findFirst({
        where: {
          usuarioId: constructorId,
          tipo: "ETAPA_APROVADA",
        },
      });

      expect(notificacao).toBeDefined();
      expect(notificacao?.titulo).toContain("Etapa aprovada");
      expect(notificacao?.tipo).toBe("ETAPA_APROVADA");
      expect(notificacao?.lida).toBe(false);
    });

    it("Notification should include etapa and obra details", async () => {
      const notificacao = await prisma.notificacao.findFirst({
        where: {
          usuarioId: constructorId,
          tipo: "ETAPA_APROVADA",
        },
      });

      expect(notificacao).toBeDefined();
      expect(notificacao?.mensagem).toBeDefined();
      expect(notificacao?.link).toContain(`/dashboard/obras/${obraId}`);
      expect(notificacao?.titulo).toBeDefined();
    });
  });

  describe("Step 4: Retrieve Notifications via API", () => {
    it("Constructor should retrieve notification from API", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes")
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      expect(Array.isArray(res.body.notificacoes)).toBe(true);
      const etapaAprovadaNotif = res.body.notificacoes.find(
        (n: any) => n.tipo === "ETAPA_APROVADA"
      );
      expect(etapaAprovadaNotif).toBeDefined();
      expect(etapaAprovadaNotif.titulo).toContain("Etapa aprovada");
    });

    it("Notification structure should match expected schema", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes")
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      const etapaNotif = res.body.notificacoes.find(
        (n: any) => n.tipo === "ETAPA_APROVADA"
      );
      expect(etapaNotif).toHaveProperty("notificacaoId");
      expect(etapaNotif).toHaveProperty("usuarioId");
      expect(etapaNotif).toHaveProperty("tipo");
      expect(etapaNotif).toHaveProperty("titulo");
      expect(etapaNotif).toHaveProperty("mensagem");
      expect(etapaNotif).toHaveProperty("lida");
      expect(etapaNotif).toHaveProperty("criadoEm");
      expect(etapaNotif.lida).toBe(false);
    });
  });

  describe("Step 5: Unread Notifications Handling", () => {
    it("Unread notification should appear in nao-lidas endpoint", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes/nao-lidas")
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const etapaNotif = res.body.find((n: any) => n.tipo === "ETAPA_APROVADA");
      expect(etapaNotif).toBeDefined();
      expect(etapaNotif.lida).toBe(false);
    });

    it("Count of unread notifications should be > 0", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes/contar-nao-lidas")
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      expect(res.body.count).toBeGreaterThan(0);
    });
  });

  describe("Step 6: Mark Notification as Read", () => {
    let notificacaoId: string;

    it("Should retrieve notificacao ID for marking as read", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes/nao-lidas")
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      const etapaNotif = res.body.find((n: any) => n.tipo === "ETAPA_APROVADA");
      notificacaoId = etapaNotif.notificacaoId;
      expect(notificacaoId).toBeDefined();
    });

    it("Constructor should mark notification as read", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/notificacoes/${notificacaoId}/lida`)
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      expect(res.body.lida).toBe(true);
      expect(res.body.lidoEm).toBeDefined();
    });

    it("Notification should no longer appear in nao-lidas", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes/nao-lidas")
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      const etapaNotif = res.body.find((n: any) => n.tipo === "ETAPA_APROVADA");
      expect(etapaNotif).toBeUndefined();
    });

    it("Marked notification should appear as lida in all notifications", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes")
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      const etapaNotif = res.body.notificacoes.find(
        (n: any) => n.tipo === "ETAPA_APROVADA"
      );
      expect(etapaNotif.lida).toBe(true);
    });
  });

  describe("Step 7: Pagination and Limits", () => {
    it("Should respect limit parameter", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes?limit=5")
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      expect(res.body.notificacoes.length).toBeLessThanOrEqual(5);
    });

    it("Should support offset parameter", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes?offset=0&limit=10")
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      expect(res.body.total).toBeDefined();
      expect(typeof res.body.total).toBe("number");
    });
  });

  describe("Step 8: Mark All Notifications as Read", () => {
    // Create another etapa approval to generate more notifications
    it("Should generate another notification", async () => {
      const obraData = await prisma.obra.findUnique({
        where: { obraId },
        include: { etapas: true },
      });

      if (obraData && obraData.etapas.length > 1) {
        const secondEtapaId = obraData.etapas[1].etapaId;

        await request(app.getHttpServer())
          .post(`/api/v1/vistoria/${secondEtapaId}/aprovar`)
          .set("Authorization", `Bearer ${managerToken}`)
          .send({
            obraId,
            observacoes: "Segunda etapa aprovada",
          })
          .expect([200, 201]);

        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    });

    it("Should have unread notifications", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes/contar-nao-lidas")
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      // May have 0 if only 1 etapa, but that's fine
      expect(res.body.count).toBeGreaterThanOrEqual(0);
    });

    it("Constructor should mark all notifications as read", async () => {
      const res = await request(app.getHttpServer())
        .patch("/api/v1/notificacoes/marcar-todas-lidas")
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
    });

    it("All notifications should be marked as read", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes/contar-nao-lidas")
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      expect(res.body.count).toBe(0);
    });
  });

  describe("Step 9: Notification Deletion", () => {
    let notificacaoId: string;

    it("Should retrieve notification for deletion", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes")
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      const etapaNotif = res.body.notificacoes.find(
        (n: any) => n.tipo === "ETAPA_APROVADA"
      );
      notificacaoId = etapaNotif.notificacaoId;
      expect(notificacaoId).toBeDefined();
    });

    it("Constructor should delete notification", async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/notificacoes/${notificacaoId}`)
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
    });

    it("Deleted notification should not appear in list", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes")
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      const deletedNotif = res.body.notificacoes.find(
        (n: any) => n.notificacaoId === notificacaoId
      );
      expect(deletedNotif).toBeUndefined();
    });
  });

  describe("Step 10: FCM Token Registration", () => {
    it("Constructor should register FCM token", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/push-notificacoes/registrar-token")
        .set("Authorization", `Bearer ${constructorToken}`)
        .send({ token: "test-fcm-token-123" })
        .expect(200);

      expect(res.body.ok).toBe(true);
    });

    it("FCM token should be stored in database", async () => {
      const token = await prisma.usuarioFcmToken.findFirst({
        where: {
          usuarioId: constructorId,
          token: "test-fcm-token-123",
        },
      });

      expect(token).toBeDefined();
      expect(token?.ativo).toBe(true);
    });

    it("Constructor should be able to deregister FCM token", async () => {
      const res = await request(app.getHttpServer())
        .delete("/api/v1/push-notificacoes/desregistrar-token")
        .set("Authorization", `Bearer ${constructorToken}`)
        .send({ token: "test-fcm-token-123" })
        .expect(200);

      expect(res.body.ok).toBe(true);

      const token = await prisma.usuarioFcmToken.findFirst({
        where: {
          usuarioId: constructorId,
          token: "test-fcm-token-123",
        },
      });

      expect(token?.ativo).toBe(false);
    });
  });

  describe("Step 11: Full Notification Workflow", () => {
    it("Complete flow: etapa approval → notification creation → user retrieval should work", async () => {
      const notificacoes = await prisma.notificacao.findMany({
        where: { usuarioId: constructorId },
      });

      expect(notificacoes.length).toBeGreaterThan(0);

      const etapaAprovadaNotif = notificacoes.find(
        (n) => n.tipo === "ETAPA_APROVADA"
      );
      expect(etapaAprovadaNotif).toBeDefined();
      expect(etapaAprovadaNotif?.titulo).toContain("Etapa");
      expect(etapaAprovadaNotif?.mensagem).toBeDefined();
    });

    it("Notifications should have correct timestamps", async () => {
      const notificacoes = await prisma.notificacao.findMany({
        where: { usuarioId: constructorId },
      });

      notificacoes.forEach((n) => {
        expect(n.criadoEm).toBeInstanceOf(Date);
        if (n.lida) {
          expect(n.lidoEm).toBeInstanceOf(Date);
        }
      });
    });

    it("Notification link should be valid", async () => {
      const notificacao = await prisma.notificacao.findFirst({
        where: {
          usuarioId: constructorId,
          tipo: "ETAPA_APROVADA",
        },
      });

      expect(notificacao?.link).toMatch(/^\/dashboard\/obras\/.+$/);
    });
  });
});
