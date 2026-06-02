import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../app.module";
import { PrismaService } from "../modules/prisma/prisma.service";

describe("Obras E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let usuarioId: string;
  let obraId: string;

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
    const email = `obras-test-${Date.now()}@imbobi.com`;
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({ email, senha: "Senha@123",
        cpf: "12345678909",
        telefone: "11999999999", nome: "Test" });

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, senha: "Senha@123" });

    token = loginRes.body.access_token;
    usuarioId = loginRes.body.usuarioId;
  });

  afterAll(async () => {
    if (obraId) {
      await prisma.obra.deleteMany({ where: { obraId } });
    }
    await app.close();
  });

  it("Create obra with 9 auto-generated stages", async () => {
    const obraData = {
      nome: "Test Obra",
      endereco: "Rua A, 123",
      geoLatitude: -23.55,
      geoLongitude: -46.63,
      raioValidacaoMetros: 50,
    };

    const res = await request(app.getHttpServer())
      .post("/api/v1/obras")
      .set("Authorization", `Bearer ${token}`)
      .send(obraData)
      .expect(201);

    expect(res.body).toHaveProperty("obraId");
    expect(res.body).toHaveProperty("nome", obraData.nome);
    obraId = res.body.obraId;

    // Verify 9 stages created
    const etapasRes = await request(app.getHttpServer())
      .get(`/api/v1/obras/${obraId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(etapasRes.body.etapas).toHaveLength(9);
    expect(etapasRes.body.etapas[0]).toHaveProperty("ordem", 1);
  });

  it("List obras", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/obras")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
