import request from "supertest";
import { PrismaService } from "../prisma/prisma.service";
import { createE2eApp, closeE2eApp } from "../../test/e2e-app";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";

let cadastroSeq = 0;

function cadastroPayload(email: string, overrides: Record<string, unknown> = {}) {
  cadastroSeq += 1;
  const cpf = String(89000000000 + cadastroSeq).padStart(11, "0").slice(-11);
  return {
    nome: "Test User",
    email,
    cpf,
    telefone: "11987654321",
    senha: "Senha@123",
    consentidoTermos: true,
    consentidoPrivacy: true,
    consentidoKyc: true,
    consentidoMarketing: false,
    ...overrides,
  };
}

async function registrarUsuario(
  app: NestFastifyApplication,
  email: string,
  senha = "Senha@123",
) {
  return request(app.getHttpServer())
    .post("/api/v1/auth/registrar")
    .send(cadastroPayload(email, { senha }))
    .expect(201);
}

describe("Auth E2E - Comprehensive Suite", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailPrefix = `auth-test-${Date.now()}`;

  beforeAll(async () => {
    const { app: e2eApp, module } = await createE2eApp();
    app = e2eApp;
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({
      where: { email: { contains: "auth-test-" } },
    });
    await closeE2eApp(app);
  });

  describe("Registration", () => {
    it("POST /auth/registrar → 201 with valid data", async () => {
      const email = `${emailPrefix}-reg@imbobi.com`;
      const res = await registrarUsuario(app, email);

      expect(res.body.usuario).toHaveProperty("usuarioId");
      expect(res.body.usuario).toHaveProperty("email", email);
      expect(res.body.usuario).toHaveProperty("nome", "Test User");
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
    });

    it("POST /auth/registrar → 400 with missing email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(cadastroPayload(`${emailPrefix}-noemail@imbobi.com`, { email: undefined }))
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/registrar → 400 with missing senha", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(cadastroPayload(`${emailPrefix}-nosenha@imbobi.com`, { senha: undefined }))
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/registrar → 400 with missing nome", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(cadastroPayload(`${emailPrefix}-nonome@imbobi.com`, { nome: undefined }))
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/registrar → 400 with invalid email format", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(cadastroPayload(`${emailPrefix}-badmail@imbobi.com`, { email: "invalid-email" }))
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/registrar → 400 with weak senha", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(cadastroPayload(`${emailPrefix}-weak@imbobi.com`, { senha: "123" }))
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/registrar → 409 with duplicate email", async () => {
      const email = `${emailPrefix}-dup@imbobi.com`;

      await registrarUsuario(app, email);

      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(cadastroPayload(email, { cpf: "98765432199" }))
        .expect(409);

      expect(res.body.message).toBeDefined();
    });

    it("User created in database with hashed password", async () => {
      const email = `${emailPrefix}-db@imbobi.com`;
      const senha = "Senha@123";

      await registrarUsuario(app, email, senha);

      const user = await prisma.usuario.findUnique({ where: { email } });
      expect(user).toBeDefined();
      expect(user?.passwordHash).not.toEqual(senha);
      expect(user?.passwordHash).toHaveLength(60);
    });
  });

  describe("Login", () => {
    let testEmail: string;
    const testSenha = "Senha@123";
    let accessToken: string;

    beforeAll(async () => {
      testEmail = `${emailPrefix}-login@imbobi.com`;
      const reg = await registrarUsuario(app, testEmail, testSenha);
      accessToken = reg.body.accessToken;
    });

    it("POST /auth/login → 200 with valid credentials", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: testEmail, senha: testSenha })
        .expect(200);

      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
      expect(res.body).toHaveProperty("usuario");
      expect(res.body.usuario).toHaveProperty("usuarioId");
      expect(res.body.usuario).toHaveProperty("email", testEmail);
    });

    it("POST /auth/login → 401 with wrong senha", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: testEmail, senha: "WrongPassword@123" })
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/login → 401 with non-existent email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: "nonexistent@imbobi.com", senha: testSenha })
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/login → 400 with missing email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ senha: testSenha })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/login → 400 with missing senha", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: testEmail })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("Tokens are valid JWT format", async () => {
      const parts = accessToken.split(".");
      expect(parts).toHaveLength(3);
    });

    it("Access token is usable for authenticated endpoints", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/usuarios/meu-perfil")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("usuarioId");
      expect(res.body).toHaveProperty("email", testEmail);
    });
  });

  describe("Token Refresh", () => {
    let testEmail: string;
    let refreshToken: string;

    beforeAll(async () => {
      testEmail = `${emailPrefix}-refresh@imbobi.com`;
      const reg = await registrarUsuario(app, testEmail);
      refreshToken = reg.body.refreshToken;
    });

    it("POST /auth/renovar → 401 with invalid refresh token", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/renovar")
        .send({ refreshToken: "invalid-token" })
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/renovar → 200 with valid refresh token", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/renovar")
        .send({ refreshToken })
        .expect(200);

      expect(res.body).toHaveProperty("accessToken");
      expect(res.body.accessToken).not.toEqual("");
    });

    it("New access token is valid for authenticated endpoints", async () => {
      const email = `${emailPrefix}-refresh-profile@imbobi.com`;
      const reg = await registrarUsuario(app, email);

      const refreshRes = await request(app.getHttpServer())
        .post("/api/v1/auth/renovar")
        .send({ refreshToken: reg.body.refreshToken })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get("/api/v1/usuarios/meu-perfil")
        .set("Authorization", `Bearer ${refreshRes.body.accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("email", email);
    });
  });

  describe("Logout", () => {
    let testEmail: string;
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      testEmail = `${emailPrefix}-logout@imbobi.com`;
      const reg = await registrarUsuario(app, testEmail);
      accessToken = reg.body.accessToken;
      refreshToken = reg.body.refreshToken;
    });

    it("POST /auth/logout → 204 with valid refresh token", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
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
      const reg = await registrarUsuario(app, `${emailPrefix}-logout-missing@imbobi.com`);

      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${reg.body.accessToken}`)
        .send({})
        .expect(400);

      expect(res.body.message).toBeDefined();
    });
  });

  describe("Authenticated Endpoints", () => {
    let token: string;
    let userId: string;

    beforeAll(async () => {
      const email = `${emailPrefix}-endpoints@imbobi.com`;
      const regRes = await registrarUsuario(app, email);
      userId = regRes.body.usuario.usuarioId;
      token = regRes.body.accessToken;
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
      const email = `${emailPrefix}-jwt@imbobi.com`;
      const reg = await registrarUsuario(app, email);
      const parts = reg.body.accessToken.split(".");
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());

      expect(payload).toHaveProperty("exp");
      expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it("Refresh token should have expiry claim", async () => {
      const email = `${emailPrefix}-refresh-jwt@imbobi.com`;
      const reg = await registrarUsuario(app, email);
      const parts = reg.body.refreshToken.split(".");
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
      expect(payload).toHaveProperty("exp");
    });
  });
});
