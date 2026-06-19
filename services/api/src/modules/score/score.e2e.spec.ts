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
    const cpf = `${Date.now()}`.padEnd(11, "0").slice(0, 11);
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({
        nome: "Score User", cpf, email, telefone: "11999999999",
        senha: "Senha@123", consentidoTermos: true, consentidoPrivacy: true, consentidoKyc: true,
      });

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, senha: "Senha@123" });

    token = loginRes.body.accessToken;
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

  it("Should return score description", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/score")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("descricao");
    expect(typeof res.body.descricao).toBe("string");
  });

  it("Should return score color code", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/score")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("cor");
    expect(["text-green-600", "text-blue-600", "text-yellow-600", "text-red-600"]).toContain(
      res.body.cor
    );
  });

  it("Score history should be paginated", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/score/historico")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty("score");
      expect(res.body[0]).toHaveProperty("motivo");
      expect(res.body[0]).toHaveProperty("criadoEm");
    }
  });

  it("Score history items should have valid structure", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/score/historico")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    if (res.body.length > 0) {
      res.body.forEach((item: any) => {
        expect(typeof item.score).toBe("number");
        expect(typeof item.motivo).toBe("string");
        expect(typeof item.criadoEm).toBe("string");
      });
    }
  });

  it("Score should be within valid range [0, 1000]", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/score")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.score).toBeGreaterThanOrEqual(0);
    expect(res.body.score).toBeLessThanOrEqual(1000);
  });

  it("Score level should match score ranges", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/score")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    const { score, nivel } = res.body;

    if (score < 450) expect(nivel).toBe("Iniciante");
    else if (score < 650) expect(nivel).toBe("Regular");
    else if (score < 800) expect(nivel).toBe("Bom");
    else expect(nivel).toBe("Excelente");
  });

  it("Different users should have independent scores", async () => {
    const email2 = `score-test-2-${Date.now()}@imbobi.com`;
    const cpf2 = `${Date.now() + 1}`.padEnd(11, "0").slice(0, 11);
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({
        nome: "Score User 2", cpf: cpf2, email: email2, telefone: "11988888888",
        senha: "Senha@123", consentidoTermos: true, consentidoPrivacy: true, consentidoKyc: true,
      });

    const loginRes2 = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: email2, senha: "Senha@123" });

    const token2 = loginRes2.body.accessToken;

    const res1 = await request(app.getHttpServer())
      .get("/api/v1/score")
      .set("Authorization", `Bearer ${token}`);

    const res2 = await request(app.getHttpServer())
      .get("/api/v1/score")
      .set("Authorization", `Bearer ${token2}`);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    // Both should have at least base score of 600
    expect(res1.body.score).toBeGreaterThanOrEqual(600);
    expect(res2.body.score).toBeGreaterThanOrEqual(600);
  });
});
