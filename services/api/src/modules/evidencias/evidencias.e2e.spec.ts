import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

describe("Evidencias E2E - Comprehensive Suite", () => {
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
      .send({ email, password: "Senha@123", nome: "Evidence Test User" });

    userId = regRes.body.usuarioId;

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: "Senha@123" });

    token = loginRes.body.access_token;

    // Create obra and get first etapa
    const obraRes = await request(app.getHttpServer())
      .post("/api/v1/obras")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Evidence Obra",
        endereco: "Rua Evidence, 123",
        geoLatitude: -23.55,
        geoLongitude: -46.63,
        raioValidacaoMetros: 50,
      });

    obraId = obraRes.body.obraId;

    const detalheRes = await request(app.getHttpServer())
      .get(`/api/v1/obras/${obraId}`)
      .set("Authorization", `Bearer ${token}`);

    etapaId = detalheRes.body.etapas[0].etapaId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GPS Validation - Client Layer", () => {
    it("Should reject evidence with accuracy > 50 meters", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/etapas/${etapaId}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          latitude: -23.55,
          longitude: -46.63,
          accuracyMetros: 51,
          timestampCaptura: new Date().toISOString(),
          descricao: "Poor accuracy photo",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("precisão");
    });

    it("Should accept evidence with accuracy <= 50 meters", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/etapas/${etapaId}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          latitude: -23.55,
          longitude: -46.63,
          accuracyMetros: 5,
          timestampCaptura: new Date().toISOString(),
          descricao: "Good accuracy photo",
        });

      expect(res.status).toBe(201);
    });

    it("Should reject with accuracy = 0", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/etapas/${etapaId}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          latitude: -23.55,
          longitude: -46.63,
          accuracyMetros: 0,
          timestampCaptura: new Date().toISOString(),
          descricao: "Zero accuracy",
        });

      expect([400, 422]).toContain(res.status);
    });

    it("Should reject with accuracy > 500 meters", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/etapas/${etapaId}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          latitude: -23.55,
          longitude: -46.63,
          accuracyMetros: 500,
          timestampCaptura: new Date().toISOString(),
          descricao: "Very poor accuracy",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("GPS Validation - Server Layer (PostGIS)", () => {
    it("Should validate distance within obra raio (PostGIS check)", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/etapas/${etapaId}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          latitude: -23.55,
          longitude: -46.63,
          accuracyMetros: 10,
          timestampCaptura: new Date().toISOString(),
          descricao: "Within raio",
        })
        .expect(201);

      expect(res.body).toHaveProperty("evidenciaId");
      expect(res.body).toHaveProperty("distanciaObra");
    });

    it("Should reject evidence outside obra raio", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/etapas/${etapaId}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          latitude: -23.60,
          longitude: -46.60,
          accuracyMetros: 10,
          timestampCaptura: new Date().toISOString(),
          descricao: "Outside raio",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("raio");
    });

    it("PostGIS validation is exact distance calculation", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/etapas/${etapaId}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          latitude: -23.55,
          longitude: -46.63,
          accuracyMetros: 5,
          timestampCaptura: new Date().toISOString(),
          descricao: "Distance test",
        })
        .expect(201);

      const evidencia = await prisma.evidenciaEtapa.findUnique({
        where: { evidenciaId: res.body.evidenciaId },
      });

      expect(evidencia?.distanciaObra).toBeLessThanOrEqual(50);
    });
  });

  describe("Evidence Upload", () => {
    it("POST /etapas/{id}/evidencias → 201 with valid data", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/etapas/${etapaId}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          latitude: -23.55,
          longitude: -46.63,
          accuracyMetros: 10,
          timestampCaptura: new Date().toISOString(),
          descricao: "Photo of foundation",
        })
        .expect(201);

      expect(res.body).toHaveProperty("evidenciaId");
      expect(res.body).toHaveProperty("etapaId", etapaId);
      expect(res.body).toHaveProperty("latCaptura", -23.55);
      expect(res.body).toHaveProperty("lngCaptura", -46.63);
    });

    it("POST /etapas/{id}/evidencias → 400 without authentication", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/etapas/${etapaId}/evidencias`)
        .send({
          latitude: -23.55,
          longitude: -46.63,
          accuracyMetros: 10,
          timestampCaptura: new Date().toISOString(),
          descricao: "No auth",
        })
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("POST /etapas/{id}/evidencias → 400 with missing coordinates", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/etapas/${etapaId}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          accuracyMetros: 10,
          timestampCaptura: new Date().toISOString(),
          descricao: "No coords",
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("Evidence stored in database with correct data", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/etapas/${etapaId}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          latitude: -23.551,
          longitude: -46.631,
          accuracyMetros: 15,
          timestampCaptura: new Date().toISOString(),
          descricao: "DB storage test",
        })
        .expect(201);

      const evidencia = await prisma.evidenciaEtapa.findUnique({
        where: { evidenciaId: res.body.evidenciaId },
      });

      expect(evidencia?.etapaId).toEqual(etapaId);
      expect(evidencia?.obraId).toEqual(obraId);
      expect(evidencia?.latCaptura).toBeCloseTo(-23.551, 4);
      expect(evidencia?.lngCaptura).toBeCloseTo(-46.631, 4);
    });
  });

  describe("Evidence List and Retrieval", () => {
    it("GET /etapas/{id}/evidencias → 200 returns array", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/etapas/${etapaId}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("GET /etapas/{id}/evidencias → 401 without authentication", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/etapas/${etapaId}/evidencias`)
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("GET /etapas/{id}/evidencias → includes uploaded evidence", async () => {
      // Upload evidence first
      const uploadRes = await request(app.getHttpServer())
        .post(`/api/v1/etapas/${etapaId}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          latitude: -23.55,
          longitude: -46.63,
          accuracyMetros: 10,
          timestampCaptura: new Date().toISOString(),
          descricao: "List test evidence",
        })
        .expect(201);

      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/etapas/${etapaId}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const found = listRes.body.some(
        (e) => e.evidenciaId === uploadRes.body.evidenciaId
      );
      expect(found).toBe(true);
    });

    it("Evidence count matches database", async () => {
      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/etapas/${etapaId}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const dbCount = await prisma.evidenciaEtapa.count({
        where: { etapaId },
      });

      expect(listRes.body.length).toEqual(dbCount);
    });

    it("Evidence items contain essential fields", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/etapas/${etapaId}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      if (res.body.length > 0) {
        const evidencia = res.body[0];
        expect(evidencia).toHaveProperty("evidenciaId");
        expect(evidencia).toHaveProperty("etapaId");
        expect(evidencia).toHaveProperty("latCaptura");
        expect(evidencia).toHaveProperty("lngCaptura");
        expect(evidencia).toHaveProperty("validada");
      }
    });
  });

  describe("Evidence Validation Status", () => {
    it("New evidence starts with validada = false", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/etapas/${etapaId}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          latitude: -23.55,
          longitude: -46.63,
          accuracyMetros: 10,
          timestampCaptura: new Date().toISOString(),
          descricao: "Validation test",
        })
        .expect(201);

      expect(res.body.validada).toBe(false);
    });

    it("Evidence validation status persists in database", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/etapas/${etapaId}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          latitude: -23.55,
          longitude: -46.63,
          accuracyMetros: 10,
          timestampCaptura: new Date().toISOString(),
          descricao: "DB validation test",
        })
        .expect(201);

      const evidencia = await prisma.evidenciaEtapa.findUnique({
        where: { evidenciaId: res.body.evidenciaId },
      });

      expect(evidencia?.validada).toBe(false);
    });
  });

  describe("Evidence with Multiple Etapas", () => {
    let obra2Id: string;
    let etapa2Id: string;

    beforeAll(async () => {
      const obraRes = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Multi-Etapa Obra",
          endereco: "Rua Multi, 789",
          geoLatitude: -23.56,
          geoLongitude: -46.64,
        });

      obra2Id = obraRes.body.obraId;

      const detalheRes = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obra2Id}`)
        .set("Authorization", `Bearer ${token}`);

      etapa2Id = detalheRes.body.etapas[1].etapaId;
    });

    it("Evidence is properly associated with correct etapa", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/etapas/${etapa2Id}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          latitude: -23.56,
          longitude: -46.64,
          accuracyMetros: 10,
          timestampCaptura: new Date().toISOString(),
          descricao: "Multi-etapa test",
        })
        .expect(201);

      const evidencia = await prisma.evidenciaEtapa.findUnique({
        where: { evidenciaId: res.body.evidenciaId },
      });

      expect(evidencia?.etapaId).toEqual(etapa2Id);
      expect(evidencia?.obraId).toEqual(obra2Id);
    });
  });

  describe("Evidence Accuracy and GPS Data", () => {
    it("Accuracy is stored in database", async () => {
      const accuracy = 25;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/etapas/${etapaId}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          latitude: -23.55,
          longitude: -46.63,
          accuracyMetros: accuracy,
          timestampCaptura: new Date().toISOString(),
          descricao: "Accuracy test",
        })
        .expect(201);

      const evidencia = await prisma.evidenciaEtapa.findUnique({
        where: { evidenciaId: res.body.evidenciaId },
      });

      expect(evidencia?.accuracyMetros).toEqual(accuracy);
    });

    it("Distance from obra is calculated by PostGIS", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/etapas/${etapaId}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          latitude: -23.55,
          longitude: -46.63,
          accuracyMetros: 10,
          timestampCaptura: new Date().toISOString(),
          descricao: "Distance calc test",
        })
        .expect(201);

      const evidencia = await prisma.evidenciaEtapa.findUnique({
        where: { evidenciaId: res.body.evidenciaId },
      });

      expect(evidencia?.distanciaObra).toBeLessThanOrEqual(50);
      expect(evidencia?.distanciaObra).toBeGreaterThanOrEqual(0);
    });

    it("Extreme coordinates are handled", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/etapas/${etapaId}/evidencias`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          latitude: -23.550001,
          longitude: -46.630001,
          accuracyMetros: 10,
          timestampCaptura: new Date().toISOString(),
          descricao: "Precision test",
        })
        .expect(201);

      expect(res.body).toHaveProperty("latCaptura");
      expect(res.body).toHaveProperty("lngCaptura");
    });
  });
});
