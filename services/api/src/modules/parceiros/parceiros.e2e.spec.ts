import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import * as bcrypt from "bcryptjs";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

const PREFIX = "parceiros-e2e";

describe("Parceiros E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let parceiroToken: string;
  let tomadorToken: string;

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

    await prisma.usuario.upsert({
      where: { email: `${PREFIX}-parceiro@imbobi.com` },
      update: {},
      create: {
        nome: "Parceiro E2E",
        email: `${PREFIX}-parceiro@imbobi.com`,
        cpf: "000.000.000-80",
        telefone: "(11) 99999-0080",
        passwordHash,
        tipo: "PARCEIRO",
        kycStatus: "APROVADO",
        consentidoTermos: true,
        consentidoPrivacy: true,
      },
    });

    const loginParceiro = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: `${PREFIX}-parceiro@imbobi.com`, password: "Senha@123" });
    parceiroToken = loginParceiro.body.access_token;

    // Registra TOMADOR para 403 tests
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({
        nome: "Tomador Parceiros E2E",
        email: `${PREFIX}-tomador@imbobi.com`,
        cpf: "000.000.000-81",
        telefone: "(11) 99999-0081",
        password: "Senha@123",
      });

    const loginTomador = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: `${PREFIX}-tomador@imbobi.com`, password: "Senha@123" });
    tomadorToken = loginTomador.body.access_token;
  });

  afterAll(async () => {
    await prisma.sessaoToken.deleteMany({
      where: { usuario: { email: { startsWith: PREFIX } } },
    });
    await prisma.usuario.deleteMany({ where: { email: { startsWith: PREFIX } } });
    await app.close();
  });

  describe("GET /parceiros/resumo", () => {
    it("200 parceiro obtém resumo de indicações", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/parceiros/resumo")
        .set("Authorization", `Bearer ${parceiroToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("codigoIndicacao");
      expect(res.body).toHaveProperty("operacoesAtivas");
      expect(res.body).toHaveProperty("taxaAprovacao");
      expect(res.body).toHaveProperty("comissoesAReceber");
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer()).get("/api/v1/parceiros/resumo").expect(401);
    });

    it("403 tomador não acessa área de parceiros", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/parceiros/resumo")
        .set("Authorization", `Bearer ${tomadorToken}`)
        .expect(403);
    });
  });

  describe("GET /parceiros/operacoes", () => {
    it("200 retorna lista de operações indicadas", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/parceiros/operacoes")
        .set("Authorization", `Bearer ${parceiroToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer()).get("/api/v1/parceiros/operacoes").expect(401);
    });
  });

  describe("GET /parceiros/mailing", () => {
    it("200 retorna lista de mailing", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/parceiros/mailing")
        .set("Authorization", `Bearer ${parceiroToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("POST /parceiros/mailing", () => {
    it("201 parceiro adiciona contato ao mailing", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/parceiros/mailing")
        .set("Authorization", `Bearer ${parceiroToken}`)
        .send({
          nome: "Contato Mailing E2E",
          email: `mailing-e2e-${Date.now()}@teste.com`,
          telefone: "(11) 97777-0001",
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("nome", "Contato Mailing E2E");
    });

    it("400 sem nome obrigatório", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/parceiros/mailing")
        .set("Authorization", `Bearer ${parceiroToken}`)
        .send({
          email: "sem-nome@teste.com",
        })
        .expect(400);
    });

    it("403 tomador não pode adicionar mailing", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/parceiros/mailing")
        .set("Authorization", `Bearer ${tomadorToken}`)
        .send({
          nome: "Tentativa",
          email: "tentativa@teste.com",
        })
        .expect(403);
    });
  });
});
