/**
 * Cria solicitação PENDENTE (sem comitê) para testar fluxo admin → engenheiro → votação.
 *
 *   DATABASE_URL=… pnpm --filter @imbobi/api exec tsx src/seeds/seed-staging-comite.ts
 */
import { PrismaClient } from "@prisma/client";

const TOMADOR_EMAIL = process.env["SEED_TOMADOR_EMAIL"] ?? "tomador@imobi.com.br";

async function main() {
  const prisma = new PrismaClient();
  const tomador = await prisma.usuario.findUnique({ where: { email: TOMADOR_EMAIL } });
  if (!tomador) {
    console.error(`❌ Usuário não encontrado: ${TOMADOR_EMAIL}`);
    process.exit(1);
  }

  const existing = await prisma.solicitacaoCredito.findFirst({
    where: { usuarioId: tomador.usuarioId, status: "PENDENTE", comite: null },
  });
  if (existing) {
    console.log(`✅ Já existe solicitação pendente: ${existing.solicitacaoId}`);
    await prisma.$disconnect();
    return;
  }

  const s = await prisma.solicitacaoCredito.create({
    data: {
      usuarioId: tomador.usuarioId,
      valorSolicitado: 850_000,
      prazoMeses: 24,
      taxaMensal: 0.012,
      finalidade: "Construção residencial — seed staging comitê",
      garantias: "Alienação fiduciária do imóvel",
      vgv: 1_200_000,
      custoObra: 900_000,
      ltv: 70.8,
      ratingCalculado: "C",
      status: "PENDENTE",
    },
  });

  console.log(`✅ Solicitação criada (PENDENTE, sem comitê): ${s.solicitacaoId}`);
  console.log(`   Admin → Comitê → Buscar → selecionar → Iniciar Comitê`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
