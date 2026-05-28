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
  let email: string;

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
    email = `obras-test-${Date.now()}@imbobi.com`;
    const regRes = await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({ email, senha: "Senha@123", nome: "Test User", cpf: "12345678901", telefone: "11999999999" });

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, senha: "Senha@123" });

    token = loginRes.body.accessToken;
    usuarioId = loginRes.body.usuario?.usuarioId || regRes.body.usuario?.usuarioId;
  });

  afterAll(async () => {
    if (obraId) {
      await prisma.obra.deleteMany({ where: { obraId } });
    }
    await app.close();
  });

  describe("Create Obra", () => {
    it("Create obra with 9 auto-generated stages - happy path", async () => {
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
      expect(res.body).toHaveProperty("endereco", obraData.endereco);
      expect(res.body).toHaveProperty("geoLatitude", obraData.geoLatitude);
      expect(res.body).toHaveProperty("geoLongitude", obraData.geoLongitude);
      obraId = res.body.obraId;

      // Verify 9 stages created
      const etapasRes = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(etapasRes.body.etapas).toHaveLength(9);
      expect(etapasRes.body.etapas[0]).toHaveProperty("ordem", 1);
      expect(etapasRes.body.etapas[8]).toHaveProperty("ordem", 9);
    });

    it("Create obra - reject without authentication", async () => {
      const obraData = {
        nome: "Test Obra",
        endereco: "Rua A, 123",
        geoLatitude: -23.55,
        geoLongitude: -46.63,
        raioValidacaoMetros: 50,
      };

      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .send(obraData);

      expect(res.status).toBe(401);
    });

    it("Create obra - reject invalid GPS coordinates", async () => {
      const obraData = {
        nome: "Test Obra",
        endereco: "Rua A, 123",
        geoLatitude: 91, // Invalid latitude > 90
        geoLongitude: -46.63,
        raioValidacaoMetros: 50,
      };

      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send(obraData);

      expect(res.status).toBe(400);
    });

    it("Create obra - reject missing required fields", async () => {
      const obraData = {
        nome: "Test Obra",
        // Missing endereco and GPS data
        raioValidacaoMetros: 50,
      };

      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send(obraData);

      expect(res.status).toBe(400);
    });

    it("Create obra - reject negative raio", async () => {
      const obraData = {
        nome: "Test Obra",
        endereco: "Rua A, 123",
        geoLatitude: -23.55,
        geoLongitude: -46.63,
        raioValidacaoMetros: -100,
      };

      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send(obraData);

      expect(res.status).toBe(400);
    });
  });

  describe("List Obras", () => {
    it("List obras - happy path", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("List obras - should contain created obra", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const foundObra = res.body.find((o: any) => o.obraId === obraId);
      expect(foundObra).toBeDefined();
      expect(foundObra.nome).toBe("Test Obra");
    });

    it("List obras - reject without authentication", async () => {
      const res = await request(app.getHttpServer()).get("/api/v1/obras");

      expect(res.status).toBe(401);
    });
  });

  describe("Get Obra Details", () => {
    it("Get obra details - happy path", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty("obraId", obraId);
      expect(res.body).toHaveProperty("nome", "Test Obra");
      expect(res.body).toHaveProperty("etapas");
      expect(Array.isArray(res.body.etapas)).toBe(true);
    });

    it("Get obra details - reject non-existent obra", async () => {
      const fakeId = "fake-obra-id-12345";
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${fakeId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it("Get obra details - reject without authentication", async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/v1/obras/${obraId}`
      );

      expect(res.status).toBe(401);
    });
  });

  describe("Stages Auto-Generation", () => {
    it("Obra stages should have sequential ordem", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const etapas = res.body.etapas;
      for (let i = 0; i < etapas.length; i++) {
        expect(etapas[i].ordem).toBe(i + 1);
      }
    });

    it("Obra stages should have standard names", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const etapas = res.body.etapas;
      expect(etapas.length).toBe(9);

      // All stages should have names
      for (const etapa of etapas) {
        expect(etapa).toHaveProperty("nome");
        expect(typeof etapa.nome).toBe("string");
        expect(etapa.nome.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Multiple Obras", () => {
    it("User can create multiple obras", async () => {
      const obra1Data = {
        nome: "Obra 1",
        endereco: "Rua 1, 100",
        geoLatitude: -23.5,
        geoLongitude: -46.6,
        raioValidacaoMetros: 50,
      };

      const obra2Data = {
        nome: "Obra 2",
        endereco: "Rua 2, 200",
        geoLatitude: -23.6,
        geoLongitude: -46.7,
        raioValidacaoMetros: 75,
      };

      const res1 = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send(obra1Data)
        .expect(201);

      const res2 = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send(obra2Data)
        .expect(201);

      expect(res1.body.obraId).not.toBe(res2.body.obraId);

      // Both should appear in list
      const listRes = await request(app.getHttpServer())
        .get("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const obrasIds = listRes.body.map((o: any) => o.obraId);
      expect(obrasIds).toContain(res1.body.obraId);
      expect(obrasIds).toContain(res2.body.obraId);
    });
  });
});
