import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

describe("Auth E2E - Comprehensive Suite", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const baseTestUser = {
    email: `auth-test-${Date.now()}@imbobi.com`,
    password: "Senha@123",
    nome: "Test User",
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
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({
      where: {
        email: {
          startsWith: "auth-test-",
        },
      },
    });
    await app.close();
  });

  describe("Registration", () => {
    it("POST /auth/registrar → 201 with valid data", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(baseTestUser)
        .expect(201);

      expect(res.body).toHaveProperty("usuarioId");
      expect(res.body).toHaveProperty("email", baseTestUser.email);
      expect(res.body).toHaveProperty("nome", baseTestUser.nome);
    });

    it("POST /auth/registrar → 400 with missing email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          password: "Senha@123",
          nome: "Test User",
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/registrar → 400 with missing password", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: `test-${Date.now()}@imbobi.com`,
          nome: "Test User",
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/registrar → 400 with missing nome", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: `test-${Date.now()}@imbobi.com`,
          password: "Senha@123",
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/registrar → 400 with invalid email format", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: "invalid-email",
          password: "Senha@123",
          nome: "Test User",
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/registrar → 400 with weak password", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: `test-${Date.now()}@imbobi.com`,
          password: "123",
          nome: "Test User",
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/registrar → 409 with duplicate email", async () => {
      const email = `duplicate-${Date.now()}@imbobi.com`;

      // First registration
      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email,
          password: "Senha@123",
          nome: "First User",
        })
        .expect(201);

      // Second registration with same email
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email,
          password: "Senha@456",
          nome: "Second User",
        })
        .expect(409);

      expect(res.body.message).toBeDefined();
    });

    it("User created in database with hashed password", async () => {
      const email = `db-test-${Date.now()}@imbobi.com`;
      const password = "Senha@123";

      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email,
          password,
          nome: "DB Test User",
        })
        .expect(201);

      const user = await prisma.usuario.findUnique({ where: { email } });
      expect(user).toBeDefined();
      expect(user?.passwordHash).not.toEqual(password);
      expect(user?.passwordHash).toHaveLength(60); // bcrypt hash length
    });
  });

  describe("Login", () => {
    let testEmail: string;
    const testPassword = "Senha@123";

    beforeAll(async () => {
      testEmail = `login-test-${Date.now()}@imbobi.com`;
      await request(app.getHttpServer()).post("/api/v1/auth/registrar").send({
        email: testEmail,
        password: testPassword,
        nome: "Login Test User",
      });
    });

    it("POST /auth/login → 200 with valid credentials", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(res.body).toHaveProperty("access_token");
      expect(res.body).toHaveProperty("refreshToken");
      expect(res.body).toHaveProperty("usuario");
      expect(res.body.usuario).toHaveProperty("usuarioId");
      expect(res.body.usuario).toHaveProperty("email", testEmail);
    });

    it("POST /auth/login → 401 with wrong password", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: testEmail,
          password: "WrongPassword@123",
        })
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/login → 401 with non-existent email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: "nonexistent@imbobi.com",
          password: testPassword,
        })
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/login → 400 with missing email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          password: testPassword,
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/login → 400 with missing password", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: testEmail,
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("Tokens are valid JWT format", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      const accessToken = res.body.access_token;
      const parts = accessToken.split(".");
      expect(parts).toHaveLength(3);
    });

    it("Access token is usable for authenticated endpoints", async () => {
      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      const token = loginRes.body.access_token;

      const res = await request(app.getHttpServer())
        .get("/api/v1/usuarios/meu-perfil")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty("usuarioId");
      expect(res.body).toHaveProperty("email", testEmail);
    });
  });

  describe("Token Refresh", () => {
    let testEmail: string;
    const testPassword = "Senha@123";
    let refreshToken: string;

    beforeAll(async () => {
      testEmail = `refresh-test-${Date.now()}@imbobi.com`;
      await request(app.getHttpServer()).post("/api/v1/auth/registrar").send({
        email: testEmail,
        password: testPassword,
        nome: "Refresh Test User",
      });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: testEmail,
          password: testPassword,
        });

      refreshToken = loginRes.body.refreshToken;
    });

    it("POST /auth/renovar → 200 with valid refresh token", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/renovar")
        .send({ refreshToken })
        .expect(200);

      expect(res.body).toHaveProperty("access_token");
      expect(res.body.access_token).not.toEqual("");
    });

    it("POST /auth/renovar → 401 with invalid refresh token", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/renovar")
        .send({ refreshToken: "invalid-token" })
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("New access token is valid for authenticated endpoints", async () => {
      const refreshRes = await request(app.getHttpServer())
        .post("/api/v1/auth/renovar")
        .send({ refreshToken })
        .expect(200);

      const newToken = refreshRes.body.access_token;

      const res = await request(app.getHttpServer())
        .get("/api/v1/usuarios/meu-perfil")
        .set("Authorization", `Bearer ${newToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("email", testEmail);
    });
  });

  describe("Logout", () => {
    let testEmail: string;
    const testPassword = "Senha@123";
    let refreshToken: string;

    beforeAll(async () => {
      testEmail = `logout-test-${Date.now()}@imbobi.com`;
      await request(app.getHttpServer()).post("/api/v1/auth/registrar").send({
        email: testEmail,
        password: testPassword,
        nome: "Logout Test User",
      });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: testEmail,
          password: testPassword,
        });

      refreshToken = loginRes.body.refreshToken;
    });

    it("POST /auth/logout → 204 with valid refresh token", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/auth/logout")
        .send({ refreshToken })
        .expect(204);
    });

    it("Refresh token is revoked after logout", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/renovar")
        .send({ refreshToken });

      expect(res.status).toBe(401);
    });

    it("POST /auth/logout → 400 with missing token", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/logout")
        .send({})
        .expect(400);

      expect(res.body.message).toBeDefined();
    });
  });

  describe("Authenticated Endpoints", () => {
    let token: string;
    let userId: string;

    beforeAll(async () => {
      const email = `auth-endpoints-${Date.now()}@imbobi.com`;
      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email,
          password: "Senha@123",
          nome: "Auth Endpoints User",
        });

      userId = loginRes.body.usuarioId;

      const login = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email,
          password: "Senha@123",
        });

      token = login.body.access_token;
    });

    it("GET /usuarios/meu-perfil → 200 with valid token", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/usuarios/meu-perfil")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty("usuarioId", userId);
      expect(res.body).toHaveProperty("nome");
      expect(res.body).toHaveProperty("email");
    });

    it("GET /usuarios/meu-perfil → 401 without token", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/usuarios/meu-perfil")
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("GET /usuarios/meu-perfil → 401 with invalid token", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/usuarios/meu-perfil")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("GET /usuarios/meu-perfil → 401 with expired token (simulated)", async () => {
      const expiredToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjowfQ.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ";

      const res = await request(app.getHttpServer())
        .get("/api/v1/usuarios/meu-perfil")
        .set("Authorization", `Bearer ${expiredToken}`)
        .expect(401);

      expect(res.body.message).toBeDefined();
    });
  });

  describe("JWT Expiry Handling", () => {
    it("Access token should have expiry claim", async () => {
      const email = `jwt-test-${Date.now()}@imbobi.com`;
      await request(app.getHttpServer()).post("/api/v1/auth/registrar").send({
        email,
        password: "Senha@123",
        nome: "JWT Test User",
      });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email,
          password: "Senha@123",
        });

      const token = loginRes.body.access_token;
      const parts = token.split(".");
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());

      expect(payload).toHaveProperty("exp");
      expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it("Refresh token should have expiry claim", async () => {
      const email = `refresh-jwt-test-${Date.now()}@imbobi.com`;
      await request(app.getHttpServer()).post("/api/v1/auth/registrar").send({
        email,
        password: "Senha@123",
        nome: "Refresh JWT Test User",
      });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email,
          password: "Senha@123",
        });

      const refreshToken = loginRes.body.refreshToken;

      if (refreshToken.includes(".")) {
        const parts = refreshToken.split(".");
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
        expect(payload).toHaveProperty("exp");
      }
    });
  });
});
