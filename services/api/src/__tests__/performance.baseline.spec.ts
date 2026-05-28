import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../app.module";
import { PrismaService } from "../modules/prisma/prisma.service";

/**
 * Performance Baseline Suite
 * Measures response times for critical flows to establish performance baselines
 * All times in milliseconds
 */
describe("Performance Baseline - Critical Flows", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const performanceMetrics: Record<string, number[]> = {};

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    // Log performance summary
    console.log("\n=== PERFORMANCE BASELINE RESULTS ===\n");
    Object.entries(performanceMetrics).forEach(([endpoint, times]) => {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

      console.log(`${endpoint}:`);
      console.log(`  Avg: ${avg.toFixed(2)}ms | Min: ${min}ms | Max: ${max}ms | P95: ${p95}ms`);
    });

    await app.close();
  });

  function trackMetric(name: string, duration: number) {
    if (!performanceMetrics[name]) {
      performanceMetrics[name] = [];
    }
    performanceMetrics[name].push(duration);
  }

  describe("Authentication Performance", () => {
    it("Registration endpoint performance", async () => {
      const testCases = 3;
      for (let i = 0; i < testCases; i++) {
        const start = Date.now();
        await request(app.getHttpServer())
          .post("/api/v1/auth/registrar")
          .send({
            email: `perf-reg-${Date.now()}-${i}@imbobi.com`,
            password: "Senha@123",
            nome: "Perf Test User",
          });
        const duration = Date.now() - start;
        trackMetric("POST /auth/registrar", duration);
      }

      const times = performanceMetrics["POST /auth/registrar"];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avg).toBeLessThan(1000); // Should complete in < 1 second
    });

    it("Login endpoint performance", async () => {
      const email = `perf-login-${Date.now()}@imbobi.com`;
      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email, password: "Senha@123", nome: "Perf Login" });

      const testCases = 5;
      for (let i = 0; i < testCases; i++) {
        const start = Date.now();
        await request(app.getHttpServer())
          .post("/api/v1/auth/login")
          .send({ email, password: "Senha@123" });
        const duration = Date.now() - start;
        trackMetric("POST /auth/login", duration);
      }

      const times = performanceMetrics["POST /auth/login"];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avg).toBeLessThan(500); // Should complete in < 500ms
    });

    it("Get profile endpoint performance", async () => {
      const email = `perf-profile-${Date.now()}@imbobi.com`;
      const regRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email, password: "Senha@123", nome: "Perf Profile" });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: "Senha@123" });

      const token = loginRes.body.access_token;

      const testCases = 10;
      for (let i = 0; i < testCases; i++) {
        const start = Date.now();
        await request(app.getHttpServer())
          .get("/api/v1/usuarios/meu-perfil")
          .set("Authorization", `Bearer ${token}`);
        const duration = Date.now() - start;
        trackMetric("GET /usuarios/meu-perfil", duration);
      }

      const times = performanceMetrics["GET /usuarios/meu-perfil"];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avg).toBeLessThan(200); // Should complete in < 200ms
    });
  });

  describe("Obra Creation Performance", () => {
    it("Create obra endpoint performance", async () => {
      const email = `perf-obra-${Date.now()}@imbobi.com`;
      const regRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email, password: "Senha@123", nome: "Perf Obra" });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: "Senha@123" });

      const token = loginRes.body.access_token;

      const testCases = 3;
      for (let i = 0; i < testCases; i++) {
        const start = Date.now();
        await request(app.getHttpServer())
          .post("/api/v1/obras")
          .set("Authorization", `Bearer ${token}`)
          .send({
            nome: `Perf Obra ${i}`,
            geoLatitude: -23.55 + (Math.random() * 0.1 - 0.05),
            geoLongitude: -46.63 + (Math.random() * 0.1 - 0.05),
            raioValidacaoMetros: 50,
          });
        const duration = Date.now() - start;
        trackMetric("POST /obras", duration);
      }

      const times = performanceMetrics["POST /obras"];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avg).toBeLessThan(800); // Should complete in < 800ms (includes etapa generation)
    });

    it("Get obra details endpoint performance", async () => {
      const email = `perf-obra-get-${Date.now()}@imbobi.com`;
      const regRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email, password: "Senha@123", nome: "Perf Obra Get" });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: "Senha@123" });

      const token = loginRes.body.access_token;

      const obraRes = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Perf Obra Detail Test",
          geoLatitude: -23.55,
          geoLongitude: -46.63,
          raioValidacaoMetros: 50,
        });

      const obraId = obraRes.body.obraId;

      const testCases = 10;
      for (let i = 0; i < testCases; i++) {
        const start = Date.now();
        await request(app.getHttpServer())
          .get(`/api/v1/obras/${obraId}`)
          .set("Authorization", `Bearer ${token}`);
        const duration = Date.now() - start;
        trackMetric("GET /obras/{id}", duration);
      }

      const times = performanceMetrics["GET /obras/{id}"];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avg).toBeLessThan(300); // Should complete in < 300ms
    });
  });

  describe("KYC Performance", () => {
    it("KYC document upload performance", async () => {
      const email = `perf-kyc-${Date.now()}@imbobi.com`;
      const regRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email, password: "Senha@123", nome: "Perf KYC" });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: "Senha@123" });

      const token = loginRes.body.access_token;

      const testCases = 5;
      for (let i = 0; i < testCases; i++) {
        const start = Date.now();
        await request(app.getHttpServer())
          .post("/api/v1/kyc/upload")
          .set("Authorization", `Bearer ${token}`)
          .send({
            tipo: "RG",
            url: `https://example.com/rg-${i}.jpg`,
          });
        const duration = Date.now() - start;
        trackMetric("POST /kyc/upload", duration);
      }

      const times = performanceMetrics["POST /kyc/upload"];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avg).toBeLessThan(400); // Should complete in < 400ms
    });

    it("KYC status endpoint performance", async () => {
      const email = `perf-kyc-status-${Date.now()}@imbobi.com`;
      const regRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email, password: "Senha@123", nome: "Perf KYC Status" });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: "Senha@123" });

      const token = loginRes.body.access_token;

      const testCases = 10;
      for (let i = 0; i < testCases; i++) {
        const start = Date.now();
        await request(app.getHttpServer())
          .get("/api/v1/kyc/status")
          .set("Authorization", `Bearer ${token}`);
        const duration = Date.now() - start;
        trackMetric("GET /kyc/status", duration);
      }

      const times = performanceMetrics["GET /kyc/status"];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avg).toBeLessThan(250); // Should complete in < 250ms
    });
  });

  describe("Credit Performance", () => {
    it("Credit simulation endpoint performance", async () => {
      const testCases = 10;
      for (let i = 0; i < testCases; i++) {
        const start = Date.now();
        await request(app.getHttpServer())
          .post("/api/v1/credito/simular")
          .send({
            valorSolicitado: 50000 + Math.random() * 50000,
            prazoMeses: Math.floor(Math.random() * 24) + 6,
          });
        const duration = Date.now() - start;
        trackMetric("POST /credito/simular", duration);
      }

      const times = performanceMetrics["POST /credito/simular"];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avg).toBeLessThan(150); // Should complete in < 150ms (no DB write)
    });

    it("Credit request endpoint performance", async () => {
      const email = `perf-credit-${Date.now()}@imbobi.com`;
      const regRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email, password: "Senha@123", nome: "Perf Credit" });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: "Senha@123" });

      const token = loginRes.body.access_token;

      const testCases = 3;
      for (let i = 0; i < testCases; i++) {
        const start = Date.now();
        await request(app.getHttpServer())
          .post("/api/v1/credito/solicitar")
          .set("Authorization", `Bearer ${token}`)
          .send({
            valorSolicitado: 50000 + i * 10000,
            prazoMeses: 12 + i * 6,
          });
        const duration = Date.now() - start;
        trackMetric("POST /credito/solicitar", duration);
      }

      const times = performanceMetrics["POST /credito/solicitar"];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avg).toBeLessThan(600); // Should complete in < 600ms
    });

    it("Credit statement endpoint performance", async () => {
      const email = `perf-credit-stmt-${Date.now()}@imbobi.com`;
      const regRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email, password: "Senha@123", nome: "Perf Credit Stmt" });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: "Senha@123" });

      const token = loginRes.body.access_token;

      const creditRes = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .set("Authorization", `Bearer ${token}`)
        .send({
          valorSolicitado: 100000,
          prazoMeses: 12,
        });

      const creditoId = creditRes.body.creditoId;

      const testCases = 10;
      for (let i = 0; i < testCases; i++) {
        const start = Date.now();
        await request(app.getHttpServer())
          .get(`/api/v1/credito/${creditoId}/extrato`)
          .set("Authorization", `Bearer ${token}`);
        const duration = Date.now() - start;
        trackMetric("GET /credito/{id}/extrato", duration);
      }

      const times = performanceMetrics["GET /credito/{id}/extrato"];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avg).toBeLessThan(300); // Should complete in < 300ms (with cache)
    });
  });

  describe("Database Query Performance", () => {
    it("Database connection is responsive", async () => {
      const start = Date.now();
      const count = await prisma.usuario.count();
      const duration = Date.now() - start;

      trackMetric("DB COUNT usuarios", duration);
      expect(duration).toBeLessThan(100); // Database query should be fast
      expect(count).toBeGreaterThan(0);
    });

    it("Complex joins complete reasonably", async () => {
      const email = `perf-complex-${Date.now()}@imbobi.com`;
      const regRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email, password: "Senha@123", nome: "Complex Query" });

      const userId = regRes.body.usuarioId;

      const start = Date.now();
      const usuario = await prisma.usuario.findUnique({
        where: { usuarioId: userId },
        include: {
          obras: true,
          creditos: true,
        },
      });
      const duration = Date.now() - start;

      trackMetric("DB Complex Query (user with relations)", duration);
      expect(duration).toBeLessThan(300); // Complex query with joins
    });
  });
});
