/**
 * RBAC Cross-User E2E Tests
 *
 * Verifies that:
 * 1. Role guards block the wrong profiles from restricted endpoints (403)
 * 2. Users cannot access resources owned by other users (403)
 * 3. Privileged profiles (ADMIN, GESTOR, ENGENHEIRO) can reach their endpoints
 *
 * Requires: PostgreSQL + Redis (set DATABASE_URL and REDIS_URL in .env.test)
 */

import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

// ─── helpers ──────────────────────────────────────────────────────────────────

const BASE = "/api/v1";
const SENHA = "Senha@123";

let _cpfSeq = 0;
function nextCpf(ts: number): string {
  _cpfSeq++;
  return String(ts + _cpfSeq).padStart(11, "0").slice(-11);
}

const OBRA_BODY = {
  nome: "Obra RBAC Cross-User",
  endereco: {
    logradouro: "Rua das Acácias",
    numero: "42",
    bairro: "Jardim Europa",
    cidade: "São Paulo",
    uf: "SP",
    cep: "01310100",
  },
  geo: { latitude: -23.5505, longitude: -46.6333, raioValidacaoMetros: 50 },
  areaM2: 120,
  dataConclusaoPrevistaISO: "2027-12-31T00:00:00.000Z",
};

const DD_BODY = {
  nomeEmpreendimento: "Empreendimento RBAC Test",
  payload: { info: "test" },
};

const CREDITO_BODY = {
  valorSolicitado: 50000,
  prazoMeses: 12,
  tipoObra: "RESIDENCIAL",
  finalidade: "Construção de moradia",
  rendaMensalDeclarada: 5000,
};

// ─── test suite ───────────────────────────────────────────────────────────────

