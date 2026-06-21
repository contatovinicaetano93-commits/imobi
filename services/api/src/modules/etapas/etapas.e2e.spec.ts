import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { hash } from "bcryptjs";

// CPF range: 000.000.000-96 to 000.000.000-99
const ADMIN_CPF = "00000000096";
const TOMADOR_EMAIL = `etapas-e2e-tomador@imbobi.com`;
const PASSWORD = "Senha@123";

describe("Etapas E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let tomadorToken: string;
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

    // Create ADMIN via Prisma
    const adminUser = await prisma.usuario.upsert({
      where: { cpf: ADMIN_CPF },
      update: {},
      create: {
        nome: "Admin Etapas E2E",
        email: "etapas-e2e-admin@imbobi.com",
        cpf: ADMIN_CPF,
        telefone: "11900000096",
        passwordHash: await hash(PASSWORD, 10),
        tipo: "ADMIN",
        kycStatus: "APROVADO",
        consentidoTermos: true,
        consentidoPrivacy: true,
        consentidoKyc: true,
      },
    });

    // Login admin
    const adminLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "etapas-e2e-admin@imbobi.com", password: PASSWORD });
    adminToken = adminLogin.body.access_token;

    // Register + login TOMADOR
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({ email: TOMADOR_EMAIL, password: PASSWORD, nome: "Tomador Etapas E2E" });

    const tomadorLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: TOMADOR_EMAIL, password: PASSWORD });
    tomadorToken = tomadorLogin.body.access_token;
    const tomadorId = tomadorLogin.body.usuario?.usuarioId;

    // Seed obra EM_EXECUCAO with one etapa AGUARDANDO_VISTORIA
    const obra = await prisma.obra.create({
      data: {
        usuarioId: tomadorId,
        nome: "Obra Etapas E2E",
        endereco: "Rua Teste, 100",
        geoLatitude: -23.55,
        geoLongitude: -46.63,
        raioValidacaoMetros: 200,
        areaM2: 100,
        tipo: "RESIDENCIAL",
        status: "EM_EXECUCAO",
      },
    });
    obraId = obra.obraId;

    const etapa = await prisma.etapaObra.create({
      data: {
        obraId,
        nome: "Fundação",
        ordem: 1,
        percentualObra: 15,
        valorLiberacao: 5000,
        status: "AGUARDANDO_VISTORIA",
      },
    });
    etapaId = etapa.etapaId;

    // Seed evidencia required for aprovação
    await prisma.evidenciaEtapa.create({
      data: {
        etapaId,
        obraId,
        fotoUrl: "https://storage.example.com/etapas-e2e-evidencia.jpg",
        latCaptura: -23.55,
        lngCaptura: -46.63,
        validada: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.evidenciaEtapa.deleteMany({ where: { obraId } });
    await prisma.etapaObra.deleteMany({ where: { obraId } });
    await prisma.obra.deleteMany({ where: { obraId } });
    await prisma.usuario.deleteMany({ where: { email: TOMADOR_EMAIL } });
    await prisma.usuario.deleteMany({ where: { cpf: ADMIN_CPF } });
    await app.close();
  });

  describe("GET /etapas/obra/:obraId", () => {
    it("200 lista etapas da obra com evidências", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/etapas/obra/${obraId}`)
        .set("Authorization", `Bearer ${tomadorToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty("etapaId");
      expect(res.body[0]).toHaveProperty("nome");
      expect(res.body[0]).toHaveProperty("status");
      expect(res.body[0]).toHaveProperty("evidencias");
    });

    it("401 sem autenticação", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/etapas/obra/${obraId}`)
        .expect(401);
    });

    it("200 retorna array vazio para obra sem etapas", async () => {
      const obraVazia = await prisma.obra.create({
        data: {
          usuarioId: (await prisma.usuario.findFirst({ where: { email: TOMADOR_EMAIL } }))!.usuarioId,
          nome: "Obra Vazia E2E",
          endereco: "Rua Vazia, 1",
          geoLatitude: -23.55,
          geoLongitude: -46.63,
          raioValidacaoMetros: 200,
          areaM2: 80,
          tipo: "RESIDENCIAL",
          status: "EM_EXECUCAO",
        },
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/etapas/obra/${obraVazia.obraId}`)
        .set("Authorization", `Bearer ${tomadorToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);

      await prisma.obra.delete({ where: { obraId: obraVazia.obraId } });
    });
  });

  describe("PATCH /etapas/:id/aprovar", () => {
    it("200 admin aprova etapa com evidência", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/etapas/${etapaId}/aprovar`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ observacao: "Aprovado pelo E2E" })
        .expect(200);

      expect(res.body).toHaveProperty("ok", true);
    });

    it("403 tomador não pode aprovar etapa", async () => {
      // Create another etapa to test 403
      const etapa2 = await prisma.etapaObra.create({
        data: {
          obraId,
          nome: "Estrutura",
          ordem: 2,
          percentualObra: 12,
          valorLiberacao: 4000,
          status: "AGUARDANDO_VISTORIA",
        },
      });
      await prisma.evidenciaEtapa.create({
        data: {
          etapaId: etapa2.etapaId,
          obraId,
          fotoUrl: "https://storage.example.com/etapas-e2e-ev2.jpg",
          latCaptura: -23.55,
          lngCaptura: -46.63,
          validada: true,
        },
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/etapas/${etapa2.etapaId}/aprovar`)
        .set("Authorization", `Bearer ${tomadorToken}`)
        .expect(403);

      await prisma.evidenciaEtapa.deleteMany({ where: { etapaId: etapa2.etapaId } });
      await prisma.etapaObra.delete({ where: { etapaId: etapa2.etapaId } });
    });
  });

  describe("PATCH /etapas/:id/rejeitar", () => {
    it("200 admin rejeita etapa com motivo", async () => {
      const etapa3 = await prisma.etapaObra.create({
        data: {
          obraId,
          nome: "Alvenaria",
          ordem: 3,
          percentualObra: 14,
          valorLiberacao: 4500,
          status: "AGUARDANDO_VISTORIA",
        },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/etapas/${etapa3.etapaId}/rejeitar`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ motivo: "Evidências insuficientes" })
        .expect(200);

      expect(res.body).toHaveProperty("ok", true);

      await prisma.etapaObra.delete({ where: { etapaId: etapa3.etapaId } });
    });
  });
});
