import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import * as bcrypt from "bcryptjs";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

const PREFIX = "engenheiros-e2e";

describe("Engenheiros E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let engenheiroToken: string;
  let tomadorToken: string;
  let obraId: string;
  let etapaId: string;
  let engenheiroId: string;
  let tomadorId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = module.get(PrismaService);

    const passwordHash = await bcrypt.hash("Senha@123", 10);

    // Cria ENGENHEIRO diretamente via Prisma
    const engenheiro = await prisma.usuario.upsert({
      where: { email: `${PREFIX}-eng@imbobi.com` },
      update: {},
      create: {
        nome: "Engenheiro E2E",
        email: `${PREFIX}-eng@imbobi.com`,
        cpf: "000.000.000-40",
        telefone: "(11) 99999-0040",
        passwordHash,
        tipo: "ENGENHEIRO",
        kycStatus: "APROVADO",
        consentidoTermos: true,
        consentidoPrivacy: true,
      },
    });
    engenheiroId = engenheiro.usuarioId;

    const loginEng = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: `${PREFIX}-eng@imbobi.com`, password: "Senha@123" });
    engenheiroToken = loginEng.body.access_token;

    // Registra tomador para criar obra
    const regTomador = await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({
        nome: "Tomador Engenheiro E2E",
        email: `${PREFIX}-tomador@imbobi.com`,
        cpf: "000.000.000-41",
        telefone: "(11) 99999-0041",
        password: "Senha@123",
      });
    tomadorId = regTomador.body.usuarioId;

    const loginTomador = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: `${PREFIX}-tomador@imbobi.com`, password: "Senha@123" });
    tomadorToken = loginTomador.body.access_token;

    // Cria obra em execução com etapa aguardando vistoria via Prisma
    const obra = await prisma.obra.create({
      data: {
        usuarioId: tomadorId,
        nome: "Obra Engenheiro E2E",
        endereco: "Rua Engenheiro, 200 - SP",
        geoLatitude: -23.55,
        geoLongitude: -46.63,
        status: "EM_EXECUCAO",
      },
    });
    obraId = obra.obraId;

    const etapa = await prisma.etapaObra.create({
      data: {
        obraId,
        nome: "Fundação E2E",
        descricao: "Etapa de fundação para testes",
        ordem: 1,
        status: "AGUARDANDO_VISTORIA",
        valorLiberacao: 50000,
      },
    });
    etapaId = etapa.etapaId;

    // Cria evidência para permitir aprovação de vistoria
    await prisma.evidenciaEtapa.create({
      data: {
        etapaId,
        obraId,
        fotoUrl: "https://storage.example.com/e2e-evidencia.jpg",
        latCaptura: -23.55,
        lngCaptura: -46.63,
        validada: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.etapaObra.deleteMany({ where: { obraId } });
    await prisma.obra.deleteMany({ where: { obraId } });
    await prisma.notificacao.deleteMany({
      where: {
        usuarioId: { in: [engenheiroId, tomadorId] },
      },
    });
    await prisma.sessaoToken.deleteMany({
      where: { usuario: { email: { startsWith: PREFIX } } },
    });
    await prisma.usuario.deleteMany({ where: { email: { startsWith: PREFIX } } });
    await app.close();
  });

  describe("GET /engenheiros/visitas", () => {
    it("200 engenheiro lista visitas (inclui etapas aguardando vistoria)", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/engenheiros/visitas")
        .set("Authorization", `Bearer ${engenheiroToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      const visita = res.body.find((v: { etapaId: string }) => v.etapaId === etapaId);
      expect(visita).toBeDefined();
      expect(visita).toHaveProperty("visitaId");
      expect(visita).toHaveProperty("status", "AGENDADA");
      expect(visita).toHaveProperty("obraId");
      expect(visita).toHaveProperty("obra");
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer()).get("/api/v1/engenheiros/visitas").expect(401);
    });

    it("403 tomador não acessa rota de engenheiro", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/engenheiros/visitas")
        .set("Authorization", `Bearer ${tomadorToken}`)
        .expect(403);
    });
  });

  describe("GET /engenheiros/visitas/:id", () => {
    it("200 retorna detalhes da visita com evidências", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/engenheiros/visitas/${etapaId}`)
        .set("Authorization", `Bearer ${engenheiroToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("visitaId", etapaId);
      expect(res.body).toHaveProperty("etapaNome", "Fundação E2E");
      expect(res.body).toHaveProperty("obra");
      expect(res.body).toHaveProperty("evidencias");
      expect(Array.isArray(res.body.evidencias)).toBe(true);
    });

    it("404 para visita inexistente", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/engenheiros/visitas/id-que-nao-existe")
        .set("Authorization", `Bearer ${engenheiroToken}`)
        .expect(404);
    });
  });

  describe("PATCH /engenheiros/visitas/:id/aprovar", () => {
    it("200 engenheiro aprova vistoria", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/engenheiros/visitas/${etapaId}/aprovar`)
        .set("Authorization", `Bearer ${engenheiroToken}`)
        .send({ observacao: "Fundação conforme especificação técnica" })
        .expect(200);

      expect(res.body).toHaveProperty("ok", true);

      const etapaAtualizada = await prisma.etapaObra.findUnique({ where: { etapaId } });
      expect(etapaAtualizada?.status).toBe("CONCLUIDA");
    });
  });

  describe("GET /engenheiros/financeiro", () => {
    it("200 retorna sumário financeiro", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/engenheiros/financeiro")
        .set("Authorization", `Bearer ${engenheiroToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer()).get("/api/v1/engenheiros/financeiro").expect(401);
    });
  });

  describe("GET /engenheiros/licencas", () => {
    it("200 retorna lista de licenças", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/engenheiros/licencas")
        .set("Authorization", `Bearer ${engenheiroToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /engenheiros/obras/:obraId/etapas", () => {
    it("200 retorna etapas da obra", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/engenheiros/obras/${obraId}/etapas`)
        .set("Authorization", `Bearer ${engenheiroToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
