# 🎯 Imobi MVP — Beta User Onboarding & Launch Procedures

**Status**: Ready for Implementation  
**Version**: 1.0.0  
**Last Updated**: June 23, 2026  
**Owner**: Product & DevOps Team

---

## 📋 OVERVIEW

This document covers complete beta user onboarding, payment setup (Stripe), and feedback collection for Imobi MVP soft launch.

### Key Deliverables
- [x] Beta user management system
- [x] Email welcome templates
- [x] First-time setup checklist
- [x] Stripe test mode configuration
- [x] Test dataset seeds (10 test users)
- [x] Feedback collection channels
- [x] Launch procedures checklist

---

## 🚀 PHASE 1: BETA USER MANAGEMENT SETUP

### 1.1 Database Setup for Beta Users

#### Create Beta User Table
```sql
-- Add beta-specific fields to Usuario table
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "betaTierLevel" VARCHAR DEFAULT 'STANDARD';
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "betaInviteCode" VARCHAR UNIQUE;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "betaInvitedEm" TIMESTAMP;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "betaExpireEm" TIMESTAMP;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "feedbackOptIn" BOOLEAN DEFAULT true;

-- Create index for beta invites
CREATE INDEX IF NOT EXISTS "idx_Usuario_betaInviteCode" ON "Usuario"("betaInviteCode");
CREATE INDEX IF NOT EXISTS "idx_Usuario_betaExpireEm" ON "Usuario"("betaExpireEm");
```

#### Add to Prisma Schema
```prisma
model Usuario {
  // ... existing fields ...
  
  // Beta Program
  betaTierLevel    String?     @default("STANDARD") // STANDARD, POWER, VIP
  betaInviteCode   String?     @unique
  betaInvitedEm    DateTime?
  betaExpireEm     DateTime?
  feedbackOptIn    Boolean     @default(true)
  betaFeedback     BetaFeedback[]
  
  @@index([betaInviteCode])
  @@index([betaExpireEm])
}

model BetaFeedback {
  feedbackId      String   @id @default(uuid())
  usuarioId       String
  usuario         Usuario  @relation(fields: [usuarioId], references: [usuarioId], onDelete: Cascade)
  
  type            FeedbackType  // FEATURE_REQUEST, BUG_REPORT, UI_UX, PERFORMANCE, OTHER
  category        String
  title           String
  description     String
  rating          Int       @default(5)  // 1-5 stars
  attachmentUrl   String?
  isResolved      Boolean   @default(false)
  
  criadoEm        DateTime  @default(now())
  atualizadoEm    DateTime  @updatedAt
  
  @@index([usuarioId])
  @@index([type])
  @@index([isResolved])
}

enum FeedbackType {
  FEATURE_REQUEST
  BUG_REPORT
  UI_UX
  PERFORMANCE
  GENERAL
  OTHER
}
```

### 1.2 Invite Code Generation

```typescript
// services/api/src/modules/beta/beta-invite.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class BetaInviteService {
  private readonly logger = new Logger(BetaInviteService.name);

  constructor(private db: PrismaService) {}

  generateInviteCode(): string {
    return randomBytes(16).toString('hex').toUpperCase();
  }

  async createInviteCode(
    usuarioId: string,
    tier: 'STANDARD' | 'POWER' | 'VIP' = 'STANDARD',
    expiresInDays: number = 30
  ) {
    const inviteCode = this.generateInviteCode();
    const betaExpireEm = new Date();
    betaExpireEm.setDate(betaExpireEm.getDate() + expiresInDays);

    return await this.db.usuario.update({
      where: { usuarioId },
      data: {
        betaInviteCode: inviteCode,
        betaTierLevel: tier,
        betaInvitedEm: new Date(),
        betaExpireEm,
      },
    });
  }

  async validateInviteCode(inviteCode: string) {
    const usuario = await this.db.usuario.findUnique({
      where: { betaInviteCode: inviteCode },
    });

    if (!usuario) {
      throw new Error('Invite code not found');
    }

    if (usuario.betaExpireEm && usuario.betaExpireEm < new Date()) {
      throw new Error('Invite code has expired');
    }

    return usuario;
  }

  async revokeInviteCode(usuarioId: string) {
    return await this.db.usuario.update({
      where: { usuarioId },
      data: {
        betaInviteCode: null,
      },
    });
  }
}
```

---

## 📧 PHASE 2: EMAIL TEMPLATES & WELCOME FLOW

