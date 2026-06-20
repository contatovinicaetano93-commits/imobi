import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

// CPF range: 000.000.000-85 (parceiros uses 80-81, so use 85)
const PREFIX = "docs-e2e";
const USER_EMAIL = `${PREFIX}-user@imbobi.com`;
const PASSWORD = "Senha@123";

describe("Documentos E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let userId: string;
  let documentoId: string;
  let obraId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    // Register + login user
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({ email: USER_EMAIL, password: PASSWORD, nome: "Docs E2E User" });

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: USER_EMAIL, password: PASSWORD });

    token = loginRes.body.access_token;
    userId = loginRes.body.usuario?.usuarioId;

    // Create an obra for the user
    const obra = await prisma.obra.create({
      data: {
        usuarioId: userId,
        nome: "Obra Docs E2E",
        endereco: "Rua Docs, 200",
        geoLatitude: -23.55,
        geoLongitude: -46.63,
        raioValidacaoMetros: 200,
        areaM2: 120,
        tipo: "RESIDENCIAL",
        status: "EM_EXECUCAO",
      },
    });
    obraId = obra.obraId;
  });

  afterAll(async () => {
    await prisma.documento.deleteMany({ where: { usuarioId: userId } });
    await prisma.obra.deleteMany({ where: { obraId } });
    await prisma.usuario.deleteMany({ where: { email: USER_EMAIL } });
    await app.close();
  });

  describe("POST /documentos (upload)", () => {
    it("201 faz upload de um documento via multipart", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/documentos")
        .set("Authorization", `Bearer ${token}`)
        .field("nome", "Contrato Teste")
        .field("tipo", "CONTRATO")
        .field("obraId", obraId)
        .attach("file", Buffer.from("conteúdo do documento teste"), {
          filename: "contrato.pdf",
          contentType: "application/pdf",
        })
        .expect(201);

      expect(res.body).toHaveProperty("documentoId");
      expect(res.body).toHaveProperty("nome", "Contrato Teste");
      expect(res.body).toHaveProperty("tipo", "CONTRATO");
      documentoId = res.body.documentoId;
    });

    it("400 sem arquivo multipart", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/documentos")
        .set("Authorization", `Bearer ${token}`)
        .set("Content-Type", "application/json")
        .send({ nome: "sem arquivo" })
        .expect(400);
    });

    it("401 sem autenticação", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/documentos")
        .attach("file", Buffer.from("teste"), { filename: "test.pdf", contentType: "application/pdf" })
        .expect(401);
    });
  });

  describe("GET /documentos/meus", () => {
    it("200 lista documentos do usuário autenticado", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/documentos/meus")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty("documentoId");
      expect(res.body[0]).toHaveProperty("nome");
      expect(res.body[0]).toHaveProperty("tipo");
    });

    it("401 sem autenticação", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/documentos/meus")
        .expect(401);
    });
  });

  describe("GET /documentos/obra/:obraId", () => {
    it("200 lista documentos da obra do próprio usuário", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/documentos/obra/${obraId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty("obraId", obraId);
    });

    it("403 outro usuário não pode ver documentos da obra", async () => {
      // Register a second user
      const email2 = `${PREFIX}-other@imbobi.com`;
      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email: email2, password: PASSWORD, nome: "Other User" });

      const loginRes2 = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: email2, password: PASSWORD });

      const token2 = loginRes2.body.access_token;

      await request(app.getHttpServer())
        .get(`/api/v1/documentos/obra/${obraId}`)
        .set("Authorization", `Bearer ${token2}`)
        .expect(403);

      await prisma.usuario.deleteMany({ where: { email: email2 } });
    });
  });

  describe("DELETE /documentos/:id", () => {
    it("200 dono pode deletar próprio documento", async () => {
      // Upload a temporary document to delete
      const uploadRes = await request(app.getHttpServer())
        .post("/api/v1/documentos")
        .set("Authorization", `Bearer ${token}`)
        .field("nome", "Para Deletar")
        .field("tipo", "OUTROS")
        .attach("file", Buffer.from("delete me"), {
          filename: "delete.pdf",
          contentType: "application/pdf",
        });

      const tempId = uploadRes.body.documentoId;

      await request(app.getHttpServer())
        .delete(`/api/v1/documentos/${tempId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    });

    it("401 sem autenticação", async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/documentos/${documentoId}`)
        .expect(401);
    });
  });
});
