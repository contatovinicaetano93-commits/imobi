import request from "supertest";
import { PrismaService } from "../prisma/prisma.service";
import { createE2eApp, closeE2eApp } from "../../test/e2e-app";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";

let kycCadastroSeq = 0;

function cadastroPayload(email: string) {
  kycCadastroSeq += 1;
  const cpf = String(20000000000 + kycCadastroSeq).padStart(11, "0").slice(0, 11);
  return {
    nome: "KYC Test User",
    email,
    cpf,
    telefone: "11987654321",
    senha: "Senha@123",
    consentidoTermos: true,
    consentidoPrivacy: true,
    consentidoKyc: true,
    consentidoMarketing: false,
  };
}

describe("KYC E2E — multipart upload", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let token: string;
  const emailPrefix = `kyc-e2e-${Date.now()}`;

  beforeAll(async () => {
    const { app: e2eApp, module } = await createE2eApp();
    app = e2eApp;
    prisma = module.get(PrismaService);

    const email = `${emailPrefix}@imbobi.com`;
    const reg = await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send(cadastroPayload(email))
      .expect(201);

    token = reg.body.accessToken;
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({
      where: { email: { contains: emailPrefix } },
    });
    await closeE2eApp(app);
  });

  it("POST /kyc/upload → 400 without multipart", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/kyc/upload")
      .set("Authorization", `Bearer ${token}`)
      .send({ tipo: "RG_FRENTE" })
      .expect(400);
  });

  it("POST /kyc/upload → 201 with multipart file", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/kyc/upload")
      .set("Authorization", `Bearer ${token}`)
      .field("tipo", "RG_FRENTE")
      .attach("file", Buffer.from("fake-jpeg-content"), {
        filename: "rg-frente.jpg",
        contentType: "image/jpeg",
      })
      .expect(201);

    expect(res.body.tipo).toBe("RG_FRENTE");
    expect(res.body).toHaveProperty("kycDocumentoId");
  });
});
