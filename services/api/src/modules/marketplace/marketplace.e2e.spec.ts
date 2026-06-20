import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import * as bcrypt from "bcryptjs";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

const PREFIX = "marketplace-e2e";

describe("Marketplace E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let adminToken: string;
  let seedFornecedorId: string;

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

    // Cria usuário ADMIN via Prisma
    await prisma.usuario.upsert({
      where: { email: `${PREFIX}-admin@imbobi.com` },
      update: {},
      create: {
        nome: "Admin Marketplace E2E",
        email: `${PREFIX}-admin@imbobi.com`,
        cpf: "000.000.000-20",
        telefone: "(11) 99999-0020",
        passwordHash,
        tipo: "ADMIN",
        kycStatus: "APROVADO",
        consentidoTermos: true,
        consentidoPrivacy: true,
      },
    });

    const loginAdmin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: `${PREFIX}-admin@imbobi.com`, password: "Senha@123" });
    adminToken = loginAdmin.body.access_token;

    // Registra user normal
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({
        nome: "User Marketplace E2E",
        email: `${PREFIX}-user@imbobi.com`,
        cpf: "000.000.000-21",
        telefone: "(11) 99999-0021",
        password: "Senha@123",
      });
    const loginUser = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: `${PREFIX}-user@imbobi.com`, password: "Senha@123" });
    userToken = loginUser.body.access_token;

    // Cria um fornecedor seed para os testes
    const fornecedor = await prisma.fornecedor.create({
      data: {
        fornecedorId: `${PREFIX}-fornecedor`,
        nome: "Fornecedor E2E Test",
        tipo: "MATERIAL_CONSTRUCAO",
        descricao: "Fornecedor criado para testes E2E",
        telefone: "(11) 1234-5678",
        email: "fornecedor@e2e.test",
        cidade: "São Paulo",
        uf: "SP",
        ativo: true,
      },
    });
    seedFornecedorId = fornecedor.fornecedorId;
  });

  afterAll(async () => {
    await prisma.avaliacaoFornecedor.deleteMany({
      where: { fornecedorId: seedFornecedorId },
    });
    await prisma.fornecedor.deleteMany({ where: { fornecedorId: { startsWith: PREFIX } } });
    await prisma.notificacao.deleteMany({
      where: { usuarioId: { in: await prisma.usuario
        .findMany({ where: { email: { startsWith: PREFIX } } })
        .then((u) => u.map((x) => x.usuarioId)) } },
    });
    await prisma.sessaoToken.deleteMany({
      where: { usuario: { email: { startsWith: PREFIX } } },
    });
    await prisma.usuario.deleteMany({ where: { email: { startsWith: PREFIX } } });
    await app.close();
  });

  describe("GET /marketplace/fornecedores", () => {
    it("200 lista fornecedores autenticado", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/marketplace/fornecedores")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("fornecedores");
      expect(res.body).toHaveProperty("total");
      expect(Array.isArray(res.body.fornecedores)).toBe(true);
    });

    it("200 filtra por tipo", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/marketplace/fornecedores?tipo=MATERIAL_CONSTRUCAO")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      res.body.fornecedores.forEach((f: { tipo: string }) => {
        expect(f.tipo).toBe("MATERIAL_CONSTRUCAO");
      });
    });

    it("200 filtra por UF", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/marketplace/fornecedores?uf=SP")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      res.body.fornecedores.forEach((f: { uf: string }) => {
        expect(f.uf).toBe("SP");
      });
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/marketplace/fornecedores")
        .expect(401);
    });
  });

  describe("GET /marketplace/fornecedores/:id", () => {
    it("200 retorna detalhes com avaliações", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/marketplace/fornecedores/${seedFornecedorId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("fornecedorId", seedFornecedorId);
      expect(res.body).toHaveProperty("nome");
      expect(res.body).toHaveProperty("avaliacoes");
      expect(Array.isArray(res.body.avaliacoes)).toBe(true);
    });

    it("404 para ID inexistente", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/marketplace/fornecedores/id-que-nao-existe")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe("POST /marketplace/fornecedores/:id/avaliar", () => {
    it("200 avalia fornecedor com nota válida", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/marketplace/fornecedores/${seedFornecedorId}/avaliar`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ nota: 5, comentario: "Excelente atendimento!" })
        .expect(201);

      expect(res.body).toHaveProperty("ok", true);
    });

    it("400 ao avaliar duas vezes o mesmo fornecedor", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/marketplace/fornecedores/${seedFornecedorId}/avaliar`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ nota: 3 })
        .expect(400);
    });

    it("400 com nota fora do range", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/marketplace/fornecedores/${seedFornecedorId}/avaliar`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ nota: 6 })
        .expect(400);
    });
  });

  describe("POST /marketplace/fornecedores (ADMIN only)", () => {
    it("201 admin cria novo fornecedor", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/marketplace/fornecedores")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nome: `${PREFIX}-novo-fornecedor`,
          tipo: "ENGENHARIA",
          cidade: "Campinas",
          uf: "SP",
        })
        .expect(201);

      expect(res.body).toHaveProperty("fornecedorId");
      expect(res.body).toHaveProperty("nome");

      // cleanup
      await prisma.fornecedor.delete({ where: { fornecedorId: res.body.fornecedorId } });
    });

    it("403 user comum não pode criar fornecedor", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/marketplace/fornecedores")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          nome: "Tentativa indevida",
          tipo: "OUTROS",
        })
        .expect(403);
    });
  });
});
