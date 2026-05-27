import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../app.module";
import { PrismaService } from "../modules/prisma/prisma.service";

describe("Auth E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testUser = {
    email: `test-${Date.now()}@imbobi.com`,
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
    await prisma.usuario.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  describe("User Registration", () => {
    it("Register user - happy path", async () => {
      const registerRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(testUser)
        .expect(201);

      expect(registerRes.body).toHaveProperty("usuarioId");
      expect(registerRes.body).toHaveProperty("email", testUser.email);
      expect(registerRes.body).toHaveProperty("nome", testUser.nome);
    });

    it("Register user - reject duplicate email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(testUser);

      expect(res.status).toBe(409);
    });

    it("Register user - reject invalid email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: "invalid-email",
          password: "Senha@123",
          nome: "Test",
        });

      expect(res.status).toBe(400);
    });

    it("Register user - reject weak password", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: `weak-${Date.now()}@imbobi.com`,
          password: "123",
          nome: "Test",
        });

      expect(res.status).toBe(400);
    });

    it("Register user - reject missing fields", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: `test-${Date.now()}@imbobi.com`,
          // Missing password and nome
        });

      expect(res.status).toBe(400);
    });
  });

  describe("User Login", () => {
    it("Login user - happy path", async () => {
      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(loginRes.body).toHaveProperty("access_token");
      expect(loginRes.body).toHaveProperty("refresh_token");
      expect(typeof loginRes.body.access_token).toBe("string");
    });

    it("Login user - reject wrong password", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: testUser.email,
          password: "WrongPassword123",
        });

      expect(res.status).toBe(401);
    });

    it("Login user - reject non-existent user", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: `nonexistent-${Date.now()}@imbobi.com`,
          password: "Senha@123",
        });

      expect(res.status).toBe(401);
    });

    it("Login user - reject missing credentials", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: testUser.email,
          // Missing password
        });

      expect(res.status).toBe(400);
    });
  });

  describe("User Profile", () => {
    it("Register → Login → Get Profile", async () => {
      const email = `profile-test-${Date.now()}@imbobi.com`;
      const userData = {
        email,
        password: "Senha@123",
        nome: "Profile Test User",
      };

      // Register
      const registerRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(userData)
        .expect(201);

      expect(registerRes.body).toHaveProperty("usuarioId");
      const userId = registerRes.body.usuarioId;

      // Login
      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email,
          password: "Senha@123",
        })
        .expect(200);

      expect(loginRes.body).toHaveProperty("access_token");
      const token = loginRes.body.access_token;

      // Get Profile
      const profileRes = await request(app.getHttpServer())
        .get("/api/v1/usuarios/meu-perfil")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(profileRes.body).toHaveProperty("usuarioId", userId);
      expect(profileRes.body).toHaveProperty("email", email);
      expect(profileRes.body).toHaveProperty("nome", userData.nome);
    });

    it("Get profile - reject without authentication", async () => {
      const res = await request(app.getHttpServer()).get(
        "/api/v1/usuarios/meu-perfil"
      );

      expect(res.status).toBe(401);
    });

    it("Get profile - reject with invalid token", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/usuarios/meu-perfil")
        .set("Authorization", "Bearer invalid-token");

      expect(res.status).toBe(401);
    });
  });

  describe("Token Management", () => {
    it("Login should return both access and refresh tokens", async () => {
      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(loginRes.body).toHaveProperty("access_token");
      expect(loginRes.body).toHaveProperty("refresh_token");
      expect(loginRes.body.access_token).not.toBe(
        loginRes.body.refresh_token
      );
    });

    it("Access token should be JWT", async () => {
      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const token = loginRes.body.access_token;
      const parts = token.split(".");
      expect(parts.length).toBe(3); // JWT format: header.payload.signature
    });
  });
});
