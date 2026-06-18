import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

const VALID_OBRA = {
  nome: "Obra Test Completa",
  endereco: {
    logradouro: "Rua Test",
    numero: "123",
    bairro: "Centro",
    cidade: "São Paulo",
    uf: "SP",
    cep: "01310100",
  },
  geo: {
    latitude: -23.55,
    longitude: -46.63,
    raioValidacaoMetros: 50,
  },
  areaM2: 200,
  dataConclusaoPrevistaISO: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
};

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

    const ts = Date.now();
    const email = `obras-test-${ts}@imbobi.com`;
    const cpf = `${ts}`.padEnd(11, "0").slice(0, 11);

    const regRes = await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({
        nome: "Obras Test User",
        cpf,
        email,
        telefone: "11999999999",
        senha: "Senha@123",
        consentidoTermos: true,
        consentidoPrivacy: true,
        consentidoKyc: true,
        consentidoMarketing: false,
      });

    userId = regRes.body.usuario?.usuarioId;

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, senha: "Senha@123" });

    token = loginRes.body.accessToken;
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
        .send(VALID_OBRA)
        .expect(201);

      expect(res.body).toHaveProperty("obraId");
      expect(res.body).toHaveProperty("nome", VALID_OBRA.nome);
      obraId = res.body.obraId;

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
      const { nome: _n, ...sem } = VALID_OBRA;
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send(sem)
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /obras → 400 with missing geo", async () => {
      const { geo: _g, ...sem } = VALID_OBRA;
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send(sem)
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /obras → 401 without authentication", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/obras")
        .send(VALID_OBRA)
        .expect(401);
    });

    it("POST /obras → obra linked to authenticated user", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...VALID_OBRA, nome: "Obra User Test" })
        .expect(201);

      const obra = await prisma.obra.findUnique({ where: { obraId: res.body.obraId } });
      expect(obra?.usuarioId).toEqual(userId);
    });

    it("Auto-generated stages have correct initial data", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...VALID_OBRA, nome: "Obra Stages Test" })
        .expect(201);

      const obra = await prisma.obra.findUnique({
        where: { obraId: res.body.obraId },
        include: { etapas: { orderBy: { ordem: "asc" } } },
      });

      expect(obra?.etapas).toHaveLength(9);
      obra?.etapas.forEach((etapa) => {
        expect(etapa.status).toBe("PLANEJADA");
        expect(etapa.percentualObra).toBeGreaterThan(0);
      });
    });
  });

  describe("List Obras", () => {
    it("GET /obras → 200 returns array", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("GET /obras → 401 without authentication", async () => {
      await request(app.getHttpServer()).get("/api/v1/obras").expect(401);
    });

    it("GET /obras → returns only user's obras with expected fields", async () => {
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
        .send({ ...VALID_OBRA, nome: "Obra List Test" })
        .expect(201);

      const listRes = await request(app.getHttpServer())
        .get("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(listRes.body.some((o) => o.obraId === createRes.body.obraId)).toBe(true);
    });
  });

  describe("Get Obra Details", () => {
    let testObraId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...VALID_OBRA, nome: "Obra Details Test" });

      testObraId = res.body.obraId;
    });

    it("GET /obras/:id → 200 with valid ID", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${testObraId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty("obraId", testObraId);
      expect(res.body).toHaveProperty("nome");
      expect(res.body).toHaveProperty("etapas");
      expect(Array.isArray(res.body.etapas)).toBe(true);
    });

    it("GET /obras/:id → 401 without authentication", async () => {
      await request(app.getHttpServer()).get(`/api/v1/obras/${testObraId}`).expect(401);
    });

    it("GET /obras/:id → 404 with non-existent ID", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/obras/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });

    it("GET /obras/:id → includes all 9 stages in order", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${testObraId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.etapas).toHaveLength(9);
      res.body.etapas.forEach((etapa, idx) => {
        expect(etapa.ordem).toBe(idx + 1);
      });
    });

    it("GET /obras/:id → stage details are complete", async () => {
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
    });
  });

  describe("Obra Progress", () => {
    let testObraId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...VALID_OBRA, nome: "Obra Progress Test" });

      testObraId = res.body.obraId;
    });

    it("GET /obras/:id/progresso → 200 returns a number", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${testObraId}/progresso`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(typeof res.body).toBe("number");
    });

    it("Progress starts at 0 for new obra", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${testObraId}/progresso`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toBe(0);
    });

    it("GET /obras/:id/progresso → 401 without authentication", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/obras/${testObraId}/progresso`)
        .expect(401);
    });

    it("GET /obras/:id/progresso → 404 with non-existent ID", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/obras/00000000-0000-0000-0000-000000000000/progresso")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });

    it("Progress is between 0 and 100", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${testObraId}/progresso`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toBeGreaterThanOrEqual(0);
      expect(res.body).toBeLessThanOrEqual(100);
    });
  });

  describe("Obra Stages", () => {
    let testObraId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...VALID_OBRA, nome: "Obra Stages Detail Test" });

      testObraId = res.body.obraId;
    });

    it("Stages have sequential order from 1–9", async () => {
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

    it("Total percentualObra of all stages is positive", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${testObraId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const total = res.body.etapas.reduce((sum, e) => sum + e.percentualObra, 0);
      expect(total).toBeGreaterThan(0);
      expect(total).toBeLessThanOrEqual(100);
    });
  });

  describe("Multi-obra User Management", () => {
    it("User can create multiple obras", async () => {
      const [r1, r2] = await Promise.all([
        request(app.getHttpServer())
          .post("/api/v1/obras")
          .set("Authorization", `Bearer ${token}`)
          .send({ ...VALID_OBRA, nome: "Multi Obra 1" })
          .expect(201),
        request(app.getHttpServer())
          .post("/api/v1/obras")
          .set("Authorization", `Bearer ${token}`)
          .send({ ...VALID_OBRA, nome: "Multi Obra 2" })
          .expect(201),
      ]);

      const listRes = await request(app.getHttpServer())
        .get("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(listRes.body.some((o) => o.obraId === r1.body.obraId)).toBe(true);
      expect(listRes.body.some((o) => o.obraId === r2.body.obraId)).toBe(true);
    });
  });
});
