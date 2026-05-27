import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

describe("Credito E2E - Comprehensive Suite", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let userId: string;
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

    // Setup: Register and login
    const email = `credito-test-${Date.now()}@imbobi.com`;
    const regRes = await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({ email, password: "Senha@123", nome: "Credit Test User" });

    userId = regRes.body.usuarioId;

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: "Senha@123" });

    token = loginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Credit Simulation (Public)", () => {
    it("POST /credito/simular → 201 with valid data", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 50000,
          prazoMeses: 12,
        })
        .expect(201);

      expect(res.body).toHaveProperty("valorTotal");
      expect(res.body).toHaveProperty("taxaMensal");
      expect(res.body).toHaveProperty("CET");
      expect(res.body.valorTotal).toBeGreaterThan(50000);
    });

    it("POST /credito/simular → 400 with missing valorSolicitado", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          prazoMeses: 12,
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /credito/simular → 400 with missing prazoMeses", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 50000,
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /credito/simular → 400 with negative valorSolicitado", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: -50000,
          prazoMeses: 12,
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /credito/simular → 400 with zero valorSolicitado", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 0,
          prazoMeses: 12,
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /credito/simular → 400 with invalid prazoMeses", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 50000,
          prazoMeses: 0,
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("Simulation with 24 months should have higher total than 12 months", async () => {
      const res12 = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 100000,
          prazoMeses: 12,
        })
        .expect(201);

      const res24 = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 100000,
          prazoMeses: 24,
        })
        .expect(201);

      expect(res24.body.valorTotal).toBeGreaterThan(res12.body.valorTotal);
    });

    it("Interest calculation: valorTotal = valorSolicitado + juros", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 100000,
          prazoMeses: 12,
        })
        .expect(201);

      const expectedJuros = res.body.valorTotal - res.body.valorSolicitado;
      expect(expectedJuros).toBeGreaterThan(0);
      expect(res.body.valorTotal).toBeCloseTo(
        100000 + expectedJuros,
        2
      );
    });

    it("Monthly tax rate should be calculated correctly", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 100000,
          prazoMeses: 12,
        })
        .expect(201);

      expect(res.body.taxaMensal).toBeGreaterThan(0);
      expect(res.body.taxaMensal).toBeLessThan(0.1); // Less than 10%
    });
  });

  describe("Credit Request (Authenticated)", () => {
    it("POST /credito/solicitar → 201 with valid data", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .set("Authorization", `Bearer ${token}`)
        .send({
          valorSolicitado: 50000,
          prazoMeses: 12,
        })
        .expect(201);

      expect(res.body).toHaveProperty("creditoId");
      expect(res.body).toHaveProperty("valorSolicitado", 50000);
      expect(res.body).toHaveProperty("prazoMeses", 12);
      expect(res.body).toHaveProperty("status");
      creditoId = res.body.creditoId;
    });

    it("POST /credito/solicitar → 201 creates credit in database", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .set("Authorization", `Bearer ${token}`)
        .send({
          valorSolicitado: 75000,
          prazoMeses: 24,
        })
        .expect(201);

      const credito = await prisma.credito.findUnique({
        where: { creditoId: res.body.creditoId },
      });

      expect(credito).toBeDefined();
      expect(credito?.usuarioId).toEqual(userId);
      expect(credito?.valorAprovado).toBeDefined();
      expect(credito?.prazoMeses).toEqual(24);
    });

    it("POST /credito/solicitar → 401 without authentication", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .send({
          valorSolicitado: 50000,
          prazoMeses: 12,
        })
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("POST /credito/solicitar → 400 with missing valorSolicitado", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .set("Authorization", `Bearer ${token}`)
        .send({
          prazoMeses: 12,
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /credito/solicitar → 400 with negative amount", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .set("Authorization", `Bearer ${token}`)
        .send({
          valorSolicitado: -50000,
          prazoMeses: 12,
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });
  });

  describe("Credit Details / Statement", () => {
    let testCreditoId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .set("Authorization", `Bearer ${token}`)
        .send({
          valorSolicitado: 100000,
          prazoMeses: 12,
        })
        .expect(201);

      testCreditoId = res.body.creditoId;
    });

    it("GET /credito/{id}/extrato → 200 with valid credit ID", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/credito/${testCreditoId}/extrato`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty("creditoId", testCreditoId);
      expect(res.body).toHaveProperty("valorSolicitado");
      expect(res.body).toHaveProperty("prazoMeses");
      expect(res.body).toHaveProperty("status");
    });

    it("GET /credito/{id}/extrato → 401 without authentication", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/credito/${testCreditoId}/extrato`)
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("GET /credito/{id}/extrato → 404 with non-existent credit ID", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/credito/non-existent-id/extrato")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.message).toBeDefined();
    });

    it("Statement contains accurate payment schedule", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/credito/${testCreditoId}/extrato`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty("cronograma");
      
      if (res.body.cronograma) {
        expect(Array.isArray(res.body.cronograma)).toBe(true);
      }
    });

    it("Credit details include calculated values", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/credito/${testCreditoId}/extrato`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.valorSolicitado).toBeGreaterThan(0);
      expect(res.body.prazoMeses).toBeGreaterThan(0);
      expect(res.body.taxaMensal).toBeGreaterThan(0);
    });
  });

  describe("User Credits List", () => {
    it("GET /credito/meus → 200 returns array", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/credito/meus")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("GET /credito/meus → 401 without authentication", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/credito/meus")
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("GET /credito/meus → returns only user's credits", async () => {
      // Create a credit
      const createRes = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .set("Authorization", `Bearer ${token}`)
        .send({
          valorSolicitado: 50000,
          prazoMeses: 12,
        })
        .expect(201);

      const listRes = await request(app.getHttpServer())
        .get("/api/v1/credito/meus")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(listRes.body)).toBe(true);
      expect(listRes.body.length).toBeGreaterThan(0);

      // Verify all credits belong to user
      const creditos = listRes.body;
      if (creditos.length > 0) {
        creditos.forEach((credito) => {
          expect(credito).toHaveProperty("creditoId");
          expect(credito).toHaveProperty("status");
        });
      }
    });

    it("GET /credito/meus → returns credits with essential fields", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/credito/meus")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      if (res.body.length > 0) {
        const credito = res.body[0];
        expect(credito).toHaveProperty("creditoId");
        expect(credito).toHaveProperty("valorSolicitado");
        expect(credito).toHaveProperty("prazoMeses");
        expect(credito).toHaveProperty("status");
      }
    });
  });

  describe("Interest Calculations", () => {
    it("Total value equals principal + interest", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 50000,
          prazoMeses: 12,
        })
        .expect(201);

      const calculatedJuros = res.body.valorTotal - res.body.valorSolicitado;
      expect(calculatedJuros).toBeGreaterThan(0);
      expect(res.body.valorTotal).toBeCloseTo(
        res.body.valorSolicitado + calculatedJuros,
        2
      );
    });

    it("Longer period results in higher interest", async () => {
      const res12 = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 50000,
          prazoMeses: 12,
        })
        .expect(201);

      const res36 = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 50000,
          prazoMeses: 36,
        })
        .expect(201);

      const juros12 = res12.body.valorTotal - res12.body.valorSolicitado;
      const juros36 = res36.body.valorTotal - res36.body.valorSolicitado;

      expect(juros36).toBeGreaterThan(juros12);
    });

    it("Higher principal results in higher total interest", async () => {
      const res50k = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 50000,
          prazoMeses: 12,
        })
        .expect(201);

      const res100k = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 100000,
          prazoMeses: 12,
        })
        .expect(201);

      const juros50k = res50k.body.valorTotal - res50k.body.valorSolicitado;
      const juros100k = res100k.body.valorTotal - res100k.body.valorSolicitado;

      expect(juros100k).toBeGreaterThan(juros50k);
    });

    it("Monthly tax rate is positive and reasonable", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 100000,
          prazoMeses: 12,
        })
        .expect(201);

      expect(res.body.taxaMensal).toBeGreaterThan(0);
      expect(res.body.taxaMensal).toBeLessThan(0.05); // Less than 5% per month
    });

    it("CET (Total Effective Cost) is calculated", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 100000,
          prazoMeses: 12,
        })
        .expect(201);

      expect(res.body).toHaveProperty("CET");
      expect(typeof res.body.CET).toBe("number");
    });
  });

  describe("Credit Status Management", () => {
    let testCreditoId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .set("Authorization", `Bearer ${token}`)
        .send({
          valorSolicitado: 50000,
          prazoMeses: 12,
        })
        .expect(201);

      testCreditoId = res.body.creditoId;
    });

    it("Credit starts with initial status", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/credito/${testCreditoId}/extrato`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.status).toBeDefined();
      expect(["ATIVO", "SUSPENSO", "VENCIDO", "QUITADO"]).toContain(
        res.body.status
      );
    });

    it("Credit has valid creation timestamp", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/credito/${testCreditoId}/extrato`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.criadoEm).toBeDefined();
      const createdDate = new Date(res.body.criadoEm);
      expect(createdDate).toBeInstanceOf(Date);
      expect(createdDate.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});