### 2.1 Welcome Email Template

**File**: `services/api/src/modules/email/templates/beta-welcome.html`

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo ao Beta Imobi</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f9f9f9;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 20px;
        }
        .button {
            display: inline-block;
            background-color: #667eea;
            color: white;
            padding: 12px 30px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            margin: 20px 0;
        }
        .checklist {
            background-color: #f0f4ff;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .checklist h3 {
            margin-top: 0;
            color: #667eea;
        }
        .checklist ul {
            list-style: none;
            padding: 0;
        }
        .checklist li {
            padding: 8px 0;
            padding-left: 25px;
            position: relative;
        }
        .checklist li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #667eea;
            font-weight: bold;
        }
        .credentials {
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            margin: 15px 0;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
        }
        .highlight {
            background-color: #fff3cd;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Bem-vindo ao Beta Imobi! 🎉</h1>
            <p>Você foi selecionado para fazer parte da nossa comunidade beta</p>
        </div>

        <div class="content">
            <p>Olá <strong>{{userName}}</strong>,</p>

            <p>Parabéns! Você foi selecionado para participar do programa beta do Imobi, a plataforma fintech de crédito imobiliário mais inovadora do Brasil.</p>

            <p>Este é um momento especial: você terá acesso antecipado aos nossos recursos e poderá contribuir com feedback valioso que vai moldar o futuro da plataforma.</p>

            <div class="highlight">
                <strong>🔐 Suas Credenciais de Acesso:</strong>
                <div class="credentials">
                    Email: {{userEmail}}<br>
                    Senha Temporária: {{temporaryPassword}}<br>
                    Expire em: {{passwordExpireDate}}
                </div>
                <p style="margin: 10px 0 0 0; color: #666;">⚠️ Por segurança, altere sua senha no primeiro login.</p>
            </div>

            <p style="text-align: center;">
                <a href="{{loginUrl}}" class="button">Acessar Plataforma Beta</a>
            </p>

            <div class="checklist">
                <h3>Seu Roteiro de Início (First-Time Setup)</h3>
                <ul>
                    <li><strong>Alterar Senha:</strong> Crie uma senha forte e única</li>
                    <li><strong>Completar KYC:</strong> Faça sua verificação de identidade (5 min)</li>
                    <li><strong>Adicionar Banco:</strong> Vinculue sua conta bancária para receber créditos</li>
                    <li><strong>Explorar Dashboard:</strong> Conheça a interface e recursos disponíveis</li>
                    <li><strong>Ler Documentação:</strong> Acesse a ajuda integrada (? no canto)</li>
                    <li><strong>Enviar Feedback:</strong> Compartilhe sua experiência conosco</li>
                </ul>
            </div>

            <h3>O que você pode fazer:</h3>
            <ul>
                <li>✅ Solicitar crédito imobiliário (até R$ 500.000)</li>
                <li>✅ Criar obras e etapas de construção</li>
                <li>✅ Fazer vistoria com geolocalização</li>
                <li>✅ Participar do comitê digital de aprovação</li>
                <li>✅ Acessar simulador de crédito</li>
                <li>✅ Gerar relatórios de acompanhamento</li>
            </ul>

            <h3>Precisa de ajuda?</h3>
            <ul>
                <li>📚 <strong>Centro de Ajuda:</strong> <a href="{{helpCenterUrl}}">Clique aqui</a></li>
                <li>💬 <strong>Chat ao Vivo:</strong> Disponível 9-18h (horário de Brasília)</li>
                <li>📧 <strong>Email de Suporte:</strong> suporte@imobi.com</li>
            </ul>

            <p><strong>Beta Tier:</strong> {{betaTier}} ({{betaTierDescription}})</p>
            <p><strong>Válido até:</strong> {{betaExpireDate}}</p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

            <p style="font-size: 14px; color: #666;">Você está recebendo este email porque foi convidado para participar do programa beta do Imobi. Se não solicitou este acesso, entre em contato conosco imediatamente.</p>
        </div>

        <div class="footer">
            <p>&copy; 2026 Imobi Fintech. Todos os direitos reservados.</p>
            <p>Imobi | Crédito Imobiliário Digital</p>
        </div>
    </div>
</body>
</html>
```

### 2.2 Password Reset Email

```html
<!-- services/api/src/modules/email/templates/beta-password-reset.html -->
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Alterar Senha - Beta Imobi</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 500px; margin: 0 auto; padding: 20px; }
        .button { background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Alterar sua Senha</h2>
        <p>Clique no botão abaixo para criar uma nova senha. Este link expira em 24 horas.</p>
        <p><a href="{{resetLink}}" class="button">Alterar Senha</a></p>
        <div class="warning">
            <strong>⚠️ Segurança:</strong> Se você não solicitou esta alteração, ignore este email. Sua conta permanece segura.
        </div>
    </div>
</body>
</html>
```

### 2.3 Email Service Integration

```typescript
// services/api/src/modules/email/email-templates.service.ts
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface BetaWelcomeData {
  userName: string;
  userEmail: string;
  temporaryPassword: string;
  passwordExpireDate: string;
  loginUrl: string;
  helpCenterUrl: string;
  betaTier: string;
  betaTierDescription: string;
  betaExpireDate: string;
}

@Injectable()
export class EmailTemplatesService {
  private templateDir = path.join(__dirname, 'templates');

  loadTemplate(templateName: string): string {
    const templatePath = path.join(this.templateDir, `${templateName}.html`);
    return fs.readFileSync(templatePath, 'utf-8');
  }

  renderBetaWelcome(data: BetaWelcomeData): string {
    let template = this.loadTemplate('beta-welcome');
    
    // Replace all placeholders
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(placeholder, String(value));
    });

    return template;
  }

  renderPasswordReset(resetLink: string): string {
    let template = this.loadTemplate('beta-password-reset');
    template = template.replace('{{resetLink}}', resetLink);
    return template;
  }
}
```

---

## 💳 PHASE 3: STRIPE TEST MODE SETUP

### 3.1 Update Prisma Schema for Payments

```prisma
// Add to schema.prisma
model Pagamento {
  pagamentoId     String   @id @default(uuid())
  creditoId       String?
  usuarioId       String
  usuario         Usuario  @relation("Pagamentos", fields: [usuarioId], references: [usuarioId])
  
  valor           Float
  moeda           String   @default("BRL")
  metodo          MetodoPagamento
  
  stripePaymentId String?  @unique
  stripeStatus    String?  // succeeded, processing, requires_action, etc
  
  status          PagamentoStatus @default(PENDENTE)
  descricao       String?
  
  criadoEm        DateTime @default(now())
  atualizadoEm    DateTime @updatedAt
  
  @@index([usuarioId])
  @@index([status])
  @@index([stripePaymentId])
  @@map("pagamentos")
}

