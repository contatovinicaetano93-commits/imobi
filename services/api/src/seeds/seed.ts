import {
  PrismaClient,
  UsuarioTipo,
  KycStatus,
  KycDocumentoStatus,
  CreditoStatus,
  ObraStatus,
  EtapaStatus,
  TipoNotificacao,
} from "@prisma/client";
import { hash } from "bcryptjs";
import * as path from "path";
import * as fs from "fs";

const prisma = new PrismaClient();

// ── Constants ──────────────────────────────────────────────────────────

const PASSWORD_HASH_ROUNDS = 10;
const TEST_PASSWORD = "TestPassword123"; // Meets schema requirements

// ── Helper Functions ──────────────────────────────────────────────────

/**
 * Calculate GPS distance using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validate GPS coordinates are within São Paulo area
 */
function isValidSaoPauloCoordinate(lat: number, lng: number): boolean {
  // São Paulo city approximate bounds
  const minLat = -23.65;
  const maxLat = -23.48;
  const minLng = -46.80;
  const maxLng = -46.40;

  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

/**
 * Calculate total amount owed with interest
 * Formula: Principal + (Principal × TaxaMensal × PrazoMeses)
 */
function calculateTotalWithInterest(
  principal: number,
  taxaMensal: number,
  prazoMeses: number
): number {
  return principal + principal * taxaMensal * prazoMeses;
}

/**
 * Load seed data from JSON file
 */
function loadSeedData(): any {
  const dataPath = path.join(__dirname, "seed-data.json");
  const rawData = fs.readFileSync(dataPath, "utf-8");
  return JSON.parse(rawData);
}

/**
 * Clear all tables in correct order (respecting foreign keys)
 */
async function clearDatabase(): Promise<void> {
  console.log("Clearing database...");

  try {
    await prisma.notificacao.deleteMany({});
    await prisma.usuarioFcmToken.deleteMany({});
    await prisma.sessaoToken.deleteMany({});
    await prisma.kycDocumento.deleteMany({});
    await prisma.evidenciaEtapa.deleteMany({});
    await prisma.etapaObra.deleteMany({});
    await prisma.liberacaoParcela.deleteMany({});
    await prisma.obra.deleteMany({});
    await prisma.credito.deleteMany({});
    await prisma.scoreHistorico.deleteMany({});
    await prisma.usuario.deleteMany({});
    await prisma.avaliacaoFornecedor.deleteMany({});
    await prisma.fornecedor.deleteMany({});

    console.log("✓ Database cleared successfully");
  } catch (error) {
    console.error("Error clearing database:", error);
    throw error;
  }
}

/**
 * Seed users with hashed passwords
 */
async function seedUsuarios(data: any): Promise<Map<number, string>> {
  console.log(`\nSeeding ${data.usuarios.length} users...`);

  const usuarioMap = new Map<number, string>();
  const passwordHash = await hash(TEST_PASSWORD, PASSWORD_HASH_ROUNDS);

  for (let i = 0; i < data.usuarios.length; i++) {
    const usuarioData = data.usuarios[i];

    const usuario = await prisma.usuario.create({
      data: {
        nome: usuarioData.nome,
        cpf: usuarioData.cpf,
        email: usuarioData.email,
        telefone: usuarioData.telefone,
        passwordHash,
        tipo: usuarioData.tipo as UsuarioTipo,
        kycStatus: usuarioData.kycStatus as KycStatus,
      },
    });

    usuarioMap.set(i, usuario.usuarioId);
    console.log(
      `  ✓ Created ${usuarioData.tipo}: ${usuarioData.nome} (${usuarioData.email})`
    );
  }

  return usuarioMap;
}

/**
 * Seed credits linked to users
 */
async function seedCreditos(
  data: any,
  usuarioMap: Map<number, string>
): Promise<Map<number, string>> {
  console.log(`\nSeeding ${data.creditos.length} credits...`);

  const creditoMap = new Map<number, string>();

  for (let i = 0; i < data.creditos.length; i++) {
    const creditoData = data.creditos[i];
    const usuarioId = usuarioMap.get(creditoData.usuarioId - 1);

    if (!usuarioId) {
      throw new Error(`Usuario not found for credito index ${i}`);
    }

    const totalComJuros = calculateTotalWithInterest(
      creditoData.valorLiberado,
      creditoData.taxaMensal,
      creditoData.prazoMeses
    );

    const dataVencimento = new Date();
    dataVencimento.setMonth(
      dataVencimento.getMonth() + creditoData.prazoMeses
    );

    const credito = await prisma.credito.create({
      data: {
        usuarioId,
        valorAprovado: creditoData.valorAprovado,
        valorLiberado: creditoData.valorLiberado,
        taxaMensal: creditoData.taxaMensal,
        prazoMeses: creditoData.prazoMeses,
        status: creditoData.status as CreditoStatus,
        dataVencimento,
      },
    });

    creditoMap.set(i, credito.creditoId);
    console.log(
      `  ✓ Created credit: R$ ${creditoData.valorAprovado} | Status: ${creditoData.status} (Total com juros: R$ ${totalComJuros.toFixed(2)})`
    );
  }

  return creditoMap;
}

/**
 * Seed obras (construction projects)
 */
async function seedObras(
  data: any,
  usuarioMap: Map<number, string>,
  creditoMap: Map<number, string>
): Promise<Map<number, string>> {
  console.log(`\nSeeding ${data.obras.length} obras (construction projects)...`);

  const obraMap = new Map<number, string>();

  for (let i = 0; i < data.obras.length; i++) {
    const obraData = data.obras[i];
    const usuarioId = usuarioMap.get(obraData.usuarioId - 1);
    const creditoId =
      obraData.creditoId !== null ? creditoMap.get(obraData.creditoId) : null;

    if (!usuarioId) {
      throw new Error(`Usuario not found for obra index ${i}`);
    }

    // Validate GPS coordinates
    if (
      !isValidSaoPauloCoordinate(obraData.geoLatitude, obraData.geoLongitude)
    ) {
      console.warn(
        `  ⚠ Obra GPS coordinates outside São Paulo bounds: ${obraData.nome}`
      );
    }

    const obra = await prisma.obra.create({
      data: {
        creditoId,
        usuarioId,
        nome: obraData.nome,
        endereco: obraData.endereco,
        geoLatitude: obraData.geoLatitude,
        geoLongitude: obraData.geoLongitude,
        raioValidacaoMetros: obraData.raioValidacaoMetros,
        areaM2: obraData.areaM2,
        tipo: obraData.tipo,
        status: obraData.status as ObraStatus,
      },
    });

    obraMap.set(i, obra.obraId);
    console.log(
      `  ✓ Created obra: ${obraData.nome} | Status: ${obraData.status} | Area: ${obraData.areaM2}m²`
    );
  }

  return obraMap;
}

/**
 * Seed etapas (stages) for each obra
 * Creates 9 standard stages for each obra
 */
async function seedEtapas(
  data: any,
  obraMap: Map<number, string>
): Promise<Map<string, string[]>> {
  console.log(`\nSeeding etapas (construction stages)...`);

  const etapaPercentuals = [
    15, // Fundação
    12, // Estrutura
    14, // Alvenaria
    10, // Cobertura
    12, // Instalações Elétricas
    12, // Instalações Hidráulicas
    10, // Revestimento
    12, // Acabamento
    3, // Entrega
  ];

  const stageTitles = [
    "Fundação e Escavação",
    "Estrutura de Concreto",
    "Alvenaria Convencional",
    "Cobertura",
    "Instalações Elétricas",
    "Instalações Hidráulicas",
    "Revestimento",
    "Acabamento Final",
    "Entrega e Limpeza",
  ];

  const stageStatuses = [
    "CONCLUIDA",
    "CONCLUIDA",
    "AGUARDANDO_VISTORIA",
    "EM_EXECUCAO",
    "PLANEJADA",
    "PLANEJADA",
    "PLANEJADA",
    "PLANEJADA",
    "PLANEJADA",
  ];

  const etapasMap = new Map<string, string[]>();
  const obraIds: string[] = [];

  obraMap.forEach((obraId) => {
    obraIds.push(obraId);
  });

  for (const obraId of obraIds) {
    console.log(`  Creating 9 stages for obra: ${obraId}`);

    const etapasIds: string[] = [];
    let cumulativePercent = 0;

    for (let stage = 0; stage < 9; stage++) {
      const percentualObra = etapaPercentuals[stage];
      cumulativePercent += percentualObra;

      // Estimate stage value (total of 150000 spread across stages)
      const valorLiberacao = (150000 * percentualObra) / 100;

      // Calculate expected dates
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() + stage * 14); // Start 2 weeks apart

      const dataConclusaoPrevista = new Date(dataInicio);
      dataConclusaoPrevista.setDate(dataConclusaoPrevista.getDate() + 14); // 2 weeks per stage

      const etapa = await prisma.etapaObra.create({
        data: {
          obraId,
          nome: stageTitles[stage],
          ordem: stage + 1,
          percentualObra,
          valorLiberacao,
          status: stageStatuses[stage] as EtapaStatus,
          dataConclusaoPrevista,
        },
      });

      etapasIds.push(etapa.etapaId);
    }

    etapasMap.set(obraId, etapasIds);
    console.log(`    ✓ Created 9 stages for obra (Total: ${cumulativePercent}%)`);
  }

  return etapasMap;
}

