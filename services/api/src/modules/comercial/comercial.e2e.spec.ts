import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import * as bcrypt from "bcryptjs";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

const PREFIX = "comercial-e2e";

describe("Comercial E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let comercialToken: string;
  let comercialId: string;
  let regularToken: string;

  const createdLeadIds: string[] = [];

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

    const comercial = await prisma.usuario.upsert({
      where: { email: `${PREFIX}-comercial@imbobi.com` },
      update: {},
      create: {
        nome: "Comercial E2E",
        email: `${PREFIX}-comercial@imbobi.com`,
        cpf: "000.000.000-70",
        telefone: "(11) 99999-0070",
        passwordHash,
        tipo: "COMERCIAL",
        kycStatus: "APROVADO",
        consentidoTermos: true,
        consentidoPrivacy: true,
      },
    });
    comercialId = comercial.usuarioId;

    const loginComercial = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: `${PREFIX}-comercial@imbobi.com`, password: "Senha@123" });
    comercialToken = loginComercial.body.access_token;

    // Regular user (TOMADOR) para 403 tests
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({
        nome: "Regular Comercial E2E",
        email: `${PREFIX}-regular@imbobi.com`,
        cpf: "000.000.000-71",
        telefone: "(11) 99999-0071",
        password: "Senha@123",
      });

    const loginRegular = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: `${PREFIX}-regular@imbobi.com`, password: "Senha@123" });
    regularToken = loginRegular.body.access_token;
  });

  afterAll(async () => {
    // Lead cascades para LeadActivity e ConversionScore
    if (createdLeadIds.length > 0) {
      await prisma.lead.deleteMany({ where: { leadId: { in: createdLeadIds } } });
    }

    await prisma.sessaoToken.deleteMany({
      where: { usuario: { email: { startsWith: PREFIX } } },
    });
    await prisma.usuario.deleteMany({ where: { email: { startsWith: PREFIX } } });
    await app.close();
  });

  describe("GET /comercial/pipeline/stages", () => {
    it("200 retorna lista de stages (auto-seed se vazio)", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/comercial/pipeline/stages")
        .set("Authorization", `Bearer ${comercialToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty("stageId");
      expect(res.body[0]).toHaveProperty("nome");
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/comercial/pipeline/stages")
        .expect(401);
    });

    it("403 usuário regular não acessa pipeline", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/comercial/pipeline/stages")
        .set("Authorization", `Bearer ${regularToken}`)
        .expect(403);
    });
  });

  describe("GET /comercial/dashboard/stats", () => {
    it("200 retorna estatísticas do dashboard", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/comercial/dashboard/stats")
        .set("Authorization", `Bearer ${comercialToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("totalLeads");
      expect(res.body).toHaveProperty("leadsThisWeek");
      expect(typeof res.body.totalLeads).toBe("number");
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/comercial/dashboard/stats")
        .expect(401);
    });
  });

  describe("POST /comercial/leads", () => {
    it("201 cria lead com dados mínimos", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/comercial/leads")
        .set("Authorization", `Bearer ${comercialToken}`)
        .send({
          clienteNome: "Lead E2E Teste",
          clienteEmail: `lead-e2e-${Date.now()}@teste.com`,
          clienteTelefone: "(11) 98888-0001",
          fonte: "WEBSITE",
          segmentoCliente: "NOVO",
        })
        .expect(201);

      expect(res.body).toHaveProperty("leadId");
      expect(res.body).toHaveProperty("clienteNome", "Lead E2E Teste");
      createdLeadIds.push(res.body.leadId);
    });

    it("403 regular user não pode criar lead", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/comercial/leads")
        .set("Authorization", `Bearer ${regularToken}`)
        .send({
          clienteNome: "Tentativa",
          clienteEmail: "tentativa@teste.com",
          clienteTelefone: "(11) 99999-0000",
        })
        .expect(403);
    });
  });

  describe("GET /comercial/leads", () => {
    it("200 lista leads com paginação", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/comercial/leads?limit=10&offset=0")
        .set("Authorization", `Bearer ${comercialToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("leads");
      expect(res.body).toHaveProperty("total");
      expect(Array.isArray(res.body.leads)).toBe(true);
    });

    it("200 filtra por searchTerm", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/comercial/leads?searchTerm=Lead+E2E+Teste")
        .set("Authorization", `Bearer ${comercialToken}`)
        .expect(200);

      expect(Array.isArray(res.body.leads)).toBe(true);
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer()).get("/api/v1/comercial/leads").expect(401);
    });
  });

  describe("GET /comercial/leads/:id", () => {
    it("200 retorna detalhe do lead criado", async () => {
      const leadId = createdLeadIds[0];
      if (!leadId) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/comercial/leads/${leadId}`)
        .set("Authorization", `Bearer ${comercialToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("leadId", leadId);
      expect(res.body).toHaveProperty("clienteNome");
      expect(res.body).toHaveProperty("stage");
    });

    it("404 para lead inexistente", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/comercial/leads/id-que-nao-existe")
        .set("Authorization", `Bearer ${comercialToken}`)
        .expect(404);
    });
  });

  describe("GET /comercial/leads/:id/score", () => {
    it("200 retorna score de conversão do lead", async () => {
      const leadId = createdLeadIds[0];
      if (!leadId) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/comercial/leads/${leadId}/score`)
        .set("Authorization", `Bearer ${comercialToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("leadId", leadId);
      expect(res.body).toHaveProperty("scoreFinal");
      expect(typeof res.body.scoreFinal).toBe("number");
    });
  });

  describe("POST /comercial/leads/:id/atividades", () => {
    it("201 adiciona atividade ao lead", async () => {
      const leadId = createdLeadIds[0];
      if (!leadId) return;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/comercial/leads/${leadId}/atividades`)
        .set("Authorization", `Bearer ${comercialToken}`)
        .send({
          tipo: "CALL_OUTBOUND",
          descricao: "Ligação de apresentação do produto",
        })
        .expect(201);

      expect(res.body).toHaveProperty("activity");
      expect(res.body.activity).toHaveProperty("tipo", "CALL_OUTBOUND");
    });
  });

  describe("POST /leads/captura (público)", () => {
    it("201 captura pública de lead sem autenticação", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/leads/captura")
        .send({
          clienteNome: "Interessado E2E",
          clienteEmail: `captura-e2e-${Date.now()}@teste.com`,
          clienteTelefone: "(21) 97777-0001",
          modalidade: "CONSTRUCAO_NOVA",
        })
        .expect(201);

      expect(res.body).toHaveProperty("leadId");
      createdLeadIds.push(res.body.leadId);
    });

    it("400 sem nome (validação Zod)", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/leads/captura")
        .send({
          clienteEmail: "sem-nome@teste.com",
          clienteTelefone: "(11) 99999-0000",
        })
        .expect(400);
    });

    it("400 e-mail inválido", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/leads/captura")
        .send({
          clienteNome: "Teste",
          clienteEmail: "email-invalido",
          clienteTelefone: "(11) 99999-0000",
        })
        .expect(400);
    });
  });
});
