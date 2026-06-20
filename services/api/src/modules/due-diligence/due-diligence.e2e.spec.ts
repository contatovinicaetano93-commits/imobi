import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import * as bcrypt from "bcryptjs";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

const PREFIX = "dd-e2e";

describe("Due Diligence E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let gestorToken: string;
  let gestorId: string;
  let adminToken: string;
  let outroGestorToken: string;
  let ddId: string;

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

    const [gestor, admin, outroGestor] = await Promise.all([
      prisma.usuario.upsert({
        where: { email: `${PREFIX}-gestor@imbobi.com` },
        update: {},
        create: {
          nome: "Gestor DD E2E",
          email: `${PREFIX}-gestor@imbobi.com`,
          cpf: "000.000.000-60",
          telefone: "(11) 99999-0060",
          passwordHash,
          tipo: "GESTOR",
          kycStatus: "APROVADO",
          consentidoTermos: true,
          consentidoPrivacy: true,
        },
      }),
      prisma.usuario.upsert({
        where: { email: `${PREFIX}-admin@imbobi.com` },
        update: {},
        create: {
          nome: "Admin DD E2E",
          email: `${PREFIX}-admin@imbobi.com`,
          cpf: "000.000.000-61",
          telefone: "(11) 99999-0061",
          passwordHash,
          tipo: "ADMIN",
          kycStatus: "APROVADO",
          consentidoTermos: true,
          consentidoPrivacy: true,
        },
      }),
      prisma.usuario.upsert({
        where: { email: `${PREFIX}-outro@imbobi.com` },
        update: {},
        create: {
          nome: "Outro Gestor DD E2E",
          email: `${PREFIX}-outro@imbobi.com`,
          cpf: "000.000.000-62",
          telefone: "(11) 99999-0062",
          passwordHash,
          tipo: "GESTOR",
          kycStatus: "APROVADO",
          consentidoTermos: true,
          consentidoPrivacy: true,
        },
      }),
    ]);
    gestorId = gestor.usuarioId;

    const [loginGestor, loginAdmin, loginOutro] = await Promise.all([
      request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: `${PREFIX}-gestor@imbobi.com`, password: "Senha@123" }),
      request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: `${PREFIX}-admin@imbobi.com`, password: "Senha@123" }),
      request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: `${PREFIX}-outro@imbobi.com`, password: "Senha@123" }),
    ]);

    gestorToken = loginGestor.body.access_token;
    adminToken = loginAdmin.body.access_token;
    outroGestorToken = loginOutro.body.access_token;
  });

  afterAll(async () => {
    await prisma.dueDiligence.deleteMany({ where: { gestorId } });
    await prisma.sessaoToken.deleteMany({
      where: { usuario: { email: { startsWith: PREFIX } } },
    });
    await prisma.usuario.deleteMany({ where: { email: { startsWith: PREFIX } } });
    await app.close();
  });

  describe("POST /due-diligence", () => {
    it("201 gestor cria due diligence", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/due-diligence")
        .set("Authorization", `Bearer ${gestorToken}`)
        .send({
          nomeEmpreendimento: "Residencial Vista Verde E2E",
          tipologia: "Residencial",
          cidade: "São Paulo",
          uf: "SP",
          totalUnidades: 120,
          nomeIncorporadora: "Incorporadora Teste E2E",
          cnpjIncorporadora: "12.345.678/0001-90",
          totalCarteira: 50000000,
          totalAReceber: 35000000,
          payload: {
            checklistItems: [
              { item: "Certidão de matrícula", ok: true },
              { item: "IPTU quitado", ok: true },
            ],
          },
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("nomeEmpreendimento", "Residencial Vista Verde E2E");
      expect(res.body).toHaveProperty("status", "ENVIADO");
      ddId = res.body.id;
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/due-diligence")
        .send({ nomeEmpreendimento: "Teste", payload: {} })
        .expect(401);
    });
  });

  describe("GET /due-diligence", () => {
    it("200 gestor lista apenas suas due diligences", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/due-diligence")
        .set("Authorization", `Bearer ${gestorToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      const dd = res.body.find((d: { id: string }) => d.id === ddId);
      expect(dd).toBeDefined();
      expect(dd).toHaveProperty("nomeEmpreendimento");
      expect(dd).toHaveProperty("status");
    });

    it("200 outro gestor não vê DDs de terceiros", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/due-diligence")
        .set("Authorization", `Bearer ${outroGestorToken}`)
        .expect(200);

      const ids = res.body.map((d: { id: string }) => d.id);
      expect(ids).not.toContain(ddId);
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer()).get("/api/v1/due-diligence").expect(401);
    });
  });

  describe("GET /due-diligence/:id", () => {
    it("200 gestor acessa sua própria due diligence", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/due-diligence/${ddId}`)
        .set("Authorization", `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("id", ddId);
      expect(res.body).toHaveProperty("payload");
    });

    it("200 admin pode acessar qualquer due diligence", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/due-diligence/${ddId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("id", ddId);
    });

    it("403 outro gestor não pode ver DD de terceiro", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/due-diligence/${ddId}`)
        .set("Authorization", `Bearer ${outroGestorToken}`)
        .expect(403);
    });

    it("404 para ID inexistente", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/due-diligence/id-que-nao-existe")
        .set("Authorization", `Bearer ${gestorToken}`)
        .expect(404);
    });
  });

  describe("PATCH /due-diligence/:id/status (ADMIN only)", () => {
    it("200 admin atualiza status da due diligence", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/due-diligence/${ddId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "APROVADO" })
        .expect(200);

      expect(res.body).toHaveProperty("status", "APROVADO");
    });

    it("403 gestor não pode alterar status", async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/due-diligence/${ddId}/status`)
        .set("Authorization", `Bearer ${gestorToken}`)
        .send({ status: "REPROVADO" })
        .expect(403);
    });

    it("404 para ID inexistente", async () => {
      await request(app.getHttpServer())
        .patch("/api/v1/due-diligence/id-que-nao-existe/status")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "APROVADO" })
        .expect(404);
    });
  });
});