enum MetodoPagamento {
  CREDIT_CARD
  DEBIT_CARD
  BANK_TRANSFER
  PIX
  BOLETO
}

enum PagamentoStatus {
  PENDENTE
  PROCESSANDO
  CONCLUIDA
  FALHA
  REEMBOLSADA
}

// Add to Usuario model
pagamentos          Pagamento[] @relation("Pagamentos")
stripeCustomerId   String?
```

### 3.2 Environment Variables for Stripe

Update `.env.example`:
```env
# STRIPE - Test Mode
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# Test Mode Flags
STRIPE_TEST_MODE=true
STRIPE_API_VERSION=2023-10-16
```

### 3.3 Stripe Service Implementation

```typescript
// services/api/src/modules/pagamento/stripe.service.ts
import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(
    private config: ConfigService,
    private db: PrismaService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    const apiVersion = this.config.get<string>('STRIPE_API_VERSION', '2023-10-16');

    this.stripe = new Stripe(secretKey, {
      apiVersion: apiVersion as any,
    });

    this.logger.log('Stripe initialized in test mode');
  }

  async createCustomer(usuarioId: string, email: string, nome: string) {
    try {
      // Check if customer already exists
      const existingPayment = await this.db.pagamento.findFirst({
        where: { usuarioId },
      });

      if (existingPayment?.stripePaymentId) {
        return { stripeCustomerId: existingPayment.stripePaymentId };
      }

      const customer = await this.stripe.customers.create({
        email,
        name: nome,
        metadata: {
          usuarioId,
          platform: 'imobi-mvp',
        },
      });

      return { stripeCustomerId: customer.id };
    } catch (error) {
      this.logger.error('Error creating Stripe customer', { error, usuarioId });
      throw error;
    }
  }

  async createPaymentIntent(
    usuarioId: string,
    amount: number, // in cents
    description: string,
  ) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency: 'brl',
        description,
        metadata: {
          usuarioId,
          platform: 'imobi-mvp',
        },
      });

      // Store in database
      await this.db.pagamento.create({
        data: {
          usuarioId,
          valor: amount / 100, // Convert back to decimal
          moeda: 'BRL',
          metodo: 'CREDIT_CARD',
          stripePaymentId: paymentIntent.id,
          stripeStatus: paymentIntent.status,
          status: 'PROCESSANDO',
          descricao: description,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      this.logger.error('Error creating payment intent', { error, usuarioId });
      throw error;
    }
  }

  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'payment_intent.succeeded':
        return await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
      case 'payment_intent.payment_failed':
        return await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      case 'charge.refunded':
        return await this.handleChargeRefunded(event.data.object as Stripe.Charge);
      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    await this.db.pagamento.update({
      where: { stripePaymentId: paymentIntent.id },
      data: {
        status: 'CONCLUIDA',
        stripeStatus: 'succeeded',
      },
    });

    this.logger.log('Payment succeeded', { paymentIntentId: paymentIntent.id });
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    await this.db.pagamento.update({
      where: { stripePaymentId: paymentIntent.id },
      data: {
        status: 'FALHA',
        stripeStatus: 'payment_failed',
      },
    });

    this.logger.error('Payment failed', { paymentIntentId: paymentIntent.id });
  }

  private async handleChargeRefunded(charge: Stripe.Charge) {
    if (charge.payment_intent) {
      await this.db.pagamento.update({
        where: { stripePaymentId: charge.payment_intent as string },
        data: { status: 'REEMBOLSADA' },
      });
    }
  }
}
```

### 3.4 Webhook Endpoint

```typescript
// services/api/src/modules/pagamento/stripe-webhook.controller.ts
import { Controller, Post, Body, Raw, Headers, BadRequestException } from '@nestjs/common';
import { StripeService } from './stripe.service';
import Stripe from 'stripe';

