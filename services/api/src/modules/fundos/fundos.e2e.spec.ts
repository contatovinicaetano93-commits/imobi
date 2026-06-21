import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import * as bcrypt from "bcryptjs";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

const PREFIX = "fundos-e2e";

describe("Fundos E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let gestorFundoToken: string;
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

    // Cria GESTOR_FUNDO diretamente via Prisma
    await prisma.usuario.upsert({
      where: { email: `${PREFIX}-gestor@imbobi.com` },
      update: {},
      create: {
        nome: "Gestor Fundo E2E",
        email: `${PREFIX}-gestor@imbobi.com`,
        cpf: "000.000.000-01",
        telefone: "(11) 99999-0001",
        passwordHash,
        tipo: "GESTOR_FUNDO",
        kycStatus: "APROVADO",
        consentidoTermos: true,
        consentidoPrivacy: true,
      },
    });

    // Login GESTOR_FUNDO
    const loginGestor = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: `${PREFIX}-gestor@imbobi.com`, password: "Senha@123" });
    gestorFundoToken = loginGestor.body.access_token;

    // Registra e loga TOMADOR (para testar acesso negado)
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({
        nome: "Tomador E2E",
        email: `${PREFIX}-tomador@imbobi.com`,
        cpf: "000.000.000-02",
        telefone: "(11) 99999-0002",
        password: "Senha@123",
      });
    const loginTomador = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: `${PREFIX}-tomador@imbobi.com`, password: "Senha@123" });
    tomadorToken = loginTomador.body.access_token;
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { email: { startsWith: PREFIX } } });
    await app.close();
  });

  describe("GET /fundos/portfolio", () => {
    it("200 com GESTOR_FUNDO", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/fundos/portfolio")
        .set("Authorization", `Bearer ${gestorFundoToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("totalDesembolsado");
      expect(res.body).toHaveProperty("totalAprovado");
      expect(res.body).toHaveProperty("obrasAtivas");
      expect(res.body).toHaveProperty("inadimplenciaRate");
      expect(res.body).toHaveProperty("liberacoesPorMes");
      expect(Array.isArray(res.body.liberacoesPorMes)).toBe(true);
      expect(res.body.liberacoesPorMes).toHaveLength(12);
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer()).get("/api/v1/fundos/portfolio").expect(401);
    });

    it("403 com TOMADOR", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/fundos/portfolio")
        .set("Authorization", `Bearer ${tomadorToken}`)
        .expect(403);
    });
  });

  describe("GET /fundos/obras", () => {
    it("200 retorna lista paginada", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/fundos/obras?limit=10&offset=0")
        .set("Authorization", `Bearer ${gestorFundoToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("obras");
      expect(res.body).toHaveProperty("total");
      expect(res.body).toHaveProperty("limit", 10);
      expect(Array.isArray(res.body.obras)).toBe(true);
    });

    it("200 filtra por status", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/fundos/obras?status=EM_EXECUCAO")
        .set("Authorization", `Bearer ${gestorFundoToken}`)
        .expect(200);

      res.body.obras.forEach((o: { status: string }) => {
        expect(o.status).toBe("EM_EXECUCAO");
      });
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer()).get("/api/v1/fundos/obras").expect(401);
    });
  });

  describe("GET /fundos/por-regiao", () => {
    it("200 retorna regiões", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/fundos/por-regiao")
        .set("Authorization", `Bearer ${gestorFundoToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("regioes");
      expect(Array.isArray(res.body.regioes)).toBe(true);
    });
  });

  describe("GET /fundos/exposicao-credito", () => {
    it("200 retorna estrutura de exposição", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/fundos/exposicao-credito")
        .set("Authorization", `Bearer ${gestorFundoToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("tomadores");
      expect(res.body).toHaveProperty("ltvMedio");
      expect(res.body).toHaveProperty("concentracaoTop5");
      expect(res.body).toHaveProperty("totalPortfolio");
      expect(Array.isArray(res.body.tomadores)).toBe(true);
    });
  });
});
