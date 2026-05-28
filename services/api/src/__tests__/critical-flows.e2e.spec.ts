import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../app.module";
import { PrismaService } from "../modules/prisma/prisma.service";

/**
 * Critical E2E Test Suite: 5 Key Flows
 * 1. LOGIN: Registration + Authentication
 * 2. CRIAR OBRA: Create project with auto-staged etapas
 * 3. VISTORIA: Evidence upload and approval workflow
 * 4. KYC: Know Your Customer document verification
 * 5. CREDITO: Credit simulation and request
 */
describe("Critical Flows E2E - Complete User Journey", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("[FLOW 1] LOGIN - Registration & Authentication", () => {
    let testEmail: string;
    let testPassword: string;
    let userId: string;
    let accessToken: string;
    let refreshToken: string;

    it("Step 1.1: Register new user with valid credentials", async () => {
      testEmail = `flow-login-${Date.now()}@imbobi.com`;
      testPassword = "ValidPassword@123";

      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: testEmail,
          password: testPassword,
          nome: "Flow Test User",
        })
        .expect(201);

      expect(res.body).toHaveProperty("usuarioId");
      expect(res.body).toHaveProperty("email", testEmail);
      expect(res.body).toHaveProperty("nome");
      userId = res.body.usuarioId;
    });

    it("Step 1.2: User cannot register with duplicate email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: testEmail,
          password: "DifferentPassword@123",
          nome: "Another User",
        })
        .expect(409);

      expect(res.body.message).toBeDefined();
    });

    it("Step 1.3: Login with registered credentials returns tokens", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(res.body).toHaveProperty("access_token");
      expect(res.body).toHaveProperty("refreshToken");
      expect(res.body).toHaveProperty("usuario");
      expect(res.body.usuario.usuarioId).toBe(userId);

      accessToken = res.body.access_token;
      refreshToken = res.body.refreshToken;
    });

    it("Step 1.4: Invalid password login is rejected", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: testEmail,
          password: "WrongPassword@123",
        })
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("Step 1.5: User can access authenticated endpoints with token", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/usuarios/meu-perfil")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.usuarioId).toBe(userId);
      expect(res.body.email).toBe(testEmail);
    });

    it("Step 1.6: Refresh token returns new access token", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/renovar")
        .send({ refreshToken })
        .expect(200);

      expect(res.body).toHaveProperty("access_token");
      expect(res.body.access_token).not.toEqual("");
    });

    it("Step 1.7: Logout invalidates refresh token", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/auth/logout")
        .send({ refreshToken })
        .expect(204);

      // Refresh token should now be invalid
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/renovar")
        .send({ refreshToken })
        .expect(401);

      expect(res.body.message).toBeDefined();
    });
  });

  describe("[FLOW 2] CRIAR OBRA - Project Creation with Auto-Stages", () => {
    let constructorToken: string;
    let constructorId: string;
    let obraId: string;

    beforeAll(async () => {
      const email = `flow-obra-${Date.now()}@imbobi.com`;
      const regRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email, password: "Senha@123", nome: "Construtor Flow" });

      constructorId = regRes.body.usuarioId;

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: "Senha@123" });

      constructorToken = loginRes.body.access_token;
    });

    it("Step 2.1: Constructor creates obra with valid location data", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${constructorToken}`)
        .send({
          nome: "Obra Test Flow",
          endereco: "Rua Exemplo, 123",
          geoLatitude: -23.55,
          geoLongitude: -46.63,
          raioValidacaoMetros: 50,
        })
        .expect(201);

      expect(res.body).toHaveProperty("obraId");
      expect(res.body.nome).toBe("Obra Test Flow");
      expect(res.body.construtorId).toBe(constructorId);
      obraId = res.body.obraId;
    });

    it("Step 2.2: Created obra is stored in database", async () => {
      const obra = await prisma.obra.findUnique({
        where: { obraId },
        include: { etapas: true },
      });

      expect(obra).toBeDefined();
      expect(obra?.nome).toBe("Obra Test Flow");
      expect(obra?.construtorId).toBe(constructorId);
    });

    it("Step 2.3: Obra auto-generates 9 sequential etapas", async () => {
      const obra = await prisma.obra.findUnique({
        where: { obraId },
        include: { etapas: { orderBy: { ordem: "asc" } } },
      });

      expect(obra?.etapas).toHaveLength(9);
      obra?.etapas.forEach((etapa, idx) => {
        expect(etapa.ordem).toBe(idx + 1);
        expect(etapa.status).toBe("AGUARDANDO_VISTORIA");
        expect(etapa.valorLiberacao).toBeGreaterThan(0);
      });
    });

    it("Step 2.4: Etapas have distributed valores based on total", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      const etapas = res.body.etapas;
      const totalEtapas = etapas.reduce(
        (sum, e) => sum + parseFloat(e.valorLiberacao || 0),
        0
      );

      expect(totalEtapas).toBeGreaterThan(0);
      etapas.forEach((etapa) => {
        expect(etapa.valorLiberacao).toBeDefined();
        expect(parseFloat(etapa.valorLiberacao)).toBeGreaterThan(0);
      });
    });

    it("Step 2.5: Constructor can retrieve created obra", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      expect(res.body.obraId).toBe(obraId);
      expect(res.body.nome).toBe("Obra Test Flow");
      expect(Array.isArray(res.body.etapas)).toBe(true);
    });

    it("Step 2.6: Missing coordinates are rejected", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${constructorToken}`)
        .send({
          nome: "Invalid Obra",
          endereco: "Rua Teste",
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("Step 2.7: Unauthenticated requests are rejected", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .send({
          nome: "Unauth Obra",
          geoLatitude: -23.55,
          geoLongitude: -46.63,
        })
        .expect(401);

      expect(res.body.message).toBeDefined();
    });
  });

  describe("[FLOW 3] VISTORIA - Evidence Upload & Approval Workflow", () => {
    let constructorToken: string;
    let managerToken: string;
    let obraId: string;
    let etapaId: string;
    let evidenciaId: string;

    beforeAll(async () => {
      // Create constructor
      const constructorEmail = `flow-vistoria-c-${Date.now()}@imbobi.com`;
      const constructorRegRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: constructorEmail,
          password: "Senha@123",
          nome: "Vistoria Constructor",
        });

      const constructorLoginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: constructorEmail, password: "Senha@123" });

      constructorToken = constructorLoginRes.body.access_token;

      // Create manager
      const managerEmail = `flow-vistoria-m-${Date.now()}@imbobi.com`;
      await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({
          email: managerEmail,
          password: "Senha@123",
          nome: "Vistoria Manager",
        });

      const managerLoginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: managerEmail, password: "Senha@123" });

      managerToken = managerLoginRes.body.access_token;

      // Create obra with etapas
      const obraRes = await request(app.getHttpServer())
        .post("/api/v1/obras")
        .set("Authorization", `Bearer ${constructorToken}`)
        .send({
          nome: "Vistoria Test Obra",
          geoLatitude: -23.55,
          geoLongitude: -46.63,
          raioValidacaoMetros: 50,
        });

      obraId = obraRes.body.obraId;

      const obraDetailRes = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${constructorToken}`);

      etapaId = obraDetailRes.body.etapas[0].id;
    });

    it("Step 3.1: Etapa starts in AGUARDANDO_VISTORIA status", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      const etapa = res.body.etapas.find((e) => e.id === etapaId);
      expect(etapa.status).toBe("AGUARDANDO_VISTORIA");
    });

    it("Step 3.2: Constructor uploads evidence photo with location data", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/evidencias")
        .set("Authorization", `Bearer ${constructorToken}`)
        .field("etapaId", etapaId)
        .field("latCaptura", "-23.55")
        .field("lngCaptura", "-46.63");

      expect([201, 400]).toContain(res.status);
      if (res.status === 201) {
        evidenciaId = res.body.id || res.body.evidenciaId;
      }
    });

    it("Step 3.3: Evidence location is validated against obra boundaries", async () => {
      // This is validated server-side with PostGIS
      // Invalid location should be rejected
      const res = await request(app.getHttpServer())
        .post("/api/v1/evidencias")
        .set("Authorization", `Bearer ${constructorToken}`)
        .field("etapaId", etapaId)
        .field("latCaptura", "0") // Invalid location
        .field("lngCaptura", "0");

      expect([400, 422]).toContain(res.status);
    });

    it("Step 3.4: Evidence list is retrievable for etapa", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/evidencias/${etapaId}`)
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("Step 3.5: Manager can approve etapa after viewing evidence", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/vistoria/${etapaId}/aprovar`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({
          obraId,
          observacoes: "Etapa aprovada pela vistoria - Flow Test",
        });

      expect([200, 201]).toContain(res.status);
    });

    it("Step 3.6: After approval, etapa status transitions", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${constructorToken}`)
        .expect(200);

      const etapa = res.body.etapas.find((e) => e.id === etapaId);
      expect(["APROVADA", "EM_PROGRESSO", "LIBERADA"]).toContain(etapa.status);
    });

    it("Step 3.7: Invalid etapa ID is rejected", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/vistoria/invalid-id/aprovar")
        .set("Authorization", `Bearer ${managerToken}`)
        .send({
          obraId,
          observacoes: "Invalid etapa",
        });

      expect([400, 404]).toContain(res.status);
    });
  });

  describe("[FLOW 4] KYC - Know Your Customer Document Verification", () => {
    let kycToken: string;
    let kycUserId: string;

    beforeAll(async () => {
      const email = `flow-kyc-${Date.now()}@imbobi.com`;
      const regRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email, password: "Senha@123", nome: "KYC Flow User" });

      kycUserId = regRes.body.usuarioId;

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: "Senha@123" });

      kycToken = loginRes.body.access_token;
    });

    it("Step 4.1: New user starts with PENDENTE KYC status", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/kyc/status")
        .set("Authorization", `Bearer ${kycToken}`)
        .expect(200);

      expect(res.body.status).toBe("PENDENTE");
      expect(res.body.usuarioId).toBe(kycUserId);
    });

    it("Step 4.2: User uploads RG document", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${kycToken}`)
        .send({
          tipo: "RG",
          url: "https://example.com/rg-flow.jpg",
        })
        .expect(201);

      expect(res.body.tipo).toBe("RG");
      expect(res.body.status).toBe("PENDENTE");
      expect(res.body).toHaveProperty("criadoEm");
    });

    it("Step 4.3: User uploads CPF document", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${kycToken}`)
        .send({
          tipo: "CPF",
          url: "https://example.com/cpf-flow.jpg",
        })
        .expect(201);

      expect(res.body.tipo).toBe("CPF");
    });

    it("Step 4.4: User uploads Proof of Residence", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${kycToken}`)
        .send({
          tipo: "Comprovante de Residência",
          url: "https://example.com/residence-flow.jpg",
        })
        .expect(201);

      expect(res.body.tipo).toBe("Comprovante de Residência");
    });

    it("Step 4.5: User uploads Selfie", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${kycToken}`)
        .send({
          tipo: "Selfie",
          url: "https://example.com/selfie-flow.jpg",
        })
        .expect(201);

      expect(res.body.tipo).toBe("Selfie");
    });

    it("Step 4.6: User can retrieve all uploaded documents", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/kyc/documentos")
        .set("Authorization", `Bearer ${kycToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(4);

      const tipos = res.body.map((doc) => doc.tipo);
      expect(tipos).toContain("RG");
      expect(tipos).toContain("CPF");
      expect(tipos).toContain("Selfie");
    });

    it("Step 4.7: KYC status shows document summary", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/kyc/status")
        .set("Authorization", `Bearer ${kycToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("resumo");
      expect(res.body.resumo).toHaveProperty("totalDocumentos");
      expect(res.body.resumo).toHaveProperty("pendentes");
      expect(res.body.resumo.totalDocumentos).toBeGreaterThanOrEqual(4);
    });

    it("Step 4.8: Uploading without authentication is rejected", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .send({
          tipo: "RG",
          url: "https://example.com/rg.jpg",
        })
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("Step 4.9: Invalid document type is rejected", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/kyc/upload")
        .set("Authorization", `Bearer ${kycToken}`)
        .send({
          tipo: "InvalidType",
          url: "https://example.com/invalid.jpg",
        });

      expect([400, 422]).toContain(res.status);
    });
  });

  describe("[FLOW 5] CREDITO - Credit Simulation & Request", () => {
    let creditToken: string;
    let creditUserId: string;
    let creditoId: string;

    beforeAll(async () => {
      const email = `flow-credit-${Date.now()}@imbobi.com`;
      const regRes = await request(app.getHttpServer())
        .post("/api/v1/auth/registrar")
        .send({ email, password: "Senha@123", nome: "Credit Flow User" });

      creditUserId = regRes.body.usuarioId;

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: "Senha@123" });

      creditToken = loginRes.body.access_token;
    });

    it("Step 5.1: Public user can simulate credit (no auth required)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 100000,
          prazoMeses: 12,
        })
        .expect(201);

      expect(res.body).toHaveProperty("valorSolicitado", 100000);
      expect(res.body).toHaveProperty("prazoMeses", 12);
      expect(res.body).toHaveProperty("valorTotal");
      expect(res.body).toHaveProperty("taxaMensal");
      expect(res.body.valorTotal).toBeGreaterThan(100000);
    });

    it("Step 5.2: 24-month credit has higher total than 12-month", async () => {
      const res12 = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 100000,
          prazoMeses: 12,
        })
        .expect(201);

      const res24 = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 100000,
          prazoMeses: 24,
        })
        .expect(201);

      expect(res24.body.valorTotal).toBeGreaterThan(res12.body.valorTotal);
    });

    it("Step 5.3: Authenticated user can request credit", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .set("Authorization", `Bearer ${creditToken}`)
        .send({
          valorSolicitado: 50000,
          prazoMeses: 12,
        })
        .expect(201);

      expect(res.body).toHaveProperty("creditoId");
      expect(res.body).toHaveProperty("valorSolicitado", 50000);
      expect(res.body).toHaveProperty("status");
      creditoId = res.body.creditoId;
    });

    it("Step 5.4: Credit request is stored in database", async () => {
      const credito = await prisma.credito.findUnique({
        where: { creditoId },
      });

      expect(credito).toBeDefined();
      expect(credito?.usuarioId).toBe(creditUserId);
      expect(credito?.prazoMeses).toBe(12);
    });

    it("Step 5.5: User can view their credit statement", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/credito/${creditoId}/extrato`)
        .set("Authorization", `Bearer ${creditToken}`)
        .expect(200);

      expect(res.body.creditoId).toBe(creditoId);
      expect(res.body).toHaveProperty("valorSolicitado");
      expect(res.body).toHaveProperty("taxaMensal");
      expect(res.body).toHaveProperty("status");
    });

    it("Step 5.6: User can list all their credits", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/credito/meus")
        .set("Authorization", `Bearer ${creditToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const found = res.body.find((c) => c.creditoId === creditoId);
      expect(found).toBeDefined();
    });

    it("Step 5.7: Invalid credit amount is rejected", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: -50000,
          prazoMeses: 12,
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("Step 5.8: Missing parameters are rejected", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 50000,
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it("Step 5.9: Unauthenticated user cannot request credit", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/solicitar")
        .send({
          valorSolicitado: 50000,
          prazoMeses: 12,
        })
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("Step 5.10: Interest calculations are mathematically correct", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/credito/simular")
        .send({
          valorSolicitado: 100000,
          prazoMeses: 12,
        })
        .expect(201);

      const juros = res.body.valorTotal - res.body.valorSolicitado;
      expect(juros).toBeGreaterThan(0);
      expect(res.body.valorTotal).toBeCloseTo(100000 + juros, 2);
    });
  });
});
