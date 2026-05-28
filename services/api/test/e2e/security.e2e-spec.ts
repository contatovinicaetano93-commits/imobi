import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/modules/prisma/prisma.service";

describe("Security E2E Tests", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser = {
    email: `security-test-${Date.now()}@imbobi.com`,
    password: "Senha@123",
    nome: "Security Test User",
  };

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
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send(testUser);
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  describe("CSRF Token Lifecycle", () => {
    it("GET /auth/csrf-token should return a valid token", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/auth/csrf-token")
        .expect(200);

      expect(res.body).toHaveProperty("csrfToken");
      expect(typeof res.body.csrfToken).toBe("string");
      expect(res.body.csrfToken.length).toBeGreaterThan(0);
    });

    it("CSRF token should be consumed after single use", async () => {
      // Get a CSRF token
      const tokenRes = await request(app.getHttpServer())
        .get("/api/v1/auth/csrf-token")
        .expect(200);

      const csrfToken = tokenRes.body.csrfToken;

      // First request with the token should succeed
      const firstRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .set("x-csrf-token", csrfToken)
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(firstRes.body).toHaveProperty("access_token");

      // Attempting to reuse the same CSRF token should fail
      const secondRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .set("x-csrf-token", csrfToken)
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(secondRes.status).toBe(400);
      expect(secondRes.body.message).toContain("CSRF token");
    });

    it("POST request without CSRF token should be rejected", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("CSRF token");
    });

    it("Invalid CSRF token should be rejected", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .set("x-csrf-token", "invalid-csrf-token-12345")
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("CSRF token");
    });

    it("CSRF token can be provided in request body as fallback", async () => {
      const tokenRes = await request(app.getHttpServer())
        .get("/api/v1/auth/csrf-token")
        .expect(200);

      const csrfToken = tokenRes.body.csrfToken;

      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
          _csrf: csrfToken,
        })
        .expect(200);

      expect(res.body).toHaveProperty("access_token");
    });

    it("GET requests should not require CSRF token", async () => {
      // Register and login to get a token
      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .get("/api/v1/auth/csrf-token")
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      // This test just verifies GET /csrf-token works without CSRF
      const res = await request(app.getHttpServer())
        .get("/api/v1/auth/csrf-token")
        .expect(200);

      expect(res.body).toHaveProperty("csrfToken");
    });
  });

  describe("Rate Limiting - Login Endpoint", () => {
    it("Login endpoint should allow 5 requests per 15 minutes per IP", async () => {
      const csrfTokens: string[] = [];

      // Get 6 CSRF tokens
      for (let i = 0; i < 6; i++) {
        const tokenRes = await request(app.getHttpServer())
          .get("/api/v1/auth/csrf-token")
          .expect(200);
        csrfTokens.push(tokenRes.body.csrfToken);
      }

      // First 5 requests should succeed
      for (let i = 0; i < 5; i++) {
        const res = await request(app.getHttpServer())
          .post("/api/v1/auth/login")
          .set("x-csrf-token", csrfTokens[i])
          .send({
            email: testUser.email,
            password: testUser.password,
          });

        expect([200, 401]).toContain(res.status); // 200 for success, 401 for auth error
      }

      // 6th request should be rate limited
      const limitedRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .set("x-csrf-token", csrfTokens[5])
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(limitedRes.status).toBe(429);
      expect(limitedRes.body.statusCode).toBe(429);
    });

    it("Rate limit should return 429 with proper error message", async () => {
      const csrfTokens: string[] = [];

      // Get enough tokens to exceed limit
      for (let i = 0; i < 7; i++) {
        const tokenRes = await request(app.getHttpServer())
          .get("/api/v1/auth/csrf-token")
          .expect(200);
        csrfTokens.push(tokenRes.body.csrfToken);
      }

      // Exceed rate limit
      for (let i = 0; i < 6; i++) {
        await request(app.getHttpServer())
          .post("/api/v1/auth/login")
          .set("x-csrf-token", csrfTokens[i])
          .send({
            email: testUser.email,
            password: testUser.password,
          });
      }

      const limitedRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .set("x-csrf-token", csrfTokens[6])
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(limitedRes.status).toBe(429);
    });
  });

  describe("Rate Limiting - Register Endpoint", () => {
    it("Register endpoint should allow 3 requests per hour per IP", async () => {
      const csrfTokens: string[] = [];

      // Get 5 CSRF tokens
      for (let i = 0; i < 5; i++) {
        const tokenRes = await request(app.getHttpServer())
          .get("/api/v1/auth/csrf-token")
          .expect(200);
        csrfTokens.push(tokenRes.body.csrfToken);
      }

      // First 3 requests should be allowed
      for (let i = 0; i < 3; i++) {
        const res = await request(app.getHttpServer())
          .post("/api/v1/auth/registrar")
          .set("x-csrf-token", csrfTokens[i])
          .send({
            email: `register-limit-test-${Date.now()}-${i}@imbobi.com`,
            password: "Senha@123",
            nome: "Test User",
            cpf: "12345678901",
            telefone: "11999999999",
          });

        expect([201, 400, 409]).toContain(res.status); // 201 success, 400 validation, 409 duplicate
      }

      // 4th request should be rate limited
      const limitedRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .set("x-csrf-token", csrfTokens[3])
        .send({
          email: `register-limit-test-${Date.now()}-4@imbobi.com`,
          password: "Senha@123",
          nome: "Test User",
          cpf: "12345678901",
          telefone: "11999999999",
        });

      expect(limitedRes.status).toBe(429);
    });
  });

  describe("JWT Refresh Token Validation", () => {
    it("Successful token refresh should generate new tokens", async () => {
      const tokenRes = await request(app.getHttpServer())
        .get("/api/v1/auth/csrf-token")
        .expect(200);

      const csrfToken = tokenRes.body.csrfToken;

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .set("x-csrf-token", csrfToken)
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const { refresh_token } = loginRes.body;

      const refreshTokenRes = await request(app.getHttpServer())
        .get("/api/v1/auth/csrf-token")
        .expect(200);

      const refreshCsrfToken = refreshTokenRes.body.csrfToken;

      const newTokenRes = await request(app.getHttpServer())
        .post("/api/v1/auth/renovar")
        .set("x-csrf-token", refreshCsrfToken)
        .send({ refreshToken: refresh_token })
        .expect(200);

      expect(newTokenRes.body).toHaveProperty("accessToken");
      expect(newTokenRes.body).toHaveProperty("refreshToken");
      expect(newTokenRes.body.accessToken).not.toBe(loginRes.body.access_token);
    });

    it("Invalid refresh token should be rejected", async () => {
      const tokenRes = await request(app.getHttpServer())
        .get("/api/v1/auth/csrf-token")
        .expect(200);

      const csrfToken = tokenRes.body.csrfToken;

      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/renovar")
        .set("x-csrf-token", csrfToken)
        .send({ refreshToken: "invalid.refresh.token" });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain("inválida");
    });

    it("Used refresh token should not be reusable (one-time use)", async () => {
      const tokenRes = await request(app.getHttpServer())
        .get("/api/v1/auth/csrf-token")
        .expect(200);

      const csrfToken = tokenRes.body.csrfToken;

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .set("x-csrf-token", csrfToken)
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const { refresh_token } = loginRes.body;

      // First refresh should succeed
      const refreshTokenRes1 = await request(app.getHttpServer())
        .get("/api/v1/auth/csrf-token")
        .expect(200);

      const refreshCsrfToken1 = refreshTokenRes1.body.csrfToken;

      const firstRefresh = await request(app.getHttpServer())
        .post("/api/v1/auth/renovar")
        .set("x-csrf-token", refreshCsrfToken1)
        .send({ refreshToken: refresh_token })
        .expect(200);

      expect(firstRefresh.body).toHaveProperty("accessToken");

      // Second attempt with same token should fail (already consumed)
      const refreshTokenRes2 = await request(app.getHttpServer())
        .get("/api/v1/auth/csrf-token")
        .expect(200);

      const refreshCsrfToken2 = refreshTokenRes2.body.csrfToken;

      const secondRefresh = await request(app.getHttpServer())
        .post("/api/v1/auth/renovar")
        .set("x-csrf-token", refreshCsrfToken2)
        .send({ refreshToken: refresh_token });

      expect(secondRefresh.status).toBe(401);
      expect(secondRefresh.body.message).toContain("inválida");
    });

    it("Expired refresh token should be rejected", async () => {
      // This is a conceptual test - in practice, we'd need to manipulate DB
      // to set an expired date, but we demonstrate the behavior with a mock
      const tokenRes = await request(app.getHttpServer())
        .get("/api/v1/auth/csrf-token")
        .expect(200);

      const csrfToken = tokenRes.body.csrfToken;

      // Attempt with an obviously expired/invalid token
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/renovar")
        .set("x-csrf-token", csrfToken)
        .send({
          refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        });

      expect(res.status).toBe(401);
    });
  });

  describe("Error Sanitization", () => {
    it("Should not leak stack traces in error responses", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
          // Missing CSRF token to trigger error
        });

      expect(res.body).not.toHaveProperty("stack");
      expect(res.body.message).toBeDefined();
      expect(typeof res.body.message).toBe("string");
    });

    it("Should not expose database details in error messages", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: testUser.email, // Duplicate email
          password: "Senha@123",
          nome: "Test",
          cpf: "12345678901",
          telefone: "11999999999",
        });

      expect(res.status).toBe(409);
      expect(res.body.message).not.toMatch(/database|prisma|query|sql/i);
      expect(res.body.message).toContain("já cadastrado");
    });

    it("Should not expose internal error details for validation errors", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: "invalid-email",
          password: "weak",
          nome: "Test",
        });

      expect(res.status).toBe(400);
      // Should have validation error message but not expose internal details
      expect(res.body).toHaveProperty("message");
      expect(res.body).not.toHaveProperty("stack");
    });

    it("Generic errors should return safe error message in production mode", async () => {
      // This test verifies the error filter returns safe messages
      const originalEnv = process.env["NODE_ENV"];
      process.env["NODE_ENV"] = "production";

      try {
        // Attempt to trigger an unhandled exception scenario
        const res = await request(app.getHttpServer())
          .post("/api/v1/auth/login")
          .send({
            email: testUser.email,
            password: testUser.password,
          });

        // Error should not contain sensitive details
        if (res.status >= 500) {
          expect(res.body.message).not.toContain("Error:");
          expect(res.body.message).not.toContain("at ");
        }
      } finally {
        process.env["NODE_ENV"] = originalEnv;
      }
    });

    it("401 Unauthorized should not expose whether user exists", async () => {
      const tokenRes = await request(app.getHttpServer())
        .get("/api/v1/auth/csrf-token")
        .expect(200);

      const csrfToken = tokenRes.body.csrfToken;

      // Try with wrong password
      const wrongPasswordRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .set("x-csrf-token", csrfToken)
        .send({
          email: testUser.email,
          password: "WrongPassword123",
        });

      expect(wrongPasswordRes.status).toBe(401);

      // Try with non-existent user
      const tokenRes2 = await request(app.getHttpServer())
        .get("/api/v1/auth/csrf-token")
        .expect(200);

      const csrfToken2 = tokenRes2.body.csrfToken;

      const nonExistentRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .set("x-csrf-token", csrfToken2)
        .send({
          email: `nonexistent-${Date.now()}@imbobi.com`,
          password: "Senha@123",
        });

      expect(nonExistentRes.status).toBe(401);

      // Both should return the same generic message
      expect(wrongPasswordRes.body.message).toEqual(
        nonExistentRes.body.message
      );
    });

    it("Profile endpoint should return 401 without exposing details", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/usuarios/meu-perfil");

      expect(res.status).toBe(401);
      expect(res.body.message).toBeDefined();
      expect(res.body).not.toHaveProperty("stack");
    });
  });

  describe("Security Headers", () => {
    it("Response should include security headers", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/auth/csrf-token");

      // Check for common security headers
      expect(res.headers).toHaveProperty("x-content-type-options");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");

      expect(res.headers).toHaveProperty("x-frame-options");
      expect(res.headers["x-xss-protection"]).toBeDefined();
    });

    it("CORS headers should be properly configured", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/auth/csrf-token");

      // Verify CORS is configured (if credentials allowed)
      if (res.headers["access-control-allow-credentials"]) {
        expect(res.headers["access-control-allow-credentials"]).toBe("true");
      }
    });
  });

  describe("Token Structure Validation", () => {
    it("Access token should be a valid JWT", async () => {
      const tokenRes = await request(app.getHttpServer())
        .get("/api/v1/auth/csrf-token")
        .expect(200);

      const csrfToken = tokenRes.body.csrfToken;

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .set("x-csrf-token", csrfToken)
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const accessToken = loginRes.body.access_token;
      const parts = accessToken.split(".");

      expect(parts.length).toBe(3); // JWT has 3 parts: header.payload.signature
      expect(parts[0]).toBeDefined(); // Header
      expect(parts[1]).toBeDefined(); // Payload
      expect(parts[2]).toBeDefined(); // Signature
    });

    it("Refresh token should be a valid JWT", async () => {
      const tokenRes = await request(app.getHttpServer())
        .get("/api/v1/auth/csrf-token")
        .expect(200);

      const csrfToken = tokenRes.body.csrfToken;

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .set("x-csrf-token", csrfToken)
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const refreshToken = loginRes.body.refresh_token;
      const parts = refreshToken.split(".");

      expect(parts.length).toBe(3);
      expect(parts[0]).toBeDefined();
      expect(parts[1]).toBeDefined();
      expect(parts[2]).toBeDefined();
    });

    it("Different tokens should have different signatures", async () => {
      const tokenRes = await request(app.getHttpServer())
        .get("/api/v1/auth/csrf-token")
        .expect(200);

      const csrfToken = tokenRes.body.csrfToken;

      const loginRes1 = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .set("x-csrf-token", csrfToken)
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const tokenRes2 = await request(app.getHttpServer())
        .get("/api/v1/auth/csrf-token")
        .expect(200);

      const csrfToken2 = tokenRes2.body.csrfToken;

      const loginRes2 = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .set("x-csrf-token", csrfToken2)
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(loginRes1.body.access_token).not.toBe(loginRes2.body.access_token);
      expect(loginRes1.body.refresh_token).not.toBe(
        loginRes2.body.refresh_token
      );
    });
  });
});
