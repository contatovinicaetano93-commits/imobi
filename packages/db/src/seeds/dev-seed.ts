import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { getSetupUsers } from "./setup-users";

const prisma = new PrismaClient();

async function main() {
  for (const u of getSetupUsers()) {
    const senhaHash = await hash(u.senha, 12);
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: { senhaHash, role: u.role, nome: u.nome },
      create: { nome: u.nome, email: u.email, senhaHash, role: u.role },
    });
    console.log(`Seed: ${u.role} ${u.email} OK`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
