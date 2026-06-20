import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import * as bcrypt from "bcryptjs";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

const PREFIX = "comite-e2e";

describe("Comite E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let adminId: string;
  let gestorFundoToken: string;
  let engenheiroToken: string;
  let tomadorToken: string;
  let tomadorId: string;

  // IDs criados durante os testes para cleanup
  const solicitacaoIds: string[] = [];

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

    const admin = await prisma.usuario.upsert({
      where: { email: `${PREFIX}-admin@imbobi.com` },
      update: {},
      create: {
        nome: "Admin Comite E2E",
        email: `${PREFIX}-admin@imbobi.com`,
        cpf: "000.000.000-50",
        telefone: "(11) 99999-0050",
        passwordHash,
        tipo: "ADMIN",
        kycStatus: "APROVADO",
        consentidoTermos: true,
        consentidoPrivacy: true,
      },
    });
    adminId = admin.usuarioId;

    await prisma.usuario.upsert({
      where: { email: `${PREFIX}-gestor@imbobi.com` },
      update: {},
      create: {
        nome: "Gestor Fundo Comite E2E",
        email: `${PREFIX}-gestor@imbobi.com`,
        cpf: "000.000.000-51",
        telefone: "(11) 99999-0051",
        passwordHash,
        tipo: "GESTOR_FUNDO",
        kycStatus: "APROVADO",
        consentidoTermos: true,
        consentidoPrivacy: true,
      },
    });

    await prisma.usuario.upsert({
      where: { email: `${PREFIX}-eng@imbobi.com` },
      update: {},
      create: {
        nome: "Engenheiro Comite E2E",
        email: `${PREFIX}-eng@imbobi.com`,
        cpf: "000.000.000-52",
        telefone: "(11) 99999-0052",
        passwordHash,
        tipo: "ENGENHEIRO",
        kycStatus: "APROVADO",
        consentidoTermos: true,
        consentidoPrivacy: true,
      },
    });

    const [loginAdmin, loginGestor, loginEng] = await Promise.all([
      request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: `${PREFIX}-admin@imbobi.com`, password: "Senha@123" }),
      request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: `${PREFIX}-gestor@imbobi.com`, password: "Senha@123" }),
      request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: `${PREFIX}-eng@imbobi.com`, password: "Senha@123" }),
    ]);

    adminToken = loginAdmin.body.access_token;
    gestorFundoToken = loginGestor.body.access_token;
    engenheiroToken = loginEng.body.access_token;

    // Registra TOMADOR
    const regTomador = await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({
        nome: "Tomador Comite E2E",
        email: `${PREFIX}-tomador@imbobi.com`,
        cpf: "000.000.000-53",
        telefone: "(11) 99999-0053",
        password: "Senha@123",
      });
    tomadorId = regTomador.body.usuarioId;

    const loginTomador = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: `${PREFIX}-tomador@imbobi.com`, password: "Senha@123" });
    tomadorToken = loginTomador.body.access_token;
  });

  afterAll(async () => {
    // Cleanup: créditos gerados por aprovação de comitê
    const creditoIds = await prisma.credito
      .findMany({ where: { usuarioId: tomadorId } })
      .then((c) => c.map((x) => x.creditoId));

    if (creditoIds.length > 0) {
      await prisma.liberacaoParcela.deleteMany({ where: { creditoId: { in: creditoIds } } });
      await prisma.credito.deleteMany({ where: { creditoId: { in: creditoIds } } });
    }

    // Solicitacoes cascadeiam para ComiteDigital e VotoComite
    if (solicitacaoIds.length > 0) {
      await prisma.solicitacaoCredito.deleteMany({
        where: { solicitacaoId: { in: solicitacaoIds } },
      });
    }

    const userIds = await prisma.usuario
      .findMany({ where: { email: { startsWith: PREFIX } } })
      .then((u) => u.map((x) => x.usuarioId));

    await prisma.notificacao.deleteMany({ where: { usuarioId: { in: userIds } } });
    await prisma.sessaoToken.deleteMany({
      where: { usuario: { email: { startsWith: PREFIX } } },
    });
    await prisma.usuario.deleteMany({ where: { email: { startsWith: PREFIX } } });
    await app.close();
  });

  describe("POST /comite/solicitar", () => {
    it("201 tomador cria solicitação e abre comitê automaticamente", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/comite/solicitar")
        .set("Authorization", `Bearer ${tomadorToken}`)
        .send({
          valorSolicitado: 500000,
          prazoMeses: 24,
          taxaMensal: 1.5,
          finalidade: "Construção residencial E2E",
          ltv: 60,
        })
        .expect(201);

      expect(res.body).toHaveProperty("solicitacaoId");
      expect(res.body).toHaveProperty("valorSolicitado");
      solicitacaoIds.push(res.body.solicitacaoId);
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/comite/solicitar")
        .send({
          valorSolicitado: 100000,
          prazoMeses: 12,
          taxaMensal: 1.2,
          finalidade: "Teste",
        })
        .expect(401);
    });

    it("403 admin não pode solicitar crédito", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/comite/solicitar")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          valorSolicitado: 100000,
          prazoMeses: 12,
          taxaMensal: 1.2,
          finalidade: "Teste admin",
        })
        .expect(403);
    });
  });

  describe("GET /comite/minhas", () => {
    it("200 tomador vê suas próprias solicitações", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/comite/minhas")
        .set("Authorization", `Bearer ${tomadorToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty("comite");
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer()).get("/api/v1/comite/minhas").expect(401);
    });
  });

  describe("GET /comite", () => {
    it("200 admin lista comitês", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/comite")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("200 gestor_fundo também pode listar comitês", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/comite")
        .set("Authorization", `Bearer ${gestorFundoToken}`)
        .expect(200);
    });

    it("403 tomador não pode listar todos os comitês", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/comite")
        .set("Authorization", `Bearer ${tomadorToken}`)
        .expect(403);
    });

    it("200 filtra por status ABERTO", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/comite?status=ABERTO")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /comite/:id (dossiê)", () => {
    it("200 retorna dossiê completo do comitê", async () => {
      // Busca o comiteId da solicitação criada anteriormente
      const solicitacao = await prisma.solicitacaoCredito.findFirst({
        where: { solicitacaoId: { in: solicitacaoIds } },
        include: { comite: true },
      });
      const comiteId = solicitacao?.comite?.comiteId;
      if (!comiteId) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/comite/${comiteId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("comiteId", comiteId);
      expect(res.body).toHaveProperty("solicitacao");
      expect(res.body).toHaveProperty("votos");
    });

    it("404 para comitê inexistente", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/comite/id-que-nao-existe")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe("POST /comite/:id/parecer", () => {
    it("201 engenheiro submete parecer técnico", async () => {
      const solicitacao = await prisma.solicitacaoCredito.findFirst({
        where: { solicitacaoId: { in: solicitacaoIds }, status: "EM_COMITE" },
        include: { comite: true },
      });
      const comiteId = solicitacao?.comite?.comiteId;
      if (!comiteId) return;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/comite/${comiteId}/parecer`)
        .set("Authorization", `Bearer ${engenheiroToken}`)
        .send({ parecerTecnico: "Projeto técnico viável. Terreno regularizado." })
        .expect(201);

      expect(res.body).toHaveProperty("comiteId", comiteId);
    });

    it("403 tomador não pode submeter parecer", async () => {
      const solicitacao = await prisma.solicitacaoCredito.findFirst({
        where: { solicitacaoId: { in: solicitacaoIds } },
        include: { comite: true },
      });
      const comiteId = solicitacao?.comite?.comiteId;
      if (!comiteId) return;

      await request(app.getHttpServer())
        .post(`/api/v1/comite/${comiteId}/parecer`)
        .set("Authorization", `Bearer ${tomadorToken}`)
        .send({ parecerTecnico: "Tentativa indevida" })
        .expect(403);
    });
  });

  describe("POST /comite/:id/votar", () => {
    it("201 admin vota no comitê", async () => {
      // Cria solicitacao dedicada para este teste
      const solRes = await request(app.getHttpServer())
        .post("/api/v1/comite/solicitar")
        .set("Authorization", `Bearer ${tomadorToken}`)
        .send({
          valorSolicitado: 200000,
          prazoMeses: 12,
          taxaMensal: 1.0,
          finalidade: "Reforma comercial E2E",
        });
      solicitacaoIds.push(solRes.body.solicitacaoId);

      const solicitacao = await prisma.solicitacaoCredito.findUnique({
        where: { solicitacaoId: solRes.body.solicitacaoId },
        include: { comite: true },
      });
      const comiteId = solicitacao?.comite?.comiteId;
      if (!comiteId) return;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/comite/${comiteId}/votar`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ voto: "REPROVAR", justificativa: "Documentação insuficiente" })
        .expect(201);

      expect(res.body).toHaveProperty("ok", true);
      expect(res.body).toHaveProperty("totalVotos");
    });

    it("403 tomador não pode votar", async () => {
      const solicitacao = await prisma.solicitacaoCredito.findFirst({
        where: { solicitacaoId: { in: solicitacaoIds }, status: "EM_COMITE" },
        include: { comite: true },
      });
      const comiteId = solicitacao?.comite?.comiteId;
      if (!comiteId) return;

      await request(app.getHttpServer())
        .post(`/api/v1/comite/${comiteId}/votar`)
        .set("Authorization", `Bearer ${tomadorToken}`)
        .send({ voto: "APROVAR" })
        .expect(403);
    });
  });

  describe("PATCH /comite/:id/encerrar", () => {
    it("200 admin encerra comitê manualmente", async () => {
      // Cria solicitacao dedicada
      const solRes = await request(app.getHttpServer())
        .post("/api/v1/comite/solicitar")
        .set("Authorization", `Bearer ${tomadorToken}`)
        .send({
          valorSolicitado: 300000,
          prazoMeses: 18,
          taxaMensal: 1.2,
          finalidade: "Construção comercial E2E",
        });
      solicitacaoIds.push(solRes.body.solicitacaoId);

      const solicitacao = await prisma.solicitacaoCredito.findUnique({
        where: { solicitacaoId: solRes.body.solicitacaoId },
        include: { comite: true },
      });
      const comiteId = solicitacao?.comite?.comiteId;
      if (!comiteId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/comite/${comiteId}/encerrar`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ decisao: "REPROVADO", motivo: "Risco elevado identificado" })
        .expect(200);

      expect(res.body).toHaveProperty("ok", true);
      expect(res.body).toHaveProperty("decisao", "REPROVADO");
    });

    it("400 encerrar comitê já encerrado", async () => {
      const encerrado = await prisma.comiteDigital.findFirst({
        where: { status: "ENCERRADO" },
      });
      if (!encerrado) return;

      await request(app.getHttpServer())
        .patch(`/api/v1/comite/${encerrado.comiteId}/encerrar`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ decisao: "REPROVADO" })
        .expect(400);
    });

    it("403 gestor_fundo não pode encerrar comitê", async () => {
      const aberto = await prisma.comiteDigital.findFirst({
        where: { status: "ABERTO" },
      });
      if (!aberto) return;

      await request(app.getHttpServer())
        .patch(`/api/v1/comite/${aberto.comiteId}/encerrar`)
        .set("Authorization", `Bearer ${gestorFundoToken}`)
        .send({ decisao: "REPROVADO" })
        .expect(403);
    });
  });
});
