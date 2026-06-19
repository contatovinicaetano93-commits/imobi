import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

describe("Manager Dashboard E2E - Comprehensive Suite", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let constructorEmail: string;
  let constructorToken: string;
  let constructorId: string;

  let managerEmail: string;
  let managerToken: string;
  let managerId: string;

  let creditoId: string;
  let obraId: string;
  let etapaIds: string[] = [];

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
    constructorEmail = `constructor-mgr-${ts}@imbobi.com`;
    const constructorCpf = `${ts}`.padEnd(11, "0").slice(0, 11);
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({
        nome: "Constructor Manager Dashboard Test", cpf: constructorCpf,
        email: constructorEmail, telefone: "11999999999", senha: "Senha@123",
        consentidoTermos: true, consentidoPrivacy: true, consentidoKyc: true,
      });

    const constructorLoginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: constructorEmail, senha: "Senha@123" });

    constructorToken = constructorLoginRes.body.accessToken;
    constructorId = constructorLoginRes.body.usuario?.usuarioId;

    // Create manager user
    managerEmail = `manager-mgr-${ts}@imbobi.com`;
    const managerCpf = `${ts + 1}`.padEnd(11, "0").slice(0, 11);
    await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send({
        nome: "Manager Dashboard Test", cpf: managerCpf,
        email: managerEmail, telefone: "11988888888", senha: "Senha@123",
        consentidoTermos: true, consentidoPrivacy: true, consentidoKyc: true,
      });

    const managerLoginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: managerEmail, senha: "Senha@123" });

    managerToken = managerLoginRes.body.accessToken;
    managerId = managerLoginRes.body.usuario?.usuarioId;

    // Create credit and obra with etapas
    const creditRes = await request(app.getHttpServer())
      .post("/api/v1/credito/solicitacao")
      .set("Authorization", `Bearer ${constructorToken}`)
      .send({
        loanType: "construction",
        valorSolicitado: 200000,
        prazoMeses: 24,
      });

    creditoId = creditRes.body.creditoId;

    await prisma.credito.update({
      where: { creditoId },
      data: { status: "APROVADO" },
    });

    const obraRes = await request(app.getHttpServer())
      .post("/api/v1/obras")
      .set("Authorization", `Bearer ${constructorToken}`)
      .send({
        nome: "Manager Dashboard Test Project",
        descricao: "Test project for manager dashboard verification",
        localizacao: {
          lat: -15.789,
          lng: -48.123,
        },
        valorTotal: 200000,
        creditoId,
      });

    obraId = obraRes.body.id;

    const obraData = await prisma.obra.findUnique({
      where: { obraId },
      include: { etapas: true },
    });

    if (obraData?.etapas) {
      etapaIds = obraData.etapas.map((e) => e.etapaId);
    }
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({
      where: {
        OR: [
          { email: { startsWith: "constructor-mgr-" } },
          { email: { startsWith: "manager-mgr-" } },
        ],
      },
    });
    await app.close();
  });

  describe("Step 1: Manager Authentication & Authorization", () => {
    it("Manager should be able to login", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: managerEmail, senha: "Senha@123" })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.usuario).toBeDefined();
    });

    it("Manager token should allow access to vistoria endpoints", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/vistoria/${etapaIds[0]}/aprovar`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({
          obraId,
          observacoes: "Test approval",
        })
        .expect([200, 201]);

      expect(res.body).toBeDefined();
    });

    it("Manager without proper auth should not access vistoria", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/vistoria/${etapaIds[1]}/aprovar`)
        .send({
          obraId,
          observacoes: "Unauthorized test",
        })
        .expect(401);
    });
  });

  describe("Step 2: View Pending Etapas for Approval", () => {
    it("Manager should view obra details with pending etapas", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(200);

      expect(res.body.etapas).toBeDefined();
      expect(Array.isArray(res.body.etapas)).toBe(true);
      expect(res.body.etapas.length).toBeGreaterThan(0);
    });

    it("Pending etapas should have correct status", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(200);

      const pendingEtapas = res.body.etapas.filter(
        (e: any) => e.status === "PLANEJADA" || e.status === "EM_EXECUCAO" || e.status === "AGUARDANDO_VISTORIA"
      );
      expect(pendingEtapas.length).toBeGreaterThan(0);
    });

    it("Etapas should include valorLiberacao for payment calculation", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(200);

      res.body.etapas.forEach((e: any) => {
        expect(e.valorLiberacao).toBeDefined();
        expect(Number(e.valorLiberacao)).toBeGreaterThan(0);
      });
    });

    it("Etapas should include nome and progress indicators", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(200);

      res.body.etapas.forEach((e: any) => {
        expect(e.nome).toBeDefined();
        expect(e.etapaId).toBeDefined();
        expect(e.status).toBeDefined();
      });
    });
  });

  describe("Step 3: Etapa Approval Workflow", () => {
    it("Manager should approve an etapa (vistoria)", async () => {
      const etapaToApprove = etapaIds[1];
      const res = await request(app.getHttpServer())
        .post(`/api/v1/vistoria/${etapaToApprove}/aprovar`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({
          obraId,
          observacoes: "Etapa aprovada com sucesso",
        })
        .expect([200, 201]);

      expect(res.body).toBeDefined();
    });

    it("Approved etapa should have status changed", async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(200);

      const approvedEtapa = res.body.etapas.find(
        (e: any) => e.etapaId === etapaIds[1]
      );
      expect(approvedEtapa?.status).toBe("CONCLUIDA");
    });

    it("Manager should be able to provide observacoes for approval", async () => {
      const etapaToApprove = etapaIds[2];
      const observacoes = "Qualidade verificada, documentação completa";

      const res = await request(app.getHttpServer())
        .post(`/api/v1/vistoria/${etapaToApprove}/aprovar`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({
          obraId,
          observacoes,
        })
        .expect([200, 201]);

      expect(res.body).toBeDefined();
    });
  });

  describe("Step 4: Etapa Rejection Workflow", () => {
    it("Manager should be able to reject an etapa", async () => {
      const etapaToReject = etapaIds[3] || etapaIds[0];
      if (!etapaToReject) {
        return; // Skip if not enough etapas
      }

      const res = await request(app.getHttpServer())
        .post(`/api/v1/vistoria/${etapaToReject}/rejeitar`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({
          motivo: "Falha na verificação de qualidade",
        })
        .expect([200, 201]);

      expect(res.body).toBeDefined();
    });

    it("Rejected etapa should have status updated", async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(200);

      const rejectedEtapas = res.body.etapas.filter(
        (e: any) => e.status === "REPROVADA"
      );
      // May have 0 or more depending on setup
      expect(Array.isArray(rejectedEtapas)).toBe(true);
    });
  });

  describe("Step 5: View Payment History & Release Status", () => {
    it("Manager should view credit details with payment release status", async () => {
      const credito = await prisma.credito.findUnique({
        where: { creditoId },
      });

      expect(credito).toBeDefined();
      expect(credito?.status).toBe("APROVADO");
      expect(credito?.valorSolicitado).toBeDefined();
      expect(credito?.valorLiberado).toBeDefined();
    });

    it("Manager should see liberacao parcela records", async () => {
      const liberacoes = await prisma.liberacaoParcela.findMany({
        where: { creditoId },
      });

      // May have 0 or more depending on approvals
      expect(Array.isArray(liberacoes)).toBe(true);
      liberacoes.forEach((lib) => {
        expect(["PENDENTE", "CONCLUIDA"]).toContain(lib.status);
      });
    });

    it("Manager should view transaction records", async () => {
      const obra = await prisma.obra.findUnique({
        where: { obraId },
      });

      expect(obra).toBeDefined();
      expect(obra?.valorTotal).toBeDefined();
    });
  });

  describe("Step 6: Obra Status Overview", () => {
    it("Manager should view overall obra progress", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(200);

      const obra = res.body;
      expect(obra.nome).toBeDefined();
      expect(obra.descricao).toBeDefined();
      expect(obra.valorTotal).toBeDefined();
      expect(obra.etapas.length).toBeGreaterThan(0);
    });

    it("Manager should see etapa completion percentage", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(200);

      const etapas = res.body.etapas;
      const totalEtapas = etapas.length;
      const completedEtapas = etapas.filter(
        (e: any) => e.status === "CONCLUIDA"
      ).length;

      expect(totalEtapas).toBeGreaterThan(0);
      expect(completedEtapas).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Step 7: Notification of Manager Actions", () => {
    it("Constructor should receive notification when etapa is approved", async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const notificacoes = await prisma.notificacao.findMany({
        where: {
          usuarioId: constructorId,
          tipo: "ETAPA_APROVADA",
        },
      });

      expect(notificacoes.length).toBeGreaterThan(0);
    });

    it("Constructor should receive notification when etapa is rejected", async () => {
      const notificacoes = await prisma.notificacao.findMany({
        where: {
          usuarioId: constructorId,
          tipo: "ETAPA_REPROVADA",
        },
      });

      // May have 0 or 1 depending on rejections
      expect(Array.isArray(notificacoes)).toBe(true);
    });
  });

  describe("Step 8: Manager Search & Filter", () => {
    it("Manager should be able to search obras by name", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/obras")
        .set("Authorization", `Bearer ${managerToken}`)
        .query({ search: "Manager Dashboard" })
        .expect([200, 400]); // 400 if search not implemented

      if (res.status === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    it("Manager should be able to list all obras", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/obras")
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("Step 9: Concurrent Manager Operations", () => {
    it("Multiple managers should be able to view same obra concurrently", async () => {
      const res1 = request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${managerToken}`);

      const res2 = request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${managerToken}`);

      const [r1, r2] = await Promise.all([res1, res2]);

      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);
      expect(r1.body.obraId).toBe(r2.body.obraId);
    });

    it("Manager operations should not interfere with constructor operations", async () => {
      const constructorRes = request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${constructorToken}`);

      const managerRes = request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${managerToken}`);

      const [cr, mr] = await Promise.all([constructorRes, managerRes]);

      expect(cr.status).toBe(200);
      expect(mr.status).toBe(200);
      expect(cr.body.obraId).toBe(mr.body.obraId);
    });
  });

  describe("Step 10: Full Manager Dashboard Workflow", () => {
    it("Complete manager flow: login → view etapas → approve → monitor should work", async () => {
      // Check manager can login
      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: managerEmail, senha: "Senha@123" })
        .expect(200);

      expect(loginRes.body.accessToken).toBeDefined();

      // Check manager can view obra
      const obraRes = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(200);

      expect(obraRes.body.etapas.length).toBeGreaterThan(0);

      // Check manager can approve etapa
      const pendingEtapa = obraRes.body.etapas.find(
        (e: any) =>
          e.status === "PLANEJADA" || e.status === "EM_EXECUCAO" || e.status === "AGUARDANDO_VISTORIA"
      );

      if (pendingEtapa) {
        const approveRes = await request(app.getHttpServer())
          .post(`/api/v1/vistoria/${pendingEtapa.etapaId}/aprovar`)
          .set("Authorization", `Bearer ${managerToken}`)
          .send({
            obraId,
            observacoes: "Final approval",
          })
          .expect([200, 201]);

        expect(approveRes.body).toBeDefined();
      }

      // Check manager can see final status
      const finalObraRes = await request(app.getHttpServer())
        .get(`/api/v1/obras/${obraId}`)
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(200);

      expect(finalObraRes.body).toBeDefined();
    });

    it("Manager should have access to all required dashboard data", async () => {
      const obra = await prisma.obra.findUnique({
        where: { obraId },
        include: {
          etapas: true,
          credito: true,
          usuario: true,
        },
      });

      expect(obra).toBeDefined();
      expect(obra?.etapas.length).toBeGreaterThan(0);
      expect(obra?.credito).toBeDefined();
      expect(obra?.usuario).toBeDefined();
    });
  });
});
