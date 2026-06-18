import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

const EMAIL_PREFIX = "auth-test-";

let _seq = 0;
function makeUser(overrides: Record<string, unknown> = {}) {
  const seq = ++_seq;
  const ts = Date.now();
  return {
    nome: "Auth Test User",
    cpf: String(ts + seq).slice(-11).padStart(11, "0"),
    email: `${EMAIL_PREFIX}${ts}-${seq}@imbobi.com`,
    telefone: "11999999999",
    senha: "Senha@123",
    consentidoTermos: true,
    consentidoPrivacy: true,
    consentidoKyc: true,
    consentidoMarketing: false,
    ...overrides,
  };
}

describe("Auth E2E - Comprehensive Suite", () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
      where: { email: { startsWith: EMAIL_PREFIX } },
    });
    await app.close();
  });

  // ─── Registration ─────────────────────────────────────────────────────────

  describe("Registration", () => {
    it("POST /auth/registrar → 201 with valid data", async () => {
      const user = makeUser();
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(user)
        .expect(201);

      expect(res.body.usuario).toHaveProperty("usuarioId");
      expect(res.body.usuario).toHaveProperty("email", user.email);
      expect(res.body.usuario).toHaveProperty("nome", user.nome);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
    });

    it("POST /auth/registrar → 400 with missing email", async () => {
      const { email: _e, ...noEmail } = makeUser();
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(noEmail)
        .expect(400);
      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/registrar → 400 with missing senha", async () => {
      const { senha: _s, ...noSenha } = makeUser();
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(noSenha)
        .expect(400);
      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/registrar → 400 with missing nome", async () => {
      const { nome: _n, ...noNome } = makeUser();
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(noNome)
        .expect(400);
      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/registrar → 400 with invalid email format", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(makeUser({ email: "not-an-email" }))
        .expect(400);
      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/registrar → 400 with weak senha (too short)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(makeUser({ senha: "A1b" }))
        .expect(400);
      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/registrar → 400 with senha missing uppercase", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(makeUser({ senha: "abcdefg1" }))
        .expect(400);
      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/registrar → 400 with invalid CPF (too short)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(makeUser({ cpf: "1234" }))
        .expect(400);
      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/registrar → 409 with duplicate email", async () => {
      const user = makeUser();
      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(user)
        .expect(201);

      const seq2 = ++_seq;
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ ...user, cpf: String(Date.now() + seq2).slice(-11).padStart(11, "0") })
        .expect(409);
      expect(res.body.message).toBeDefined();
    });

    it("User created in database with hashed password", async () => {
      const user = makeUser();
      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(user)
        .expect(201);

      const dbUser = await prisma.usuario.findUnique({ where: { email: user.email } });
      expect(dbUser).toBeDefined();
      expect(dbUser?.passwordHash).not.toEqual(user.senha);
      expect(dbUser?.passwordHash?.length).toBeGreaterThanOrEqual(60);
    });
  });

  // ─── Login ────────────────────────────────────────────────────────────────

  describe("Login", () => {
    let testUser: ReturnType<typeof makeUser>;

    beforeAll(async () => {
      testUser = makeUser();
      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(testUser);
    });

    it("POST /auth/login → 200 with valid credentials", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: testUser.email, senha: testUser.senha })
        .expect(200);

      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
      expect(res.body).toHaveProperty("usuario");
      expect(res.body.usuario).toHaveProperty("usuarioId");
      expect(res.body.usuario).toHaveProperty("email", testUser.email);
    });

    it("POST /auth/login → 401 with wrong senha", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: testUser.email, senha: "WrongPass@999" })
        .expect(401);
      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/login → 401 with non-existent email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: "nobody@imbobi.com", senha: testUser.senha })
        .expect(401);
      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/login → 400 with missing email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ senha: testUser.senha })
        .expect(400);
      expect(res.body.message).toBeDefined();
    });

    it("POST /auth/login → 400 with missing senha", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: testUser.email })
        .expect(400);
      expect(res.body.message).toBeDefined();
    });

    it("accessToken is valid JWT with 3 parts", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: testUser.email, senha: testUser.senha })
        .expect(200);

      const parts = res.body.accessToken.split(".");
      expect(parts).toHaveLength(3);
    });

    it("accessToken is usable for authenticated endpoints", async () => {
      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: testUser.email, senha: testUser.senha })
        .expect(200);

      const token = loginRes.body.accessToken;

      const res = await request(app.getHttpServer())
        .get("/api/v1/usuarios/meu-perfil")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty("usuarioId");
      expect(res.body).toHaveProperty("email", testUser.email);
    });
  });

  // ─── Token Refresh ────────────────────────────────────────────────────────

  describe("Token Refresh", () => {
    let testUser: ReturnType<typeof makeUser>;
    let refreshToken: string;

    beforeAll(async () => {
      testUser = makeUser();
      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(testUser);

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: testUser.email, senha: testUser.senha });

      refreshToken = loginRes.body.refreshToken;
    });

    it("POST /auth/renovar → 200 with valid refresh token", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/renovar")
        .send({ refreshToken })
        .expect(200);

      expect(res.body).toHaveProperty("accessToken");
      expect(res.body.accessToken).not.toEqual("");
    });

    it("POST /auth/renovar → 401 with invalid refresh token", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/renovar")
        .send({ refreshToken: "not-a-real-token" })
        .expect(401);
      expect(res.body.message).toBeDefined();
    });

    it("New accessToken from renovar is valid for authenticated endpoints", async () => {
      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: testUser.email, senha: testUser.senha });
      const freshRefresh = loginRes.body.refreshToken;

      const refreshRes = await request(app.getHttpServer())
        .post("/api/v1/auth/renovar")
        .send({ refreshToken: freshRefresh })
        .expect(200);

      const newToken = refreshRes.body.accessToken;
      const res = await request(app.getHttpServer())
        .get("/api/v1/usuarios/meu-perfil")
        .set("Authorization", `Bearer ${newToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("email", testUser.email);
    });
  });

  // ─── Logout ───────────────────────────────────────────────────────────────

  describe("Logout", () => {
    let testUser: ReturnType<typeof makeUser>;
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      testUser = makeUser();
      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(testUser);

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: testUser.email, senha: testUser.senha });

      accessToken = loginRes.body.accessToken;
      refreshToken = loginRes.body.refreshToken;
    });

    it("POST /auth/logout → 204 with valid token and refreshToken in body", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(204);
    });

    it("Refresh token is unusable after logout (renovar → 401)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/renovar")
        .send({ refreshToken });
      expect(res.status).toBe(401);
    });

    it("POST /auth/logout → 401 without Authorization header", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/logout")
        .send({ refreshToken })
        .expect(401);
      expect(res.body.message).toBeDefined();
    });
  });

  // ─── Authenticated Endpoints ──────────────────────────────────────────────

  describe("Authenticated Endpoints", () => {
    let accessToken: string;
    let userId: string;

    beforeAll(async () => {
      const user = makeUser();
      const regRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send(user);

      userId = regRes.body.usuario?.usuarioId;

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: user.email, senha: user.senha });

      accessToken = loginRes.body.accessToken;
    });

    it("GET /usuarios/meu-perfil → 200 with valid token", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/usuarios/meu-perfil")
        .set("Authorization", `Bearer ${accessToken}`)
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

    it("GET /usuarios/meu-perfil → 401 with malformed token", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/usuarios/meu-perfil")
        .set("Authorization", "Bearer not.valid.token")
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

  // ─── JWT Payload ──────────────────────────────────────────────────────────

  describe("JWT Payload", () => {
    it("accessToken has valid exp claim in the future", async () => {
      const user = makeUser();
      await request(app.getHttpServer()).post("/api/v1/auth/registrar").send(user);

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: user.email, senha: user.senha });

      const token = loginRes.body.accessToken;
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());

      expect(payload).toHaveProperty("exp");
      expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it("accessToken payload contains sub, role and email", async () => {
      const user = makeUser();
      await request(app.getHttpServer()).post("/api/v1/auth/registrar").send(user);

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: user.email, senha: user.senha });

      const token = loginRes.body.accessToken;
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());

      expect(payload).toHaveProperty("sub");
      expect(payload).toHaveProperty("role");
      expect(payload).toHaveProperty("email", user.email);
    });

    it("refreshToken is present and non-empty", async () => {
      const user = makeUser();
      await request(app.getHttpServer()).post("/api/v1/auth/registrar").send(user);

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: user.email, senha: user.senha });

      expect(loginRes.body.refreshToken).toBeDefined();
      expect(typeof loginRes.body.refreshToken).toBe("string");
      expect(loginRes.body.refreshToken.length).toBeGreaterThan(0);
    });
  });
});
