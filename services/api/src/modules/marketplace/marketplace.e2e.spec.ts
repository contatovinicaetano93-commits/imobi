import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, HttpStatus } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { UsuarioTipo, ObraStatus, EtapaStatus, VistoriaStatus } from "@prisma/client";

describe("Marketplace API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tomadorToken: string;
  let tomadorId: string;
  let parceiroToken: string;
  let parceiroId: string;
  let parceiroUserId: string;
  let obraId: string;
  let etapaId: string;
  let vistoriaId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Setup", () => {
    it("should create tomador user with obra", async () => {
      const tomadorEmail = `tomador-${Date.now()}@test.com`;

      const registerRes = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          nome: "Tomador Marketplace",
          cpf: `1111111111${Math.floor(Math.random() * 100)}`,
          email: tomadorEmail,
          telefone: "11999999999",
          password: "TomadorPass123!",
        });

      expect(registerRes.status).toBe(201);

      const loginRes = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: tomadorEmail,
          password: "TomadorPass123!",
        });

      tomadorToken = loginRes.body.accessToken;

      const tomador = await prisma.usuario.findUnique({
        where: { email: tomadorEmail },
      });
      tomadorId = tomador.usuarioId;

      // Create obra
      const obra = await prisma.obra.create({
        data: {
          usuarioId: tomadorId,
          nome: "Obra Marketplace",
          endereco: "Rua Test, 123",
          geoLatitude: -23.5505,
          geoLongitude: -46.6333,
          status: ObraStatus.EM_EXECUCAO,
        },
      });

      obraId = obra.obraId;

      // Create etapa
      const etapa = await prisma.etapaObra.create({
        data: {
          obraId,
          nome: "Fundação",
          ordem: 1,
          percentualObra: 10,
          valorLiberacao: 5000,
          status: EtapaStatus.PLANEJADA,
        },
      });

      etapaId = etapa.etapaId;
    });

    it("should create contractor user", async () => {
      const parceiroEmail = `parceiro-${Date.now()}@test.com`;

      const registerRes = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          nome: "Contractor Test",
          cpf: `2222222222${Math.floor(Math.random() * 100)}`,
          email: parceiroEmail,
          telefone: "11988888888",
          password: "ParceiroPass123!",
        });

      expect(registerRes.status).toBe(201);

      const loginRes = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: parceiroEmail,
          password: "ParceiroPass123!",
        });

      parceiroToken = loginRes.body.accessToken;

      const parceiro = await prisma.usuario.findUnique({
        where: { email: parceiroEmail },
      });
      parceiroUserId = parceiro.usuarioId;
    });
  });

  describe("POST /marketplace/parceiros", () => {
    it("should create contractor profile", async () => {
      const res = await request(app.getHttpServer())
        .post("/marketplace/parceiros")
        .set("Authorization", `Bearer ${parceiroToken}`)
        .send({
          descricao: "Especialista em fundações",
          especialidades: ["fundações", "estrutura"],
          telefone: "11987654321",
          endereco: "Av. Test, 456",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("parceiroId");
      expect(res.body.mediaAvaliacao).toBe(0.0);
      parceiroId = res.body.parceiroId;
    });

    it("should prevent duplicate contractor registration", async () => {
      const res = await request(app.getHttpServer())
        .post("/marketplace/parceiros")
        .set("Authorization", `Bearer ${parceiroToken}`)
        .send({
          descricao: "Duplicate",
          especialidades: ["test"],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("já é um parceiro");
    });
  });

  describe("GET /marketplace/parceiros/:parceiroId", () => {
    it("should get contractor details with services and reviews", async () => {
      const res = await request(app.getHttpServer()).get(
        `/marketplace/parceiros/${parceiroId}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.parceiroId).toBe(parceiroId);
      expect(res.body).toHaveProperty("usuario");
      expect(res.body).toHaveProperty("servicos");
      expect(res.body).toHaveProperty("avaliacoes");
    });
  });

  describe("GET /marketplace/parceiros/search", () => {
    it("should list contractors with filters", async () => {
      const res = await request(app.getHttpServer())
        .get("/marketplace/parceiros/search")
        .query({ especialidade: "fundações", minAvaliacao: 0, limite: 20 });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("POST /marketplace/servicos", () => {
    it("should create service", async () => {
      const res = await request(app.getHttpServer())
        .post("/marketplace/servicos")
        .set("Authorization", `Bearer ${parceiroToken}`)
        .send({
          parceiroId,
          nome: "Escavação e Fundação",
          descricao: "Serviço completo de fundação",
          preco: 15000,
          estimadoHoras: 120,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("servicoId");
      expect(res.body.nome).toBe("Escavação e Fundação");
    });
  });

  describe("GET /marketplace/servicos/:parceiroId", () => {
    it("should list contractor services", async () => {
      const res = await request(app.getHttpServer()).get(
        `/marketplace/servicos/${parceiroId}`,
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("POST /marketplace/vistorias", () => {
    it("should schedule inspection", async () => {
      const res = await request(app.getHttpServer())
        .post("/marketplace/vistorias")
        .set("Authorization", `Bearer ${tomadorToken}`)
        .send({
          etapaId,
          parceiroId,
          precoAcordado: 15000,
          dataAgendada: new Date(),
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("vistoriaId");
      expect(res.body.status).toBe(VistoriaStatus.AGENDADA);
      vistoriaId = res.body.vistoriaId;
    });

    it("should prevent duplicate inspection for same stage", async () => {
      const res = await request(app.getHttpServer())
        .post("/marketplace/vistorias")
        .set("Authorization", `Bearer ${tomadorToken}`)
        .send({
          etapaId,
          parceiroId: parceiroId,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("já tem uma vistoria");
    });
  });

  describe("GET /marketplace/vistorias/:vistoriaId", () => {
    it("should get inspection details", async () => {
      const res = await request(app.getHttpServer()).get(
        `/marketplace/vistorias/${vistoriaId}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.vistoriaId).toBe(vistoriaId);
      expect(res.body).toHaveProperty("etapa");
      expect(res.body).toHaveProperty("parceiro");
    });
  });

  describe("GET /marketplace/etapa/:etapaId/vistorias", () => {
    it("should list inspections for stage", async () => {
      const res = await request(app.getHttpServer()).get(
        `/marketplace/etapa/${etapaId}/vistorias`,
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe("POST /marketplace/parceiros/:parceiroId/avaliacoes", () => {
    it("should rate contractor", async () => {
      const res = await request(app.getHttpServer())
        .post(`/marketplace/parceiros/${parceiroId}/avaliacoes`)
        .set("Authorization", `Bearer ${tomadorToken}`)
        .send({
          vistoriaId,
          estrelas: 5,
          comentario: "Excelente trabalho!",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("avaliacaoId");
      expect(res.body.estrelas).toBe(5);
    });

    it("should validate star rating", async () => {
      const res = await request(app.getHttpServer())
        .post(`/marketplace/parceiros/${parceiroId}/avaliacoes`)
        .set("Authorization", `Bearer ${tomadorToken}`)
        .send({
          estrelas: 10,
          comentario: "Invalid rating",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("entre 1 e 5");
    });
  });

  describe("GET /marketplace/parceiros/:parceiroId/avaliacoes", () => {
    it("should list contractor reviews", async () => {
      const res = await request(app.getHttpServer()).get(
        `/marketplace/parceiros/${parceiroId}/avaliacoes`,
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("PATCH /marketplace/parceiros/:parceiroId", () => {
    it("should update contractor profile", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/marketplace/parceiros/${parceiroId}`)
        .set("Authorization", `Bearer ${parceiroToken}`)
        .send({
          descricao: "Atualizado - 15 anos de experiência",
          especialidades: ["fundações", "estrutura", "alvenaria"],
        });

      expect(res.status).toBe(200);
      expect(res.body.descricao).toContain("15 anos");
    });
  });

  describe("Average rating calculation", () => {
    it("should update contractor average rating after review", async () => {
      const parceiroAtualizado = await prisma.parceiro.findUnique({
        where: { parceiroId },
      });

      expect(parceiroAtualizado.mediaAvaliacao).toBe(5.0);
      expect(parceiroAtualizado.totalAvaliacoes).toBe(1);
    });
  });
});
