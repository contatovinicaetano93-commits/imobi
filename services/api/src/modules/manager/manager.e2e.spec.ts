import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, HttpStatus } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { KycDocumentoStatus, EtapaStatus, CreditoStatus, ObraStatus } from "@prisma/client";

describe("Manager API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let gestorToken: string;
  let gestorId: string;
  let tomadorId: string;
  let obraId: string;
  let etapaId: string;
  let kycDocumentoId: string;

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
    it("should create gestor user and login", async () => {
      const gestorEmail = `gestor-${Date.now()}@test.com`;
      const gestorPassword = "GestorPass123!";

      const registerRes = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          nome: "Gestor Test",
          cpf: `1234567890${Math.floor(Math.random() * 100)}`,
          email: gestorEmail,
          telefone: "11999999999",
          password: gestorPassword,
        });

      expect(registerRes.status).toBe(201);

      const loginRes = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: gestorEmail,
          password: gestorPassword,
        });

      expect(loginRes.status).toBe(200);
      gestorToken = loginRes.body.accessToken;
      expect(gestorToken).toBeDefined();

      const gestor = await prisma.usuario.findUnique({
        where: { email: gestorEmail },
      });
      gestorId = gestor.usuarioId;
    });

    it("should create tomador user with obra and etapas", async () => {
      const tomadorEmail = `tomador-${Date.now()}@test.com`;
      const tomadorPassword = "TomadorPass123!";

      const registerRes = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          nome: "Tomador Test",
          cpf: `9876543210${Math.floor(Math.random() * 100)}`,
          email: tomadorEmail,
          telefone: "11999999998",
          password: tomadorPassword,
        });

      expect(registerRes.status).toBe(201);

      const tomador = await prisma.usuario.findUnique({
        where: { email: tomadorEmail },
      });
      tomadorId = tomador.usuarioId;

      const credito = await prisma.credito.create({
        data: {
          usuarioId: tomadorId,
          valorAprovado: 100000,
          valorLiberado: 50000,
          prazoMeses: 60,
          status: CreditoStatus.ATIVO,
        },
      });

      const obra = await prisma.obra.create({
        data: {
          usuarioId: tomadorId,
          creditoId: credito.creditoId,
          nome: "Obra Test",
          endereco: "Rua Test, 123",
          geoLatitude: -23.5505,
          geoLongitude: -46.6333,
          status: ObraStatus.EM_EXECUCAO,
        },
      });

      obraId = obra.obraId;

      const etapa1 = await prisma.etapaObra.create({
        data: {
          obraId,
          nome: "Fundação",
          ordem: 1,
          percentualObra: 10,
          valorLiberacao: 5000,
          status: EtapaStatus.AGUARDANDO_VISTORIA,
        },
      });

      etapaId = etapa1.etapaId;

      await prisma.evidenciaEtapa.create({
        data: {
          etapaId: etapa1.etapaId,
          obraId,
          fotoUrl: "https://example.com/foto1.jpg",
          latCaptura: -23.5505,
          lngCaptura: -46.6333,
          validada: true,
        },
      });
    });

    it("should create KYC documents", async () => {
      const kycDoc = await prisma.kycDocumento.create({
        data: {
          usuarioId: tomadorId,
          tipo: "RG",
          url: "https://s3.example.com/kyc/rg.jpg",
          status: KycDocumentoStatus.PENDENTE,
        },
      });

      kycDocumentoId = kycDoc.kycDocumentoId;
    });
  });

  describe("GET /manager/dashboard", () => {
    it("should return manager stats", async () => {
      const res = await request(app.getHttpServer())
        .get("/manager/dashboard")
        .set("Authorization", `Bearer ${gestorToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body).toHaveProperty("filaAprovacoes");
      expect(res.body).toHaveProperty("filaKyc");
      expect(typeof res.body.filaAprovacoes).toBe("number");
    });
  });

  describe("GET /manager/etapas-pendentes", () => {
    it("should list pending etapas", async () => {
      const res = await request(app.getHttpServer())
        .get("/manager/etapas-pendentes")
        .set("Authorization", `Bearer ${gestorToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("PATCH /manager/etapas/:id/aprovar", () => {
    it("should approve etapa and create audit log", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/manager/etapas/${etapaId}/aprovar`)
        .set("Authorization", `Bearer ${gestorToken}`)
        .send({ observacao: "Validado" });

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body).toHaveProperty("etapaId", etapaId);

      const auditLogs = await prisma.auditLog.findMany({
        where: { entidadeId: etapaId },
      });
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].acao).toBe("ETAPA_APROVADA");
    });
  });

  describe("PATCH /manager/kyc/:id/aprovar", () => {
    it("should approve KYC document", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/manager/kyc/${kycDocumentoId}/aprovar`)
        .set("Authorization", `Bearer ${gestorToken}`)
        .send({});

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body).toHaveProperty("kycDocumentoId", kycDocumentoId);

      const auditLogs = await prisma.auditLog.findMany({
        where: { entidadeId: kycDocumentoId },
      });
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].acao).toBe("KYC_APROVADO");
    });
  });

  describe("GET /manager/audit-trail", () => {
    it("should list audit trail", async () => {
      const res = await request(app.getHttpServer())
        .get("/manager/audit-trail?limit=10&offset=0")
        .set("Authorization", `Bearer ${gestorToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /manager/audit-trail/:entidade/:id", () => {
    it("should get audit history for specific entity", async () => {
      const res = await request(app.getHttpServer())
        .get(`/manager/audit-trail/ETAPA/${etapaId}`)
        .set("Authorization", `Bearer ${gestorToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