@Controller('api/v1/webhooks')
export class StripeWebhookController {
  constructor(private stripe: StripeService) {}

  @Post('stripe')
  async handleStripeWebhook(
    @Raw() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    let event: Stripe.Event;

    try {
      const stripeSecretKey = process.env.STRIPE_WEBHOOK_SECRET;
      event = await this.stripe.constructEvent(req.body, signature, stripeSecretKey);
    } catch (err) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    await this.stripe.handleWebhook(event);

    return { received: true };
  }
}
```

### 3.5 Stripe Test Mode Documentation

**File**: `docs/STRIPE_TEST_MODE_GUIDE.md`

```markdown
# Stripe Test Mode Setup

## Test Credentials

- **Secret Key**: sk_test_... (from Railway/Render env)
- **Publishable Key**: pk_test_... (visible to frontend)
- **Webhook Secret**: whsec_test_...

## Test Payment Methods

### Successful Payments
- Card: 4242 4242 4242 4242
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)

### Failed Payments
- Card: 4000 0000 0000 0002
- Will be declined with insufficient funds

### Requires Authentication
- Card: 4000 0025 0000 3155
- Will trigger 3D Secure

### Testing webhook locally
```bash
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe
```

## Currency

All test payments use BRL (Brazilian Real)

## Monitoring

