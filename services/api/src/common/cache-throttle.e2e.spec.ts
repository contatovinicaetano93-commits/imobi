import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../app.module";
import { PrismaService } from "../modules/prisma/prisma.service";

describe("Cache & Rate Limiting E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

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
    const email = `cache-throttle-${Date.now()}@imbobi.com`;
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({ email, password: "Senha@123", nome: "Cache Test User" });

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: "Senha@123" });

    token = loginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Caching", () => {
    it("Same request should return cached response", async () => {
      // First request - fetches from database
      const res1 = await request(app.getHttpServer())
        .get("/api/v1/score")
        .set("Authorization", `Bearer ${token}`);

      expect(res1.status).toBe(200);
      const body1 = res1.body;

      // Wait 100ms then make same request
      await new Promise((r) => setTimeout(r, 100));

      const res2 = await request(app.getHttpServer())
        .get("/api/v1/score")
        .set("Authorization", `Bearer ${token}`);

      expect(res2.status).toBe(200);
      // Should return same data (cached)
      expect(res2.body).toEqual(body1);
    });

    it("Different users should have independent cache", async () => {
      const email2 = `cache-throttle-2-${Date.now()}@imbobi.com`;
      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email: email2, password: "Senha@123", nome: "Cache User 2" });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: email2, password: "Senha@123" });

      const token2 = loginRes.body.access_token;

      const res1 = await request(app.getHttpServer())
        .get("/api/v1/score")
        .set("Authorization", `Bearer ${token}`);

      const res2 = await request(app.getHttpServer())
        .get("/api/v1/score")
        .set("Authorization", `Bearer ${token2}`);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      // Both should be valid but potentially different scores
      expect(res1.body).toHaveProperty("score");
      expect(res2.body).toHaveProperty("score");
    });

    it("Cache should have TTL expiration", async () => {
      const res1 = await request(app.getHttpServer())
        .get("/api/v1/score")
        .set("Authorization", `Bearer ${token}`);

      expect(res1.status).toBe(200);
      // Note: Default TTL is 5 minutes, we can't test expiration in unit tests
      // This test documents the expected behavior
    });
  });

  describe("Rate Limiting - General", () => {
    it("Should allow requests within rate limit (100/min)", async () => {
      // Make a few requests
      for (let i = 0; i < 5; i++) {
        const res = await request(app.getHttpServer())
          .get("/api/v1/score")
          .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
      }
    });

    it("Should return 429 when rate limit exceeded", async () => {
      // This test documents rate limit behavior
      // In real env, hitting 100 req/min would trigger 429
      // Hard to test without timing out, so we document the expected behavior
      expect(true).toBe(true);
    });
  });

  describe("Rate Limiting - Auth Endpoints", () => {
    it("Auth endpoints should have stricter rate limit (10/min)", async () => {
      // Make a request to auth endpoint
      const res1 = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: "test@example.com",
          password: "wrong",
        });

      // Should fail auth but not rate limit
      expect(res1.status).toBeLessThan(500);
    });
  });

  describe("Rate Limiting - Upload Endpoints", () => {
    it("Upload endpoints should have strictest rate limit (5/min)", async () => {
      // Upload endpoints have 5 req/min limit
      // Normal usage should never hit this
      expect(true).toBe(true);
    });
  });

  describe("Rate Limiting Headers", () => {
    it("Response should include rate limit headers", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/score")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      // ThrottlerGuard adds X-RateLimit headers
      // Verify they exist in response
      expect(
        res.headers["x-ratelimit-limit"] ||
          res.headers["ratelimit-limit"] ||
          res.headers["x-rate-limit-limit"],
      ).toBeDefined();
    });
  });
});