describe("RBAC Cross-User E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Actors
  let tomadorA: { usuarioId: string; token: string; email: string };
  let tomadorB: { usuarioId: string; token: string; email: string };
  let adminUser: { usuarioId: string; token: string; email: string };
  let gestorUser: { usuarioId: string; token: string; email: string };
  let engUser: { usuarioId: string; token: string; email: string };

  // Shared resources
  let obraAId: string;
  let etapaAId: string;
  let creditoAdminId: string;
  let dueDiligenceGestorId: string;

  // ── setup ──────────────────────────────────────────────────────────────────

  async function criarUsuario(
    nome: string,
    tipo?: string,
  ): Promise<{ usuarioId: string; token: string; email: string }> {
    const ts = Date.now();
    const email = `rbac-${nome.toLowerCase().replace(/\s/g, "-")}-${ts}@test.imbobi`;
    const cpf = nextCpf(ts);

    const regRes = await request(app.getHttpServer())
      .post(`${BASE}/auth/registrar`)
      .send({
        nome,
        cpf,
        email,
        telefone: "11988887777",
        senha: SENHA,
        consentidoTermos: true,
        consentidoPrivacy: true,
        consentidoKyc: true,
        consentidoMarketing: false,
      });

    const usuarioId = regRes.body.usuario?.usuarioId ?? regRes.body.usuarioId;

    if (tipo && tipo !== "TOMADOR") {
      await prisma.usuario.update({ where: { usuarioId }, data: { tipo } });
    }

    // Login after possible role update to get JWT with correct role
    const loginRes = await request(app.getHttpServer())
      .post(`${BASE}/auth/login`)
      .send({ email, senha: SENHA });

    const token = loginRes.body.accessToken ?? loginRes.body.access_token;
    return { usuarioId, token, email };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    // Create actors
    [tomadorA, tomadorB, adminUser, gestorUser, engUser] = await Promise.all([
      criarUsuario("Tomador A"),
      criarUsuario("Tomador B"),
      criarUsuario("Admin User", "ADMIN"),
      criarUsuario("Gestor User", "GESTOR"),
      criarUsuario("Eng User", "ENGENHEIRO"),
    ]);

    // Tomador A creates an obra
    const obraRes = await request(app.getHttpServer())
      .post(`${BASE}/obras`)
      .set("Authorization", `Bearer ${tomadorA.token}`)
      .send(OBRA_BODY);
    obraAId = obraRes.body.obraId;

    // Get first etapa of that obra
    const obraDetail = await request(app.getHttpServer())
      .get(`${BASE}/obras/${obraAId}`)
      .set("Authorization", `Bearer ${tomadorA.token}`);
    etapaAId = obraDetail.body.etapas?.[0]?.etapaId;

    // Admin creates a credito (admin-only endpoint; credito belongs to admin)
    const creditoRes = await request(app.getHttpServer())
      .post(`${BASE}/credito/solicitar`)
      .set("Authorization", `Bearer ${adminUser.token}`)
      .send(CREDITO_BODY);
    creditoAdminId = creditoRes.body.creditoId;

    // Gestor creates a due-diligence
    const ddRes = await request(app.getHttpServer())
      .post(`${BASE}/due-diligence`)
      .set("Authorization", `Bearer ${gestorUser.token}`)
      .send(DD_BODY);
    dueDiligenceGestorId = ddRes.body.id;
  }, 60_000);

  afterAll(async () => {
    // Clean up test users
    const emails = [
      tomadorA?.email, tomadorB?.email,
      adminUser?.email, gestorUser?.email, engUser?.email,
    ].filter(Boolean);
    if (emails.length) {
      await prisma.usuario.deleteMany({ where: { email: { in: emails } } });
    }
    await app.close();
  });

  // ── 1. Endpoint-level role enforcement ────────────────────────────────────

  describe("Role enforcement – TOMADOR cannot reach privileged endpoints", () => {
    it("GET /manager/dashboard → 403 for TOMADOR", async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/manager/dashboard`)
        .set("Authorization", `Bearer ${tomadorA.token}`)
        .expect(403);
    });

    it("GET /manager/carteira → 403 for TOMADOR", async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/manager/carteira`)
        .set("Authorization", `Bearer ${tomadorA.token}`)
        .expect(403);
    });

    it("GET /manager/etapas-pendentes → 403 for TOMADOR", async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/manager/etapas-pendentes`)
        .set("Authorization", `Bearer ${tomadorA.token}`)
        .expect(403);
    });

    it("GET /manager/kyc-pendentes → 403 for TOMADOR", async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/manager/kyc-pendentes`)
        .set("Authorization", `Bearer ${tomadorA.token}`)
        .expect(403);
    });

    it("GET /kyc/pendentes → 403 for TOMADOR", async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/kyc/pendentes`)
        .set("Authorization", `Bearer ${tomadorA.token}`)
        .expect(403);
    });

    it("PATCH /kyc/:id/aprovar → 403 for TOMADOR", async () => {
      await request(app.getHttpServer())
        .patch(`${BASE}/kyc/00000000-0000-0000-0000-000000000001/aprovar`)
        .set("Authorization", `Bearer ${tomadorA.token}`)
        .expect(403);
    });

    it("PATCH /kyc/:id/rejeitar → 403 for TOMADOR", async () => {
      await request(app.getHttpServer())
        .patch(`${BASE}/kyc/00000000-0000-0000-0000-000000000001/rejeitar`)
        .set("Authorization", `Bearer ${tomadorA.token}`)
        .send({ motivo: "teste" })
        .expect(403);
    });

    it("PATCH /evidencias/:id/validar → 403 for TOMADOR", async () => {
      await request(app.getHttpServer())
        .patch(`${BASE}/evidencias/00000000-0000-0000-0000-000000000001/validar`)
        .set("Authorization", `Bearer ${tomadorA.token}`)
        .send({ aprovado: true })
        .expect(403);
    });

    it("PATCH /due-diligence/:id/status → 403 for TOMADOR", async () => {
      await request(app.getHttpServer())
        .patch(`${BASE}/due-diligence/00000000-0000-0000-0000-000000000001/status`)
        .set("Authorization", `Bearer ${tomadorA.token}`)
        .send({ status: "APROVADO" })
        .expect(403);
    });

    it("POST /due-diligence → 403 for TOMADOR (role-restricted after fix)", async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/due-diligence`)
        .set("Authorization", `Bearer ${tomadorA.token}`)
        .send(DD_BODY)
        .expect(403);
    });

    it("GET /due-diligence → 403 for TOMADOR listing (role-restricted after fix)", async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/due-diligence`)
        .set("Authorization", `Bearer ${tomadorA.token}`)
        .expect(403);
    });
  });

  // ── 2. Privileged profiles reach their endpoints ───────────────────────────

  describe("Role enforcement – privileged profiles are allowed", () => {
    it("GET /manager/dashboard → 200 for GESTOR", async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/manager/dashboard`)
        .set("Authorization", `Bearer ${gestorUser.token}`)
        .expect(200);
    });

    it("GET /manager/dashboard → 200 for ADMIN", async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/manager/dashboard`)
        .set("Authorization", `Bearer ${adminUser.token}`)
        .expect(200);
    });

    it("GET /kyc/pendentes → 200 for GESTOR", async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/kyc/pendentes`)
        .set("Authorization", `Bearer ${gestorUser.token}`)
        .expect(200);
    });

    it("POST /due-diligence → 201 for GESTOR", async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/due-diligence`)
        .set("Authorization", `Bearer ${gestorUser.token}`)
        .send(DD_BODY)
        .expect(201);
    });

    it("POST /due-diligence → 201 for ADMIN", async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/due-diligence`)
        .set("Authorization", `Bearer ${adminUser.token}`)
        .send(DD_BODY)
        .expect(201);
    });

    it("PATCH /evidencias/:id/validar → 404 (not 403) for ENGENHEIRO – role passes, evidencia not found", async () => {
      const res = await request(app.getHttpServer())
        .patch(`${BASE}/evidencias/00000000-0000-0000-0000-000000000001/validar`)
        .set("Authorization", `Bearer ${engUser.token}`)
        .send({ aprovado: true });
      // 404 means the role guard passed; the evidencia just doesn't exist
      expect([404, 200, 201]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    it("PATCH /kyc/:id/aprovar → 404 (not 403) for ADMIN – role passes, doc not found", async () => {
      const res = await request(app.getHttpServer())
        .patch(`${BASE}/kyc/00000000-0000-0000-0000-000000000001/aprovar`)
        .set("Authorization", `Bearer ${adminUser.token}`);
      expect(res.status).not.toBe(403);
    });
  });

  // ── 3. Unauthenticated requests are rejected ──────────────────────────────

  describe("Authentication – no token is rejected", () => {
    it("GET /obras → 401 without token", async () => {
      await request(app.getHttpServer()).get(`${BASE}/obras`).expect(401);
    });

    it("GET /manager/dashboard → 401 without token", async () => {
      await request(app.getHttpServer()).get(`${BASE}/manager/dashboard`).expect(401);
    });

    it("GET /kyc/pendentes → 401 without token", async () => {
      await request(app.getHttpServer()).get(`${BASE}/kyc/pendentes`).expect(401);
    });
  });

  // ── 4. Cross-user resource ownership ─────────────────────────────────────

  describe("Ownership enforcement – User B cannot access User A's resources", () => {
    it("GET /obras/:id → 403 when Tomador B accesses Tomador A's obra", async () => {
      expect(obraAId).toBeDefined();
      await request(app.getHttpServer())
        .get(`${BASE}/obras/${obraAId}`)
        .set("Authorization", `Bearer ${tomadorB.token}`)
        .expect(403);
    });

    it("GET /obras/:id/progresso → 403 when Tomador B accesses Tomador A's obra progress", async () => {
      expect(obraAId).toBeDefined();
      await request(app.getHttpServer())
        .get(`${BASE}/obras/${obraAId}/progresso`)
        .set("Authorization", `Bearer ${tomadorB.token}`)
        .expect(403);
    });

    it("GET /credito/:id/extrato → 403 when Tomador A accesses Admin's credito", async () => {
      expect(creditoAdminId).toBeDefined();
      await request(app.getHttpServer())
        .get(`${BASE}/credito/${creditoAdminId}/extrato`)
        .set("Authorization", `Bearer ${tomadorA.token}`)
        .expect(403);
    });

    it("GET /credito/:id/extrato → 403 when Tomador B accesses Admin's credito", async () => {
      expect(creditoAdminId).toBeDefined();
      await request(app.getHttpServer())
        .get(`${BASE}/credito/${creditoAdminId}/extrato`)
        .set("Authorization", `Bearer ${tomadorB.token}`)
        .expect(403);
    });

    it("GET /evidencias/etapa/:id → 403 when Tomador B accesses Tomador A's etapa evidencias", async () => {
      expect(etapaAId).toBeDefined();
      await request(app.getHttpServer())
        .get(`${BASE}/evidencias/etapa/${etapaAId}`)
        .set("Authorization", `Bearer ${tomadorB.token}`)
        .expect(403);
    });

    it("GET /due-diligence/:id → 403 when Tomador A accesses Gestor's due-diligence", async () => {
      expect(dueDiligenceGestorId).toBeDefined();
      await request(app.getHttpServer())
        .get(`${BASE}/due-diligence/${dueDiligenceGestorId}`)
        .set("Authorization", `Bearer ${tomadorA.token}`)
        .expect(403);
    });
  });

  // ── 5. Privileged users bypass ownership for their scope ──────────────────

  describe("Ownership enforcement – privileged users can access cross-user resources", () => {
    it("GET /obras/:id → 200 when ADMIN accesses Tomador A's obra", async () => {
      expect(obraAId).toBeDefined();
      await request(app.getHttpServer())
        .get(`${BASE}/obras/${obraAId}`)
        .set("Authorization", `Bearer ${adminUser.token}`)
        .expect(200);
    });

    it("GET /obras/:id/progresso → 200 when ADMIN accesses Tomador A's progresso", async () => {
      expect(obraAId).toBeDefined();
      await request(app.getHttpServer())
        .get(`${BASE}/obras/${obraAId}/progresso`)
        .set("Authorization", `Bearer ${adminUser.token}`)
        .expect(200);
    });

    it("GET /evidencias/etapa/:id → 200 when GESTOR accesses Tomador A's etapa evidencias", async () => {
      expect(etapaAId).toBeDefined();
      await request(app.getHttpServer())
        .get(`${BASE}/evidencias/etapa/${etapaAId}`)
        .set("Authorization", `Bearer ${gestorUser.token}`)
        .expect(200);
    });

    it("GET /evidencias/etapa/:id → 200 when ADMIN accesses Tomador A's etapa evidencias", async () => {
      expect(etapaAId).toBeDefined();
      await request(app.getHttpServer())
        .get(`${BASE}/evidencias/etapa/${etapaAId}`)
        .set("Authorization", `Bearer ${adminUser.token}`)
        .expect(200);
    });

    it("GET /due-diligence/:id → 200 when ADMIN accesses Gestor's due-diligence", async () => {
      expect(dueDiligenceGestorId).toBeDefined();
      await request(app.getHttpServer())
        .get(`${BASE}/due-diligence/${dueDiligenceGestorId}`)
        .set("Authorization", `Bearer ${adminUser.token}`)
        .expect(200);
    });

    it("GET /credito/:id/extrato → 200 when Admin accesses their own credito", async () => {
      expect(creditoAdminId).toBeDefined();
      await request(app.getHttpServer())
        .get(`${BASE}/credito/${creditoAdminId}/extrato`)
        .set("Authorization", `Bearer ${adminUser.token}`)
        .expect(200);
    });
  });
});
