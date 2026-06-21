import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

const PREFIX = "construtor-e2e";

describe("Construtor E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let usuarioId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = module.get(PrismaService);

    const regRes = await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({
        nome: "Construtor E2E",
        email: `${PREFIX}@imbobi.com`,
        cpf: "000.000.000-10",
        telefone: "(11) 99999-0010",
        password: "Senha@123",
      });
    usuarioId = regRes.body.usuarioId;

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: `${PREFIX}@imbobi.com`, password: "Senha@123" });
    token = loginRes.body.access_token;
  });

  afterAll(async () => {
    await prisma.scoreHistorico.deleteMany({ where: { usuarioId } });
    await prisma.notificacao.deleteMany({ where: { usuarioId } });
    await prisma.sessaoToken.deleteMany({ where: { usuarioId } });
    await prisma.usuario.deleteMany({ where: { email: { startsWith: PREFIX } } });
    await app.close();
  });

  describe("GET /construtor/resumo", () => {
    it("200 retorna resumo do construtor", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/construtor/resumo")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty("usuario");
      expect(res.body).toHaveProperty("scoreAtual");
      expect(res.body).toHaveProperty("scoreNivel");
      expect(res.body).toHaveProperty("obras");
      expect(res.body).toHaveProperty("solicitacoes");
      expect(res.body.obras).toHaveProperty("total");
      expect(res.body.obras).toHaveProperty("progressoGeral");
      expect(["Iniciante", "Regular", "Bom", "Excelente"]).toContain(res.body.scoreNivel);
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer()).get("/api/v1/construtor/resumo").expect(401);
    });
  });

  describe("GET /construtor/cronograma-desembolsos", () => {
    it("200 retorna array de obras com etapas", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/construtor/cronograma-desembolsos")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // usuário novo → array vazio é válido
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/construtor/cronograma-desembolsos")
        .expect(401);
    });
  });

  describe("GET /construtor/acompanhamento-tecnico", () => {
    it("200 retorna array de obras com acompanhamento", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/construtor/acompanhamento-tecnico")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("401 sem token", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/construtor/acompanhamento-tecnico")
        .expect(401);
    });
  });

  describe("Integração com obra criada", () => {
    it("cronograma retorna etapas quando obra existe", async () => {
      // Cria uma obra para o usuário
      const obraRes = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Obra E2E Construtor",
          endereco: "Rua Teste, 100 - SP",
          geoLatitude: -23.55,
          geoLongitude: -46.63,
          raioValidacaoMetros: 50,
        });

      if (obraRes.status === 201) {
        const res = await request(app.getHttpServer())
          .get("/api/v1/construtor/cronograma-desembolsos")
          .set("Authorization", `Bearer ${token}`)
          .expect(200);

        expect(res.body.length).toBeGreaterThanOrEqual(1);
        const obra = res.body[0];
        expect(obra).toHaveProperty("etapas");
        expect(obra).toHaveProperty("totalPrevistoEtapas");
        expect(Array.isArray(obra.etapas)).toBe(true);
      }
    });
  });
});
