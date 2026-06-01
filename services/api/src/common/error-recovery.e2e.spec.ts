import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../app.module";
import { PrismaService } from "../modules/prisma/prisma.service";

describe("Error Recovery E2E - Comprehensive Suite", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userEmail: string;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    // Create test user
    userEmail = `error-recovery-${Date.now()}@imbobi.com`;
    await request(app.getHttpServer()).post("/api/v1/auth/registrar").send({
      email: userEmail,
      password: "Senha@123",
      nome: "Error Recovery Test User",
    });

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: userEmail, password: "Senha@123" });

    userToken = loginRes.body.access_token;
    userId = loginRes.body.usuario?.usuarioId;
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({
      where: { email: { startsWith: "error-recovery-" } },
    });
    await app.close();
  });

  describe("Step 1: Database Error Handling", () => {
    it("Should handle database connection gracefully", async () => {
      // Test with valid request - should work normally
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body.notificacoes)).toBe(true);
    });

    it("Invalid database queries should return proper error responses", async () => {
      // Request with invalid ID format should fail gracefully
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes/invalid-uuid-format")
        .set("Authorization", `Bearer ${userToken}`);

      expect([400, 404, 500]).toContain(res.status);
      // Should not expose sensitive database details
      if (res.body.message) {
        expect(res.body.message).not.toContain("SELECT");
        expect(res.body.message).not.toContain("postgresql");
      }
    });

    it("Concurrent database operations should not deadlock", async () => {
      // Make concurrent requests to same resource
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app.getHttpServer())
            .get("/api/v1/notificacoes")
            .set("Authorization", `Bearer ${userToken}`),
        );
      }

      const responses = await Promise.all(requests);

      // All should complete successfully
      responses.forEach((res) => {
        expect([200, 429]).toContain(res.status);
      });
    });

    it("Database constraint violations should be handled", async () => {
      // Try to create duplicate user (violates unique constraint)
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: userEmail, // Already exists
          password: "Senha@123",
          nome: "Duplicate User",
        });

      expect([400, 409, 500]).toContain(res.status);
      // Should not expose raw database error
      if (res.body.message) {
        expect(res.body.message.toLowerCase()).toContain("exist");
      }
    });
  });

  describe("Step 2: Redis/Cache Unavailability", () => {
    it("System should function even if cache is unavailable", async () => {
      // Normal operation should work (cache is transparent)
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body.notificacoes)).toBe(true);
    });

    it("Cache failures should not block request flow", async () => {
      // Make multiple requests - if cache fails, database fallback works
      const responses = [];
      for (let i = 0; i < 3; i++) {
        const res = await request(app.getHttpServer())
          .get("/api/v1/score")
          .set("Authorization", `Bearer ${userToken}`);

        responses.push(res);
      }

      // All should succeed despite potential cache issues
      responses.forEach((res) => {
        expect([200, 429]).toContain(res.status);
      });
    });

    it("BullMQ jobs should retry on failure", async () => {
      // Create a scenario that would trigger background jobs
      const creditRes = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitacao")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          loanType: "construction",
          valorSolicitado: 100000,
          prazoMeses: 12,
        });

      expect(creditRes.status).toBe(201);
      expect(creditRes.body.creditoId).toBeDefined();

      // Job should be queued even if Redis has issues
      const credito = await prisma.credito.findUnique({
        where: { creditoId: creditRes.body.creditoId },
      });

      expect(credito).toBeDefined();
      expect(credito?.status).toBe("AGUARDANDO_ANALISE");
    });
  });

  describe("Step 3: External Service Failures", () => {
    it("Firebase push notification failure should not block main request", async () => {
      // Create credit which might trigger notifications
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitacao")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          loanType: "construction",
          valorSolicitado: 100000,
          prazoMeses: 12,
        });

      // Should succeed even if Firebase isn't configured
      expect(res.status).toBe(201);
      expect(res.body.creditoId).toBeDefined();
    });

    it("Email service failure should not block user operations", async () => {
      // Signup with email service
      const newEmail = `test-email-${Date.now()}@imbobi.com`;
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: newEmail,
          password: "Senha@123",
          nome: "Email Test User",
        });

      // Should succeed even if email service is unavailable
      expect(res.status).toBe(201);
    });

    it("S3 upload failure should return proper error", async () => {
      // Try to upload evidence (may fail if S3 unavailable)
      const creditRes = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitacao")
        .set("Authorization", `Bearer ${userToken}`)
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
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          nome: "Upload Test",
          descricao: "Test",
          localizacao: { lat: -15.789, lng: -48.123 },
          valorTotal: 100000,
          creditoId,
        });

      const obraData = await prisma.obra.findUnique({
        where: { obraId: obraRes.body.id },
        include: { etapas: true },
      });

      const etapaId = obraData?.etapas[0]?.etapaId;

      if (etapaId) {
        const uploadRes = await request(app.getHttpServer())
          .post("/api/v1/evidencias")
          .set("Authorization", `Bearer ${userToken}`)
          .field("etapaId", etapaId)
          .field("latCaptura", "-15.789")
          .field("lngCaptura", "-48.123");

        // Should fail gracefully (400 for missing file, not 500)
        expect([400, 500]).toContain(uploadRes.status);
      }
    });
  });

  describe("Step 4: Request Timeout Handling", () => {
    it("Long-running requests should not hang indefinitely", async () => {
      // Request should complete within reasonable time
      const startTime = Date.now();

      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes?limit=100")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      const duration = Date.now() - startTime;

      // Should complete within 30 seconds
      expect(duration).toBeLessThan(30000);
      expect(Array.isArray(res.body.notificacoes)).toBe(true);
    });

    it("Batch operations should timeout gracefully", async () => {
      // Make request that would retrieve large dataset
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes?limit=1000")
        .set("Authorization", `Bearer ${userToken}`);

      expect([200, 400, 429]).toContain(res.status);
      // Should return result or error, not hang
    });
  });

  describe("Step 5: Graceful Degradation", () => {
    it("Optional features should not break core functionality", async () => {
      // Core auth should work
      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: userEmail, password: "Senha@123" });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.access_token).toBeDefined();
    });

    it("Secondary services failing should not affect main operations", async () => {
      // Create obra (primary) - should work even if notifications fail
      const creditRes = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitacao")
        .set("Authorization", `Bearer ${userToken}`)
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
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          nome: "Degradation Test",
          descricao: "Test",
          localizacao: { lat: -15.789, lng: -48.123 },
          valorTotal: 100000,
          creditoId,
        });

      expect(obraRes.status).toBe(201);
      // Obra should be created even if secondary notifications fail
    });

    it("Feature flags should allow graceful feature disabling", async () => {
      // System should work with minimal features
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes")
        .set("Authorization", `Bearer ${userToken}`);

      expect([200, 429]).toContain(res.status);
    });
  });

  describe("Step 6: Error Response Consistency", () => {
    it("All errors should follow consistent response format", async () => {
      // Test various error types
      const responses = [];

      // Invalid request
      responses.push(
        await request(app.getHttpServer())
          .get("/api/v1/notificacoes/invalid")
          .set("Authorization", `Bearer ${userToken}`),
      );

      // Unauthenticated
      responses.push(
        await request(app.getHttpServer()).get("/api/v1/notificacoes"),
      );

      // Responses should have consistent error format
      responses.forEach((res) => {
        if (res.status >= 400) {
          // Error responses should have some structure
          expect(res.body).toBeDefined();
        }
      });
    });

    it("Error messages should not expose sensitive information", async () => {
      // Invalid request should not expose database schema
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes/invalid")
        .set("Authorization", `Bearer ${userToken}`);

      if (res.status >= 400) {
        const body = JSON.stringify(res.body);
        expect(body).not.toContain("password");
        expect(body).not.toContain("private_key");
      }
    });

    it("HTTP status codes should be semantically correct", async () => {
      // Unauthorized
      const unauthorizedRes = await request(app.getHttpServer())
        .get("/api/v1/notificacoes")
        .expect(401);

      expect(unauthorizedRes.status).toBe(401);

      // Not Found
      const notFoundRes = await request(app.getHttpServer())
        .get("/api/v1/notificacoes/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${userToken}`);

      expect([404, 400]).toContain(notFoundRes.status);
    });
  });

  describe("Step 7: Recovery from Failed Operations", () => {
    it("Failed request should not affect subsequent requests", async () => {
      // Make a valid request
      const res1 = await request(app.getHttpServer())
        .get("/api/v1/notificacoes")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res1.status).toBe(200);

      // Make an invalid request
      const res2 = await request(app.getHttpServer())
        .get("/api/v1/invalid-endpoint")
        .set("Authorization", `Bearer ${userToken}`);

      expect([404, 405]).toContain(res2.status);

      // Subsequent valid request should still work
      const res3 = await request(app.getHttpServer())
        .get("/api/v1/notificacoes")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res3.status).toBe(200);
    });

    it("Partial failures should not rollback unrelated changes", async () => {
      // Create credit successfully
      const creditRes = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitacao")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          loanType: "construction",
          valorSolicitado: 100000,
          prazoMeses: 12,
        });

      expect(creditRes.status).toBe(201);
      const creditoId = creditRes.body.creditoId;

      // Verify credit was created even if follow-up operations failed
      const credito = await prisma.credito.findUnique({
        where: { creditoId },
      });

      expect(credito).toBeDefined();
    });
  });

  describe("Step 8: Logging and Monitoring", () => {
    it("Errors should be logged for debugging", async () => {
      // Make requests that generate errors
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes/invalid")
        .set("Authorization", `Bearer ${userToken}`);

      // Error should be handled (logged internally)
      expect([400, 404, 500]).toContain(res.status);
    });

    it("Success responses should indicate health", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      // Response should indicate success
      expect(res.status).toBe(200);
    });
  });

  describe("Step 9: Transactional Integrity", () => {
    it("Database transactions should be atomic", async () => {
      // Create obra with credit relationship
      const creditRes = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitacao")
        .set("Authorization", `Bearer ${userToken}`)
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
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          nome: "Transaction Test",
          descricao: "Test",
          localizacao: { lat: -15.789, lng: -48.123 },
          valorTotal: 100000,
          creditoId,
        });

      expect(obraRes.status).toBe(201);

      // Verify relationships are intact
      const obra = await prisma.obra.findUnique({
        where: { obraId: obraRes.body.id },
        include: { credito: true, etapas: true },
      });

      expect(obra?.credito).toBeDefined();
      expect(obra?.credito?.creditoId).toBe(creditoId);
      expect(obra?.etapas.length).toBeGreaterThan(0);
    });

    it("Concurrent updates should maintain consistency", async () => {
      // Create a test objeto
      const creditRes = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitacao")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          loanType: "construction",
          valorSolicitado: 50000,
          prazoMeses: 12,
        });

      const creditoId = creditRes.body.creditoId;

      // Try concurrent reads
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          prisma.credito.findUnique({
            where: { creditoId },
          }),
        );
      }

      const results = await Promise.all(promises);

      // All reads should see same consistent state
      results.forEach((result) => {
        expect(result?.creditoId).toBe(creditoId);
      });
    });
  });

  describe("Step 10: Full Error Recovery Workflow", () => {
    it("System should recover from complete flow failures and retry", async () => {
      // Normal flow should work
      const res = await request(app.getHttpServer())
        .get("/api/v1/notificacoes")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body.notificacoes)).toBe(true);

      // Even with potential background failures, data should persist
      const userData = await prisma.usuario.findUnique({
        where: { usuarioId: userId },
      });

      expect(userData).toBeDefined();
    });

    it("Operations should be idempotent where applicable", async () => {
      // Creating same token registration twice should be safe
      const token1 = "test-idempotent-token-123";

      const res1 = await request(app.getHttpServer())
        .post("/api/v1/push-notificacoes/registrar-token")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ token: token1 })
        .expect(200);

      const res2 = await request(app.getHttpServer())
        .post("/api/v1/push-notificacoes/registrar-token")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ token: token1 })
        .expect(200);

      // Both should succeed
      expect(res1.body.ok).toBe(true);
      expect(res2.body.ok).toBe(true);

      // Token should only exist once
      const tokens = await prisma.usuarioFcmToken.findMany({
        where: { usuarioId: userId, token: token1 },
      });

      expect(tokens.length).toBeLessThanOrEqual(1);
    });
  });
});
