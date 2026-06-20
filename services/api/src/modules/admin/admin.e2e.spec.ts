import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import * as bcrypt from "bcryptjs";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

const PREFIX = "admin-e2e";

describe("Admin E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let adminId: string;
  let gestorToken: string;
  let userToken: string;
  let userId: string;
  let seedObraId: string;

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

    // Cria ADMIN diretamente via Prisma
    const admin = await prisma.usuario.upsert({
      where: { email: `${PREFIX}-admin@imbobi.com` },
      update: {},
      create: {
        nome: "Admin E2E",
        email: `${PREFIX}-admin@imbobi.com`,
        cpf: "000.000.000-30",
        telefone: "(11) 99999-0030",
        passwordHash,
        tipo: "ADMIN",
        kycStatus: "APROVADO",
        consentidoTermos: true,
        consentidoPrivacy: true,
      },
    });
    adminId = admin.usuarioId;

    const loginAdmin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: `${PREFIX}-admin@imbobi.com`, password: "Senha@123" });
    adminToken = loginAdmin.body.access_token;

    // Cria GESTOR diretamente via Prisma
    await prisma.usuario.upsert({
      where: { email: `${PREFIX}-gestor@imbobi.com` },
      update: {},
      create: {
        nome: "Gestor E2E",
        email: `${PREFIX}-gestor@imbobi.com`,
        cpf: "000.000.000-31",
        telefone: "(11) 99999-0031",
        passwordHash,
        tipo: "GESTOR",
        kycStatus: "APROVADO",
        consentidoTermos: true,
        consentidoPrivacy: true,
      },
    });

    const loginGestor = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: `${PREFIX}-gestor@imbobi.com`, password: "Senha@123" });
    gestorToken = loginGestor.body.access_token;

    // Registra usuário regular
    const regRes = await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({
        nome: "User Admin E2E",
        email: `${PREFIX}-user@imbobi.com`,
        cpf: "000.000.000-32",
        telefone: "(11) 99999-0032",
        password: "Senha@123",
      });
    userId = regRes.body.usuarioId;

    const loginUser = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: `${PREFIX}-user@imbobi.com`, password: "Senha@123" });
    userToken = loginUser.body.access_token;

    // Cria obra para testes de homologação
    const obra = await prisma.obra.create({
      data: {
        usuarioId: userId,
        nome: "Obra Admin E2E",
        endereco: "Rua Admin, 100 - SP",
        geoLatitude: -23.55,
        geoLongitude: -46.63,
        status: "AGUARDANDO_HOMOLOGACAO",
      },
    });
    seedObraId = obra.obraId;
  });

  afterAll(async () => {
    await prisma.obra.deleteMany({ where: { obraId: seedObraId } });
    await prisma.notificacao.deleteMany({
      where: {
        usuarioId: {
          in: await prisma.usuario
            .findMany({ where: { email: { startsWith: PREFIX } } })
            .then((u) => u.map((x) => x.usuarioId)),
        },
      },
    });
    await prisma.sessaoToken.deleteMany({
      where: { usuario: { email: { startsWith: PREFIX } } },
    });
    await prisma.usuario.deleteMany({ where: { email: { startsWith: PREFIX } } });
    await app.close();
  });

  describe("GET /admin/overview", () => {
    it("200 admin recebe overview com campos corretos", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/admin/overview")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("totalUsuarios");
      expect(res.body).toHaveProperty("obrasAtivas");
      expect(res.body).toHaveProperty("obrasTotal");
      expect(res.body).toHaveProperty("creditoAprovado");
      expect(res.body).toHaveProperty("creditoLiberado");
      expect(res.body).toHaveProperty("kycPendentes");
      expect(res.body).toHaveProperty("etapasPendentes");
      expect(res.body).toHaveProperty("filaLiberacao");
      expect(typeof res.body.totalUsuarios).toBe("number");
    });

    it("200 gestor também pode ver overview", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/admin/overview")
        .set("Authorization", `Bearer ${gestorToken}`)
        .expect(200);
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer()).get("/api/v1/admin/overview").expect(401);
    });

    it("403 usuário comum não pode ver overview", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/admin/overview")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe("GET /admin/metricas", () => {
    it("200 retorna estrutura de métricas", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/admin/metricas")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("creditoLiberadoPorMes");
      expect(res.body).toHaveProperty("obrasPorStatus");
      expect(res.body).toHaveProperty("taxaAprovacaoEtapas");
      expect(res.body).toHaveProperty("kycPendentes");
      expect(Array.isArray(res.body.creditoLiberadoPorMes)).toBe(true);
      expect(res.body.creditoLiberadoPorMes).toHaveLength(12);
    });

    it("200 gestor pode acessar métricas", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/admin/metricas")
        .set("Authorization", `Bearer ${gestorToken}`)
        .expect(200);
    });

    it("403 usuário comum não acessa métricas", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/admin/metricas")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe("GET /admin/atividades", () => {
    it("200 retorna array de atividades recentes", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/admin/atividades?limit=5")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer()).get("/api/v1/admin/atividades").expect(401);
    });

    it("403 gestor não acessa atividades (rota ADMIN only)", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/admin/atividades")
        .set("Authorization", `Bearer ${gestorToken}`)
        .expect(403);
    });
  });

  describe("GET /admin/usuarios", () => {
    it("200 lista usuários com campos esperados", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/admin/usuarios")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const u = res.body[0];
      expect(u).toHaveProperty("id");
      expect(u).toHaveProperty("nome");
      expect(u).toHaveProperty("email");
      expect(u).toHaveProperty("tipo");
      expect(u).toHaveProperty("kycStatus");
    });

    it("403 usuário comum não lista usuários", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/admin/usuarios")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe("POST /admin/usuarios", () => {
    let criadoId: string | undefined;

    afterEach(async () => {
      if (criadoId) {
        await prisma.usuario.deleteMany({ where: { usuarioId: criadoId } });
        criadoId = undefined;
      }
    });

    it("201 admin cria usuário com tipo ENGENHEIRO", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/admin/usuarios")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nome: "Engenheiro Criado E2E",
          email: `${PREFIX}-eng-criado@imbobi.com`,
          senha: "Senha@123",
          tipo: "ENGENHEIRO",
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("tipo", "ENGENHEIRO");
      criadoId = res.body.id;
    });

    it("409 ao criar usuário com e-mail duplicado", async () => {
      // primeiro
      const first = await request(app.getHttpServer())
        .post("/api/v1/admin/usuarios")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nome: "Dup E2E",
          email: `${PREFIX}-dup@imbobi.com`,
          senha: "Senha@123",
          tipo: "TOMADOR",
        });
      criadoId = first.body.id;

      // segundo com mesmo e-mail
      await request(app.getHttpServer())
        .post("/api/v1/admin/usuarios")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nome: "Dup E2E 2",
          email: `${PREFIX}-dup@imbobi.com`,
          senha: "Senha@123",
          tipo: "TOMADOR",
        })
        .expect(409);
    });

    it("403 usuário comum não pode criar usuários", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/admin/usuarios")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          nome: "Tentativa",
          email: `${PREFIX}-tentativa@imbobi.com`,
          senha: "Senha@123",
          tipo: "TOMADOR",
        })
        .expect(403);
    });
  });

  describe("PATCH /admin/usuarios/:id", () => {
    it("200 admin atualiza nome de usuário", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/usuarios/${userId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ nome: "Nome Atualizado E2E" })
        .expect(200);

      expect(res.body).toHaveProperty("nome", "Nome Atualizado E2E");
    });

    it("400 admin não pode bloquear a própria conta", async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/usuarios/${adminId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ bloqueado: true })
        .expect(400);
    });

    it("403 usuário comum não pode atualizar usuários", async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/usuarios/${userId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ nome: "Hackeado" })
        .expect(403);
    });
  });

  describe("DELETE /admin/usuarios/:id", () => {
    it("200 admin pode excluir usuário via soft delete", async () => {
      // Cria usuário temporário para excluir
      const temp = await prisma.usuario.create({
        data: {
          nome: "Temp Delete E2E",
          email: `${PREFIX}-temp-delete@imbobi.com`,
          cpf: "000.000.000-39",
          telefone: "(11) 99999-0039",
          passwordHash: await bcrypt.hash("Senha@123", 10),
          tipo: "TOMADOR",
          consentidoTermos: true,
          consentidoPrivacy: true,
        },
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/admin/usuarios/${temp.usuarioId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("ok", true);

      // verifica soft-delete
      const excluido = await prisma.usuario.findUnique({
        where: { usuarioId: temp.usuarioId },
      });
      expect(excluido?.deletadoEm).not.toBeNull();
      await prisma.usuario.delete({ where: { usuarioId: temp.usuarioId } });
    });

    it("400 admin não pode excluir a própria conta", async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/usuarios/${adminId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);
    });

    it("404 para usuário inexistente", async () => {
      await request(app.getHttpServer())
        .delete("/api/v1/admin/usuarios/id-que-nao-existe")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe("GET /admin/obras", () => {
    it("200 lista obras com paginação", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/admin/obras?limit=10&offset=0")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer()).get("/api/v1/admin/obras").expect(401);
    });
  });

  describe("PATCH /admin/obras/:id/homologar", () => {
    it("200 homologa obra aguardando homologação", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/obras/${seedObraId}/homologar`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("ok", true);
      expect(res.body).toHaveProperty("status", "EM_EXECUCAO");
    });

    it("400 obra já em execução não pode ser homologada novamente", async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/obras/${seedObraId}/homologar`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);
    });

    it("404 obra inexistente", async () => {
      await request(app.getHttpServer())
        .patch("/api/v1/admin/obras/id-que-nao-existe/homologar")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe("GET /admin/liberacoes/aguardando-pagamento", () => {
    it("200 retorna array (pode estar vazio)", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/admin/liberacoes/aguardando-pagamento")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/admin/liberacoes/aguardando-pagamento")
        .expect(401);
    });
  });
});
