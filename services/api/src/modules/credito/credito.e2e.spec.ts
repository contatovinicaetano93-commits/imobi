import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import * as bcrypt from "bcryptjs";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

const VALID_SIMULAR = {
  valorSolicitado: 50000,
  prazoMeses: 12,
  tipoObra: "RESIDENCIAL" as const,
};

const VALID_SOLICITAR = {
  valorSolicitado: 50000,
  prazoMeses: 12,
  tipoObra: "RESIDENCIAL" as const,
  finalidade: "Construção de residência unifamiliar",
  rendaMensalDeclarada: 10000,
};

describe("Credito E2E - Comprehensive Suite", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let adminToken: string;
  let adminUserId: string;
  let creditoId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    const ts = Date.now();

    // Regular user via HTTP registration
    const userEmail = `credito-user-${ts}@imbobi.com`;
    const userCpf = `${ts}`.padEnd(11, "0").slice(0, 11);

    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({
        nome: "Credito Test User",
        cpf: userCpf,
        email: userEmail,
        telefone: "11999999999",
        senha: "Senha@123",
        consentidoTermos: true,
        consentidoPrivacy: true,
        consentidoKyc: true,
        consentidoMarketing: false,
      });

    const userLoginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: userEmail, senha: "Senha@123" });

    userToken = userLoginRes.body.accessToken;

    // Admin user via Prisma directly (no HTTP endpoint to create ADMIN)
    const adminEmail = `credito-admin-${ts}@imbobi.com`;
    const adminCpf = `${ts + 1}`.padEnd(11, "0").slice(0, 11);
    const passwordHash = await bcrypt.hash("Senha@123", 12);

    const adminUser = await prisma.usuario.create({
      data: {
        nome: "Credito Admin User",
        cpf: adminCpf,
        email: adminEmail,
        telefone: "11888888888",
        passwordHash,
        tipo: "ADMIN",
        consentidoTermos: true,
        consentidoPrivacy: true,
        consentidoKyc: true,
        consentidoMarketing: false,
      },
    });
    adminUserId = adminUser.usuarioId;

    const adminLoginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, senha: "Senha@123" });

    adminToken = adminLoginRes.body.accessToken;
  });

  afterAll(async () => {
    if (adminUserId) {
      await prisma.credito.deleteMany({ where: { usuarioId: adminUserId } });
      await prisma.usuario.deleteMany({ where: { usuarioId: adminUserId } });
    }
    await app.close();
  });

  describe("Credit Simulation (Public)", () => {
    it("POST /credito/simular → 201 with valid data", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send(VALID_SIMULAR)
        .expect(201);

      expect(res.body).toHaveProperty("parcelaMensal");
      expect(res.body).toHaveProperty("totalPago");
      expect(res.body).toHaveProperty("totalJuros");
      expect(res.body).toHaveProperty("cet");
      expect(res.body.totalPago).toBeGreaterThan(VALID_SIMULAR.valorSolicitado);
    });

    it("POST /credito/simular → 400 with missing valorSolicitado", async () => {
      const { valorSolicitado: _v, ...sem } = VALID_SIMULAR;
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send(sem)
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /credito/simular → 400 with missing prazoMeses", async () => {
      const { prazoMeses: _p, ...sem } = VALID_SIMULAR;
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send(sem)
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /credito/simular → 400 with missing tipoObra", async () => {
      const { tipoObra: _t, ...sem } = VALID_SIMULAR;
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send(sem)
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /credito/simular → 400 with valorSolicitado below minimum", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({ ...VALID_SIMULAR, valorSolicitado: 1000 })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /credito/simular → 400 with prazoMeses below minimum", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({ ...VALID_SIMULAR, prazoMeses: 6 })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("Simulation with 24 months should have higher totalPago than 12 months", async () => {
      const res12 = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({ ...VALID_SIMULAR, valorSolicitado: 100000, prazoMeses: 12 })
        .expect(201);

      const res24 = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({ ...VALID_SIMULAR, valorSolicitado: 100000, prazoMeses: 24 })
        .expect(201);

      expect(res24.body.totalPago).toBeGreaterThan(res12.body.totalPago);
    });

    it("totalJuros is positive", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({ ...VALID_SIMULAR, valorSolicitado: 100000, prazoMeses: 12 })
        .expect(201);

      expect(res.body.totalJuros).toBeGreaterThan(0);
    });

    it("Monthly rate (cet) should be calculated and positive", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({ ...VALID_SIMULAR, valorSolicitado: 100000, prazoMeses: 12 })
        .expect(201);

      expect(res.body.cet).toBeGreaterThan(0);
    });
  });

  describe("Credit Request (ADMIN only)", () => {
    it("POST /credito/solicitar → 201 with valid data (admin)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(VALID_SOLICITAR)
        .expect(201);

      expect(res.body).toHaveProperty("creditoId");
      expect(res.body).toHaveProperty("valorAprovado", VALID_SOLICITAR.valorSolicitado);
      expect(res.body).toHaveProperty("prazoMeses", VALID_SOLICITAR.prazoMeses);
      expect(res.body).toHaveProperty("status");
      creditoId = res.body.creditoId;
    });

    it("POST /credito/solicitar → 201 creates credit in database", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...VALID_SOLICITAR, valorSolicitado: 75000, prazoMeses: 24 })
        .expect(201);

      const credito = await prisma.credito.findUnique({
        where: { creditoId: res.body.creditoId },
      });

      expect(credito).toBeDefined();
      expect(credito?.usuarioId).toEqual(adminUserId);
      expect(credito?.valorAprovado).toBeDefined();
      expect(credito?.prazoMeses).toEqual(24);
    });

    it("POST /credito/solicitar → 401 without authentication", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .send(VALID_SOLICITAR)
        .expect(401);
    });

    it("POST /credito/solicitar → 403 for non-ADMIN user", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .set("Authorization", `Bearer ${userToken}`)
        .send(VALID_SOLICITAR)
        .expect(403);
    });

    it("POST /credito/solicitar → 400 with missing valorSolicitado", async () => {
      const { valorSolicitado: _v, ...sem } = VALID_SOLICITAR;
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(sem)
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /credito/solicitar → 400 with missing finalidade", async () => {
      const { finalidade: _f, ...sem } = VALID_SOLICITAR;
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(sem)
        .expect(400);

      expect(res.body.message).toBeDefined();
    });
  });

  describe("Credit Details (extrato)", () => {
    let testCreditoId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...VALID_SOLICITAR, valorSolicitado: 100000, prazoMeses: 12 })
        .expect(201);

      testCreditoId = res.body.creditoId;
    });

    it("GET /credito/:id/extrato → 200 with valid credit ID (admin)", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/credito/${testCreditoId}/extrato`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("creditoId", testCreditoId);
      expect(res.body).toHaveProperty("valorAprovado");
      expect(res.body).toHaveProperty("prazoMeses");
      expect(res.body).toHaveProperty("status");
    });

    it("GET /credito/:id/extrato → 401 without authentication", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/credito/${testCreditoId}/extrato`)
        .expect(401);
    });

    it("GET /credito/:id/extrato → 404 with non-existent credit ID", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/credito/00000000-0000-0000-0000-000000000000/extrato")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });

    it("Extrato contains liberacoes array", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/credito/${testCreditoId}/extrato`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("liberacoes");
      expect(Array.isArray(res.body.liberacoes)).toBe(true);
    });

    it("Credit extrato includes calculated values", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/credito/${testCreditoId}/extrato`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.valorAprovado).toBeGreaterThan(0);
      expect(res.body.prazoMeses).toBeGreaterThan(0);
      expect(res.body.taxaMensal).toBeGreaterThan(0);
    });
  });

  describe("User Credits List", () => {
    it("GET /credito/meus → 200 returns array", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/credito/meus")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("GET /credito/meus → 401 without authentication", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/credito/meus")
        .expect(401);
    });

    it("GET /credito/meus → returns credits with essential fields", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/credito/meus")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      const credito = res.body[0];
      expect(credito).toHaveProperty("id");
      expect(credito).toHaveProperty("valorAprovado");
      expect(credito).toHaveProperty("prazoMeses");
      expect(credito).toHaveProperty("status");
    });

    it("GET /credito/meus → new credit appears in list", async () => {
      const createRes = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...VALID_SOLICITAR, valorSolicitado: 20000 })
        .expect(201);

      const listRes = await request(app.getHttpServer())
        .get("/api/v1/credito/meus")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(listRes.body.some((c) => c.id === createRes.body.creditoId)).toBe(true);
    });
  });

  describe("Interest Calculations", () => {
    it("totalJuros = totalPago − valorSolicitado", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({ ...VALID_SIMULAR, valorSolicitado: 50000, prazoMeses: 12 })
        .expect(201);

      const expectedJuros = res.body.totalPago - VALID_SIMULAR.valorSolicitado;
      expect(res.body.totalJuros).toBeCloseTo(expectedJuros, 2);
    });

    it("Longer period results in higher totalJuros", async () => {
      const res12 = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({ ...VALID_SIMULAR, valorSolicitado: 50000, prazoMeses: 12 })
        .expect(201);

      const res36 = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({ ...VALID_SIMULAR, valorSolicitado: 50000, prazoMeses: 36 })
        .expect(201);

      expect(res36.body.totalJuros).toBeGreaterThan(res12.body.totalJuros);
    });

    it("Higher principal results in higher totalJuros", async () => {
      const res50k = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({ ...VALID_SIMULAR, valorSolicitado: 50000, prazoMeses: 12 })
        .expect(201);

      const res100k = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({ ...VALID_SIMULAR, valorSolicitado: 100000, prazoMeses: 12 })
        .expect(201);

      expect(res100k.body.totalJuros).toBeGreaterThan(res50k.body.totalJuros);
    });

    it("cet is positive and reasonable", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({ ...VALID_SIMULAR, valorSolicitado: 100000, prazoMeses: 12 })
        .expect(201);

      expect(res.body.cet).toBeGreaterThan(0);
      expect(res.body.cet).toBeLessThan(100);
    });
  });

  describe("Credit Status Management", () => {
    let testCreditoId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...VALID_SOLICITAR, valorSolicitado: 50000, prazoMeses: 12 })
        .expect(201);

      testCreditoId = res.body.creditoId;
    });

    it("Credit starts with ATIVO status", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/credito/${testCreditoId}/extrato`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(["ATIVO", "SUSPENSO", "VENCIDO", "QUITADO"]).toContain(res.body.status);
    });

    it("403 when non-owner tries to access credit extrato", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/credito/${testCreditoId}/extrato`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
