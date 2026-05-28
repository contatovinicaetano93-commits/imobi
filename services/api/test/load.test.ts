/**
 * Load Testing Suite for Imobi API
 *
 * This suite validates API performance under production workloads.
 * Uses supertest + manual load generation to test:
 * - Auth workflows (login/registration)
 * - Critical read operations (manager/etapas-pendentes, list obras)
 * - State mutations (approve etapa, release payment)
 * - Rate limiting behavior
 * - Cache effectiveness
 *
 * Run: pnpm test -- --testPathPattern=load.test.ts
 */

import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/modules/prisma/prisma.service";

interface PerformanceMetric {
  endpoint: string;
  method: string;
  responseTimes: number[];
  errorCount: number;
  totalRequests: number;
  cacheHit?: number;
  cacheMiss?: number;
}

interface LoadTestConfig {
  concurrentUsers: number;
  requestsPerUser: number;
  duration?: number;
}

class LoadTester {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private startTime: number = 0;

  constructor(private app: INestApplication, private prisma: PrismaService) {}

  recordMetric(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    cacheHit?: boolean
  ) {
    const key = `${method} ${endpoint}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        endpoint,
        method,
        responseTimes: [],
        errorCount: 0,
        totalRequests: 0,
      });
    }

    const metric = this.metrics.get(key)!;
    metric.totalRequests++;
    metric.responseTimes.push(responseTime);

    if (statusCode >= 400) {
      metric.errorCount++;
    }

    if (cacheHit !== undefined) {
      metric.cacheHit = (metric.cacheHit || 0) + (cacheHit ? 1 : 0);
      metric.cacheMiss = (metric.cacheMiss || 0) + (cacheHit ? 0 : 1);
    }
  }

  getMetrics() {
    return Array.from(this.metrics.values()).map((m) => {
      const sorted = m.responseTimes.sort((a, b) => a - b);
      return {
        ...m,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
        avg: sorted.reduce((a, b) => a + b, 0) / sorted.length,
        min: Math.min(...sorted),
        max: Math.max(...sorted),
        errorRate: (m.errorCount / m.totalRequests * 100).toFixed(2) + "%",
        cacheHitRate: m.cacheHit
          ? ((m.cacheHit / (m.cacheHit + m.cacheMiss!)) * 100).toFixed(2) + "%"
          : undefined,
      };
    });
  }

  async simulateConcurrentUsers(
    config: LoadTestConfig,
    workloadFn: (userId: string, token: string, userIdx: number) => Promise<void>
  ) {
    this.startTime = Date.now();
    const userTokens: Array<{ id: string; token: string }> = [];

    // Setup: Create test users
    console.log(`[Load Test] Creating ${config.concurrentUsers} test users...`);
    for (let i = 0; i < config.concurrentUsers; i++) {
      const email = `load-test-${Date.now()}-${i}@imbobi.test`;
      try {
        await request(this.app.getHttpServer())
          .post("/api/v1/auth/registrar")
          .send({
            email,
            password: "TestPass@123",
            nome: `Load Test User ${i}`,
          });

        const loginRes = await request(this.app.getHttpServer())
          .post("/api/v1/auth/login")
          .send({ email, password: "TestPass@123" });

        if (loginRes.status === 200 && loginRes.body.access_token) {
          userTokens.push({
            id: loginRes.body.usuario?.usuarioId || `user-${i}`,
            token: loginRes.body.access_token,
          });
        }
      } catch (e) {
        console.warn(`Failed to create user ${i}`);
      }
    }

    console.log(`[Load Test] Created ${userTokens.length} test users`);

    // Run: Concurrent workload
    const promises: Promise<void>[] = [];
    for (let i = 0; i < userTokens.length; i++) {
      for (let j = 0; j < config.requestsPerUser; j++) {
        const user = userTokens[i];
        promises.push(
          workloadFn(user.id, user.token, i).catch((e) => {
            // Silently catch workload errors to continue test
          })
        );
      }
    }

    await Promise.all(promises);

    // Cleanup
    const emails = userTokens.map((_, i) => `load-test-${Date.now()}-${i}@imbobi.test`);
    await this.prisma.usuario.deleteMany({
      where: { email: { in: emails } },
    });

    console.log(
      `[Load Test] Completed ${promises.length} requests in ${Date.now() - this.startTime}ms`
    );
  }
}

describe("Load Testing & Performance Validation", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let loadTester: LoadTester;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    loadTester = new LoadTester(app, prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Scenario 1: Authentication Bottleneck (100 concurrent users, 2 login requests each)", () => {
    it("should handle auth load without excessive errors", async () => {
      const config: LoadTestConfig = {
        concurrentUsers: 100,
        requestsPerUser: 2,
      };

      await loadTester.simulateConcurrentUsers(config, async (userId, token, userIdx) => {
        const email = `load-auth-${Date.now()}-${userIdx}@imbobi.test`;
        const startMs = Date.now();

        const res = await request(app.getHttpServer())
          .post("/api/v1/auth/login")
          .send({ email, password: "TestPass@123" });

        const responseTime = Date.now() - startMs;
        loadTester.recordMetric("/auth/login", "POST", responseTime, res.status);
      });

      const metrics = loadTester.getMetrics();
      const authMetric = metrics.find((m) => m.endpoint === "/auth/login");

      expect(authMetric).toBeDefined();
      expect(authMetric!.errorCount).toBeLessThan(authMetric!.totalRequests * 0.1); // < 10% error
      expect(authMetric!.p95).toBeLessThan(1000); // p95 < 1s
    });
  });

  describe("Scenario 2: Manager Dashboard Load (50 concurrent users, 5 dashboard requests each)", () => {
    it("should load manager dashboard with effective caching", async () => {
      // Create a test manager
      const managerEmail = `manager-load-${Date.now()}@imbobi.test`;
      const registerRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: managerEmail,
          password: "TestPass@123",
          nome: "Manager Load Test",
          tipo: "GESTOR_OBRA",
        });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: managerEmail, password: "TestPass@123" });

      const managerToken = loginRes.body.access_token;
      const managerId = loginRes.body.usuario?.usuarioId;

      // Elevate user to manager
      await prisma.usuario.update({
        where: { usuarioId: managerId },
        data: { tipo: "GESTOR_OBRA" },
      });

      const config: LoadTestConfig = {
        concurrentUsers: 50,
        requestsPerUser: 5,
      };

      let firstRequestTime = 0;
      let subsequentTimes: number[] = [];

      await loadTester.simulateConcurrentUsers(
        config,
        async (userId, token, userIdx) => {
          const startMs = Date.now();

          const res = await request(app.getHttpServer())
            .get("/api/v1/manager/etapas-pendentes?limit=20&offset=0")
            .set("Authorization", `Bearer ${managerToken}`);

          const responseTime = Date.now() - startMs;

          if (firstRequestTime === 0) {
            firstRequestTime = responseTime;
          } else {
            subsequentTimes.push(responseTime);
          }

          const xCacheHeader =
            res.headers["x-cache"] || res.headers["cache-control"] || "unknown";
          const cacheHit = xCacheHeader.includes("hit") || xCacheHeader.includes("HIT");

          loadTester.recordMetric(
            "/manager/etapas-pendentes",
            "GET",
            responseTime,
            res.status,
            cacheHit
          );
        }
      );

      const metrics = loadTester.getMetrics();
      const dashboardMetric = metrics.find((m) => m.endpoint === "/manager/etapas-pendentes");

      expect(dashboardMetric).toBeDefined();
      expect(dashboardMetric!.p95).toBeLessThan(500); // p95 < 500ms for cached requests
      expect(dashboardMetric!.cacheHitRate).toBeDefined();

      // Cleanup
      await prisma.usuario.delete({ where: { usuarioId: managerId } });
      await prisma.usuario.delete({ where: { email: managerEmail } });
    });
  });

  describe("Scenario 3: List Obras (Heavy Read, 75 concurrent users)", () => {
    it("should efficiently query obras with proper indexing", async () => {
      // Create test obras for query
      const ownerId = (await prisma.usuario.findFirst({}))?.usuarioId;
      if (!ownerId) {
        // Create test user if none exists
        const res = await request(app.getHttpServer())
          .post("/api/v1/auth/registrar")
          .send({
            email: `load-obras-owner-${Date.now()}@imbobi.test`,
            password: "TestPass@123",
            nome: "Obras Owner",
          });
      }

      const config: LoadTestConfig = {
        concurrentUsers: 75,
        requestsPerUser: 3,
      };

      await loadTester.simulateConcurrentUsers(config, async (userId, token, userIdx) => {
        const startMs = Date.now();

        const res = await request(app.getHttpServer())
          .get("/api/v1/obras?limit=50&offset=0")
          .set("Authorization", `Bearer ${token}`);

        const responseTime = Date.now() - startMs;
        loadTester.recordMetric("/obras", "GET", responseTime, res.status);
      });

      const metrics = loadTester.getMetrics();
      const obrasMetric = metrics.find((m) => m.endpoint === "/obras");

      expect(obrasMetric).toBeDefined();
      expect(obrasMetric!.p95).toBeLessThan(800); // p95 < 800ms
      expect(obrasMetric!.errorRate).toBeLessThan("5%");
    });
  });

  describe("Scenario 4: Etapa Approval Workflow (Low concurrency, high contention)", () => {
    it("should safely handle etapa approval under moderate load", async () => {
      // Create test obra and etapa
      const userRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: `load-etapa-owner-${Date.now()}@imbobi.test`,
          password: "TestPass@123",
          nome: "Etapa Owner",
        });

      const userToken = userRes.body.access_token;
      const userId = userRes.body.usuario?.usuarioId;

      const obraRes = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          nome: "Load Test Obra",
          tipo: "RESIDENCIAL",
          endereco: "Rua Teste, 123",
          localizacao: { latitude: -23.55, longitude: -46.63 },
        });

      if (obraRes.status !== 201) {
        console.warn("Failed to create test obra for etapa approval load test");
        return;
      }

      const obraId = obraRes.body.obraId;

      // List etapas for this obra
      const etapasRes = await request(app.getHttpServer())
        .get(`/api/v1/etapas/obra/${obraId}`)
        .set("Authorization", `Bearer ${userToken}`);

      if (!etapasRes.body?.etapas || etapasRes.body.etapas.length === 0) {
        console.warn("No etapas found in test obra");
        return;
      }

      const testEtapa = etapasRes.body.etapas[0];

      const config: LoadTestConfig = {
        concurrentUsers: 10,
        requestsPerUser: 2,
      };

      // Concurrent attempts to approve same etapa (should mostly fail due to state check)
      await loadTester.simulateConcurrentUsers(config, async (userId, token, userIdx) => {
        const startMs = Date.now();

        const res = await request(app.getHttpServer())
          .patch(`/api/v1/etapas/${testEtapa.etapaId}/aprovar`)
          .set("Authorization", `Bearer ${userToken}`)
          .send({ observacao: "Approved" });

        const responseTime = Date.now() - startMs;
        loadTester.recordMetric("/etapas/:id/aprovar", "PATCH", responseTime, res.status);
      });

      const metrics = loadTester.getMetrics();
      const approvalMetric = metrics.find((m) => m.endpoint === "/etapas/:id/aprovar");

      // Even with concurrent attempts, response should be fast
      expect(approvalMetric!.p95).toBeLessThan(800);

      // Cleanup
      await prisma.obra.delete({ where: { obraId } });
      await prisma.usuario.delete({ where: { usuarioId: userId } });
    });
  });

  describe("Scenario 5: Rate Limit Validation (Verify limits are enforced)", () => {
    it("should enforce rate limits on auth endpoints", async () => {
      const testEmail = `rate-limit-load-${Date.now()}@imbobi.test`;

      // Try to exceed auth rate limit (10 req/min)
      let successCount = 0;
      let rateLimitedCount = 0;

      for (let i = 0; i < 15; i++) {
        const res = await request(app.getHttpServer())
          .post("/api/v1/auth/login")
          .send({ email: testEmail, password: "TestPass@123" });

        if (res.status === 200 || res.status === 401) {
          successCount++;
        } else if (res.status === 429) {
          rateLimitedCount++;
        }
      }

      // Should eventually hit rate limit
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe("Performance Report", () => {
    it("should generate comprehensive performance report", () => {
      const metrics = loadTester.getMetrics();

      console.log("\n\n╔════════════════════════════════════════════════════════════════════╗");
      console.log("║             IMOBI API - LOAD TEST PERFORMANCE REPORT                ║");
      console.log("╚════════════════════════════════════════════════════════════════════╝\n");

      metrics.forEach((m) => {
        console.log(`\n${m.method} ${m.endpoint}`);
        console.log("  ├─ Requests:      " + m.totalRequests);
        console.log("  ├─ Errors:        " + m.errorCount + ` (${m.errorRate})`);
        console.log(
          `  ├─ Response Time: min=${m.min}ms, avg=${m.avg.toFixed(2)}ms, p50=${m.p50}ms, p95=${m.p95}ms, p99=${m.p99}ms, max=${m.max}ms`
        );
        if (m.cacheHitRate) {
          console.log(`  ├─ Cache Hit Rate: ${m.cacheHitRate}`);
        }
        console.log("  └─ Status:        " + (m.p95 < 500 ? "✓ PASS" : "⚠ SLOW"));
      });

      console.log("\n");
      expect(metrics.length).toBeGreaterThan(0);
    });
  });
});
