/**
 * Remove obras fictícias de demo no staging (ex.: Admin como tomador).
 *
 *   DATABASE_URL=… pnpm --filter @imbobi/api exec tsx src/seeds/cleanup-staging-demo.ts
 */
import { PrismaClient } from "@prisma/client";

const DEMO_OBRA_NAMES = ["Residencial Pinheiros"];

async function main() {
  const prisma = new PrismaClient();

  const demoByName = await prisma.obra.findMany({
    where: { nome: { in: DEMO_OBRA_NAMES } },
    select: { obraId: true, nome: true, status: true, usuario: { select: { nome: true, email: true, tipo: true } } },
  });

  const demoByAdminOwner = await prisma.obra.findMany({
    where: {
      usuario: { tipo: { in: ["ADMIN", "COMERCIAL", "ENGENHEIRO", "GESTOR"] } },
      status: { in: ["PLANEJAMENTO", "AGUARDANDO_HOMOLOGACAO"] },
    },
    select: { obraId: true, nome: true, status: true, usuario: { select: { nome: true, email: true, tipo: true } } },
  });

  const toDelete = new Map<string, (typeof demoByName)[number]>();
  for (const o of [...demoByName, ...demoByAdminOwner]) {
    toDelete.set(o.obraId, o);
  }

  if (toDelete.size === 0) {
    console.log("✅ Nenhuma obra fictícia encontrada.");
    await prisma.$disconnect();
    return;
  }

  console.log(`→ Removendo ${toDelete.size} obra(s) fictícia(s):`);
  for (const o of toDelete.values()) {
    console.log(`   · ${o.nome} (${o.status}) — ${o.usuario?.nome} <${o.usuario?.email}>`);
  }

  const ids = [...toDelete.keys()];
  await prisma.obra.deleteMany({ where: { obraId: { in: ids } } });

  console.log("✅ Obras fictícias removidas.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