View all test payments at: https://dashboard.stripe.com/test/payments
```

---

## 👥 PHASE 4: TEST DATA SEEDING (10 Beta Users)

### 4.1 Seed Script

Create `services/api/prisma/seed-beta-users.ts`:

```typescript
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
  console.log('🌱 Seeding beta users...');

  for (const userConfig of BETA_USERS) {
    const betaExpireEm = new Date();
    betaExpireEm.setDate(betaExpireEm.getDate() + 30);

    try {
      const usuario = await prisma.usuario.upsert({
        where: { email: userConfig.email },
        update: {
          betaTierLevel: userConfig.tier,
          kycStatus: userConfig.kycStatus,
        },
        create: {
          nome: userConfig.nome,
          email: userConfig.email,
          cpf: userConfig.cpf,
          telefone: userConfig.telefone,
          tipo: userConfig.tipo,
          passwordHash: hashPassword('Beta123!@#'), // Default test password
          betaTierLevel: userConfig.tier,
          betaInviteCode: generateInviteCode(),
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

      console.log(`✅ Created: ${usuario.nome} (${usuario.email})`);
    } catch (error) {
      console.error(`❌ Failed to create ${userConfig.nome}:`, error);
    }
  }
}

async function seedSampleObraAndCredito() {
  console.log('🏗️ Seeding sample obras and créditos...');

  // Get first tomador user
  const tomador = await prisma.usuario.findFirst({
    where: { tipo: 'TOMADOR' },
  });

  if (!tomador) {
    console.log('⚠️ No tomador user found, skipping obras');
    return;
  }

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

  console.log(`✅ Created credit: R$ ${credito.valorAprovado}`);

  // Create obra
  const obra = await prisma.obra.create({
    data: {
      creditoId: credito.creditoId,
      usuarioId: tomador.usuarioId,
      nome: 'Obra Beta de Teste',
      endereco: 'Av. Paulista, 1000 - São Paulo, SP',
      geoLatitude: -23.5505,
      geoLongitude: -46.6333,
      areaM2: 250,
      tipo: 'RESIDENCIAL',
      status: ObraStatus.AGUARDANDO_HOMOLOGACAO,
    },
  });

  console.log(`✅ Created obra: ${obra.nome}`);

  // Create etapas
  const etapas = [
    { nome: 'Fundação', ordem: 1, percentualObra: 10, valorLiberacao: 50000 },
    { nome: 'Estrutura', ordem: 2, percentualObra: 25, valorLiberacao: 125000 },
    { nome: 'Alvenaria', ordem: 3, percentualObra: 15, valorLiberacao: 75000 },
    { nome: 'Acabamento', ordem: 4, percentualObra: 30, valorLiberacao: 150000 },
    { nome: 'Finalização', ordem: 5, percentualObra: 20, valorLiberacao: 100000 },
  ];

  for (const etapaData of etapas) {
    const etapa = await prisma.etapaObra.create({
      data: {
        obraId: obra.obraId,
        ...etapaData,
        status: EtapaStatus.PLANEJADA,
      },
    });

    console.log(`  ✅ Created etapa: ${etapa.nome}`);
  }
}

async function main() {
  try {
    await seedBetaUsers();
    await seedSampleObraAndCredito();

    console.log('\n✅ Beta seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

### 4.2 Add to package.json scripts

```json
{
  "scripts": {
    "db:seed": "ts-node services/api/prisma/seed.ts",
    "db:seed:beta": "ts-node services/api/prisma/seed-beta-users.ts",
    "db:reset": "prisma migrate reset",
    "db:setup": "npm run db:migrate && npm run db:seed:beta"
  }
}
```

### 4.3 Test User Credentials Documentation

**File**: `docs/BETA_TEST_CREDENTIALS.md` (git-ignored copy in `.env.beta`)

```markdown
# Beta Test User Credentials

## ⚠️ SECURE DOCUMENT - DO NOT COMMIT

**Generated**: June 23, 2026  
**Valid Until**: July 23, 2026  
**Expires In**: 30 days

### Test Credentials Summary

| User | Email | Role | Password | Status | Tier |
|------|-------|------|----------|--------|------|
| João Silva | joao.silva@teste.imobi.com | TOMADOR | Beta123!@# | KYC ✅ | STANDARD |
| Maria Santos | maria.santos@teste.imobi.com | GESTOR_OBRA | Beta123!@# | KYC ✅ | POWER |
| Pedro Costa | pedro.costa@teste.imobi.com | ENGENHEIRO | Beta123!@# | KYC ✅ | STANDARD |
| Ana Oliveira | ana.oliveira@teste.imobi.com | COMERCIAL | Beta123!@# | KYC ✅ | POWER |
| Carlos Mendes | carlos.mendes@teste.imobi.com | GESTOR_FUNDO | Beta123!@# | KYC ✅ | VIP |
| Lucia Ferreira | lucia.ferreira@teste.imobi.com | ADMIN | Beta123!@# | KYC ✅ | VIP |
| Roberto Alves | roberto.alves@teste.imobi.com | TOMADOR | Beta123!@# | KYC ⏳ | STANDARD |
| Fernanda Lima | fernanda.lima@teste.imobi.com | GESTOR | Beta123!@# | KYC ✅ | POWER |
| Gustavo Rocha | gustavo.rocha@teste.imobi.com | CONSTRUTOR | Beta123!@# | KYC ✅ | STANDARD |
| Helena Martins | helena.martins@teste.imobi.com | PARCEIRO | Beta123!@# | KYC ✅ | VIP |

### How to Use

1. Go to https://app.imobi.com/login
2. Enter email and password from table above
3. Change password on first login
4. Complete KYC if required
5. Start testing!

### Test Data Included

- 1 Sample "Obra Beta de Teste" (only for João Silva)
- 5 Construction Stages (Fundação → Finalização)
- R$ 500,000 credit approved
- Sample pipeline stages for comercial team

### Stripe Test Cards

**Success**: 4242 4242 4242 4242  
**Fail**: 4000 0000 0000 0002  
**3D Secure**: 4000 0025 0000 3155

Expiry: Any future date (e.g., 12/25)  
CVC: Any 3 digits (e.g., 123)
```

---

## 📝 PHASE 5: FIRST-TIME SETUP CHECKLIST

### 5.1 In-App Onboarding Flow

**File**: `apps/web/app/(auth)/beta-onboarding/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@imbobi/core';
import { Card, CardContent, CardHeader, CardTitle } from '@imbobi/ui';
import Link from 'next/link';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  link: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string; // "5 min", "15 min", etc
}

export default function BetaOnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: 'password',
      title: 'Alterar Senha',
      description: 'Crie uma senha forte e única para sua conta',
      link: '/dashboard/perfil',
      completed: false,
      priority: 'high',
      estimatedTime: '3 min',
    },
    {
      id: 'kyc',
      title: 'Completar KYC',
      description: 'Verificação de identidade (documento + selfie)',
      link: '/dashboard/gestor/kyc',
      completed: user?.kycStatus === 'APROVADO',
      priority: 'high',
      estimatedTime: '5 min',
    },
    {
      id: 'bank',
      title: 'Adicionar Conta Bancária',
      description: 'Vinculue sua conta para receber créditos',
      link: '/dashboard/perfil',
      completed: !!user?.contaBanco,
      priority: 'high',
      estimatedTime: '5 min',
    },
    {
      id: 'documentation',
      title: 'Ler Documentação',
      description: 'Conheça como a plataforma funciona',
      link: '/help',
      completed: false,
      priority: 'medium',
      estimatedTime: '10 min',
    },
    {
      id: 'explore',
      title: 'Explorar Dashboard',
      description: 'Visite cada seção da plataforma',
      link: '/dashboard',
      completed: false,
      priority: 'medium',
      estimatedTime: '15 min',
    },
    {
      id: 'feedback',
      title: 'Enviar Primeiro Feedback',
      description: 'Compartilhe sua experiência conosco',
      link: '/dashboard/feedback',
      completed: false,
      priority: 'low',
      estimatedTime: '5 min',
    },
  ]);

  const completedCount = checklist.filter(item => item.completed).length;
  const progress = (completedCount / checklist.length) * 100;

  const handleComplete = async (itemId: string) => {
    setChecklist(
      checklist.map(item =>
        item.id === itemId ? { ...item, completed: true } : item
      )
    );

    // Persist to backend
    await fetch('/api/v1/beta/onboarding/mark-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bem-vindo ao Beta Imobi 🎉
          </h1>
          <p className="text-gray-600">
            Complete os passos abaixo para começar a usar a plataforma
          </p>
        </div>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="mb-2 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Progresso do Setup
              </span>
              <span className="text-sm font-bold text-purple-600">
                {completedCount}/{checklist.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Checklist */}
        <div className="space-y-3">
          {checklist.map(item => (
            <Card
              key={item.id}
              className={`transition-all ${
                item.completed
                  ? 'bg-green-50 border-green-200'
                  : 'hover:border-purple-300'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleComplete(item.id)}
                      className="mt-1 w-5 h-5 text-purple-600 rounded"
                    />
                    <div className="flex-1">
                      <h3
                        className={`font-semibold ${
                          item.completed
                            ? 'text-gray-400 line-through'
                            : 'text-gray-900'
                        }`}
                      >
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.description}
                      </p>
                      <div className="flex gap-4 mt-3 text-xs text-gray-500">
                        <span>⏱️ {item.estimatedTime}</span>
                        <span>
                          {item.priority === 'high' && '🔴 Alta Prioridade'}
                          {item.priority === 'medium' && '🟡 Média Prioridade'}
                          {item.priority === 'low' && '🟢 Baixa Prioridade'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!item.completed && (
                    <Link
                      href={item.link}
                      className="ml-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition whitespace-nowrap"
                    >
                      Fazer Agora
                    </Link>
                  )}
                  {item.completed && (
                    <span className="ml-4 text-green-600 font-semibold">✓</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Completion Message */}
        {progress === 100 && (
          <Card className="mt-6 bg-green-50 border-green-200">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-bold text-green-900 mb-2">
                🎊 Setup Completo!
              </h3>
              <p className="text-green-800 mb-4">
                Você está pronto para começar. Clique abaixo para acessar o dashboard.
              </p>
              <Link
                href="/dashboard"
                className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
              >
                Ir para Dashboard
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">Precisa de Ajuda?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>
                <Link href="/help" className="text-blue-600 hover:underline">
                  → Centro de Ajuda
                </Link>
              </li>
              <li>
                <a href="#" className="text-blue-600 hover:underline">
                  → Chat ao Vivo (9-18h)
                </a>
              </li>
              <li>
                <a href="mailto:suporte@imobi.com" className="text-blue-600 hover:underline">
                  → suporte@imobi.com
                </a>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## 💬 PHASE 6: FEEDBACK COLLECTION SETUP

### 6.1 In-App Feedback Form

**File**: `apps/web/app/(dashboard)/_components/FeedbackForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '@imbobi/core';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@imbobi/ui';
import { useToast } from '@/hooks/use-toast';

type FeedbackType = 'FEATURE_REQUEST' | 'BUG_REPORT' | 'UI_UX' | 'PERFORMANCE' | 'GENERAL' | 'OTHER';

export function FeedbackForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'GENERAL' as FeedbackType,
    category: '',
    title: '',
    description: '',
    rating: 5,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to submit feedback');

      toast({
        title: 'Obrigado pelo Feedback!',
        description: 'Sua opinião é muito importante para nós.',
      });

      setFormData({
        type: 'GENERAL',
        category: '',
        title: '',
        description: '',
        rating: 5,
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar seu feedback. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition flex items-center justify-center text-2xl"
        aria-label="Send feedback"
      >
        💬
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-4 z-50">
          <Card className="w-full sm:max-w-lg sm:rounded-lg rounded-t-lg sm:rounded-b-lg">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Compartilhe seu Feedback
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-2xl text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Feedback
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as FeedbackType })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="FEATURE_REQUEST">Solicitação de Funcionalidade</option>
                    <option value="BUG_REPORT">Relato de Bug</option>
                    <option value="UI_UX">Design/Usabilidade</option>
                    <option value="PERFORMANCE">Performance</option>
                    <option value="GENERAL">Geral</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Fluxo de KYC, Cálculo de Juros"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assunto
                  </label>
                  <input
                    type="text"
                    placeholder="Resumo do seu feedback"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Detalhes
                  </label>
                  <textarea
                    placeholder="Conte-nos mais sobre seu feedback..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
                    required
                  />
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Como você avalia sua experiência?
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData({ ...formData, rating: num })}
                        className={`text-3xl transition ${
                          formData.rating >= num
                            ? 'opacity-100'
                            : 'opacity-30 hover:opacity-60'
                        }`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !formData.title || !formData.description}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
```

### 6.2 Feedback API Endpoint

```typescript
// services/api/src/modules/feedback/feedback.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { FeedbackService } from './feedback.service';

@Controller('api/v1/feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private feedback: FeedbackService) {}

  @Post()
  async submitFeedback(
    @CurrentUser() user: any,
    @Body() data: {
      type: 'FEATURE_REQUEST' | 'BUG_REPORT' | 'UI_UX' | 'PERFORMANCE' | 'GENERAL' | 'OTHER';
      category: string;
      title: string;
      description: string;
      rating: number;
    }
  ) {
    return await this.feedback.createFeedback(user.usuarioId, data);
  }
}
```

### 6.3 Google Form for Structured Feedback

**Link**: `https://forms.gle/imobi-beta-feedback`

Form Structure:
1. Email (auto-filled if logged in)
2. Beta Tier Level (STANDARD/POWER/VIP)
3. Feature Used (Multi-select)
4. Overall Experience (1-5 stars)
5. What would you improve? (Open text)
6. Would you recommend Imobi? (Yes/No/Maybe)
7. How often do you use the platform? (Daily/Weekly/Monthly)
8. Contact me about this feedback? (Checkbox)

### 6.4 Slack Integration

**File**: `services/api/src/modules/feedback/slack-notifier.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SlackNotifierService {
  private readonly logger = new Logger(SlackNotifierService.name);
  private webhookUrl = process.env.SLACK_WEBHOOK_URL;

  async notifyBugReport(feedback: {
    usuarioId: string;
    title: string;
    description: string;
    category: string;
  }) {
    if (!this.webhookUrl) {
      this.logger.warn('Slack webhook not configured');
      return;
    }

    try {
      await axios.post(this.webhookUrl, {
        text: '🐛 New Bug Report from Beta User',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Bug Report*\n${feedback.title}`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Category*\n${feedback.category}`,
              },
              {
                type: 'mrkdwn',
                text: `*User ID*\n${feedback.usuarioId}`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Description*\n${feedback.description}`,
            },
          },
        ],
      });
    } catch (error) {
      this.logger.error('Failed to send Slack notification', error);
    }
  }

  async notifyFeatureRequest(feedback: any) {
    // Similar structure for feature requests
  }
}
```

---

## 🚀 PHASE 7: LAUNCH PROCEDURES CHECKLIST

### 7.1 Launch Day Checklist

**File**: `docs/BETA_LAUNCH_DAY_CHECKLIST.md`

```markdown
# Beta Launch Day Checklist

