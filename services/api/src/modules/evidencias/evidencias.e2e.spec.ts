import { Test, TestingModule } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import multipart from "@fastify/multipart";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

// Minimal JPEG magic bytes — enough to pass Buffer.length > 0 check
const FAKE_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const FAKE_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const mockStorage = {
  upload: jest.fn().mockResolvedValue({ key: "evidencias/test-etapa/test-uuid", url: "https://s3.test/key" }),
  getSignedUrl: jest.fn().mockResolvedValue("https://s3.test/signed-url"),
  delete: jest.fn().mockResolvedValue(undefined),
};

let cpfCounter = 10000000000;
function uniqueCpf() {
  return String(cpfCounter++);
}

async function registerAndLogin(app: NestFastifyApplication, tipo = "TOMADOR") {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  const cpf = uniqueCpf();
  const regRes = await request(app.getHttpServer())
    .post("/api/v1/auth/registrar")
    .send({
      nome: "Test User",
      cpf,
      email,
      telefone: "11999990000",
      senha: "Senha@123",
      tipo,
      consentidoTermos: true,
      consentidoPrivacy: true,
      consentidoKyc: true,
    });
  expect(regRes.status).toBe(201);
  return { token: regRes.body.accessToken as string, usuarioId: regRes.body.usuario.usuarioId as string };
}

async function criarObra(app: NestFastifyApplication, token: string) {
  const res = await request(app.getHttpServer())
    .post("/api/v1/obras")
    .set("Authorization", `Bearer ${token}`)
    .send({
      nome: "Obra de Teste E2E",
      endereco: { logradouro: "Rua Teste", numero: "1", bairro: "Centro", cidade: "São Paulo", uf: "SP", cep: "01310100" },
      geo: { latitude: -23.55, longitude: -46.63, raioValidacaoMetros: 100 },
      areaM2: 120,
      dataConclusaoPrevistaISO: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    });
  expect(res.status).toBe(201);
  const etapaId = res.body.etapas[0].etapaId as string;
  return { obraId: res.body.obraId as string, etapaId };
}

