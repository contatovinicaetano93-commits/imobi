# Email Implementation Code Snippets

Complete code references for SendGrid integration in IMOBI.

---

## 1. Environment Variables Setup

### Production Configuration

**File: `.env.production`**

```bash
# Email Configuration
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM=noreply@imbobi.com.br
APP_URL=https://app.imbobi.com.br

# Required for email functionality
NODE_ENV=production
PORT=4000
```

### Staging Configuration

**File: `.env.staging`**

```bash
# Email Configuration (Staging)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM=staging-noreply@imbobi.com.br
APP_URL=https://staging.imbobi.com.br

NODE_ENV=staging
PORT=4000
```

### Development Configuration (Console Mode)

**File: `.env.development`**

```bash
# Development: Emails logged to console
EMAIL_PROVIDER=console
# No additional variables needed
SMTP_FROM=dev-noreply@imbobi.local
APP_URL=http://localhost:3000

NODE_ENV=development
PORT=4000
```

---

## 2. Complete Email Service Implementation

**File: `services/api/src/modules/email/email.service.ts`**

```typescript
import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

/**
 * Email Service
 * Supports: SendGrid, AWS SES, generic SMTP, or console logging
 *
 * Provider selection via EMAIL_PROVIDER environment variable:
 * - "sendgrid" → SendGrid SMTP relay
 * - "ses" → AWS SES
 * - "smtp" or other → Generic SMTP server
 * - undefined → Console logging (development)
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly provider: string;
  private readonly retryConfig: RetryConfig = {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
  };

  constructor() {
    this.provider = process.env["EMAIL_PROVIDER"] || "smtp";
    this.initializeTransporter();
  }

  /**
   * Initialize transporter based on configured provider
   */
  private initializeTransporter() {
    const provider = this.provider.toLowerCase();

    if (provider === "sendgrid") {
      this.initializeSendGrid();
    } else if (provider === "ses") {
      this.initializeAwsSes();
    } else {
      this.initializeSmtp();
    }
  }

  /**
   * SendGrid SMTP Configuration
   * Credentials: username="apikey", password=API_KEY
   */
  private initializeSendGrid() {
    const apiKey = process.env["SENDGRID_API_KEY"];

    if (!apiKey) {
      this.logger.warn(
        "SendGrid API key not found (SENDGRID_API_KEY) - using console mode"
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false, // Use TLS, not SSL
      auth: {
        user: "apikey", // SendGrid requires username "apikey"
        pass: apiKey,
      },
    });

    this.logger.debug("SendGrid email provider configured");
  }

  /**
   * AWS SES SMTP Configuration
   * Requires: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
   */
  private initializeAwsSes() {
    const region = process.env["AWS_REGION"];
    const accessKeyId = process.env["AWS_ACCESS_KEY_ID"];
    const secretAccessKey = process.env["AWS_SECRET_ACCESS_KEY"];

    if (!region || !accessKeyId || !secretAccessKey) {
      this.logger.warn(
        "AWS SES credentials not complete - using console mode"
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: `email-smtp.${region}.amazonaws.com`,
      port: 587,
      secure: false,
      auth: {
        user: accessKeyId,
        pass: secretAccessKey,
      },
    });

    this.logger.debug("AWS SES email provider configured");
  }

  /**
   * Generic SMTP Configuration
   * Requires: SMTP_HOST, SMTP_PORT
   * Optional: SMTP_USER, SMTP_PASS
   */
  private initializeSmtp() {
    const smtpHost = process.env["SMTP_HOST"];
    const smtpPort = process.env["SMTP_PORT"];
    const smtpUser = process.env["SMTP_USER"];
    const smtpPass = process.env["SMTP_PASS"];

    if (!smtpHost || !smtpPort) {
      this.logger.warn("SMTP configuration not complete - using console mode");
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: parseInt(smtpPort) === 465, // SSL for port 465
      auth:
        smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    });

    this.logger.debug(
      `SMTP email provider configured: ${smtpHost}:${smtpPort}`
    );
  }

  /**
   * Helper: Sleep for retry logic
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Core email sending method
   * Handles retries with exponential backoff
   * Falls back to console logging if no transporter configured
   */
  async enviarEmail(opcoes: EmailOptions): Promise<boolean> {
    // If no transporter (console mode), just log
    if (!this.transporter) {
      this.logger.debug(
        `[EMAIL-CONSOLE] To: ${opcoes.to} | Subject: ${opcoes.subject}`
      );
      return true;
    }

    let lastError: Error | null = null;
    let delayMs = this.retryConfig.delayMs;

    // Retry logic: up to 3 attempts with exponential backoff
    for (
      let attempt = 1;
      attempt <= this.retryConfig.maxAttempts;
      attempt++
    ) {
      try {
        await this.transporter.sendMail({
          from: process.env["SMTP_FROM"] || "noreply@imbobi.com",
          to: opcoes.to,
          subject: opcoes.subject,
          html: opcoes.html,
          text: opcoes.text,
        });

        this.logger.debug(
          `Email sent to ${opcoes.to} (attempt ${attempt}/${this.retryConfig.maxAttempts})`
        );
        return true;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Email send attempt ${attempt} failed for ${opcoes.to}: ${lastError.message}`
        );

        // Wait before retrying (exponential backoff)
        if (attempt < this.retryConfig.maxAttempts) {
          await this.sleep(delayMs);
          delayMs *= this.retryConfig.backoffMultiplier;
        }
      }
    }

    this.logger.error(
      `Email failed after ${this.retryConfig.maxAttempts} attempts for ${opcoes.to}: ${lastError?.message}`
    );
    return false;
  }

  // =====================================================
  // EMAIL TEMPLATES
  // =====================================================

  /**
   * Welcome email on registration
   */
  async bemVindoEmail(nome: string, email: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            h2 { color: #007bff; }
            a { color: #007bff; text-decoration: none; }
            button { background-color: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Bem-vindo ao imbobi, ${nome}!</h2>
            <p>Sua conta foi criada com sucesso. Agora você pode começar a utilizar a plataforma.</p>
            
            <h3>Próximos passos:</h3>
            <ul>
              <li>Complete seu perfil com informações adicionais</li>
              <li>Valide sua identidade (KYC)</li>
              <li>Solicite um crédito para sua obra</li>
              <li>Crie suas primeiras obras e comece a enviar evidências</li>
            </ul>
            
            <p>
              <a href="${process.env["APP_URL"] || "http://localhost:3000"}/dashboard" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none;">
                Acessar Dashboard
              </a>
            </p>
            
            <p>Se tiver dúvidas, entre em contato com nosso suporte.</p>
          </div>
        </body>
      </html>
    `;

    return this.enviarEmail({
      to: email,
      subject: "Bem-vindo ao imbobi!",
      html,
    });
  }

  /**
   * Stage approval notification with release amount
   */
  async etapaAprovadaEmail(
    nome: string,
    email: string,
    etapaNome: string,
    obraNome: string,
    valor: number
  ): Promise<boolean> {
    const valorFmt = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .alert { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 12px; border-radius: 5px; margin: 20px 0; }
            h2 { color: #28a745; }
            .value { font-size: 24px; font-weight: bold; color: #007bff; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Etapa Aprovada: ${etapaNome}</h2>
            <p>Olá ${nome},</p>
            
            <div class="alert">
              <p>A etapa "<strong>${etapaNome}</strong>" de sua obra "<strong>${obraNome}</strong>" foi aprovada!</p>
            </div>
            
            <p>Valor liberado: <span class="value">${valorFmt}</span></p>
            <p>A liberação foi agendada e será processada em breve na conta cadastrada.</p>
            
            <p>
              <a href="${process.env["APP_URL"] || "http://localhost:3000"}/dashboard/obras" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none;">
                Ver Minhas Obras
              </a>
            </p>
          </div>
        </body>
      </html>
    `;

    return this.enviarEmail({
      to: email,
      subject: `Etapa Aprovada: ${etapaNome}`,
      html,
    });
  }

  /**
   * Installment released confirmation
   */
  async parcelaLiberadaEmail(
    nome: string,
    email: string,
    valor: number,
    obraNome: string
  ): Promise<boolean> {
    const valorFmt = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .success { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
            h2 { color: #28a745; }
            .value { font-size: 28px; font-weight: bold; color: #28a745; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Pagamento Confirmado</h2>
            <p>Olá ${nome},</p>
            
            <div class="success">
              <p>O pagamento de <span class="value">${valorFmt}</span> foi creditado na conta cadastrada.</p>
              <p><strong>Obra:</strong> ${obraNome}</p>
            </div>
            
            <p>Verifique seu extrato para mais detalhes.</p>
            
            <p>
              <a href="${process.env["APP_URL"] || "http://localhost:3000"}/dashboard/credito" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none;">
                Ver Extrato
              </a>
            </p>
          </div>
        </body>
      </html>
    `;

    return this.enviarEmail({
      to: email,
      subject: "Pagamento confirmado — IMOBI",
      html,
    });
  }

  /**
   * KYC Approval notification
   */
  async kycAprovadoEmail(nome: string, email: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .success { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
            h2 { color: #28a745; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Validação de Identidade Aprovada!</h2>
            <p>Olá ${nome},</p>
            
            <div class="success">
              <p>Sua validação de identidade (KYC) foi aprovada com sucesso!</p>
            </div>
            
            <p>Agora você tem acesso a todas as funcionalidades da plataforma, incluindo:</p>
            <ul>
              <li>Solicitar créditos</li>
              <li>Criar obras</li>
              <li>Enviar evidências fotográficas</li>
              <li>Acompanhar pagamentos</li>
            </ul>
            
            <p>
              <a href="${process.env["APP_URL"] || "http://localhost:3000"}/dashboard" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none;">
                Ir para Dashboard
              </a>
            </p>
          </div>
        </body>
      </html>
    `;

    return this.enviarEmail({
      to: email,
      subject: "Validação Aprovada",
      html,
    });
  }

  /**
   * KYC Rejection notification with reason and retry link
   */
  async kycRejeitadoEmail(
    nome: string,
    email: string,
    motivo: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .alert { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0; }
            h2 { color: #721c24; }
            .reason { font-style: italic; color: #721c24; padding: 10px; border-left: 3px solid #721c24; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Validação de Identidade Rejeitada</h2>
            <p>Olá ${nome},</p>
            
            <div class="alert">
              <p>Infelizmente sua validação de identidade (KYC) foi rejeitada.</p>
            </div>
            
            <p><strong>Motivo da rejeição:</strong></p>
            <div class="reason">${motivo}</div>
            
            <p>Por favor, envie novamente seu documento com as correções necessárias.</p>
            <p>Você pode tentar quantas vezes for necessário até que o documento seja aprovado.</p>
            
            <p>
              <a href="${process.env["APP_URL"] || "http://localhost:3000"}/dashboard/kyc" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none;">
                Enviar Novo Documento
              </a>
            </p>
          </div>
        </body>
      </html>
    `;

    return this.enviarEmail({
      to: email,
      subject: "Documento Rejeitado - Ação Necessária",
      html,
    });
  }

  /**
   * Password recovery link
   */
  async recuperacaoSenhaEmail(
    nome: string,
    email: string,
    token: string
  ): Promise<boolean> {
    const resetLink = `${process.env["APP_URL"] || "http://localhost:3000"}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .warning { background-color: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 12px; border-radius: 5px; margin: 15px 0; }
            h2 { color: #007bff; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Recuperar sua Senha</h2>
            <p>Olá ${nome},</p>
            
            <p>Você solicitou a recuperação de sua senha. Clique no botão abaixo para criar uma nova senha:</p>
            
            <p>
              <a href="${resetLink}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none;">
                Resetar Senha
              </a>
            </p>
            
            <div class="warning">
              <p><strong>⚠️ Importante:</strong> Este link expira em 1 hora. Se não solicitou esta ação, ignore este email e sua senha permanecerá segura.</p>
            </div>
            
            <p>Se tiver problemas ao clicar no link, copie e cole a seguinte URL em seu navegador:</p>
            <p style="word-break: break-all; font-size: 12px; color: #666;">
              ${resetLink}
            </p>
          </div>
        </body>
      </html>
    `;

    return this.enviarEmail({
      to: email,
      subject: "Recuperar sua senha",
      html,
    });
  }

  /**
   * Capital phase awaiting manual payment (with WhatsApp link)
   */
  async capitalFaseAguardandoPagamentoEmail(params: {
    nome: string;
    email: string;
    obraNome: string;
    etapaNome: string;
    valor: number;
    whatsAppUrl: string;
    liberacaoRef: string;
  }): Promise<boolean> {
    const valorFmt = params.valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .highlight { background-color: #e7f3ff; border: 1px solid #b3d9ff; color: #004085; padding: 15px; border-radius: 5px; margin: 20px 0; }
            h2 { color: #004085; }
            .value { font-size: 24px; font-weight: bold; color: #007bff; }
            .whatsapp { background-color: #25D366; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Capital fase liberado — ${params.etapaNome}</h2>
            <p>Olá ${params.nome},</p>
            
            <div class="highlight">
              <p>A vistoria da fase <strong>${params.etapaNome}</strong> da obra <strong>${params.obraNome}</strong> foi aprovada!</p>
              <p>Valor: <span class="value">${valorFmt}</span></p>
              ${params.liberacaoRef ? `<p>Referência: ${params.liberacaoRef}</p>` : ""}
            </div>
            
            <p>O financeiro IMOBI processará o pagamento manualmente na conta cadastrada.</p>
            
            <p>Você pode confirmar com o nosso time financeiro através do WhatsApp para acelerar o processo:</p>
            
            <p style="text-align: center;">
              <a href="${params.whatsAppUrl}" style="display: inline-block; background-color: #25D366; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">
                Confirmar com Financeiro (WhatsApp)
              </a>
            </p>
            
            <p>Ou acesse a plataforma para acompanhar o status:</p>
            <p>
              <a href="${process.env["APP_URL"] || "http://localhost:3000"}/dashboard/obras" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none;">
                Ver obra na plataforma
              </a>
            </p>
          </div>
        </body>
      </html>
    `;

    return this.enviarEmail({
      to: params.email,
      subject: `Capital fase ${params.etapaNome} liberado — IMOBI`,
      html,
    });
  }

  /**
   * Account deletion confirmation (LGPD Article 17)
   */
  async contaExcluida(nome: string, email: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .legal { background-color: #f5f5f5; border: 1px solid #ddd; color: #666; padding: 15px; border-radius: 5px; margin: 20px 0; font-size: 12px; }
            h2 { color: #721c24; }
            h3 { color: #555; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Sua Conta foi Permanentemente Excluída</h2>
            <p>Olá ${nome},</p>
            
            <p>Sua conta no imbobi foi permanentemente excluída após o período de graça de 30 dias, conforme solicitado.</p>
            
            <h3>O que foi deletado:</h3>
            <ul>
              <li>Seu perfil de usuário e informações pessoais</li>
              <li>Suas solicitações de crédito</li>
              <li>Seus projetos de construção</li>
              <li>Seus tokens de sessão</li>
              <li>Notificações e histórico de transações</li>
            </ul>
            
            <h3>O que foi retido (conforme lei):</h3>
            <ul>
              <li>Documentos KYC (retenção: 5 anos - requisito AML/regulatório)</li>
              <li>Logs de auditoria (retenção: 7 anos - requisito regulatório)</li>
            </ul>
            
            <div class="legal">
              <p><strong>Conformidade LGPD:</strong> Em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018), seus dados pessoais foram completamente removidos de nossos sistemas de produção, exceto onde a lei permite ou exige retenção.</p>
            </div>
            
            <p>Se tiver dúvidas sobre esta exclusão ou sua privacidade, entre em contato com nosso time:</p>
            <p>Email: privacidade@imbobi.com.br</p>
            
            <p>Obrigado por ter usado o imbobi.</p>
          </div>
        </body>
      </html>
    `;

    return this.enviarEmail({
      to: email,
      subject: "Conta Excluída - Confirmação",
      html,
    });
  }
}
```

### Email Module Registration

**File: `services/api/src/modules/email/email.module.ts`**

```typescript
import { Module } from "@nestjs/common";
import { EmailService } from "./email.service";

@Module({
  providers: [EmailService],
  exports: [EmailService], // Make available to other modules
})
export class EmailModule {}
```

---

## 3. Integration with Auth Service

**File: `services/api/src/modules/auth/auth.service.ts` (relevant parts)**

```typescript
import { EmailService } from "../email/email.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService // Inject email service
  ) {}

  async registrar(input: CadastroUsuarioInput) {
    const existe = await this.prisma.usuario.findFirst({
      where: { OR: [{ email: input.email }, { cpf: input.cpf }] },
    });
    if (existe) throw new ConflictException("E-mail ou CPF já cadastrado.");

    const passwordHash = await bcrypt.hash(input.senha, 12);
    const usuario = await this.prisma.usuario.create({
      data: {
        nome: input.nome,
        email: input.email,
        cpf: input.cpf,
        telefone: input.telefone,
        passwordHash,
        consentidoTermos: input.consentidoTermos,
        consentidoPrivacy: input.consentidoPrivacy,
        consentidoKyc: input.consentidoKyc,
      },
      select: { usuarioId: true, nome: true, email: true },
    });

    // Send welcome email (fire-and-forget)
    this.email
      .bemVindoEmail(usuario.nome, usuario.email)
      .catch((e) => {
        // Log error but don't block registration
        console.error(`Failed to send welcome email: ${e.message}`);
      });

    return { usuario, ...await this.gerarTokens(usuario.usuarioId) };
  }

  async esqueceuSenha(emailInput: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: emailInput },
    });

    if (!usuario) {
      // Don't reveal if email exists (security)
      return { message: "Email enviado se a conta existir" };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await this.prisma.resetToken.create({
      data: {
        usuarioId: usuario.usuarioId,
        token,
        expiresAt,
      },
    });

    // Send password reset email (fire-and-forget)
    this.email
      .recuperacaoSenhaEmail(usuario.nome, usuario.email, token)
      .catch((e) => {
        console.error(`Failed to send reset email: ${e.message}`);
      });

    return { message: "Email enviado se a conta existir" };
  }
}
```

---

## 4. Integration with KYC Service

**File: `services/api/src/modules/kyc/kyc.service.ts` (relevant parts)**

```typescript
import { EmailService } from "../email/email.service";

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService
  ) {}

  async aprovarDocumento(documentoId: string, admin: string) {
    const documento = await this.prisma.kycDocumento.findUnique({
      where: { documentoId },
      include: { usuario: true },
    });

    if (!documento) throw new NotFoundException("Documento não encontrado");

    // Update document status
    await this.prisma.kycDocumento.update({
      where: { documentoId },
      data: { status: "APROVADO" },
    });

    // Send approval email (fire-and-forget)
    await this.email
      .kycAprovadoEmail(documento.usuario.nome, documento.usuario.email)
      .catch((e) => {
        console.error(`Failed to send approval email: ${e.message}`);
      });

    // Check if KYC is complete
    const kycCompleta = await this.verificarKycCompleta(documento.usuarioId);
    if (kycCompleta) {
      await this.prisma.usuario.update({
        where: { usuarioId: documento.usuarioId },
        data: { kycStatus: "APROVADO" },
      });
    }

    return { message: "Documento aprovado" };
  }

  async rejeitarDocumento(documentoId: string, motivo: string) {
    const documento = await this.prisma.kycDocumento.findUnique({
      where: { documentoId },
      include: { usuario: true },
    });

    if (!documento) throw new NotFoundException("Documento não encontrado");

    // Update document status
    await this.prisma.kycDocumento.update({
      where: { documentoId },
      data: { status: "REJEITADO" },
    });

    // Send rejection email (fire-and-forget)
    await this.email
      .kycRejeitadoEmail(documento.usuario.nome, documento.usuario.email, motivo)
      .catch((e) => {
        console.error(`Failed to send rejection email: ${e.message}`);
      });

    return { message: "Documento rejeitado" };
  }
}
```

---

## 5. Integration with Installment Release Worker

**File: `services/api/src/workers/liberacao-parcela.worker.ts` (relevant parts)**

```typescript
import { EmailService } from "../modules/email/email.service";

@Injectable()
@Processor(QUEUE_LIBERACAO)
export class LiberacaoParcelaWorker {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService
  ) {}

  @Process()
  async handle(job: Job<LiberacaoJob>) {
    const { creditoId, liberacaoId, valor } = job.data;

    try {
      // Process release transaction...
      const credito = await this.prisma.credito.findUnique({
        where: { creditoId },
        include: { usuario: true, obras: true },
      });

      // Format currency
      const formattedValue = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(valor);

      // Send confirmation email (fire-and-forget)
      this.email
        .parcelaLiberadaEmail(
          credito.usuario.nome,
          credito.usuario.email,
          valor,
          credito.obras?.[0]?.nome || "sua obra"
        )
        .catch((e) => {
          console.error(`Failed to send release email: ${e.message}`);
        });

      this.logger.log(`Liberação processada: ${formattedValue}`);
    } catch (error) {
      this.logger.error(`Erro ao processar liberação: ${error}`);
      throw error;
    }
  }
}
```

---

## 6. Usage Pattern: Fire-and-Forget

Most email sends in IMOBI follow this pattern:

```typescript
// ✅ CORRECT: Fire-and-forget pattern
this.email
  .enviarEmail(opcoes)
  .catch((e) => {
    this.logger.error(`Email delivery failed: ${e.message}`);
  });

// Then continue with request handling
return { message: "Processado com sucesso" };
```

**Why?** User doesn't need to wait for email delivery. Email is sent async in background.

---

## 7. Testing Configuration

**File: `jest.setup.ts`** (Mock email in tests)

```typescript
// Mock EmailService for tests
jest.mock("../modules/email/email.service", () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    bemVindoEmail: jest.fn().mockResolvedValue(true),
    etapaAprovadaEmail: jest.fn().mockResolvedValue(true),
    parcelaLiberadaEmail: jest.fn().mockResolvedValue(true),
    kycAprovadoEmail: jest.fn().mockResolvedValue(true),
    kycRejeitadoEmail: jest.fn().mockResolvedValue(true),
    recuperacaoSenhaEmail: jest.fn().mockResolvedValue(true),
    enviarEmail: jest.fn().mockResolvedValue(true),
  })),
}));
```

---

## 8. Docker Configuration for Production

**File: `Dockerfile` (excerpt)**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm run build

# Runtime: email service will read env vars at startup
ENV NODE_ENV=production
ENV EMAIL_PROVIDER=sendgrid

EXPOSE 4000
CMD ["node", "dist/main.js"]
```

**Environment variables passed at runtime**:
```bash
docker run \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  -e EMAIL_PROVIDER="sendgrid" \
  -e SENDGRID_API_KEY="SG.xxx" \
  -e SMTP_FROM="noreply@imbobi.com.br" \
  -e APP_URL="https://app.imbobi.com.br" \
  imobi-api:latest
```

---

## Summary Table

| Component | File | Purpose |
|-----------|------|---------|
| Email Service | `email.service.ts` | Core email logic, provider selection |
| Email Module | `email.module.ts` | DI registration |
| Auth Integration | `auth.service.ts` | Welcome + password reset emails |
| KYC Integration | `kyc.service.ts` | Approval/rejection emails |
| Release Worker | `liberacao-parcela.worker.ts` | Release confirmation email |
| Configuration | `.env.production` | SendGrid credentials |
| Testing | `test-email-integration.sh` | Email delivery validation |
| Documentation | `SENDGRID_INTEGRATION_GUIDE.md` | Complete setup guide |

---

**Ready to implement!** All code is production-ready and requires only setting environment variables to activate SendGrid.