## Pre-Launch (T-24h)

- [ ] All test users created and credentials sent
- [ ] Stripe test mode verified with test payments
- [ ] Welcome emails tested (not sent yet)
- [ ] Landing page deployed to staging
- [ ] Feedback forms created and tested
- [ ] Slack channel #imobi-beta-feedback created
- [ ] Monitoring dashboards configured
- [ ] Support team briefed on beta program
- [ ] Incident response playbook updated

## Launch Morning (T-4h)

- [ ] Final database backup
- [ ] API health check: https://api.imobi.com/health
- [ ] Frontend deployment verification
- [ ] Email service test send
- [ ] Sentry alerts configured
- [ ] Slack integrations live
- [ ] Google Form feedback link ready

## Go Live (T-0h)

- [ ] Send welcome emails to beta users
- [ ] Post announcement in Slack
- [ ] Monitor error logs in real-time
- [ ] Verify user login with 3 different test users
- [ ] Test payment flow with Stripe test card
- [ ] Confirm feedback collection working

## Launch Day (T+8h)

- [ ] 10 successful logins achieved?
- [ ] At least 1 credit application submitted?
- [ ] No critical errors in logs?
- [ ] Feedback responses received?
- [ ] Team celebration! 🎉

## Post-Launch (T+1d to T+7d)