/**
 * Seed evidencias (photo evidence) for selected stages
 */
async function seedEvidencias(
  data: any,
  obraMap: Map<number, string>,
  etapasMap: Map<string, string[]>
): Promise<void> {
  console.log(`\nSeeding ${data.evidencias.length} photo evidences...`);

  for (const evidenciaData of data.evidencias) {
    const obraId = obraMap.get(evidenciaData.obraId);
    if (!obraId) {
      console.warn(`  ⚠ Obra not found for evidencia, skipping`);
      continue;
    }

    const etapasIds = etapasMap.get(obraId);
    if (!etapasIds || !etapasIds[evidenciaData.etapaId]) {
      console.warn(
        `  ⚠ Etapa not found for evidencia in obra, skipping`
      );
      continue;
    }

    const etapaId = etapasIds[evidenciaData.etapaId];

    // Calculate distance from obra center
    const obra = await prisma.obra.findUnique({
      where: { obraId },
    });

    if (!obra) continue;

    const distanciaObra = calculateDistance(
      obra.geoLatitude,
      obra.geoLongitude,
      evidenciaData.latCaptura,
      evidenciaData.lngCaptura
    );

    const evidencia = await prisma.evidenciaEtapa.create({
      data: {
        etapaId,
        obraId,
        fotoUrl: evidenciaData.fotoUrl,
        latCaptura: evidenciaData.latCaptura,
        lngCaptura: evidenciaData.lngCaptura,
        accuracyMetros: evidenciaData.accuracyMetros,
        distanciaObra,
        validada: evidenciaData.validada,
        observacao: evidenciaData.observacao,
      },
    });

    const validStatus = evidenciaData.validada ? "VALIDADA" : "PENDENTE";
    console.log(
      `  ✓ Created evidence: ${evidenciaData.fotoUrl} | Status: ${validStatus} | Distance: ${(distanciaObra / 1).toFixed(1)}m`
    );
  }
}

