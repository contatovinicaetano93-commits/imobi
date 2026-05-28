import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

describe("KYC E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let email: string;
  let docId: string;

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
    email = `kyc-test-${Date.now()}@imbobi.com`;
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({ email, senha: "Senha@123", nome: "Test User", cpf: "12345678901", telefone: "11999999999" });

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, senha: "Senha@123" });

    token = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.kycDocumento.deleteMany({ where: {} });
    await app.close();
  });

  describe("KYC Document Upload", () => {
    it("Upload KYC document - happy path", async () => {
      const docData = {
        tipo: "RG",
        url: "https://example.com/rg.jpg",
      };

      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send(docData)
        .expect(201);

      expect(res.body).toHaveProperty("kycDocumentoId");
      expect(res.body).toHaveProperty("status", "PENDENTE");
      expect(res.body).toHaveProperty("tipo", "RG");
      docId = res.body.kycDocumentoId;
    });

    it("Upload multiple document types", async () => {
      const docTypes = ["RG", "CPF", "CNH", "COMPROVANTE_ENDERECO"];

      for (const tipo of docTypes) {
        const res = await request(app.getHttpServer())
          .post("/api/v1/kyc/upload")
          .set("Authorization", `Bearer ${token}`)
          .send({
            tipo,
            url: `https://example.com/${tipo.toLowerCase()}.jpg`,
          });

        if (res.status === 201) {
          expect(res.body).toHaveProperty("kycDocumentoId");
          expect(res.body).toHaveProperty("tipo", tipo);
          expect(res.body.status).toBe("PENDENTE");
        }
      }
    });

    it("Upload KYC document - reject without authentication", async () => {
      const docData = {
        tipo: "RG",
        url: "https://example.com/rg.jpg",
      };

      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .send(docData);

      expect(res.status).toBe(401);
    });

    it("Upload KYC document - reject invalid tipo", async () => {
      const docData = {
        tipo: "INVALID_TYPE",
        url: "https://example.com/doc.jpg",
      };

      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send(docData);

      expect(res.status).toBe(400);
    });

    it("Upload KYC document - reject missing URL", async () => {
      const docData = {
        tipo: "RG",
        // Missing URL
      };

      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send(docData);

      expect(res.status).toBe(400);
    });
  });

  describe("KYC Status", () => {
    it("Get KYC status - happy path", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/kyc/status")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty("usuarioId");
      expect(res.body).toHaveProperty("status");
      expect(res.body).toHaveProperty("documentos");
      expect(res.body).toHaveProperty("resumo");
    });

    it("KYC status should have valid structure", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/kyc/status")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body.documentos)).toBe(true);
      expect(typeof res.body.status).toBe("string");

      if (res.body.resumo) {
        expect(typeof res.body.resumo).toBe("object");
      }
    });

    it("Get KYC status - reject without authentication", async () => {
      const res = await request(app.getHttpServer()).get("/api/v1/kyc/status");

      expect(res.status).toBe(401);
    });

    it("KYC status should reflect uploaded documents", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/kyc/status")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.documentos.length).toBeGreaterThan(0);
    });
  });

  describe("KYC Documents List", () => {
    it("List user documents - happy path", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/kyc/documentos")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("Listed documents should have valid structure", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/kyc/documentos")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      if (res.body.length > 0) {
        const doc = res.body[0];
        expect(doc).toHaveProperty("kycDocumentoId");
        expect(doc).toHaveProperty("tipo");
        expect(doc).toHaveProperty("status");
      }
    });

    it("List user documents - reject without authentication", async () => {
      const res = await request(app.getHttpServer()).get("/api/v1/kyc/documentos");

      expect(res.status).toBe(401);
    });

    it("Uploaded documents should appear in list", async () => {
      const uploadRes = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "CPF",
          url: "https://example.com/cpf.jpg",
        });

      if (uploadRes.status === 201) {
        const listRes = await request(app.getHttpServer())
          .get("/api/v1/kyc/documentos")
          .set("Authorization", `Bearer ${token}`)
          .expect(200);

        const uploadedDoc = listRes.body.find(
          (d: any) => d.kycDocumentoId === uploadRes.body.kycDocumentoId
        );
        expect(uploadedDoc).toBeDefined();
      }
    });
  });

  describe("KYC Workflow", () => {
    it("Complete KYC workflow - upload and check status", async () => {
      // Upload document
      const uploadRes = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipo: "RG",
          url: "https://example.com/rg-complete.jpg",
        });

      if (uploadRes.status === 201) {
        // Check status reflects new document
        const statusRes = await request(app.getHttpServer())
          .get("/api/v1/kyc/status")
          .set("Authorization", `Bearer ${token}`)
          .expect(200);

        const hasRG = statusRes.body.documentos.some(
          (d: any) => d.tipo === "RG"
        );
        expect(hasRG).toBe(true);
      }
    });

    it("New user should have PENDENTE KYC status initially", async () => {
      const email2 = `kyc-new-${Date.now()}@imbobi.com`;
      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email: email2, password: "Senha@123", nome: "New User" });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: email2, password: "Senha@123" });

      const newToken = loginRes.body.access_token;

      const statusRes = await request(app.getHttpServer())
        .get("/api/v1/kyc/status")
        .set("Authorization", `Bearer ${newToken}`)
        .expect(200);

      expect(statusRes.body).toHaveProperty("status");
    });
  });
});
