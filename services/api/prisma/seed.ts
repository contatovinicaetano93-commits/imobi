import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clean up existing test user if it exists
  await prisma.usuario.deleteMany({
    where: {
      email: "test@imbobi.com.br",
    },
  });

  // Create test seed user
  const hashedPassword = await bcrypt.hash("Senha@123", 10);

  const testUser = await prisma.usuario.create({
    data: {
      nome: "Test User",
      email: "test@imbobi.com.br",
      cpf: "12345678901", // Valid format for testing
      telefone: "(11) 98765-4321",
      passwordHash: hashedPassword,
      tipo: "TOMADOR",
      kycStatus: "APROVADO",
    },
  });

  console.log(`✓ Test seed user created: ${testUser.email} (ID: ${testUser.usuarioId})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