/**
 * Seed KYC documents
 */
async function seedKycDocumentos(
  data: any,
  usuarioMap: Map<number, string>
): Promise<void> {
  console.log(`\nSeeding ${data.kycDocumentos.length} KYC documents...`);

  for (const kycData of data.kycDocumentos) {
    const usuarioId = usuarioMap.get(kycData.usuarioId - 1);

    if (!usuarioId) {
      console.warn(`  ⚠ Usuario not found for KYC document, skipping`);
      continue;
    }

    let analisadoPorId: string | null = null;
    let analisadoEm: Date | null = null;

    // For approved/rejected documents, assign to an admin user
    if (
      kycData.status === "APROVADO" ||
      kycData.status === "REJEITADO"
    ) {
      // Get first admin user
      const admin = await prisma.usuario.findFirst({
        where: { tipo: "ADMIN" },
      });
      if (admin) {
        analisadoPorId = admin.usuarioId;
        analisadoEm = new Date();
        // Set analysis date 1-5 days before now
        analisadoEm.setDate(analisadoEm.getDate() - Math.floor(Math.random() * 5 + 1));
      }
    }

    const kycDocumento = await prisma.kycDocumento.create({
      data: {
        usuarioId,
        tipo: kycData.tipo,
        url: kycData.url,
        status: kycData.status as KycDocumentoStatus,
        motivo_rejeicao: kycData.motivo_rejeicao || null,
        analisadoPor: analisadoPorId,
        analisadoEm,
      },
    });

    console.log(
      `  ✓ Created KYC document: ${kycData.tipo} | Status: ${kycData.status}`
    );
  }
}

/**
 * Seed score history records
 */