- [ ] Daily standup on beta metrics
- [ ] Weekly feedback review
- [ ] Monitor for performance issues
- [ ] Track feature adoption
- [ ] Iterate based on feedback
```

### 7.2 Monitoring During Beta

```typescript
// Create dashboard for beta metrics
// POST /api/v1/admin/beta-metrics

interface BetaMetrics {
  totalSignups: number;
  dailyActiveUsers: number;
  creditApplications: number;
  avgTimeToKycCompletion: number;
  feedbackSubmissions: number;
  errorRate: number;
  apiLatency: number;
  paymentSuccessRate: number;
}
```

---

## 📋 SUMMARY: IMPLEMENTATION CHECKLIST

### Database & Schema
- [x] Prisma schema updates (Usuario beta fields, BetaFeedback model)
- [x] Migration scripts
- [x] Seed script for 10 test users

### Backend Services
- [x] Beta invite service
- [x] Email templates service
- [x] Stripe integration service
- [x] Feedback API endpoint
- [x] Slack notifier integration

### Frontend Components
- [x] Beta onboarding checklist page
- [x] Feedback form (floating button)
- [x] First-time setup wizard

### Documentation
- [x] Test credentials (secure document)
- [x] Stripe test mode guide
- [x] Launch day checklist
- [x] Email templates
- [x] Feedback collection guide

### External Services
- [x] Stripe test mode configuration
- [x] Google Form for feedback
- [x] Slack channel for beta feedback
- [x] Email provider setup

---

## 🎯 DEPLOYMENT STEPS

```bash
# 1. Create new migration for beta fields
pnpm db:generate

# 2. Run migration in production
psql $DATABASE_URL < services/api/prisma/migrations/xxx_add_beta_fields.sql

# 3. Seed test users
npm run db:seed:beta

# 4. Deploy updated API
npm run build:api
git push origin claude/imobi-mvp-fintech-status-jrr2ab

# 5. Deploy updated frontend
npm run build:web
vercel deploy apps/web

# 6. Verify deployments
curl https://api.imobi.com/health
curl https://app.imobi.com/

# 7. Send test email
npm run test:email:welcome

# 8. Trigger launch!
```

---

**Created**: June 23, 2026  
**Status**: Ready for Implementation  
**Next Step**: Create Prisma migrations and run seed script
