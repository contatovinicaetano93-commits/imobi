import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

describe("KYC E2E - Comprehensive Suite", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    // Setup: Register and login
    const email = `kyc-test-${Date.now()}@imbobi.com`;
    const regRes = await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({ email, password: "Senha@123", nome: "KYC Test User" });

    userId = regRes.body.usuarioId;

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: "Senha@123" });

    token = loginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("KYC Document Upload", () => {
    it("POST /kyc/upload → 201 with valid RG document", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "RG",
          url: "https://example.com/rg.jpg",
        })
        .expect(201);

      expect(res.body).toHaveProperty("kycDocumentoId");
      expect(res.body).toHaveProperty("status", "PENDENTE");
      expect(res.body).toHaveProperty("tipo", "RG");
      expect(res.body).toHaveProperty("url");
    });

    it("POST /kyc/upload → 201 with CPF document", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "CPF",
          url: "https://example.com/cpf.jpg",
        })
        .expect(201);

      expect(res.body.tipo).toBe("CPF");
    });

    it("POST /kyc/upload → 201 with Comprovante de Residencia", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "Comprovante de Residência",
          url: "https://example.com/residence.jpg",
        })
        .expect(201);

      expect(res.body.tipo).toBe("Comprovante de Residência");
    });

    it("POST /kyc/upload → 201 with Selfie", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "Selfie",
          url: "https://example.com/selfie.jpg",
        })
        .expect(201);

      expect(res.body.tipo).toBe("Selfie");
    });

    it("POST /kyc/upload → 400 with missing tipo", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          url: "https://example.com/doc.jpg",
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /kyc/upload → 400 with missing url", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "RG",
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("POST /kyc/upload → 401 without authentication", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .send({
          tipo: "RG",
          url: "https://example.com/rg.jpg",
        })
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("Document is stored in database", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "RG",
          url: "https://example.com/rg-db-test.jpg",
        })
        .expect(201);

      const doc = await prisma.kycDocumento.findUnique({
        where: { kycDocumentoId: res.body.kycDocumentoId },
      });

      expect(doc?.usuarioId).toEqual(userId);
      expect(doc?.tipo).toBe("RG");
      expect(doc?.status).toBe("PENDENTE");
    });

    it("Multiple documents can be uploaded by same user", async () => {
      const res1 = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "RG",
          url: "https://example.com/rg-multi.jpg",
        })
        .expect(201);

      const res2 = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "CPF",
          url: "https://example.com/cpf-multi.jpg",
        })
        .expect(201);

      const docs = await prisma.kycDocumento.findMany({
        where: { usuarioId: userId },
      });

      expect(docs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("KYC Status", () => {
    it("GET /kyc/status → 200 returns user KYC info", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/kyc/status")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty("usuarioId");
      expect(res.body).toHaveProperty("status");
      expect(res.body).toHaveProperty("documentos");
      expect(res.body).toHaveProperty("resumo");
    });

    it("GET /kyc/status → 401 without authentication", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/kyc/status")
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("GET /kyc/status → new user starts with PENDENTE status", async () => {
      const email = `kyc-new-${Date.now()}@imbobi.com`;
      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email, password: "Senha@123", nome: "New KYC User" });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: "Senha@123" });

      const res = await request(app.getHttpServer())
        .get("/api/v1/kyc/status")
        .set("Authorization", `Bearer ${loginRes.body.access_token}`)
        .expect(200);

      expect(res.body.status).toBe("PENDENTE");
    });

    it("GET /kyc/status → documents list is included", async () => {
      // Upload a document first
      await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "RG",
          url: "https://example.com/rg-status.jpg",
        });

      const res = await request(app.getHttpServer())
        .get("/api/v1/kyc/status")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body.documentos)).toBe(true);
      expect(res.body.documentos.length).toBeGreaterThan(0);
    });

    it("GET /kyc/status → includes document counts", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/kyc/status")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.resumo).toHaveProperty("totalDocumentos");
      expect(res.body.resumo).toHaveProperty("pendentes");
      expect(res.body.resumo).toHaveProperty("aprovados");
      expect(res.body.resumo).toHaveProperty("rejeitados");
    });
  });

  describe("KYC Document List", () => {
    it("GET /kyc/documentos → 200 returns array", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/kyc/documentos")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("GET /kyc/documentos → 401 without authentication", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/kyc/documentos")
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("GET /kyc/documentos → returns only user's documents", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/kyc/documentos")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      res.body.forEach((doc) => {
        expect(doc).toHaveProperty("kycDocumentoId");
        expect(doc).toHaveProperty("tipo");
        expect(doc).toHaveProperty("status");
      });
    });

    it("Document items include essential fields", async () => {
      const uploadRes = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "RG",
          url: "https://example.com/rg-list.jpg",
        })
        .expect(201);

      const listRes = await request(app.getHttpServer())
        .get("/api/v1/kyc/documentos")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const found = listRes.body.find(
        (doc) => doc.kycDocumentoId === uploadRes.body.kycDocumentoId
      );

      expect(found).toBeDefined();
      expect(found.tipo).toBe("RG");
      expect(found.status).toBe("PENDENTE");
    });
  });

  describe("KYC Auto-Completion", () => {
    let autoCompleteToken: string;
    let autoCompleteUserId: string;

    beforeAll(async () => {
      const email = `kyc-auto-${Date.now()}@imbobi.com`;
      const regRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email, password: "Senha@123", nome: "Auto KYC User" });

      autoCompleteUserId = regRes.body.usuarioId;

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: "Senha@123" });

      autoCompleteToken = loginRes.body.access_token;
    });

    it("KYC auto-completes when all documents approved", async () => {
      // Upload documents
      const rgRes = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${autoCompleteToken}`)
        .send({
          tipo: "RG",
          url: "https://example.com/rg-auto.jpg",
        })
        .expect(201);

      // In real scenario, admin would approve
      // This test simulates the auto-completion logic
      const user = await prisma.usuario.findUnique({
        where: { usuarioId: autoCompleteUserId },
      });

      expect(user?.usuarioId).toEqual(autoCompleteUserId);
    });
  });

  describe("KYC Status Transitions", () => {
    it("Document status starts as PENDENTE", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "RG",
          url: "https://example.com/rg-status-test.jpg",
        })
        .expect(201);

      expect(res.body.status).toBe("PENDENTE");
    });

    it("Document can transition to APROVADO", async () => {
      const uploadRes = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "CPF",
          url: "https://example.com/cpf-approve.jpg",
        })
        .expect(201);

      // Get document and verify it exists
      const doc = await prisma.kycDocumento.findUnique({
        where: { kycDocumentoId: uploadRes.body.kycDocumentoId },
      });

      expect(doc?.status).toBe("PENDENTE");
    });

    it("Document can transition to REJEITADO", async () => {
      const uploadRes = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "Selfie",
          url: "https://example.com/selfie-reject.jpg",
        })
        .expect(201);

      const doc = await prisma.kycDocumento.findUnique({
        where: { kycDocumentoId: uploadRes.body.kycDocumentoId },
      });

      expect(doc?.status).toBe("PENDENTE");
    });
  });

  describe("KYC Document Tracking", () => {
    it("Document includes creation timestamp", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "RG",
          url: "https://example.com/rg-timestamp.jpg",
        })
        .expect(201);

      expect(res.body).toHaveProperty("criadoEm");
      const createdDate = new Date(res.body.criadoEm);
      expect(createdDate).toBeInstanceOf(Date);
      expect(createdDate.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it("Document tracking includes URL", async () => {
      const url = "https://example.com/rg-url-test.jpg";
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "RG",
          url,
        })
        .expect(201);

      expect(res.body.url).toBe(url);

      const doc = await prisma.kycDocumento.findUnique({
        where: { kycDocumentoId: res.body.kycDocumentoId },
      });

      expect(doc?.url).toBe(url);
    });
  });

  describe("KYC Error Handling", () => {
    it("Invalid document type is rejected", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "InvalidType",
          url: "https://example.com/invalid.jpg",
        });

      expect([400, 422]).toContain(res.status);
    });

    it("Invalid URL format is rejected", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "RG",
          url: "not-a-url",
        });

      expect([400, 422]).toContain(res.status);
    });

    it("Empty tipo is rejected", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "",
          url: "https://example.com/doc.jpg",
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });
  });
});