async function seedScoreHistoricos(
  data: any,
  usuarioMap: Map<number, string>
): Promise<void> {
  console.log(`\nSeeding ${data.scoreHistoricos.length} score history records...`);

  for (const scoreData of data.scoreHistoricos) {
    const usuarioId = usuarioMap.get(scoreData.usuarioId - 1);

    if (!usuarioId) {
      console.warn(`  ⚠ Usuario not found for score record, skipping`);
      continue;
    }

    const scoreRecord = await prisma.scoreHistorico.create({
      data: {
        usuarioId,
        score: scoreData.score,
        motivo: scoreData.motivo,
      },
    });

    console.log(
      `  ✓ Created score record: Score ${scoreData.score} | Reason: ${scoreData.motivo}`
    );
  }
}

/**
 * Create sample notifications for completed operations
 */
async function seedNotificacoes(
  usuarioMap: Map<number, string>
): Promise<void> {
  console.log(`\nCreating sample notifications...`);

  const notificationMessages = [
    {
      tipo: "CREDITO_APROVADO",
      titulo: "Crédito Aprovado",
      mensagem: "Seu crédito foi aprovado com sucesso!",
    },
    {
      tipo: "KYC_APROVADO",
      titulo: "KYC Verificado",
      mensagem: "Seu KYC foi verificado e aprovado.",
    },
    {
      tipo: "ETAPA_APROVADA",
      titulo: "Etapa Aprovada",
      mensagem: "A etapa foi aprovada na vistoria.",
    },
    {
      tipo: "PARCELA_LIBERADA",
      titulo: "Parcela Liberada",
      mensagem: "Uma parcela do seu crédito foi liberada.",
    },
  ];

  // Create 2-3 notifications for first 5 users
  const usersToNotify: string[] = [];
  let count = 0;
  usuarioMap.forEach((usuarioId) => {
    if (count < 5) {
      usersToNotify.push(usuarioId);
      count++;
    }
  });

  for (const usuarioId of usersToNotify) {
    const notificationCount = Math.floor(Math.random() * 2) + 2; // 2-3 notifications

    for (let i = 0; i < notificationCount; i++) {
      const notification =
        notificationMessages[i % notificationMessages.length];

      await prisma.notificacao.create({
        data: {
          usuarioId,
          tipo: notification.tipo as TipoNotificacao,
          titulo: notification.titulo,
          mensagem: notification.mensagem,
        },
      });
    }

    console.log(`  ✓ Created notifications for user: ${usuarioId}`);
  }
}

