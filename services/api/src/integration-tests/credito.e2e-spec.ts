import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../app.module";

describe("Credit Simulator Integration Tests", () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Register and login test user
    const signup = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email: "creditotest@example.com",
        password: "SecurePass123!@#",
        nome: "Credit Test User",
        cpf: "11144477741",
        celular: "11999999999",
      });

    accessToken = signup.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/v1/credito/simular", () => {
    it("should simulate credit correctly", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          valor: 50000, // R$50,000
          prazo: 36, // 36 months
        })
        .expect(201);

      expect(response.body).toHaveProperty("parcelas");
      expect(response.body).toHaveProperty("juros");
      expect(response.body).toHaveProperty("cet");
      expect(response.body.valor).toBe(50000);
      expect(response.body.prazo).toBe(36);

      // Validate calculations
      expect(response.body.parcelas).toBeGreaterThan(0);
      expect(response.body.juros).toBeGreaterThan(0);
      expect(response.body.cet).toBeGreaterThan(0);
    });

    it("should reject valor below minimum", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          valor: 5000, // Below R$10,000 minimum
          prazo: 36,
        })
        .expect(400);
    });

    it("should reject valor above maximum", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          valor: 2000000, // Above R$1,000,000 maximum
          prazo: 36,
        })
        .expect(400);
    });

    it("should reject prazo below minimum", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          valor: 50000,
          prazo: 6, // Below 12 months minimum
        })
        .expect(400);
    });

    it("should reject prazo above maximum", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          valor: 50000,
          prazo: 240, // Above 180 months maximum
        })
        .expect(400);
    });

    it("should calculate different rates for different amounts", async () => {
      const simulation1 = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          valor: 10000,
          prazo: 12,
        })
        .expect(201);

      const simulation2 = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          valor: 500000,
          prazo: 12,
        })
        .expect(201);

      // Higher amounts typically have better rates
      expect(simulation2.body.cet).toBeLessThan(simulation1.body.cet);
    });

    it("should calculate different rates for different terms", async () => {
      const shortTerm = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          valor: 100000,
          prazo: 12,
        })
        .expect(201);

      const longTerm = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          valor: 100000,
          prazo: 60,
        })
        .expect(201);

      // Longer terms typically have higher rates
      expect(longTerm.body.cet).toBeGreaterThan(shortTerm.body.cet);
    });

    it("should reject unauthorized request", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valor: 50000,
          prazo: 36,
        })
        .expect(401);
    });

    it("should include calculated monthly installment", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          valor: 100000,
          prazo: 36,
        })
        .expect(201);

      const expectedMonthly = response.body.parcelas;
      expect(expectedMonthly).toBeLessThan(100000 / 36 + 100000 * 0.1); // Basic validation
      expect(expectedMonthly).toBeGreaterThan(100000 / 36); // Greater than base amount
    });
  });

  describe("GET /api/v1/credito/simulacoes", () => {
    it("should list user simulations", async () => {
      // First create some simulations
      await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          valor: 50000,
          prazo: 36,
        });

      const response = await request(app.getHttpServer())
        .get("/api/v1/credito/simulacoes")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);

      // Verify structure
      response.body.forEach((sim: any) => {
        expect(sim).toHaveProperty("valor");
        expect(sim).toHaveProperty("prazo");
        expect(sim).toHaveProperty("parcelas");
        expect(sim).toHaveProperty("createdAt");
      });
    });

    it("should reject unauthorized request", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/credito/simulacoes")
        .expect(401);
    });
  });
});
