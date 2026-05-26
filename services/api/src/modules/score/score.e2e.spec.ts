import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

describe("Score E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    const email = `score-test-${Date.now()}@imbobi.com`;
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({ email, password: "Senha@123", nome: "Score User" });

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: "Senha@123" });

    token = loginRes.body.access_token;
    userId = loginRes.body.usuario?.usuarioId;
  });

  afterAll(async () => {
    await app.close();
  });

  it("Should return score for authenticated user", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/score")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("score");
    expect(typeof res.body.score).toBe("number");
    expect(res.body.score).toBeGreaterThanOrEqual(0);
    expect(res.body.score).toBeLessThanOrEqual(1000);
  });

  it("Should return score level", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/score")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("nivel");
    expect(["Excelente", "Bom", "Regular", "Iniciante"]).toContain(res.body.nivel);
  });

  it("Should return score history", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/score/historico")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("New user should start with base score >= 600", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/score")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.score).toBeGreaterThanOrEqual(600);
  });

  it("Should reject unauthenticated request", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/score");
    expect(res.status).toBe(401);
  });
});
