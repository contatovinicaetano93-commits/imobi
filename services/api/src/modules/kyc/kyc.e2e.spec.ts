import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

describe("KYC E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

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
    const email = `kyc-test-${Date.now()}@imbobi.com`;
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

  it("Upload KYC document", async () => {
    const docData = {
      tipo: "RG",
      url: "https://example.com/rg.jpg",
    };

    const res = await request(app.getHttpServer())
      .post("/api/v1/kyc/upload")
      .set("Authorization", `Bearer ${token}`)
      .send(docData)
      .expect(201);

    expect(res.body).toHaveProperty("kycDocumentoId");
    expect(res.body).toHaveProperty("status", "PENDENTE");
    expect(res.body).toHaveProperty("tipo", "RG");
  });

  it("Get KYC status", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/kyc/status")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty("usuarioId");
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("documentos");
    expect(res.body).toHaveProperty("resumo");
  });

  it("List user documents", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/kyc/documentos")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});
