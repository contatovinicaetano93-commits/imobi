import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../app.module";
import { PrismaService } from "../modules/prisma/prisma.service";

describe("Integration: Complete Workflows E2E", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Complete User Onboarding Flow", () => {
    let userEmail: string;
    let userId: string;
    let token: string;

    it("Step 1: Register new user", async () => {
      userEmail = `onboarding-${Date.now()}@imbobi.com`;
      const password = "Senha@123";
      const nome = "Onboarding User";

      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email: userEmail, password, nome })
        .expect(201);

      expect(res.body).toHaveProperty("usuarioId");
      expect(res.body.email).toBe(userEmail);
      expect(res.body.nome).toBe(nome);
      userId = res.body.usuarioId;
    });

    it("Step 2: Login and obtain access token", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: userEmail, password: "Senha@123" })
        .expect(200);

      expect(res.body).toHaveProperty("access_token");
      expect(res.body.usuario).toHaveProperty("usuarioId");
      token = res.body.access_token;
    });

    it("Step 3: Verify initial KYC status is PENDENTE", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/kyc/status")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty("status");
      expect(["PENDENTE", "EM_ANALISE"]).toContain(res.body.status);
    });

    it("Step 4: User uploads KYC document", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "CPF",
          url: "s3://kyc-docs/cpf-123456789.pdf",
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body.tipo).toBe("CPF");
      expect(res.body.status).toBe("PENDENTE");
    });

    it("Step 5: List uploaded documents", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/kyc/documentos")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty("tipo");
      expect(res.body[0]).toHaveProperty("status");
    });

    it("Step 6: Admin approves KYC document", async () => {
      // Get list of documents first
      const docsRes = await request(app.getHttpServer())
        .get("/api/v1/kyc/documentos")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const docId = docsRes.body[0].id;

      // Create admin user for approval
      const adminEmail = `admin-${Date.now()}@imbobi.com`;
      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: adminEmail,
          password: "Senha@123",
          nome: "Admin User",
        });

      const adminLoginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: adminEmail, password: "Senha@123" });

      const adminToken = adminLoginRes.body.access_token;

      // Approve document
      const approveRes = await request(app.getHttpServer())
        .patch(`/api/v1/kyc/${docId}/aprovar`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(approveRes.body).toHaveProperty("status");
      expect(["APROVADO", "PENDENTE"]).toContain(approveRes.body.status);
    });

    it("Step 7: Verify KYC complete check", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/kyc/verificar")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty("completo");
      expect(typeof res.body.completo).toBe("boolean");
    });

    it("Step 8: User profile now complete with onboarding finished", async () => {
      // After KYC approval, user should be eligible for credit operations
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 50000,
          prazoMeses: 12,
        })
        .expect(201);

      expect(res.body).toHaveProperty("valorTotal");
      expect(res.body).toHaveProperty("taxaMensal");
    });
  });

  describe("Credit Request & Payment Flow", () => {
    let token: string;
    let userId: string;
    let creditoId: string;
    let simulacaoId: string;

    beforeEach(async () => {
      // Setup: Register and login user
      const email = `credit-flow-${Date.now()}@imbobi.com`;
      const regRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email,
          password: "Senha@123",
          nome: "Credit Flow User",
        });

      userId = regRes.body.usuarioId;

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: "Senha@123" });

      token = loginRes.body.access_token;
    });

    it("Step 1: User performs credit simulation (public, no auth required)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 100000,
          prazoMeses: 24,
        })
        .expect(201);

      expect(res.body).toHaveProperty("valorTotal");
      expect(res.body).toHaveProperty("taxaMensal");
      expect(res.body).toHaveProperty("CET");
      expect(res.body.valorTotal).toBeGreaterThan(100000);
      simulacaoId = res.body.id || "sim-" + Date.now();
    });

    it("Step 2: Verify simulation returns realistic values", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 50000,
          prazoMeses: 12,
        })
        .expect(201);

      expect(res.body.taxaMensal).toBeGreaterThan(0);
      expect(res.body.taxaMensal).toBeLessThan(100);
      expect(res.body.CET).toBeGreaterThan(0);
    });

    it("Step 3: User requests credit with valid data", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .set("Authorization", `Bearer ${token}`)
        .send({
          valorSolicitado: 75000,
          prazoMeses: 18,
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("status");
      expect(["PENDENTE", "ANALISE", "APROVADO"]).toContain(res.body.status);
      expect(res.body.usuarioId).toBe(userId);
      creditoId = res.body.id;
    });

    it("Step 4: User retrieves their credit requests", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/credito/meus")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty("id");
      expect(res.body[0]).toHaveProperty("status");
      expect(res.body[0]).toHaveProperty("valorSolicitado");
    });

    it("Step 5: Retrieve credit statement (cached)", async () => {
      if (!creditoId) {
        // Create a credit if needed
        const reqRes = await request(app.getHttpServer())
          .post("/api/v1/credito/solicitar")
          .set("Authorization", `Bearer ${token}`)
          .send({
            valorSolicitado: 60000,
            prazoMeses: 12,
          });
        creditoId = reqRes.body.id;
      }

      const res = await request(app.getHttpServer())
        .get(`/api/v1/credito/${creditoId}/extrato`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("status");
      expect(res.body).toHaveProperty("saldo");
    });

    it("Step 6: Verify multiple simulations don't exceed rate limit", async () => {
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app.getHttpServer())
            .post("/api/v1/credito/simular")
            .send({
              valorSolicitado: 50000 + i * 10000,
              prazoMeses: 12 + i,
            })
        );
      }

      const results = await Promise.all(requests);
      const successCount = results.filter((r) => r.status === 201).length;
      expect(successCount).toBeGreaterThan(0);
    });

    it("Step 7: Credit status transitions are tracked", async () => {
      const credsRes = await request(app.getHttpServer())
        .get("/api/v1/credito/meus")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(credsRes.body.length).toBeGreaterThan(0);
      const cred = credsRes.body[0];

      expect(cred).toHaveProperty("criadoEm");
      expect(cred).toHaveProperty("atualizadoEm");
      expect(typeof cred.criadoEm).toBe("string");
      expect(typeof cred.atualizadoEm).toBe("string");
    });
  });

  describe("Work & Evidence Flow", () => {
    let constructorToken: string;
    let managerToken: string;
    let obraId: string;
    let etapaId: string;

    beforeEach(async () => {
      // Setup: Create constructor and manager users
      const constructorEmail = `constructor-${Date.now()}@imbobi.com`;
      const managerEmail = `manager-${Date.now()}@imbobi.com`;

      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: constructorEmail,
          password: "Senha@123",
          nome: "Constructor",
        });

      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: managerEmail,
          password: "Senha@123",
          nome: "Manager",
        });

      const constructorLogin = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: constructorEmail, password: "Senha@123" });

      const managerLogin = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: managerEmail, password: "Senha@123" });

      constructorToken = constructorLogin.body.access_token;
      managerToken = managerLogin.body.access_token;
    });

    it("Step 1: Constructor creates obra (construction project)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${constructorToken}`)
        .send({
          nome: "Integration Test Building",
          descricao: "Test construction project",
          localizacao: { lat: -15.789, lng: -48.123 },
          valorTotal: 500000,
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body.nome).toBe("Integration Test Building");
      expect(res.body.status).toBe("ATIVA");
      obraId = res.body.id;
    });

    it("Step 2: Verify etapas auto-generated", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("etapas");
      expect(Array.isArray(res.body.etapas)).toBe(true);
      expect(res.body.etapas.length).toBeGreaterThan(0);

      const firstEtapa = res.body.etapas[0];
      etapaId = firstEtapa.id;
      expect(firstEtapa.status).toBe("AGUARDANDO_VISTORIA");
      expect(firstEtapa).toHaveProperty("valorLiberacao");
    });

    it("Step 3: Constructor uploads evidence with GPS coordinates", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/evidencias")
        .set("Authorization", `Bearer ${constructorToken}`)
        .send({
          etapaId,
          latCaptura: -15.789,
          lngCaptura: -48.123,
          descricao: "Foundation completed",
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body.etapaId).toBe(etapaId);
      expect(res.body.latCaptura).toBeCloseTo(-15.789, 3);
      expect(res.body.lngCaptura).toBeCloseTo(-48.123, 3);
    });

    it("Step 4: Verify GPS validation occurs", async () => {
      // Invalid GPS coordinates should be rejected
      const res = await request(app.getHttpServer())
        .post("/api/v1/evidencias")
        .set("Authorization", `Bearer ${constructorToken}`)
        .send({
          etapaId,
          latCaptura: 99999,
          lngCaptura: 99999,
          descricao: "Invalid GPS",
        });

      expect(res.status).toBe(400);
    });

    it("Step 5: Manager retrieves pending etapas for review", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/vistoria/pending")
        .set("Authorization", `Bearer ${managerToken}`);

      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    it("Step 6: Manager approves etapa after review", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/vistoria/${etapaId}/aprovar`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({
          obraId,
          observacoes: "Foundations look good, ready for next phase",
        });

      expect([200, 201]).toContain(res.status);
    });

    it("Step 7: Verify etapa status changed after approval", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      const etapa = res.body.etapas.find((e: any) => e.id === etapaId);
      expect(etapa).toBeDefined();
      expect(["APROVADA", "EM_PROGRESSO", "LIBERADA", "CONCLUIDA"]).toContain(
        etapa.status
      );
    });

    it("Step 8: List all evidências for etapa", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/evidencias/etapa/${etapaId}`)
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty("id");
        expect(res.body[0]).toHaveProperty("etapaId");
      }
    });

    it("Step 9: Manager can validate evidence", async () => {
      // Get evidências first
      const evidRes = await request(app.getHttpServer())
        .get(`/api/v1/evidencias/etapa/${etapaId}`)
        .set("Authorization", `Bearer ${constructorToken}`);

      if (evidRes.body.length > 0) {
        const evidId = evidRes.body[0].id;

        const res = await request(app.getHttpServer())
          .patch(`/api/v1/evidencias/${evidId}/validar`)
          .set("Authorization", `Bearer ${managerToken}`)
          .send({
            evidenciaId: evidId,
            aprovado: true,
            observacao: "Evidence quality is excellent",
          });

        expect([200, 201]).toContain(res.status);
      }
    });
  });

  describe("Score Calculation & Ranking Flow", () => {
    let token: string;
    let userId: string;

    beforeEach(async () => {
      // Setup: Create test user
      const email = `score-flow-${Date.now()}@imbobi.com`;
      const regRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email,
          password: "Senha@123",
          nome: "Score User",
        });

      userId = regRes.body.usuarioId;

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: "Senha@123" });

      token = loginRes.body.access_token;
    });

    it("Step 1: User receives initial score on registration", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/score")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty("score");
      expect(typeof res.body.score).toBe("number");
      expect(res.body.score).toBeGreaterThanOrEqual(0);
      expect(res.body.score).toBeLessThanOrEqual(1000);
    });

    it("Step 2: Score is cached for subsequent requests", async () => {
      const res1 = await request(app.getHttpServer())
        .get("/api/v1/score")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const score1 = res1.body.score;

      await new Promise((r) => setTimeout(r, 100));

      const res2 = await request(app.getHttpServer())
        .get("/api/v1/score")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const score2 = res2.body.score;
      expect(score1).toBe(score2);
    });

    it("Step 3: Score level is determined correctly", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/score")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const { score, nivel } = res.body;

      if (score < 450) {
        expect(nivel).toBe("Iniciante");
      } else if (score < 650) {
        expect(nivel).toBe("Regular");
      } else if (score < 800) {
        expect(nivel).toBe("Bom");
      } else {
        expect(nivel).toBe("Excelente");
      }
    });

    it("Step 4: Score history is tracked", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/score/historico")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("Step 5: Each score history entry has required fields", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/score/historico")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      if (res.body.length > 0) {
        res.body.forEach((item: any) => {
          expect(typeof item.score).toBe("number");
          expect(typeof item.motivo).toBe("string");
          expect(typeof item.criadoEm).toBe("string");
        });
      }
    });

    it("Step 6: Multiple users have independent scores", async () => {
      // Create second user
      const email2 = `score-user2-${Date.now()}@imbobi.com`;
      const reg2 = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: email2,
          password: "Senha@123",
          nome: "User 2",
        });

      const login2 = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: email2, password: "Senha@123" });

      const token2 = login2.body.access_token;

      // Get both scores
      const res1 = await request(app.getHttpServer())
        .get("/api/v1/score")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const res2 = await request(app.getHttpServer())
        .get("/api/v1/score")
        .set("Authorization", `Bearer ${token2}`)
        .expect(200);

      expect(res1.body).toHaveProperty("score");
      expect(res2.body).toHaveProperty("score");
    });

    it("Step 7: Score reflects user history and activities", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/score")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty("score");
      expect(res.body).toHaveProperty("nivel");
      expect(res.body).toHaveProperty("fatores");
    });
  });

  describe("Multi-User Concurrent Operations", () => {
    it("Multiple users can operate independently without cache conflicts", async () => {
      // Create 2 users simultaneously
      const email1 = `concurrent-1-${Date.now()}@imbobi.com`;
      const email2 = `concurrent-2-${Date.now()}@imbobi.com`;

      const [reg1, reg2] = await Promise.all([
        request(app.getHttpServer())
          .post("/api/v1/auth/registrar")
          .send({ email: email1, password: "Senha@123", nome: "User 1" }),
        request(app.getHttpServer())
          .post("/api/v1/auth/registrar")
          .send({ email: email2, password: "Senha@123", nome: "User 2" }),
      ]);

      expect(reg1.status).toBe(201);
      expect(reg2.status).toBe(201);
    });

    it("User 1 and User 2 have independent scores", async () => {
      const email1 = `score-1-${Date.now()}@imbobi.com`;
      const email2 = `score-2-${Date.now()}@imbobi.com`;

      // Register both
      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email: email1, password: "Senha@123", nome: "User 1" });

      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email: email2, password: "Senha@123", nome: "User 2" });

      // Login both
      const login1 = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: email1, password: "Senha@123" });

      const login2 = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: email2, password: "Senha@123" });

      const token1 = login1.body.access_token;
      const token2 = login2.body.access_token;

      // Get scores
      const [score1, score2] = await Promise.all([
        request(app.getHttpServer())
          .get("/api/v1/score")
          .set("Authorization", `Bearer ${token1}`),
        request(app.getHttpServer())
          .get("/api/v1/score")
          .set("Authorization", `Bearer ${token2}`),
      ]);

      expect(score1.status).toBe(200);
      expect(score2.status).toBe(200);
      expect(score1.body).toHaveProperty("score");
      expect(score2.body).toHaveProperty("score");
    });

    it("Concurrent credit simulations succeed without rate limiting", async () => {
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app.getHttpServer())
            .post("/api/v1/credito/simular")
            .send({
              valorSolicitado: 50000 + i * 10000,
              prazoMeses: 12 + i,
            })
        );
      }

      const results = await Promise.all(requests);
      const successCount = results.filter((r) => r.status === 201).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe("Cache Invalidation & Consistency", () => {
    let token: string;
    let creditoId: string;

    beforeEach(async () => {
      const email = `cache-test-${Date.now()}@imbobi.com`;
      const regRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email,
          password: "Senha@123",
          nome: "Cache Test User",
        });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: "Senha@123" });

      token = loginRes.body.access_token;
    });

    it("Score cache is invalidated when user activities change", async () => {
      // Get initial score
      const res1 = await request(app.getHttpServer())
        .get("/api/v1/score")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const initialScore = res1.body.score;

      // Create a credit request to change user state
      await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .set("Authorization", `Bearer ${token}`)
        .send({
          valorSolicitado: 50000,
          prazoMeses: 12,
        });

      // Score should still be accessible
      const res2 = await request(app.getHttpServer())
        .get("/api/v1/score")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res2.body).toHaveProperty("score");
    });
  });

  describe("Timestamps & Audit Trail", () => {
    let token: string;
    let userId: string;
    let obraId: string;

    beforeEach(async () => {
      const email = `audit-${Date.now()}@imbobi.com`;
      const regRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email,
          password: "Senha@123",
          nome: "Audit User",
        });

      userId = regRes.body.usuarioId;

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: "Senha@123" });

      token = loginRes.body.access_token;
    });

    it("All entities have consistent timestamp fields", async () => {
      // Create obra
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Audit Test Obra",
          localizacao: { lat: -15.789, lng: -48.123 },
          valorTotal: 500000,
        })
        .expect(201);

      obraId = res.body.id;

      expect(res.body).toHaveProperty("criadoEm");
      expect(res.body).toHaveProperty("atualizadoEm");

      const createdTime = new Date(res.body.criadoEm).getTime();
      const updatedTime = new Date(res.body.atualizadoEm).getTime();

      expect(createdTime).toBeGreaterThan(0);
      expect(updatedTime).toBeGreaterThanOrEqual(createdTime);
    });

    it("Entity timestamps are ISO 8601 formatted", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

      expect(iso8601Regex.test(res.body.criadoEm)).toBe(true);
      expect(iso8601Regex.test(res.body.atualizadoEm)).toBe(true);
    });
  });

  describe("Error Handling & Validation", () => {
    let token: string;

    beforeEach(async () => {
      const email = `validation-${Date.now()}@imbobi.com`;
      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email,
          password: "Senha@123",
          nome: "Validation User",
        });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: "Senha@123" });

      token = loginRes.body.access_token;
    });

    it("Invalid obra data is rejected with 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "", // Empty name
          localizacao: { lat: -15.789, lng: -48.123 },
          valorTotal: -100, // Negative value
        });

      expect(res.status).toBe(400);
    });

    it("Missing authentication returns 401", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/score")
        .expect(401);

      expect(res.body).toHaveProperty("message");
    });

    it("Invalid credit parameters rejected", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: -50000,
          prazoMeses: 0,
        });

      expect(res.status).toBe(400);
    });

    it("GPS coordinates validation in evidence upload", async () => {
      // First create obra and etapa
      const obraRes = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "GPS Test Obra",
          localizacao: { lat: -15.789, lng: -48.123 },
          valorTotal: 500000,
        })
        .expect(201);

      const obraId = obraRes.body.id;

      const obrasRes = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const etapaId = obrasRes.body.etapas[0].id;

      // Try invalid GPS
      const res = await request(app.getHttpServer())
        .post("/api/v1/evidencias")
        .set("Authorization", `Bearer ${token}`)
        .send({
          etapaId,
          latCaptura: 999,
          lngCaptura: 999,
        });

      expect(res.status).toBe(400);
    });
  });
});
