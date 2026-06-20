import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";

describe("POST /api/v1/leads/captura", () => {
  let app: INestApplication;

  const valid = {
    clienteNome: "João Construtor",
    clienteEmail: "joao@construtora.com.br",
    clienteTelefone: "11999998888",
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("201 — aceita payload válido com campos opcionais", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/leads/captura")
      .send({ ...valid, empresa: "Construtora XYZ", cargo: "Sócio", modalidade: "construcao", volume: "5M", observacoes: "Projeto residencial 20 unidades" });
    expect(res.status).toBe(201);
  });

  it("201 — aceita payload mínimo (só nome, email, telefone)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/leads/captura")
      .send(valid);
    expect(res.status).toBe(201);
  });

  it("400 — rejeita nome vazio", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/leads/captura")
      .send({ ...valid, clienteNome: "A" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Nome/i);
  });

  it("400 — rejeita e-mail inválido", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/leads/captura")
      .send({ ...valid, clienteEmail: "nao-e-email" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/E-mail/i);
  });

  it("400 — rejeita telefone curto demais", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/leads/captura")
      .send({ ...valid, clienteTelefone: "99" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Telefone/i);
  });

  it("400 — rejeita observacoes acima de 1000 chars", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/leads/captura")
      .send({ ...valid, observacoes: "x".repeat(1001) });
    expect(res.status).toBe(400);
  });

  it("400 — rejeita body vazio", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/leads/captura")
      .send({});
    expect(res.status).toBe(400);
  });
});
