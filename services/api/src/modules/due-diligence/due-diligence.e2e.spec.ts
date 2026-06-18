/**
 * Due-Diligence E2E Tests
 *
 * After the RBAC fix, criar and listar require GESTOR or ADMIN.
 * Tests verify both the role restriction and the CRUD happy path.
 *
 * Requires: PostgreSQL + Redis (set DATABASE_URL and REDIS_URL in .env.test)
 */

import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

const BASE = "/api/v1";
const SENHA = "Senha@123";

let _seq = 0;
function nextCpf(ts: number) {
  _seq++;
  return String(ts + _seq * 17).padStart(11, "0").slice(-11);
}

const DD_BODY = {
  nomeEmpreendimento: "Condomínio E2E Test",
  tipologia: "RESIDENCIAL",
  endereco: "Av. Paulista, 1000",
  cidade: "São Paulo",
  uf: "SP",
  totalUnidades: 48,
  nomeIncorporadora: "Construtora Test",
  cnpjIncorporadora: "12345678000199",
  payload: { versao: 1, dados: "test" },
};

describe("Due-Diligence E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let gestorToken: string;
  let gestorId: string;
  let adminToken: string;
  let tomadorToken: string;

  async function criarUsuario(nome: string, tipo?: string) {
    const ts = Date.now();
    const email = `dd-e2e-${nome.toLowerCase()}-${ts}@test.imbobi`;
    const cpf = nextCpf(ts);

    const regRes = await request(app.getHttpServer())
      .post(`${BASE}/auth/registrar`)
      .send({
        nome,
        cpf,
        email,
        telefone: "11977776666",
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

    const loginRes = await request(app.getHttpServer())
      .post(`${BASE}/auth/login`)
      .send({ email, senha: SENHA });

    return {
      usuarioId,
      token: loginRes.body.accessToken ?? loginRes.body.access_token,
      email,
    };
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

    const gestor = await criarUsuario("Gestor DD", "GESTOR");
    gestorToken = gestor.token;
    gestorId = gestor.usuarioId;

    const admin = await criarUsuario("Admin DD", "ADMIN");
    adminToken = admin.token;

    const tomador = await criarUsuario("Tomador DD");
    tomadorToken = tomador.token;
  }, 60_000);

  afterAll(async () => {
    await prisma.dueDiligence.deleteMany({ where: { gestorId } });
    await app.close();
  });

  // ── Role enforcement ─────────────────────────────────────────────────────

  describe("Role enforcement", () => {
    it("POST /due-diligence → 403 for TOMADOR", async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/due-diligence`)
        .set("Authorization", `Bearer ${tomadorToken}`)
        .send(DD_BODY)
        .expect(403);
    });

    it("GET /due-diligence → 403 for TOMADOR", async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/due-diligence`)
        .set("Authorization", `Bearer ${tomadorToken}`)
        .expect(403);
    });

    it("POST /due-diligence → 401 without token", async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/due-diligence`)
        .send(DD_BODY)
        .expect(401);
    });

    it("PATCH /due-diligence/:id/status → 403 for GESTOR (ADMIN-only)", async () => {
      await request(app.getHttpServer())
        .patch(`${BASE}/due-diligence/00000000-0000-0000-0000-000000000001/status`)
        .set("Authorization", `Bearer ${gestorToken}`)
        .send({ status: "APROVADO" })
        .expect(403);
    });
  });

  // ── GESTOR CRUD ───────────────────────────────────────────────────────────

  describe("GESTOR can create and manage their due-diligences", () => {
    let ddId: string;

    it("POST /due-diligence → 201 for GESTOR", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/due-diligence`)
        .set("Authorization", `Bearer ${gestorToken}`)
        .send(DD_BODY)
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body.nomeEmpreendimento).toBe(DD_BODY.nomeEmpreendimento);
      expect(res.body.status).toBe("ENVIADO");
      ddId = res.body.id;
    });

    it("GET /due-diligence → 200 returns GESTOR's own DDs", async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/due-diligence`)
        .set("Authorization", `Bearer ${gestorToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("GET /due-diligence/:id → 200 for owner GESTOR", async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/due-diligence/${ddId}`)
        .set("Authorization", `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.id).toBe(ddId);
    });

    it("GET /due-diligence/:id → 403 for another GESTOR (ownership check)", async () => {
      const outroGestor = await criarUsuario("Outro Gestor", "GESTOR");

      await request(app.getHttpServer())
        .get(`${BASE}/due-diligence/${ddId}`)
        .set("Authorization", `Bearer ${outroGestor.token}`)
        .expect(403);
    });

    it("GET /due-diligence/:id → 200 for ADMIN (ownership bypass)", async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/due-diligence/${ddId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
    });

    it("GET /due-diligence/:id → 404 with non-existent ID", async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/due-diligence/00000000-0000-0000-0000-000000000099`)
        .set("Authorization", `Bearer ${gestorToken}`)
        .expect(404);
    });
  });

  // ── ADMIN status update ───────────────────────────────────────────────────

  describe("ADMIN can update due-diligence status", () => {
    let ddId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/due-diligence`)
        .set("Authorization", `Bearer ${gestorToken}`)
        .send(DD_BODY);
      ddId = res.body.id;
    });

    it("PATCH /due-diligence/:id/status → 200 for ADMIN", async () => {
      const res = await request(app.getHttpServer())
        .patch(`${BASE}/due-diligence/${ddId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "EM_ANALISE" })
        .expect(200);

      expect(res.body.status).toBe("EM_ANALISE");
    });

    it("PATCH /due-diligence/:id/status → 404 with non-existent ID", async () => {
      await request(app.getHttpServer())
        .patch(`${BASE}/due-diligence/00000000-0000-0000-0000-000000000099/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "APROVADO" })
        .expect(404);
    });
  });

  // ── ADMIN CRUD ────────────────────────────────────────────────────────────

  describe("ADMIN can also create and list due-diligences", () => {
    it("POST /due-diligence → 201 for ADMIN", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/due-diligence`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...DD_BODY, nomeEmpreendimento: "DD do Admin" })
        .expect(201);

      expect(res.body).toHaveProperty("id");
    });

    it("GET /due-diligence → 200 returns ADMIN's own DDs", async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/due-diligence`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