async function seedMarketplace(): Promise<void> {
  console.log("\n▶ Seeding marketplace fornecedores...");

  const fornecedores = [
    {
      nome: "Construmax Materiais",
      tipo: "MATERIAL_CONSTRUCAO" as const,
      descricao: "Distribuidora de materiais de construção civil com foco em obras residenciais e comerciais.",
      telefone: "(11) 3344-5566",
      email: "vendas@construmax.com.br",
      cidade: "São Paulo",
      uf: "SP",
      geoLatitude: -23.5505,
      geoLongitude: -46.6333,
      avaliacaoMedia: 4.5,
      totalAvaliacoes: 38,
    },
    {
      nome: "Mão Firme Serviços",
      tipo: "MAO_DE_OBRA" as const,
      descricao: "Equipe especializada em alvenaria, revestimentos e acabamentos. Mais de 15 anos de experiência.",
      telefone: "(11) 9 8765-4321",
      email: "contato@maofirme.com.br",
      cidade: "São Paulo",
      uf: "SP",
      geoLatitude: -23.5489,
      geoLongitude: -46.6388,
      avaliacaoMedia: 4.2,
      totalAvaliacoes: 22,
    },
    {
      nome: "EquipAlug Locações",
      tipo: "EQUIPAMENTO" as const,
      descricao: "Locação de andaimes, betoneiras, compactadores e equipamentos de médio e grande porte.",
      telefone: "(11) 4004-7788",
      email: "locacao@equipalug.com.br",
      cidade: "Guarulhos",
      uf: "SP",
      geoLatitude: -23.4533,
      geoLongitude: -46.5332,
      avaliacaoMedia: 4.7,
      totalAvaliacoes: 51,
    },
    {
      nome: "ArqPlan Projetos",
      tipo: "PROJETO_ARQUITETURA" as const,
      descricao: "Escritório de arquitetura e projetos executivos para obras residenciais, comerciais e industriais.",
      telefone: "(11) 3210-9900",
      email: "projetos@arqplan.com.br",
      cidade: "São Paulo",
      uf: "SP",
      geoLatitude: -23.5620,
      geoLongitude: -46.6560,
      avaliacaoMedia: 4.8,
      totalAvaliacoes: 17,
    },
    {
      nome: "Engenharia Sólida",
      tipo: "ENGENHARIA" as const,
      descricao: "Laudos técnicos, ART, acompanhamento de obras e consultoria estrutural.",
      telefone: "(11) 2233-4455",
      email: "eng@solidaeng.com.br",
      cidade: "São Bernardo do Campo",
      uf: "SP",
      geoLatitude: -23.6939,
      geoLongitude: -46.5650,
      avaliacaoMedia: 4.6,
      totalAvaliacoes: 29,
    },
    {
      nome: "Norte Construções",
      tipo: "MAO_DE_OBRA" as const,
      descricao: "Empreiteira completa: fundação, estrutura, alvenaria e cobertura.",
      telefone: "(21) 3344-2211",
      email: "orcamento@norteconstrucoes.com.br",
      cidade: "Rio de Janeiro",
      uf: "RJ",
      geoLatitude: -22.9068,
      geoLongitude: -43.1729,
      avaliacaoMedia: 4.0,
      totalAvaliacoes: 14,
    },
    {
      nome: "BH Materiais Premium",
      tipo: "MATERIAL_CONSTRUCAO" as const,
      descricao: "Cimento, aço, blocos e materiais de acabamento com entrega em obra.",
      telefone: "(31) 3456-7890",
      email: "vendas@bhmateriais.com.br",
      cidade: "Belo Horizonte",
      uf: "MG",
      geoLatitude: -19.9167,
      geoLongitude: -43.9345,
      avaliacaoMedia: 4.3,
      totalAvaliacoes: 33,
    },
    {
      nome: "TechForm Fôrmas e Escoramentos",
      tipo: "EQUIPAMENTO" as const,
      descricao: "Fôrmas metálicas, escoramentos e sistemas construtivos para lajes e pilares.",
      telefone: "(11) 5566-3300",
      email: "comercial@techform.com.br",
      cidade: "Osasco",
      uf: "SP",
      geoLatitude: -23.5320,
      geoLongitude: -46.7919,
      avaliacaoMedia: 4.4,
      totalAvaliacoes: 26,
    },
  ];

  for (const f of fornecedores) {
    await prisma.fornecedor.upsert({
      where: { fornecedorId: `seed-${f.nome.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: {
        fornecedorId: `seed-${f.nome.toLowerCase().replace(/\s+/g, "-")}`,
        ...f,
        ativo: true,
      },
    });
    console.log(`  ✓ Fornecedor: ${f.nome}`);
  }
}

/**
 * Main seed function
 */
async function main(): Promise<void> {
  try {
    console.log("╔════════════════════════════════════════════════════════╗");
    console.log("║     Starting Database Seeding for Staging Environment   ║");
    console.log("╚════════════════════════════════════════════════════════╝");

    const data = loadSeedData();
    console.log("✓ Seed data loaded from seed-data.json");

    await clearDatabase();

    const usuarioMap = await seedUsuarios(data);
    const creditoMap = await seedCreditos(data, usuarioMap);
    const obraMap = await seedObras(data, usuarioMap, creditoMap);
    const etapasMap = await seedEtapas(data, obraMap);
    await seedEvidencias(data, obraMap, etapasMap);
    await seedKycDocumentos(data, usuarioMap);
    await seedScoreHistoricos(data, usuarioMap);
    await seedNotificacoes(usuarioMap);
    await seedMarketplace();

    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║                  Seeding Complete! ✓                    ║");
    console.log("║                                                         ║");
    console.log("║  Test Credentials:                                      ║");
    console.log(`║  - Email: admin1@test.com                              ║`);
    console.log(`║  - Password: ${TEST_PASSWORD.padEnd(44)}║`);
    console.log("║                                                         ║");
    console.log("║  Data Summary:                                          ║");
    console.log(`║  - Users: ${data.usuarios.length}                                             ║`);
    console.log(`║  - Credits: ${data.creditos.length}                                            ║`);
    console.log(`║  - Obras: ${data.obras.length}                                             ║`);
    console.log(`║  - Etapas: 90 (9 per obra)                              ║`);
    console.log(`║  - Evidencias: ${data.evidencias.length}                                          ║`);
    console.log(`║  - KYC Documents: ${data.kycDocumentos.length}                                      ║`);
    console.log(`║  - Score Records: ${data.scoreHistoricos.length}                                      ║`);
    console.log("╚════════════════════════════════════════════════════════╝");
  } catch (error) {
    console.error("\n✗ Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute seed if run directly
if (require.main === module) {
  main();
}

export { main, clearDatabase };
