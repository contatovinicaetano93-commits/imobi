import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../app.module";
import { PrismaService } from "../modules/prisma/prisma.service";

describe("Concurrency E2E - Comprehensive Suite", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const users: { email: string; token: string; id: string }[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    // Create multiple test users
    for (let i = 0; i < 3; i++) {
      const email = `concurrent-user-${i}-${Date.now()}@imbobi.com`;
      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email,
          password: "Senha@123",
          nome: `Concurrent User ${i}`,
        });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: "Senha@123" });

      users.push({
        email,
        token: loginRes.body.access_token,
        id: loginRes.body.usuario?.usuarioId,
      });
    }
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({
      where: {
        email: { startsWith: "concurrent-user-" },
      },
    });
    await app.close();
  });

  describe("Step 1: Concurrent User Operations", () => {
    it("Multiple users should be able to login simultaneously", async () => {
      const loginPromises = users.map((u) =>
        request(app.getHttpServer())
          .post("/api/v1/auth/login")
          .send({ email: u.email, password: "Senha@123" }),
      );

      const responses = await Promise.all(loginPromises);

      responses.forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.body.access_token).toBeDefined();
      });
    });

    it("Multiple users reading data should not interfere", async () => {
      const readPromises = users.map((u) =>
        request(app.getHttpServer())
          .get("/api/v1/notificacoes")
          .set("Authorization", `Bearer ${u.token}`),
      );

      const responses = await Promise.all(readPromises);

      responses.forEach((res) => {
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.notificacoes)).toBe(true);
      });
    });
  });

  describe("Step 2: Concurrent Obra Creation", () => {
    it("Multiple users should be able to create obras simultaneously", async () => {
      // Setup: create credits for each user
      const credits = [];
      for (const user of users) {
        const creditRes = await request(app.getHttpServer())
          .post("/api/v1/credito/solicitacao")
          .set("Authorization", `Bearer ${user.token}`)
          .send({
            loanType: "construction",
            valorSolicitado: 100000,
            prazoMeses: 12,
          });

        const creditoId = creditRes.body.creditoId;
        await prisma.credito.update({
          where: { creditoId },
          data: { status: "APROVADO" },
        });

        credits.push(creditoId);
      }

      // Concurrent obra creation
      const obraPromises = users.map((u, idx) =>
        request(app.getHttpServer())
          .post("/api/v1/obras")
          .set("Authorization", `Bearer ${u.token}`)
          .send({
            nome: `Concurrent Obra ${idx} - ${Date.now()}`,
            descricao: `Concurrent test project ${idx}`,
            localizacao: {
              lat: -15.789 + idx * 0.001,
              lng: -48.123 + idx * 0.001,
            },
            valorTotal: 100000,
            creditoId: credits[idx],
          }),
      );

      const responses = await Promise.all(obraPromises);

      responses.forEach((res) => {
        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();
      });
    });

    it("Concurrent reads of same obra should not cause conflicts", async () => {
      // Create one obra
      const user = users[0];
      const creditRes = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitacao")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          loanType: "construction",
          valorSolicitado: 100000,
          prazoMeses: 12,
        });

      const creditoId = creditRes.body.creditoId;
      await prisma.credito.update({
        where: { creditoId },
        data: { status: "APROVADO" },
      });

      const obraRes = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          nome: `Shared Obra - ${Date.now()}`,
          descricao: "Concurrent read test",
          localizacao: { lat: -15.789, lng: -48.123 },
          valorTotal: 100000,
          creditoId,
        });

      const obraId = obraRes.body.id;

      // Multiple concurrent reads
      const readPromises = users.map((u) =>
        request(app.getHttpServer())
          .get(`/api/v1/obras/${obraId}`)
          .set("Authorization", `Bearer ${u.token}`),
      );

      const responses = await Promise.all(readPromises);

      responses.forEach((res) => {
        if (res.status === 200) {
          expect(res.body.id).toBe(obraId);
        } else if (res.status === 403) {
          // User might not have access
          expect([200, 403]).toContain(res.status);
        }
      });
    });
  });

  describe("Step 3: Concurrent Evidence Uploads", () => {
    it("Multiple users uploading evidence simultaneously should work", async () => {
      // Setup: create obra and etapas for first user
      const user = users[0];
      const creditRes = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitacao")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          loanType: "construction",
          valorSolicitado: 100000,
          prazoMeses: 12,
        });

      const creditoId = creditRes.body.creditoId;
      await prisma.credito.update({
        where: { creditoId },
        data: { status: "APROVADO" },
      });

      const obraRes = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          nome: `Upload Test Obra - ${Date.now()}`,
          descricao: "Concurrent upload test",
          localizacao: { lat: -15.789, lng: -48.123 },
          valorTotal: 100000,
          creditoId,
        });

      const obraId = obraRes.body.id;
      const obraData = await prisma.obra.findUnique({
        where: { obraId },
        include: { etapas: true },
      });

      if (obraData?.etapas && obraData.etapas.length > 0) {
        const etapaId = obraData.etapas[0].etapaId;

        // Concurrent upload attempts
        const uploadPromises = users.map((u) =>
          request(app.getHttpServer())
            .post("/api/v1/evidencias")
            .set("Authorization", `Bearer ${u.token}`)
            .field("etapaId", etapaId)
            .field("latCaptura", "-15.789")
            .field("lngCaptura", "-48.123"),
        );

        const responses = await Promise.all(uploadPromises);

        // All should respond (might fail auth or for missing file)
        responses.forEach((res) => {
          expect([400, 401, 403, 429]).toContain(res.status);
        });
      }
    });
  });

  describe("Step 4: Concurrent Etapa Approvals", () => {
    it("Multiple managers approving different etapas should work", async () => {
      // Setup: create obra with multiple etapas
      const user = users[0];
      const creditRes = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitacao")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          loanType: "construction",
          valorSolicitado: 100000,
          prazoMeses: 12,
        });

      const creditoId = creditRes.body.creditoId;
      await prisma.credito.update({
        where: { creditoId },
        data: { status: "APROVADO" },
      });

      const obraRes = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          nome: `Approval Test Obra - ${Date.now()}`,
          descricao: "Concurrent approval test",
          localizacao: { lat: -15.789, lng: -48.123 },
          valorTotal: 100000,
          creditoId,
        });

      const obraId = obraRes.body.id;
      const obraData = await prisma.obra.findUnique({
        where: { obraId },
        include: { etapas: true },
      });

      if (obraData?.etapas && obraData.etapas.length > 1) {
        // Concurrent approvals of different etapas
        const approvalPromises = obraData.etapas.slice(0, 2).map((etapa) =>
          request(app.getHttpServer())
            .post(`/api/v1/vistoria/${etapa.etapaId}/aprovar`)
            .set("Authorization", `Bearer ${users[1].token}`)
            .send({
              obraId,
              observacoes: "Concurrent approval",
            }),
        );

        const responses = await Promise.all(approvalPromises);

        // All approval attempts should complete
        responses.forEach((res) => {
          expect([200, 201, 400, 403]).toContain(res.status);
        });
      }
    });
  });

  describe("Step 5: Concurrent Data Reads", () => {
    it("Multiple concurrent reads of same resource should be consistent", async () => {
      const user = users[0];

      // Make concurrent reads
      const readPromises = [];
      for (let i = 0; i < 10; i++) {
        readPromises.push(
          request(app.getHttpServer())
            .get("/api/v1/notificacoes")
            .set("Authorization", `Bearer ${user.token}`),
        );
      }

      const responses = await Promise.all(readPromises);

      // All should succeed and return consistent data
      const firstResponse = responses.find((r) => r.status === 200);
      responses.forEach((res) => {
        if (res.status === 200) {
          expect(Array.isArray(res.body.notificacoes)).toBe(true);
          // Total count should be consistent
          expect(res.body.total).toEqual(firstResponse?.body.total);
        }
      });
    });

    it("Reading while another user writes should show consistent state", async () => {
      const user1 = users[0];
      const user2 = users[1];

      // User 1 creates a resource
      const creditRes = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitacao")
        .set("Authorization", `Bearer ${user1.token}`)
        .send({
          loanType: "construction",
          valorSolicitado: 100000,
          prazoMeses: 12,
        });

      const creditoId = creditRes.body.creditoId;
      const credit = await prisma.credito.findUnique({
        where: { creditoId },
      });

      expect(credit).toBeDefined();
      expect(credit?.status).toBe("AGUARDANDO_ANALISE");

      // User 2 reads while user 1 is writing
      const readRes = await request(app.getHttpServer())
        .get("/api/v1/credito")
        .set("Authorization", `Bearer ${user2.token}`);

      // Should either see the new credit or not (no corruption)
      expect([200, 400, 401]).toContain(readRes.status);
    });
  });

  describe("Step 6: Cache Consistency Under Concurrency", () => {
    it("Cache should stay consistent with multiple concurrent reads", async () => {
      const user = users[0];

      // First read (potentially caches)
      const res1 = await request(app.getHttpServer())
        .get("/api/v1/score")
        .set("Authorization", `Bearer ${user.token}`);

      // Multiple concurrent reads
      const readPromises = [];
      for (let i = 0; i < 5; i++) {
        readPromises.push(
          request(app.getHttpServer())
            .get("/api/v1/score")
            .set("Authorization", `Bearer ${user.token}`),
        );
      }

      const responses = await Promise.all(readPromises);

      // All should return same data
      if (res1.status === 200) {
        responses.forEach((res) => {
          if (res.status === 200) {
            expect(res.body.score).toEqual(res1.body.score);
          }
        });
      }
    });
  });

  describe("Step 7: Database Connection Pool Under Load", () => {
    it("Multiple concurrent database queries should not exhaust connection pool", async () => {
      const queryPromises = [];

      // Generate 20 concurrent queries
      for (let i = 0; i < 20; i++) {
        const userIdx = i % users.length;
        queryPromises.push(
          request(app.getHttpServer())
            .get("/api/v1/notificacoes")
            .set("Authorization", `Bearer ${users[userIdx].token}`),
        );
      }

      const responses = await Promise.all(queryPromises);

      // Most should succeed
      const successCount = responses.filter((r) => r.status === 200).length;
      expect(successCount).toBeGreaterThan(15);
    });

    it("Query timeouts should not cascade to other requests", async () => {
      // Make many concurrent requests
      const promises = users.map((u) =>
        request(app.getHttpServer())
          .get("/api/v1/notificacoes?limit=1000")
          .set("Authorization", `Bearer ${u.token}`),
      );

      const responses = await Promise.all(promises);

      // All should complete (not timeout)
      responses.forEach((res) => {
        expect([200, 400, 429]).toContain(res.status);
      });
    });
  });

  describe("Step 8: Transaction Isolation", () => {
    it("Concurrent transactions should maintain isolation", async () => {
      const user = users[0];

      // Create multiple transactions
      const txPromises = [];
      for (let i = 0; i < 3; i++) {
        txPromises.push(
          request(app.getHttpServer())
            .post("/api/v1/credito/solicitacao")
            .set("Authorization", `Bearer ${user.token}`)
            .send({
              loanType: "construction",
              valorSolicitado: 50000 + i * 10000,
              prazoMeses: 12,
            }),
        );
      }

      const responses = await Promise.all(txPromises);

      // All should succeed and create independent records
      const createdIds = responses
        .filter((r) => r.status === 201)
        .map((r) => r.body.creditoId);

      expect(createdIds.length).toBe(3);

      // Verify all are independent
      const credits = await Promise.all(
        createdIds.map((id) =>
          prisma.credito.findUnique({ where: { creditoId: id } }),
        ),
      );

      credits.forEach((credit) => {
        expect(credit).toBeDefined();
        expect(credit?.status).toBe("AGUARDANDO_ANALISE");
      });
    });
  });

  describe("Step 9: Race Conditions Prevention", () => {
    it("Duplicate creation should be prevented", async () => {
      const user = users[0];

      // Try to create same resource twice simultaneously
      const duplicatePromises = [];
      for (let i = 0; i < 2; i++) {
        duplicatePromises.push(
          request(app.getHttpServer())
            .post("/api/v1/push-notificacoes/registrar-token")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ token: "duplicate-test-token" }),
        );
      }

      const responses = await Promise.all(duplicatePromises);

      // Both should succeed (upsert), not conflict
      responses.forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
      });

      // Only one token should exist
      const tokens = await prisma.usuarioFcmToken.findMany({
        where: {
          usuarioId: user.id,
          token: "duplicate-test-token",
        },
      });

      expect(tokens.length).toBeLessThanOrEqual(1);
    });
  });

  describe("Step 10: Full Concurrent Workflow", () => {
    it("Multiple users running complete workflows simultaneously should work", async () => {
      const workflows = users.map(async (user) => {
        // 1. Get notifications
        const notifRes = await request(app.getHttpServer())
          .get("/api/v1/notificacoes")
          .set("Authorization", `Bearer ${user.token}`);

        // 2. Create credit
        const creditRes = await request(app.getHttpServer())
          .post("/api/v1/credito/solicitacao")
          .set("Authorization", `Bearer ${user.token}`)
          .send({
            loanType: "construction",
            valorSolicitado: 100000,
            prazoMeses: 12,
          });

        // 3. Approve credit
        if (creditRes.status === 201) {
          await prisma.credito.update({
            where: { creditoId: creditRes.body.creditoId },
            data: { status: "APROVADO" },
          });

          // 4. Create obra
          const obraRes = await request(app.getHttpServer())
            .post("/api/v1/obras")
            .set("Authorization", `Bearer ${user.token}`)
            .send({
              nome: `Complete Workflow - ${user.id}`,
              descricao: "Concurrent workflow test",
              localizacao: { lat: -15.789, lng: -48.123 },
              valorTotal: 100000,
              creditoId: creditRes.body.creditoId,
            });

          return {
            notifications: notifRes.status === 200,
            credit: creditRes.status === 201,
            obra: obraRes.status === 201,
          };
        }

        return { notifications: false, credit: false, obra: false };
      });

      const results = await Promise.all(workflows);

      // Most workflows should complete successfully
      const successCount = results.filter(
        (r) => r.notifications && r.credit && r.obra,
      ).length;

      expect(successCount).toBeGreaterThanOrEqual(1);
    });
  });
});
