import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

describe("Evidencias E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let userId: string;
  let obraId: string;
  let etapaId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    // Setup: Register user
    const email = `evidencia-test-${Date.now()}@imbobi.com`;
    const regRes = await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({ email, senha: "Senha@123", nome: "Test User", cpf: "12345678901", telefone: "11999999999" });

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, senha: "Senha@123" });

    token = loginRes.body.accessToken;
    userId = loginRes.body.usuario?.usuarioId || regRes.body.usuario?.usuarioId;

    // Setup: Create obra with etapa
    const obraRes = await request(app.getHttpServer())
      .post("/api/v1/obras")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Obra Test",
        endereco: "Rua Test, 123",
        tipo: "RESIDENCIAL",
        dataInicio: new Date(),
        geoLatitude: -23.55,
        geoLongitude: -46.63,
        raioValidacaoMetros: 50,
      });

    obraId = obraRes.body.obraId;

    // Create etapa
    const etapaRes = await request(app.getHttpServer())
      .post(`/api/v1/obras/${obraId}/etapas`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Fundação",
        ordem: 1,
        percentualObra: 20,
        valorLiberacao: 10000,
      });

    etapaId = etapaRes.body.etapaId;
  });

  afterAll(async () => {
    await app.close();
  });

  it("Should reject evidence with poor GPS accuracy", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/etapas/${etapaId}/evidencias`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        etapaId,
        latitude: -23.55,
        longitude: -46.63,
        accuracyMetros: 50,
        timestampCaptura: new Date().toISOString(),
        descricao: "Photo of foundation",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("precisão");
  });

  it("Should upload evidence with good GPS accuracy", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/etapas/${etapaId}/evidencias`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        etapaId,
        latitude: -23.55,
        longitude: -46.63,
        accuracyMetros: 5,
        timestampCaptura: new Date().toISOString(),
        descricao: "Photo of foundation",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("evidenciaId");
    expect(res.body.validada).toBe(false);
  });

  it("Should list evidencias by etapa", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/etapas/${etapaId}/evidencias`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
