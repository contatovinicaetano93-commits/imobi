import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

describe("Credito E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
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
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({ email, password: "Senha@123", nome: "Test" });

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: "Senha@123" });

    token = loginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("Request credit", async () => {
    const creditData = {
      valorSolicitado: 50000,
      prazoMeses: 12,
    };

    const res = await request(app.getHttpServer())
      .post("/api/v1/credito/solicitar")
      .set("Authorization", `Bearer ${token}`)
      .send(creditData)
      .expect(201);

    expect(res.body).toHaveProperty("creditoId");
    expect(res.body).toHaveProperty("valorSolicitado", 50000);
    expect(res.body).toHaveProperty("status");
    creditoId = res.body.creditoId;
  });

  it("Get credit details", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/credito/${creditoId}/extrato`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty("creditoId", creditoId);
    expect(res.body).toHaveProperty("valorSolicitado");
    expect(res.body).toHaveProperty("prazoMeses");
  });

  it("List user credits", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/credito/meus")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it("Simulate credit (public endpoint)", async () => {
    const simData = {
      valorSolicitado: 100000,
      prazoMeses: 24,
    };

    const res = await request(app.getHttpServer())
      .post("/api/v1/credito/simular")
      .send(simData)
      .expect(201);

    expect(res.body).toHaveProperty("valorTotal");
    expect(res.body).toHaveProperty("taxaMensal");
    expect(res.body).toHaveProperty("CET");
    expect(res.body.valorTotal).toBeGreaterThan(simData.valorSolicitado);
  });
});
