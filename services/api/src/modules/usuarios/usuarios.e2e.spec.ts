import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

// CPF range: 000.000.000-90 to 000.000.000-93
const PREFIX = "usuarios-e2e";

describe("Usuarios E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let userId: string;

  const email = `${PREFIX}-user@imbobi.com`;
  const password = "Senha@123";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    // Register + login
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({ email, password, nome: "Usuário Teste E2E" });

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password });

    token = loginRes.body.access_token;
    userId = loginRes.body.usuario?.usuarioId;
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { email } });
    await app.close();
  });

  describe("GET /usuarios/me", () => {
    it("200 retorna perfil do usuário autenticado", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/usuarios/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty("usuarioId");
      expect(res.body).toHaveProperty("email", email);
      expect(res.body).toHaveProperty("nome");
      expect(res.body).not.toHaveProperty("passwordHash");
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer()).get("/api/v1/usuarios/me").expect(401);
    });

    it("GET /usuarios/meu-perfil também funciona (legacy alias)", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/usuarios/meu-perfil")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty("usuarioId");
    });
  });

  describe("PATCH /usuarios/me", () => {
    it("200 atualiza nome e telefone", async () => {
      const res = await request(app.getHttpServer())
        .patch("/api/v1/usuarios/me")
        .set("Authorization", `Bearer ${token}`)
        .send({ nome: "Nome Atualizado", telefone: "11988888888" })
        .expect(200);

      expect(res.body).toHaveProperty("nome", "Nome Atualizado");
    });

    it("400 nome muito curto não é aceito", async () => {
      await request(app.getHttpServer())
        .patch("/api/v1/usuarios/me")
        .set("Authorization", `Bearer ${token}`)
        .send({ nome: "A" })
        .expect(400);
    });
  });

  describe("PATCH /usuarios/me/conta-bancaria", () => {
    it("200 atualiza dados bancários", async () => {
      const res = await request(app.getHttpServer())
        .patch("/api/v1/usuarios/me/conta-bancaria")
        .set("Authorization", `Bearer ${token}`)
        .send({
          contaTitular: "Usuário Teste",
          contaBanco: "001",
          contaAgencia: "1234",
          contaNumero: "56789-0",
          contaPix: "teste@pix.com",
        })
        .expect(200);

      expect(res.body).toHaveProperty("usuarioId");
    });
  });

  describe("GET /usuarios/me/preferencias", () => {
    it("200 retorna preferências de notificação", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/usuarios/me/preferencias")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty("etapaAprovada");
      expect(res.body).toHaveProperty("parcelaLiberada");
    });
  });

  describe("PATCH /usuarios/me/preferencias", () => {
    it("200 salva preferências", async () => {
      const res = await request(app.getHttpServer())
        .patch("/api/v1/usuarios/me/preferencias")
        .set("Authorization", `Bearer ${token}`)
        .send({ etapaAprovada: false, parcelaLiberada: true })
        .expect(200);

      expect(res.body).toHaveProperty("etapaAprovada", false);
      expect(res.body).toHaveProperty("parcelaLiberada", true);
    });
  });

  describe("GET /usuarios/meus-dados (LGPD)", () => {
    it("200 retorna dados pessoais completos", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/usuarios/meus-dados")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty("usuario");
      expect(res.body.usuario).toHaveProperty("email");
      expect(res.body.usuario).not.toHaveProperty("passwordHash");
    });

    it("401 sem autenticação", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/usuarios/meus-dados")
        .expect(401);
    });
  });

  describe("POST /usuarios/exportar-dados (LGPD portabilidade)", () => {
    it("200 retorna arquivo JSON para download", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/usuarios/exportar-dados")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.headers["content-type"]).toContain("application/json");
      expect(res.headers["content-disposition"]).toContain("attachment");
      expect(res.headers["content-disposition"]).toContain("dados-pessoais-");
    });
  });

  describe("PATCH /usuarios/revogar-consentimento (LGPD)", () => {
    it("200 revoga consentimento de marketing", async () => {
      await request(app.getHttpServer())
        .patch("/api/v1/usuarios/revogar-consentimento")
        .set("Authorization", `Bearer ${token}`)
        .send({ tipo: "MARKETING" })
        .expect(200);
    });
  });

  describe("DELETE /usuarios/meu-perfil (LGPD exclusão)", () => {
    it("200 inicia exclusão com período de carência de 30 dias", async () => {
      // Create a separate user for deletion test to not break other tests
      const delEmail = `${PREFIX}-del@imbobi.com`;
      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email: delEmail, password, nome: "Usuario Para Deletar" });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: delEmail, password });

      const delToken = loginRes.body.access_token;

      const res = await request(app.getHttpServer())
        .delete("/api/v1/usuarios/meu-perfil")
        .set("Authorization", `Bearer ${delToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("ok", true);
      expect(res.body).toHaveProperty("dataDelecao");

      // Cleanup
      await prisma.usuario.deleteMany({ where: { email: delEmail } });
    });
  });
});
