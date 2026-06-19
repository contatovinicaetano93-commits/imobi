import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const hash = (senha: string) => bcrypt.hash(senha, 10);

async function main() {
  console.log("🌱 Seeding database...");

  // ── Usuários ──────────────────────────────────────────────────────
  const adminHash = await hash("Admin@123");
  const admin = await prisma.usuario.upsert({
    where: { email: "admin@imbobi.com" },
    update: {},
    create: {
      nome: "Administrador",
      cpf: "00000000191",
      email: "admin@imbobi.com",
      telefone: "11999990001",
      passwordHash: adminHash,
      tipo: "ADMIN",
      kycStatus: "APROVADO",
      consentidoTermos: true,
      consentidoPrivacy: true,
      consentidoKyc: true,
      consentidoMarketing: false,
      consentidoEm: new Date(),
    },
  });

  const gestorHash = await hash("Gestor@123");
  const gestor = await prisma.usuario.upsert({
    where: { email: "gestor@imbobi.com" },
    update: {},
    create: {
      nome: "Gestor Silva",
      cpf: "00000000272",
      email: "gestor@imbobi.com",
      telefone: "11999990002",
      passwordHash: gestorHash,
      tipo: "GESTOR",
      kycStatus: "APROVADO",
      consentidoTermos: true,
      consentidoPrivacy: true,
      consentidoKyc: true,
      consentidoMarketing: false,
      consentidoEm: new Date(),
    },
  });

  const engenheiroHash = await hash("Engenheiro@123");
  await prisma.usuario.upsert({
    where: { email: "engenheiro@imbobi.com" },
    update: {},
    create: {
      nome: "Engenheiro Costa",
      cpf: "00000000353",
      email: "engenheiro@imbobi.com",
      telefone: "11999990003",
      passwordHash: engenheiroHash,
      tipo: "ENGENHEIRO",
      kycStatus: "APROVADO",
      consentidoTermos: true,
      consentidoPrivacy: true,
      consentidoKyc: true,
      consentidoMarketing: false,
      consentidoEm: new Date(),
    },
  });

  const tomador1Hash = await hash("Tomador@123");
  const tomador1 = await prisma.usuario.upsert({
    where: { email: "joao.silva@exemplo.com" },
    update: {},
    create: {
      nome: "João da Silva",
      cpf: "52998224725",
      email: "joao.silva@exemplo.com",
      telefone: "11988880001",
      passwordHash: tomador1Hash,
      tipo: "TOMADOR",
      kycStatus: "APROVADO",
      consentidoTermos: true,
      consentidoPrivacy: true,
      consentidoKyc: true,
      consentidoMarketing: true,
      consentidoEm: new Date(),
    },
  });

  const tomador2Hash = await hash("Tomador@123");
  const tomador2 = await prisma.usuario.upsert({
    where: { email: "maria.santos@exemplo.com" },
    update: {},
    create: {
      nome: "Maria Santos",
      cpf: "11144477735",
      email: "maria.santos@exemplo.com",
      telefone: "11988880002",
      passwordHash: tomador2Hash,
      tipo: "TOMADOR",
      kycStatus: "EM_VERIFICACAO",
      consentidoTermos: true,
      consentidoPrivacy: true,
      consentidoKyc: true,
      consentidoMarketing: false,
      consentidoEm: new Date(),
    },
  });

  const tomador3Hash = await hash("Tomador@123");
  const tomador3 = await prisma.usuario.upsert({
    where: { email: "carlos.ferreira@exemplo.com" },
    update: {},
    create: {
      nome: "Carlos Ferreira",
      cpf: "34528894742",
      email: "carlos.ferreira@exemplo.com",
      telefone: "11988880003",
      passwordHash: tomador3Hash,
      tipo: "TOMADOR",
      kycStatus: "PENDENTE",
      consentidoTermos: true,
      consentidoPrivacy: true,
      consentidoKyc: true,
      consentidoMarketing: true,
      consentidoEm: new Date(),
    },
  });

  const comercialHash = await hash("Comercial@123");
  await prisma.usuario.upsert({
    where: { email: "comercial@imbobi.com" },
    update: {},
    create: {
      nome: "Vendedor Parceiro",
      cpf: "54276139164",
      email: "comercial@imbobi.com",
      telefone: "11999990004",
      passwordHash: comercialHash,
      tipo: "COMERCIAL",
      kycStatus: "APROVADO",
      consentidoTermos: true,
      consentidoPrivacy: true,
      consentidoKyc: true,
      consentidoMarketing: false,
      consentidoEm: new Date(),
    },
  });

  const construtorHash = await hash("Construtor@123");
  await prisma.usuario.upsert({
    where: { email: "construtor@imbobi.com" },
    update: {},
    create: {
      nome: "Construtora ABC",
      cpf: "14532133093",
      email: "construtor@imbobi.com",
      telefone: "11999990005",
      passwordHash: construtorHash,
      tipo: "CONSTRUTOR",
      kycStatus: "APROVADO",
      consentidoTermos: true,
      consentidoPrivacy: true,
      consentidoKyc: true,
      consentidoMarketing: false,
      consentidoEm: new Date(),
    },
  });

  console.log("✅ Usuários criados");

  // ── Créditos ──────────────────────────────────────────────────────
  // Credito schema: valorAprovado Float (required), valorLiberado Float (required),
  // taxaMensal Float, prazoMeses Int, status CreditoStatus (ATIVO/SUSPENSO/VENCIDO/QUITADO)
  const credito1 = await prisma.credito.create({
    data: {
      usuarioId: tomador1.usuarioId,
      valorAprovado: 320000,
      valorLiberado: 80000,
      taxaMensal: 0.0085,
      prazoMeses: 120,
      status: "ATIVO",
    },
  }).catch(() => prisma.credito.findFirst({ where: { usuarioId: tomador1.usuarioId } }));

  await prisma.credito.create({
    data: {
      usuarioId: tomador2.usuarioId,
      valorAprovado: 180000,
      valorLiberado: 0,
      taxaMensal: 0.009,
      prazoMeses: 60,
      status: "SUSPENSO",
    },
  }).catch(() => null);

  console.log("✅ Créditos criados");

  // ── Notificações ──────────────────────────────────────────────────
  // Notificacao schema: tipo TipoNotificacao enum, mensagem String (not descricao)
  // Valid TipoNotificacao: ETAPA_APROVADA, ETAPA_REPROVADA, PARCELA_LIBERADA,
  // PARCELA_FALHA, CREDITO_APROVADO, KYC_APROVADO, KYC_REJEITADO, OBRA_CRIADA,
  // SCORE_ATUALIZADO, VISTORIA_PENDENTE, PARECER_SOLICITADO, COMITE_DECISAO
  const notifData = [
    { usuarioId: tomador1.usuarioId, tipo: "PARCELA_LIBERADA", titulo: "Parcela liberada!", mensagem: "R$ 20.000 foram liberados para sua obra Residência João.", lida: false },
    { usuarioId: tomador1.usuarioId, tipo: "ETAPA_APROVADA", titulo: "Etapa aprovada", mensagem: "Etapa Fundação foi concluída e aprovada.", lida: true },
    { usuarioId: tomador1.usuarioId, tipo: "KYC_APROVADO", titulo: "KYC Aprovado", mensagem: "Sua verificação de identidade foi aprovada.", lida: true },
    { usuarioId: tomador2.usuarioId, tipo: "CREDITO_APROVADO", titulo: "Bem-vinda!", mensagem: "Sua conta foi criada com sucesso.", lida: false },
    { usuarioId: tomador2.usuarioId, tipo: "VISTORIA_PENDENTE", titulo: "Documentos pendentes", mensagem: "Envie seus documentos para iniciar a verificação KYC.", lida: false },
    { usuarioId: admin.usuarioId, tipo: "OBRA_CRIADA", titulo: "Sistema iniciado", mensagem: "Ambiente de desenvolvimento configurado.", lida: true },
    { usuarioId: gestor.usuarioId, tipo: "VISTORIA_PENDENTE", titulo: "Nova obra para revisar", mensagem: "Residência João Silva aguarda vistoria.", lida: false },
  ];

  for (const n of notifData) {
    await prisma.notificacao.create({ data: n as any }).catch(() => null);
  }

  console.log("✅ Notificações criadas");

  // ── KYC Documents ─────────────────────────────────────────────────
  // KycDocumento schema: tipo String, url String, status KycDocumentoStatus (PENDENTE/APROVADO/REJEITADO)
  const kycDocs = [
    { usuarioId: tomador2.usuarioId, tipo: "RG", url: "https://example.com/seed/rg.jpg", status: "PENDENTE" },
    { usuarioId: tomador2.usuarioId, tipo: "CPF", url: "https://example.com/seed/cpf.jpg", status: "PENDENTE" },
    { usuarioId: tomador3.usuarioId, tipo: "Selfie", url: "https://example.com/seed/selfie.jpg", status: "PENDENTE" },
    { usuarioId: tomador3.usuarioId, tipo: "Comprovante de Residência", url: "https://example.com/seed/residencia.jpg", status: "PENDENTE" },
    { usuarioId: tomador3.usuarioId, tipo: "RG", url: "https://example.com/seed/rg2.jpg", status: "PENDENTE" },
  ];

  for (const doc of kycDocs) {
    await prisma.kycDocumento.create({ data: doc as any }).catch(() => null);
  }

  console.log("✅ Documentos KYC criados");

  console.log("\n🎉 Seed completo!");
  console.log("\nCredenciais de acesso:");
  console.log("  admin@imbobi.com       / Admin@123      (ADMIN)");
  console.log("  gestor@imbobi.com      / Gestor@123     (GESTOR)");
  console.log("  engenheiro@imbobi.com  / Engenheiro@123 (ENGENHEIRO)");
  console.log("  joao.silva@exemplo.com / Tomador@123    (TOMADOR - KYC Aprovado)");
  console.log("  maria.santos@exemplo.com / Tomador@123  (TOMADOR - KYC Em verificação)");
  console.log("  carlos.ferreira@exemplo.com / Tomador@123 (TOMADOR - KYC Pendente)");
  console.log("  comercial@imbobi.com   / Comercial@123  (COMERCIAL)");
  console.log("  construtor@imbobi.com  / Construtor@123 (CONSTRUTOR)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
