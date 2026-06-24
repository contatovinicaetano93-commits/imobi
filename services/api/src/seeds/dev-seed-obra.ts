/**
 * Seed da 1ª obra + crédito ativo para o tomador de teste (idempotente).
 *
 *   pnpm --filter @imbobi/api seed:dev:obra
 *   DATABASE_URL=… pnpm seed:staging:obra
 */
import {
  CreditoStatus,
  EtapaStatus,
  ObraStatus,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

const TOMADOR_EMAIL = "tomador@imobi.com.br";
const OBRA_NOME = "Residencial Gralha Azul — Torre A";

const ETAPAS = [
  { ordem: 1, nome: "Fundação", percentualObra: 12, valorLiberacao: 102_000, status: EtapaStatus.CONCLUIDA },
  { ordem: 2, nome: "Estrutura", percentualObra: 28, valorLiberacao: 238_000, status: EtapaStatus.AGUARDANDO_VISTORIA },
  { ordem: 3, nome: "Alvenaria", percentualObra: 18, valorLiberacao: 153_000, status: EtapaStatus.PLANEJADA },
  { ordem: 4, nome: "Acabamento", percentualObra: 27, valorLiberacao: 229_500, status: EtapaStatus.PLANEJADA },
  { ordem: 5, nome: "Finalização", percentualObra: 15, valorLiberacao: 127_500, status: EtapaStatus.PLANEJADA },
] as const;

async function main() {
  console.log("──────────────────────────────────────");
  console.log("  Seed 1ª obra + crédito — IMOBI       ");
  console.log("──────────────────────────────────────");

  const tomador = await prisma.usuario.findUnique({ where: { email: TOMADOR_EMAIL } });
  if (!tomador) {
    throw new Error(`Tomador não encontrado (${TOMADOR_EMAIL}). Rode pnpm seed:dev antes.`);
  }

  const valorAprovado = 850_000;
  const valorLiberado = ETAPAS.filter((e) => e.status === EtapaStatus.CONCLUIDA)
    .reduce((s, e) => s + e.valorLiberacao, 0);

  let credito = await prisma.credito.findFirst({
    where: { usuarioId: tomador.usuarioId, status: CreditoStatus.ATIVO },
    orderBy: { criadoEm: "desc" },
  });

  if (credito) {
    credito = await prisma.credito.update({
      where: { creditoId: credito.creditoId },
      data: {
        valorAprovado,
        valorLiberado,
        taxaMensal: 0.0099,
        prazoMeses: 48,
        status: CreditoStatus.ATIVO,
        dataVencimento: new Date(Date.now() + 48 * 30 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`  [CRÉDITO   ]  atualizado — R$ ${valorAprovado.toLocaleString("pt-BR")} (liberado R$ ${valorLiberado.toLocaleString("pt-BR")})`);
  } else {
    credito = await prisma.credito.create({
      data: {
        usuarioId: tomador.usuarioId,
        valorAprovado,
        valorLiberado,
        taxaMensal: 0.0099,
        prazoMeses: 48,
        status: CreditoStatus.ATIVO,
        dataVencimento: new Date(Date.now() + 48 * 30 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`  [CRÉDITO   ]  criado — R$ ${valorAprovado.toLocaleString("pt-BR")}`);
  }

  let obra = await prisma.obra.findFirst({
    where: { usuarioId: tomador.usuarioId, nome: OBRA_NOME },
  });

  if (obra) {
    obra = await prisma.obra.update({
      where: { obraId: obra.obraId },
      data: {
        creditoId: credito.creditoId,
        endereco: "Rua Gralha Azul, 120 — Vila Mariana, São Paulo, SP",
        geoLatitude: -23.5897,
        geoLongitude: -46.6342,
        areaM2: 312,
        tipo: "RESIDENCIAL",
        status: ObraStatus.EM_EXECUCAO,
      },
    });
    console.log(`  [OBRA      ]  atualizada — ${OBRA_NOME}`);
  } else {
    obra = await prisma.obra.create({
      data: {
        creditoId: credito.creditoId,
        usuarioId: tomador.usuarioId,
        nome: OBRA_NOME,
        endereco: "Rua Gralha Azul, 120 — Vila Mariana, São Paulo, SP",
        geoLatitude: -23.5897,
        geoLongitude: -46.6342,
        raioValidacaoMetros: 80,
        areaM2: 312,
        tipo: "RESIDENCIAL",
        status: ObraStatus.EM_EXECUCAO,
      },
    });
    console.log(`  [OBRA      ]  criada — ${OBRA_NOME}`);
  }

  for (const etapa of ETAPAS) {
    await prisma.etapaObra.upsert({
      where: { obraId_ordem: { obraId: obra.obraId, ordem: etapa.ordem } },
      create: {
        obraId: obra.obraId,
        nome: etapa.nome,
        ordem: etapa.ordem,
        percentualObra: etapa.percentualObra,
        valorLiberacao: etapa.valorLiberacao,
        status: etapa.status,
      },
      update: {
        nome: etapa.nome,
        percentualObra: etapa.percentualObra,
        valorLiberacao: etapa.valorLiberacao,
        status: etapa.status,
      },
    });
    console.log(`  [ETAPA ${etapa.ordem}]  ${etapa.nome.padEnd(14)}  ${etapa.status}`);
  }

  console.log("\n  IDs:");
  console.log(`    obraId:    ${obra.obraId}`);
  console.log(`    creditoId: ${credito.creditoId}`);
  console.log('\n  Login: tomador@imobi.com.br / Tomador@123');
  console.log('  Web:   /dashboard/construtor · /dashboard/obras');
  console.log('  E2E:   etapa "Estrutura" em AGUARDANDO_VISTORIA (vistoria-submission.spec.ts)');
  console.log('──────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
