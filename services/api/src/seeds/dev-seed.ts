/**
 * Seed de usuários de teste para desenvolvimento.
 * Cria (ou atualiza) as 5 contas de staff + 1 cliente.
 *
 * Executar: pnpm --filter api seed:dev
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const USUARIOS = [
  {
    nome:     "Administrador IMOBI",
    email:    "admin@imobi.com.br",
    cpf:      "00000000001",
    telefone: "11900000001",
    senha:    "Admin@123",
    tipo:     "ADMIN" as const,
  },
  {
    nome:     "Gestor de Fundo",
    email:    "gestor@imobi.com.br",
    cpf:      "00000000002",
    telefone: "11900000002",
    senha:    "Gestor@123",
    tipo:     "GESTOR" as const,
  },
  {
    nome:     "Engenheiro Responsável",
    email:    "eng@imobi.com.br",
    cpf:      "00000000003",
    telefone: "11900000003",
    senha:    "Eng@123",
    tipo:     "ENGENHEIRO" as const,
  },
  {
    nome:     "Parceiro Comercial",
    email:    "comercial@imobi.com.br",
    cpf:      "00000000004",
    telefone: "11900000004",
    senha:    "Comercial@123",
    tipo:     "COMERCIAL" as const,
  },
  {
    nome:     "Cliente Tomador",
    email:    "tomador@imobi.com.br",
    cpf:      "00000000005",
    telefone: "11900000005",
    senha:    "Tomador@123",
    tipo:     "TOMADOR" as const,
  },
];

async function main() {
  console.log("──────────────────────────────────────");
  console.log("  Seed de usuários de teste — IMOBI   ");
  console.log("──────────────────────────────────────");

  for (const u of USUARIOS) {
    const passwordHash = await hash(u.senha, 12);
    const usuario = await prisma.usuario.upsert({
      where: { email: u.email },
      update: { passwordHash, tipo: u.tipo as any, kycStatus: "APROVADO", nome: u.nome },
      create: {
        nome:         u.nome,
        email:        u.email,
        cpf:          u.cpf,
        telefone:     u.telefone,
        passwordHash,
        tipo:         u.tipo as any,
        kycStatus:    "APROVADO",
        consentidoTermos:    true,
        consentidoPrivacy:   true,
        consentidoKyc:       true,
      },
    });
    console.log(`  [${u.tipo.padEnd(11)}]  ${u.email}  /  ${u.senha}`);
  }

  console.log("\n  Todos os usuários criados/atualizados com sucesso.");
  console.log("──────────────────────────────────────\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
