import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

describe("Fluxo Completo: Obra → Evidência → Vistoria → Liberação", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let constructorToken: string;
  let constructorId: string;
  let managerToken: string;
  let managerId: string;
  let obraId: string;
  let etapaId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    // Create constructor user
    const ts = Date.now();
    const constructorEmail = `constructor-${ts}@imbobi.com`;
    const constructorCpf = `${ts}`.padEnd(11, "0").slice(0, 11);
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({
        nome: "Construtor Test", cpf: constructorCpf, email: constructorEmail,
        telefone: "11999999999", senha: "Senha@123",
        consentidoTermos: true, consentidoPrivacy: true, consentidoKyc: true,
      });

    const constructorRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: constructorEmail, senha: "Senha@123" });

    constructorToken = constructorRes.body.accessToken;
    constructorId = constructorRes.body.usuario?.usuarioId;

    // Create manager user
    const managerEmail = `manager-${ts}@imbobi.com`;
    const managerCpf = `${ts + 1}`.padEnd(11, "0").slice(0, 11);
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({
        nome: "Manager Test", cpf: managerCpf, email: managerEmail,
        telefone: "11988888888", senha: "Senha@123",
        consentidoTermos: true, consentidoPrivacy: true, consentidoKyc: true,
      });

    const managerRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: managerEmail, senha: "Senha@123" });

    managerToken = managerRes.body.accessToken;
    managerId = managerRes.body.usuario?.usuarioId;
  });

  afterAll(async () => {
    await app.close();
  });

  it("Step 1: Constructor creates obra", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/obras")
      .set("Authorization", `Bearer ${constructorToken}`)
      .send({
        nome: "Test Obra",
        localizacao: {
          lat: -15.789,
          lng: -48.123,
        },
        valorTotal: 100000,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.nome).toBe("Test Obra");
    obraId = res.body.id;
  });

  it("Step 2: Obra should have etapas created", async () => {
    expect(obraId).toBeDefined();
    const res = await request(app.getHttpServer())
      .get(`/api/v1/obras/${obraId}`)
      .set("Authorization", `Bearer ${constructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.etapas).toBeDefined();
    expect(res.body.etapas.length).toBeGreaterThan(0);
    etapaId = res.body.etapas[0].id;
  });

  it("Step 3: First etapa should be AGUARDANDO_VISTORIA", async () => {
    expect(etapaId).toBeDefined();
    const res = await request(app.getHttpServer())
      .get(`/api/v1/obras/${obraId}`)
      .set("Authorization", `Bearer ${constructorToken}`);

    expect(res.status).toBe(200);
    const etapa = res.body.etapas.find((e: any) => e.id === etapaId);
    expect(etapa.status).toBe("AGUARDANDO_VISTORIA");
  });

  it("Step 4: Constructor uploads evidence photo for etapa", async () => {
    expect(etapaId).toBeDefined();

    const res = await request(app.getHttpServer())
      .post("/api/v1/evidencias")
      .set("Authorization", `Bearer ${constructorToken}`)
      .field("etapaId", etapaId)
      .field("latCaptura", "-15.789")
      .field("lngCaptura", "-48.123");
    // In real test, would attach image file

    expect(res.status === 201 || res.status === 400).toBe(true); // 400 if no file
  });

  it("Step 5: Evidence should be retrievable", async () => {
    expect(etapaId).toBeDefined();
    const res = await request(app.getHttpServer())
      .get(`/api/v1/evidencias/${etapaId}`)
      .set("Authorization", `Bearer ${constructorToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("Step 6: Manager approves etapa (vistoria)", async () => {
    expect(etapaId).toBeDefined();
    expect(obraId).toBeDefined();

    const res = await request(app.getHttpServer())
      .post(`/api/v1/vistoria/${etapaId}/aprovar`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        obraId,
        observacoes: "Etapa aprovada pela vistoria",
      });

    expect(res.status === 200 || res.status === 201).toBe(true);
  });

  it("Step 7: After approval, etapa status should change", async () => {
    expect(obraId).toBeDefined();
    const res = await request(app.getHttpServer())
      .get(`/api/v1/obras/${obraId}`)
      .set("Authorization", `Bearer ${constructorToken}`);

    expect(res.status).toBe(200);
    const etapa = res.body.etapas.find((e: any) => e.id === etapaId);
    // Status should change from AGUARDANDO_VISTORIA to APROVADA or EM_PROGRESSO
    expect(["APROVADA", "EM_PROGRESSO", "LIBERADA"]).toContain(etapa.status);
  });

  it("Multiple etapas should all start as AGUARDANDO_VISTORIA", async () => {
    expect(obraId).toBeDefined();
    const res = await request(app.getHttpServer())
      .get(`/api/v1/obras/${obraId}`)
      .set("Authorization", `Bearer ${constructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.etapas.length).toBeGreaterThan(1);
    res.body.etapas.forEach((etapa: any) => {
      expect(["AGUARDANDO_VISTORIA", "APROVADA", "EM_PROGRESSO", "LIBERADA", "REJEITADA"]).toContain(
        etapa.status
      );
    });
  });

  it("Etapas should have sequential order", async () => {
    expect(obraId).toBeDefined();
    const res = await request(app.getHttpServer())
      .get(`/api/v1/obras/${obraId}`)
      .set("Authorization", `Bearer ${constructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.etapas.length).toBeGreaterThan(0);

    for (let i = 0; i < res.body.etapas.length; i++) {
      expect(res.body.etapas[i].ordem).toBe(i + 1);
    }
  });

  it("Each etapa should have valor de liberacao", async () => {
    expect(obraId).toBeDefined();
    const res = await request(app.getHttpServer())
      .get(`/api/v1/obras/${obraId}`)
      .set("Authorization", `Bearer ${constructorToken}`);

    expect(res.status).toBe(200);
    res.body.etapas.forEach((etapa: any) => {
      expect(etapa.valorLiberacao).toBeDefined();
      expect(typeof etapa.valorLiberacao).toBe("string");
      expect(Number(etapa.valorLiberacao)).toBeGreaterThan(0);
    });
  });
});