describe("POST /api/v1/evidencias — upload de evidência (Bug 9)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let token: string;
  let etapaId: string;
  let obraId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StorageService)
      .useValue(mockStorage)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
    app.setGlobalPrefix("api/v1");
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = moduleFixture.get(PrismaService);

    const user = await registerAndLogin(app);
    token = user.token;
    ({ obraId, etapaId } = await criarObra(app, token));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.upload.mockResolvedValue({ key: "evidencias/test-etapa/test-uuid", url: "https://s3.test/key" });
    mockStorage.getSignedUrl.mockResolvedValue("https://s3.test/signed-url");
  });

  describe("Caminho feliz", () => {
    it("aceita JPEG dentro do raio e persiste a key S3 no banco", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/evidencias")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", FAKE_JPEG, { filename: "foto.jpg", contentType: "image/jpeg" })
        .field("etapaId", etapaId)
        .field("latitude", "-23.55")
        .field("longitude", "-46.63")
        .field("accuracyMetros", "10")
        .field("timestampCaptura", new Date().toISOString());

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("evidenciaId");

      // StorageService.upload deve ter recebido o buffer real (não vazio)
      expect(mockStorage.upload).toHaveBeenCalledTimes(1);
      const [uploadedBuffer, mimeType] = mockStorage.upload.mock.calls[0];
      expect(Buffer.isBuffer(uploadedBuffer)).toBe(true);
      expect(uploadedBuffer.length).toBeGreaterThan(0);
      expect(mimeType).toBe("image/jpeg");

      // Banco deve ter a S3 key, não uma URL expirada
      const evidencia = await prisma.evidenciaEtapa.findUnique({
        where: { evidenciaId: res.body.evidenciaId },
      });
      expect(evidencia).not.toBeNull();
      expect(evidencia!.fotoUrl).toBe("evidencias/test-etapa/test-uuid");
      expect(evidencia!.fotoUrl).not.toMatch(/^https?:\/\//); // key, não URL
      expect(evidencia!.etapaId).toBe(etapaId);
      expect(evidencia!.obraId).toBe(obraId);
      expect(evidencia!.validada).toBe(false);
    });

    it("aceita PNG", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/evidencias")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", FAKE_PNG, { filename: "foto.png", contentType: "image/png" })
        .field("etapaId", etapaId)
        .field("latitude", "-23.55")
        .field("longitude", "-46.63")
        .field("accuracyMetros", "5")
        .field("timestampCaptura", new Date().toISOString());

      expect(res.status).toBe(201);
      expect(mockStorage.upload.mock.calls[0][1]).toBe("image/png");
    });

    it("persiste accuracyMetros e distanciaObra no banco", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/evidencias")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", FAKE_JPEG, { filename: "foto.jpg", contentType: "image/jpeg" })
        .field("etapaId", etapaId)
        .field("latitude", "-23.55")
        .field("longitude", "-46.63")
        .field("accuracyMetros", "8")
        .field("timestampCaptura", new Date().toISOString())
        .field("descricao", "Fundação concluída");

      expect(res.status).toBe(201);

      const evidencia = await prisma.evidenciaEtapa.findUnique({
        where: { evidenciaId: res.body.evidenciaId },
      });
      expect(Number(evidencia!.accuracyMetros)).toBe(8);
      expect(evidencia!.observacao).toBe("Fundação concluída");
      expect(Number(evidencia!.distanciaObra)).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Validação de MIME type", () => {
    it("rejeita PDF com 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/evidencias")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", Buffer.from("%PDF-1.4"), { filename: "doc.pdf", contentType: "application/pdf" })
        .field("etapaId", etapaId)
        .field("latitude", "-23.55")
        .field("longitude", "-46.63")
        .field("accuracyMetros", "10")
        .field("timestampCaptura", new Date().toISOString());

      expect(res.status).toBe(400);
      expect(mockStorage.upload).not.toHaveBeenCalled();
    });

    it("rejeita texto com 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/evidencias")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", Buffer.from("malicious"), { filename: "exploit.txt", contentType: "text/plain" })
        .field("etapaId", etapaId)
        .field("latitude", "-23.55")
        .field("longitude", "-46.63")
        .field("accuracyMetros", "10")
        .field("timestampCaptura", new Date().toISOString());

      expect(res.status).toBe(400);
      expect(mockStorage.upload).not.toHaveBeenCalled();
    });
  });

  describe("Validação de GPS", () => {
    it("rejeita accuracy > 15m com 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/evidencias")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", FAKE_JPEG, { filename: "foto.jpg", contentType: "image/jpeg" })
        .field("etapaId", etapaId)
        .field("latitude", "-23.55")
        .field("longitude", "-46.63")
        .field("accuracyMetros", "16")
        .field("timestampCaptura", new Date().toISOString());

      expect(res.status).toBe(400);
      expect(mockStorage.upload).not.toHaveBeenCalled();
    });

    it("rejeita coordenadas fora do raio da obra com 403", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/evidencias")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", FAKE_JPEG, { filename: "foto.jpg", contentType: "image/jpeg" })
        .field("etapaId", etapaId)
        .field("latitude", "-22.0")   // ~170km longe da obra
        .field("longitude", "-43.0")
        .field("accuracyMetros", "10")
        .field("timestampCaptura", new Date().toISOString());

      expect(res.status).toBe(403);
      expect(mockStorage.upload).not.toHaveBeenCalled();
    });
  });

  describe("Validação de campos obrigatórios", () => {
    it("rejeita sem arquivo com 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/evidencias")
        .set("Authorization", `Bearer ${token}`)
        .field("etapaId", etapaId)
        .field("latitude", "-23.55")
        .field("longitude", "-46.63")
        .field("accuracyMetros", "10")
        .field("timestampCaptura", new Date().toISOString());

      expect(res.status).toBe(400);
    });

    it("rejeita sem etapaId com 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/evidencias")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", FAKE_JPEG, { filename: "foto.jpg", contentType: "image/jpeg" })
        .field("latitude", "-23.55")
        .field("longitude", "-46.63")
        .field("accuracyMetros", "10")
        .field("timestampCaptura", new Date().toISOString());

      expect(res.status).toBe(400);
    });

    it("rejeita etapaId inválido (não UUID) com 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/evidencias")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", FAKE_JPEG, { filename: "foto.jpg", contentType: "image/jpeg" })
        .field("etapaId", "nao-e-uuid")
        .field("latitude", "-23.55")
        .field("longitude", "-46.63")
        .field("accuracyMetros", "10")
        .field("timestampCaptura", new Date().toISOString());

      expect(res.status).toBe(400);
    });
  });

  describe("Autenticação e autorização", () => {
    it("rejeita sem token com 401", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/evidencias")
        .attach("file", FAKE_JPEG, { filename: "foto.jpg", contentType: "image/jpeg" })
        .field("etapaId", etapaId)
        .field("latitude", "-23.55")
        .field("longitude", "-46.63")
        .field("accuracyMetros", "10")
        .field("timestampCaptura", new Date().toISOString());

      expect(res.status).toBe(401);
    });

    it("rejeita upload em etapa de outro usuário com 403", async () => {
      const outro = await registerAndLogin(app);
      const res = await request(app.getHttpServer())
        .post("/api/v1/evidencias")
        .set("Authorization", `Bearer ${outro.token}`)
        .attach("file", FAKE_JPEG, { filename: "foto.jpg", contentType: "image/jpeg" })
        .field("etapaId", etapaId)  // etapa pertence ao primeiro usuário
        .field("latitude", "-23.55")
        .field("longitude", "-46.63")
        .field("accuracyMetros", "10")
        .field("timestampCaptura", new Date().toISOString());

      expect(res.status).toBe(403);
      expect(mockStorage.upload).not.toHaveBeenCalled();
    });
  });

  describe("Idempotência do storage", () => {
    it("S3 upload falha → banco não registra evidência", async () => {
      mockStorage.upload.mockRejectedValueOnce(new Error("S3 unavailable"));

      const res = await request(app.getHttpServer())
        .post("/api/v1/evidencias")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", FAKE_JPEG, { filename: "foto.jpg", contentType: "image/jpeg" })
        .field("etapaId", etapaId)
        .field("latitude", "-23.55")
        .field("longitude", "-46.63")
        .field("accuracyMetros", "10")
        .field("timestampCaptura", new Date().toISOString());

      expect(res.status).toBeGreaterThanOrEqual(500);

      // Nenhum registro fantasma no banco
      const count = await prisma.evidenciaEtapa.count({
        where: { etapaId, fotoUrl: "" },
      });
      expect(count).toBe(0);
    });
  });
});
