import { PrismaClient, UsuarioTipo, KycStatus, ObraStatus, EtapaStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

interface BetaUserConfig {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  tipo: UsuarioTipo;
  tier: 'STANDARD' | 'POWER' | 'VIP';
  kycStatus: KycStatus;
  contaBanco?: string;
  contaPix?: string;
}

const BETA_USERS: BetaUserConfig[] = [
  {
    nome: 'João Silva (Tomador)',
    email: 'joao.silva@teste.imobi.com',
    cpf: '12345678901',
    telefone: '11987654321',
    tipo: 'TOMADOR',
    tier: 'STANDARD',
    kycStatus: 'APROVADO',
    contaBanco: '123456',
    contaPix: 'joao@teste.imobi.com',
  },
  {
    nome: 'Maria Santos (Gestor Obra)',
    email: 'maria.santos@teste.imobi.com',
    cpf: '12345678902',
    telefone: '11987654322',
    tipo: 'GESTOR_OBRA',
    tier: 'POWER',
    kycStatus: 'APROVADO',
  },
  {
    nome: 'Pedro Costa (Engenheiro)',
    email: 'pedro.costa@teste.imobi.com',
    cpf: '12345678903',
    telefone: '11987654323',
    tipo: 'ENGENHEIRO',
    tier: 'STANDARD',
    kycStatus: 'APROVADO',
  },
  {
    nome: 'Ana Oliveira (Comercial)',
    email: 'ana.oliveira@teste.imobi.com',
    cpf: '12345678904',
    telefone: '11987654324',
    tipo: 'COMERCIAL',
    tier: 'POWER',
    kycStatus: 'APROVADO',
  },
  {
    nome: 'Carlos Mendes (Gestor Fundo)',
    email: 'carlos.mendes@teste.imobi.com',
    cpf: '12345678905',
    telefone: '11987654325',
    tipo: 'GESTOR_FUNDO',
    tier: 'VIP',
    kycStatus: 'APROVADO',
  },
  {
    nome: 'Lucia Ferreira (Admin)',
    email: 'lucia.ferreira@teste.imobi.com',
    cpf: '12345678906',
    telefone: '11987654326',
    tipo: 'ADMIN',
    tier: 'VIP',
    kycStatus: 'APROVADO',
  },
  {
    nome: 'Roberto Alves (Tomador)',
    email: 'roberto.alves@teste.imobi.com',
    cpf: '12345678907',
    telefone: '11987654327',
    tipo: 'TOMADOR',
    tier: 'STANDARD',
    kycStatus: 'PENDENTE',
  },
  {
    nome: 'Fernanda Lima (Gestor)',
    email: 'fernanda.lima@teste.imobi.com',
    cpf: '12345678908',
    telefone: '11987654328',
    tipo: 'GESTOR',
    tier: 'POWER',
    kycStatus: 'APROVADO',
  },
  {
    nome: 'Gustavo Rocha (Construtor)',
    email: 'gustavo.rocha@teste.imobi.com',
    cpf: '12345678909',
    telefone: '11987654329',
    tipo: 'CONSTRUTOR',
    tier: 'STANDARD',
    kycStatus: 'APROVADO',
  },
  {
    nome: 'Helena Martins (Parceiro)',
    email: 'helena.martins@teste.imobi.com',
    cpf: '12345678910',
    telefone: '11987654330',
    tipo: 'PARCEIRO',
    tier: 'VIP',
    kycStatus: 'APROVADO',
  },
];

function generateInviteCode(): string {
  return crypto.randomBytes(16).toString('hex').toUpperCase();
}

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

async function seedBetaUsers() {
  console.log('🌱 Seeding beta users...\n');

  const createdUsers: Array<{ email: string; nome: string; inviteCode: string }> = [];

  for (const userConfig of BETA_USERS) {
    const betaExpireEm = new Date();
    betaExpireEm.setDate(betaExpireEm.getDate() + 30);

    try {
      const inviteCode = generateInviteCode();

      const usuario = await prisma.usuario.upsert({
        where: { email: userConfig.email },
        update: {
          betaTierLevel: userConfig.tier,
          kycStatus: userConfig.kycStatus,
          betaInviteCode: inviteCode,
          betaInvitedEm: new Date(),
          betaExpireEm,
        },
        create: {
          nome: userConfig.nome,
          email: userConfig.email,
          cpf: userConfig.cpf,
          telefone: userConfig.telefone,
          tipo: userConfig.tipo,
          passwordHash: hashPassword('Beta123!@#'), // Default test password
          betaTierLevel: userConfig.tier,
          betaInviteCode: inviteCode,
          betaInvitedEm: new Date(),
          betaExpireEm,
          kycStatus: userConfig.kycStatus,
          consentidoTermos: true,
          consentidoPrivacy: true,
          consentidoKyc: true,
          consentidoMarketing: true,
          contaBanco: userConfig.contaBanco || '999999',
          contaAgencia: '0001',
          contaNumero: '123456',
          contaTitular: userConfig.nome,
          contaPix: userConfig.contaPix || `${userConfig.email}`,
          feedbackOptIn: true,
        },
      });

      createdUsers.push({
        email: usuario.email,
        nome: usuario.nome,
        inviteCode: usuario.betaInviteCode!,
      });

      console.log(`✅ Created: ${usuario.nome}`);
      console.log(`   Email: ${usuario.email}`);
      console.log(`   Tier: ${usuario.betaTierLevel}`);
      console.log(`   Invite: ${usuario.betaInviteCode}\n`);
    } catch (error) {
      console.error(`❌ Failed to create ${userConfig.nome}:`, error);
    }
  }

  return createdUsers;
}

async function seedPipelineStages() {
  console.log('\n📊 Setting up pipeline stages...\n');

  const stages = [
    { nome: 'Contato Inicial', ordem: 1, taxaConversao: 0.3 },
    { nome: 'Proposta Enviada', ordem: 2, taxaConversao: 0.5 },
    { nome: 'Negociação', ordem: 3, taxaConversao: 0.7 },
    { nome: 'Aprovação KYC', ordem: 4, taxaConversao: 0.85 },
    { nome: 'Crédito Aprovado', ordem: 5, taxaConversao: 1.0 },
  ];

  for (const stage of stages) {
    try {
      const existing = await prisma.pipelineStage.findUnique({
        where: { nome: stage.nome },
      });

      if (!existing) {
        await prisma.pipelineStage.create({
          data: {
            nome: stage.nome,
            ordem: stage.ordem,
            descricao: `Stage: ${stage.nome}`,
            corHex: this.getColorForStage(stage.ordem),
            taxaConversao: stage.taxaConversao,
          },
        });

        console.log(`✅ Created pipeline stage: ${stage.nome}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create stage ${stage.nome}:`, error);
    }
  }
}

function getColorForStage(ordem: number): string {
  const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe'];
  return colors[ordem - 1] || '#999999';
}

async function seedSampleObraAndCredito() {
  console.log('\n🏗️ Seeding sample obra and crédito...\n');

  // Get first tomador user
  const tomador = await prisma.usuario.findFirst({
    where: { tipo: 'TOMADOR' },
  });

  if (!tomador) {
    console.log('⚠️ No tomador user found, skipping obras');
    return;
  }

  try {
    // Create credit
    const credito = await prisma.credito.create({
      data: {
        usuarioId: tomador.usuarioId,
        valorAprovado: 500000,
        valorLiberado: 0,
        taxaMensal: 0.0099,
        prazoMeses: 60,
      },
    });

    console.log(`✅ Created credit for ${tomador.nome}`);
    console.log(`   Credit ID: ${credito.creditoId}`);
    console.log(`   Amount: R$ ${credito.valorAprovado.toLocaleString('pt-BR')}`);

    // Create obra
    const obra = await prisma.obra.create({
      data: {
        creditoId: credito.creditoId,
        usuarioId: tomador.usuarioId,
        nome: 'Obra Beta de Teste - São Paulo',
        endereco: 'Av. Paulista, 1000 - São Paulo, SP',
        geoLatitude: -23.5505,
        geoLongitude: -46.6333,
        areaM2: 250,
        tipo: 'RESIDENCIAL',
        status: ObraStatus.AGUARDANDO_HOMOLOGACAO,
      },
    });

    console.log(`\n✅ Created obra: ${obra.nome}`);
    console.log(`   Obra ID: ${obra.obraId}`);
    console.log(`   Location: ${obra.endereco}`);
    console.log(`   Area: ${obra.areaM2}m²`);

    // Create etapas
    const etapas = [
      { nome: 'Fundação', ordem: 1, percentualObra: 10, valorLiberacao: 50000 },
      { nome: 'Estrutura', ordem: 2, percentualObra: 25, valorLiberacao: 125000 },
      { nome: 'Alvenaria', ordem: 3, percentualObra: 15, valorLiberacao: 75000 },
      { nome: 'Acabamento', ordem: 4, percentualObra: 30, valorLiberacao: 150000 },
      { nome: 'Finalização', ordem: 5, percentualObra: 20, valorLiberacao: 100000 },
    ];

    console.log('\n📋 Creating construction stages:');
    for (const etapaData of etapas) {
      const etapa = await prisma.etapaObra.create({
        data: {
          obraId: obra.obraId,
          ...etapaData,
          status: EtapaStatus.PLANEJADA,
        },
      });

      console.log(`   ✅ ${etapa.nome} - R$ ${etapa.valorLiberacao.toLocaleString('pt-BR')}`);
    }
  } catch (error) {
    console.error('❌ Failed to create obra/credito:', error);
  }
}

async function main() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 Imobi MVP - Beta Test Data Seeder');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const users = await seedBetaUsers();
    await seedPipelineStages();
    await seedSampleObraAndCredito();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Beta seed completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 TEST USERS CREATED:');
    users.forEach((user, idx) => {
      console.log(`\n${idx + 1}. ${user.nome}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: Beta123!@#`);
      console.log(`   Invite: ${user.inviteCode}`);
    });

    console.log('\n🔑 Common Test Credentials:');
    console.log(`   All passwords: Beta123!@#`);
    console.log(`   Default Stripe Test Card: 4242 4242 4242 4242`);
    console.log(`   Expiry: 12/25 | CVC: 123\n`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
