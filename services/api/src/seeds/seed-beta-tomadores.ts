/**
 * 3 tomadores beta para soft launch — KYC pendente (fluxo completo).
 *
 *   DATABASE_URL=… pnpm --filter @imbobi/api exec tsx src/seeds/seed-beta-tomadores.ts
 */
import { PrismaClient, KycStatus } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

const BETA_PASSWORD = process.env.SEED_BETA_TOMADOR_PASSWORD?.trim() || "BetaTomador@123";

const TOMADORES = [
  {
    nome: "Beta Tomador 1 — Ana",
    email: "beta.tomador1@imobi.com.br",
    cpf: "90000000001",
    telefone: "11990000001",
  },
  {
    nome: "Beta Tomador 2 — Bruno",
    email: "beta.tomador2@imobi.com.br",
    cpf: "90000000002",
    telefone: "11990000002",
  },
  {
    nome: "Beta Tomador 3 — Carla",
    email: "beta.tomador3@imobi.com.br",
    cpf: "90000000003",
    telefone: "11990000003",
  },
] as const;

async function main() {
  console.log("──────────────────────────────────────");
  console.log("  Beta tomadores — soft launch IMOBI   ");
  console.log("──────────────────────────────────────\n");

  const passwordHash = await hash(BETA_PASSWORD, 12);
  const webUrl = process.env.BETA_WEB_URL?.trim() || "https://imobi-web-ten.vercel.app";

  for (const t of TOMADORES) {
    await prisma.usuario.upsert({
      where: { email: t.email },
      update: {
        nome: t.nome,
        passwordHash,
        tipo: "TOMADOR",
        kycStatus: KycStatus.PENDENTE,
        consentidoTermos: true,
        consentidoPrivacy: true,
        consentidoKyc: true,
      },
      create: {
        nome: t.nome,
        email: t.email,
        cpf: t.cpf,
        telefone: t.telefone,
        passwordHash,
        tipo: "TOMADOR",
        kycStatus: KycStatus.PENDENTE,
        consentidoTermos: true,
        consentidoPrivacy: true,
        consentidoKyc: true,
      },
    });

    const inviteCode = randomBytes(8).toString("hex").toUpperCase();

    console.log(`✅ ${t.nome}`);
    console.log(`   Email:    ${t.email}`);
    console.log(`   Senha:    ${BETA_PASSWORD}`);
    console.log(`   Invite:   ${inviteCode}`);
    console.log(`   Login:    ${webUrl}/login`);
    console.log(`   Fluxo:    KYC → crédito → obra\n`);
  }

  console.log("──────────────────────────────────────");
  console.log("Mensagem sugerida para convite:\n");
  console.log(
    `Olá! Você foi convidado(a) para o beta do IMOBI.\n` +
      `1. Acesse ${webUrl}/login\n` +
      `2. Use o e-mail e senha que enviamos\n` +
      `3. Complete o KYC e cadastre sua primeira obra\n`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
