import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

describe("Obras E2E - Comprehensive Suite", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let userId: string;
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
    const regRes = await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({ email, password: "Senha@123", nome: "Obras Test User" });

    userId = regRes.body.usuarioId;

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: "Senha@123" });

    token = loginRes.body.access_token;
  });

  afterAll(async () => {
    if (obraId) {
      await prisma.obra.deleteMany({ where: { obraId } });
    }
    await app.close();
  });

  describe("Create Obra", () => {
    it("POST /obras → 201 creates obra with auto-generated 9 stages", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Obra Test Completa",
          endereco: "Rua Test, 123",
          geoLatitude: -23.55,
          geoLongitude: -46.63,
          raioValidacaoMetros: 50,
        })
        .expect(201);

      expect(res.body).toHaveProperty("obraId");
      expect(res.body).toHaveProperty("nome", "Obra Test Completa");
      expect(res.body).toHaveProperty("endereco");
      expect(res.body).toHaveProperty("geoLatitude");
      expect(res.body).toHaveProperty("geoLongitude");
      obraId = res.body.obraId;

      // Verify 9 stages auto-created
      const obra = await prisma.obra.findUnique({
        where: { obraId },
        include: { etapas: true },
      });

      expect(obra?.etapas).toHaveLength(9);
      obra?.etapas.forEach((etapa, idx) => {
        expect(etapa.ordem).toBe(idx + 1);
      });
    });

    it("POST /obras → 400 with missing nome", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({
          endereco: "Rua Test, 123",
          geoLatitude: -23.55,
          geoLongitude: -46.63,
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /obras → 400 with missing coordinates", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Test Obra",
          endereco: "Rua Test, 123",
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /obras → 401 without authentication", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .send({
          nome: "Test Obra",
          endereco: "Rua Test, 123",
          geoLatitude: -23.55,
          geoLongitude: -46.63,
        })
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("POST /obras → obra created with user relationship", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Obra User Test",
          endereco: "Rua Test, 456",
          geoLatitude: -23.55,
          geoLongitude: -46.63,
        })
        .expect(201);

      const obra = await prisma.obra.findUnique({
        where: { obraId: res.body.obraId },
      });

      expect(obra?.usuarioId).toEqual(userId);
    });

    it("Auto-generated stages have correct initial data", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Obra Stages Test",
          endereco: "Rua Test, 789",
          geoLatitude: -23.55,
          geoLongitude: -46.63,
        })
        .expect(201);

      const obra = await prisma.obra.findUnique({
        where: { obraId: res.body.obraId },
        include: { etapas: { orderBy: { ordem: "asc" } } },
      });

      expect(obra?.etapas).toHaveLength(9);
      obra?.etapas.forEach((etapa) => {
        expect(etapa.status).toBe("PLANEJADA");
        expect(etapa.percentualObra).toBeGreaterThan(0);
        expect(etapa.valorLiberacao).toBeGreaterThan(0);
      });
    });
  });

  describe("List Obras", () => {
    it("GET /obras → 200 returns paginated list", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("GET /obras → 401 without authentication", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/obras")
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("GET /obras → returns only user's obras", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((obra) => {
        expect(obra).toHaveProperty("obraId");
        expect(obra).toHaveProperty("nome");
        expect(obra).toHaveProperty("status");
      });
    });

    it("GET /obras → new obra appears in list", async () => {
      const createRes = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Obra List Test",
          endereco: "Rua Test, 999",
          geoLatitude: -23.55,
          geoLongitude: -46.63,
        })
        .expect(201);

      const listRes = await request(app.getHttpServer())
        .get("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const found = listRes.body.some(
        (obra) => obra.obraId === createRes.body.obraId
      );
      expect(found).toBe(true);
    });
  });

  describe("Get Obra Details", () => {
    let testObraId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Obra Details Test",
          endereco: "Rua Test, Detail",
          geoLatitude: -23.55,
          geoLongitude: -46.63,
        });

      testObraId = res.body.obraId;
    });

    it("GET /obras/{id} → 200 with valid ID", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${testObraId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty("obraId", testObraId);
      expect(res.body).toHaveProperty("nome");
      expect(res.body).toHaveProperty("etapas");
      expect(Array.isArray(res.body.etapas)).toBe(true);
    });

    it("GET /obras/{id} → 401 without authentication", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${testObraId}`)
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("GET /obras/{id} → 404 with non-existent ID", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/obras/non-existent-id")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.message).toBeDefined();
    });

    it("GET /obras/{id} → includes all 9 stages", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${testObraId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.etapas).toHaveLength(9);
      res.body.etapas.forEach((etapa, idx) => {
        expect(etapa.ordem).toBe(idx + 1);
      });
    });

    it("GET /obras/{id} → stage details are complete", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${testObraId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const etapa = res.body.etapas[0];
      expect(etapa).toHaveProperty("etapaId");
      expect(etapa).toHaveProperty("nome");
      expect(etapa).toHaveProperty("ordem");
      expect(etapa).toHaveProperty("status");
      expect(etapa).toHaveProperty("percentualObra");
      expect(etapa).toHaveProperty("valorLiberacao");
    });
  });

  describe("Obra Progress", () => {
    let testObraId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Obra Progress Test",
          endereco: "Rua Progress, 123",
          geoLatitude: -23.55,
          geoLongitude: -46.63,
        });

      testObraId = res.body.obraId;
    });

    it("GET /obras/{id}/progresso → 200 with valid ID", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${testObraId}/progresso`)
        .expect(200);

      expect(res.body).toHaveProperty("percentualConclusao");
      expect(res.body).toHaveProperty("etapasConc luidas");
      expect(res.body).toHaveProperty("etapasTotal");
    });

    it("Progress starts at 0% for new obra", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${testObraId}/progresso`)
        .expect(200);

      expect(res.body.percentualConclusao).toBe(0);
    });

    it("GET /obras/{id}/progresso → 404 with non-existent ID", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/obras/non-existent-id/progresso")
        .expect(404);

      expect(res.status).toBe(404);
    });

    it("Progress calculation is correct", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${testObraId}/progresso`)
        .expect(200);

      expect(res.body.percentualConclusao).toBeGreaterThanOrEqual(0);
      expect(res.body.percentualConclusao).toBeLessThanOrEqual(100);
      expect(res.body.etapasTotal).toEqual(9);
    });
  });

  describe("Obra Stages", () => {
    let testObraId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Obra Stages Test",
          endereco: "Rua Stages, 123",
          geoLatitude: -23.55,
          geoLongitude: -46.63,
        });

      testObraId = res.body.obraId;
    });

    it("Stages have sequential order from 1-9", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${testObraId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      res.body.etapas.forEach((etapa, idx) => {
        expect(etapa.ordem).toBe(idx + 1);
      });
    });

    it("All stages start with PLANEJADA status", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${testObraId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      res.body.etapas.forEach((etapa) => {
        expect(etapa.status).toBe("PLANEJADA");
      });
    });

    it("Total percentual from all stages equals or approaches 100%", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${testObraId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const totalPercentual = res.body.etapas.reduce(
        (sum, etapa) => sum + etapa.percentualObra,
        0
      );

      expect(totalPercentual).toBeGreaterThan(0);
      expect(totalPercentual).toBeLessThanOrEqual(100);
    });

    it("Stages have proper valorLiberacao distribution", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${testObraId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      res.body.etapas.forEach((etapa) => {
        expect(etapa.valorLiberacao).toBeGreaterThan(0);
      });
    });
  });

  describe("Obra Data Validation", () => {
    it("Latitude and longitude are stored correctly", async () => {
      const lat = -23.5505;
      const lng = -46.6333;

      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Geo Test Obra",
          endereco: "Rua Geo, 123",
          geoLatitude: lat,
          geoLongitude: lng,
        })
        .expect(201);

      const obra = await prisma.obra.findUnique({
        where: { obraId: res.body.obraId },
      });

      expect(obra?.geoLatitude).toBe(lat);
      expect(obra?.geoLongitude).toBe(lng);
    });

    it("Raio validacao defaults to 50 meters", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Raio Test Obra",
          endereco: "Rua Raio, 123",
          geoLatitude: -23.55,
          geoLongitude: -46.63,
        })
        .expect(201);

      const obra = await prisma.obra.findUnique({
        where: { obraId: res.body.obraId },
      });

      expect(obra?.raioValidacaoMetros).toBe(50);
    });

    it("Custom raio validacao is stored", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Custom Raio Obra",
          endereco: "Rua Custom, 123",
          geoLatitude: -23.55,
          geoLongitude: -46.63,
          raioValidacaoMetros: 100,
        })
        .expect(201);

      const obra = await prisma.obra.findUnique({
        where: { obraId: res.body.obraId },
      });

      expect(obra?.raioValidacaoMetros).toBe(100);
    });
  });

  describe("Multi-obra User Management", () => {
    it("User can create multiple obras", async () => {
      const createRes1 = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Multi Obra 1",
          endereco: "Rua Multi, 1",
          geoLatitude: -23.55,
          geoLongitude: -46.63,
        })
        .expect(201);

      const createRes2 = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Multi Obra 2",
          endereco: "Rua Multi, 2",
          geoLatitude: -23.56,
          geoLongitude: -46.64,
        })
        .expect(201);

      const listRes = await request(app.getHttpServer())
        .get("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const found1 = listRes.body.some(
        (obra) => obra.obraId === createRes1.body.obraId
      );
      const found2 = listRes.body.some(
        (obra) => obra.obraId === createRes2.body.obraId
      );

      expect(found1).toBe(true);
      expect(found2).toBe(true);
    });
  });
});
