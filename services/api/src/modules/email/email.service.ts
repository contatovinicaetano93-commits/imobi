import { Injectable, Logger } from "@nestjs/common";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
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

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private sesClient: SESClient | null = null;
  private transporter: Transporter | null = null;
  private readonly provider: string;
  private readonly retryConfig: RetryConfig = {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
  };

  constructor() {
    this.provider = process.env["EMAIL_PROVIDER"] || "smtp";
    this.initializeProvider();
  }

  private initializeProvider() {
    const provider = this.provider.toLowerCase();

    if (provider === "sendgrid") {
      this.initializeSendGrid();
    } else if (provider === "ses") {
      this.initializeAwsSes();
    } else {
      this.initializeSmtp();
    }
  }

  private initializeSendGrid() {
    const apiKey = process.env["SENDGRID_API_KEY"];

    if (!apiKey) {
      this.logger.warn("SendGrid API key not found - using console mode");
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      auth: {
        user: "apikey",
        pass: apiKey,
      },
    });

    this.logger.debug("SendGrid email provider configured");
  }

  private initializeAwsSes() {
    const region = process.env["AWS_REGION"];
    const accessKeyId = process.env["AWS_ACCESS_KEY_ID"];
    const secretAccessKey = process.env["AWS_SECRET_ACCESS_KEY"];

    if (!region || !accessKeyId || !secretAccessKey) {
      this.logger.warn("AWS SES credentials not found - using console mode");
      return;
    }

    this.sesClient = new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.debug("AWS SES email provider configured");
  }

  private initializeSmtp() {
    const smtpHost = process.env["SMTP_HOST"];
    const smtpPort = process.env["SMTP_PORT"];
    const smtpUser = process.env["SMTP_USER"];
    const smtpPass = process.env["SMTP_PASS"];

    if (!smtpHost || !smtpPort) {
      this.logger.warn("SMTP configuration not found - using console mode");
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: parseInt(smtpPort) === 465,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    });

    this.logger.debug(`SMTP email provider configured: ${smtpHost}:${smtpPort}`);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async enviarEmail(opcoes: EmailOptions): Promise<boolean> {
    if (this.sesClient) {
      return this.enviarEmailViaSes(opcoes);
    } else if (this.transporter) {
      return this.enviarEmailViaTransporter(opcoes);
    } else {
      this.logger.debug(`[EMAIL-CONSOLE] ${opcoes.to} - ${opcoes.subject}`);
      return true;
    }
  }

  private async enviarEmailViaSes(opcoes: EmailOptions): Promise<boolean> {
    let lastError: Error | null = null;
    let delayMs = this.retryConfig.delayMs;

    const fromEmail = process.env["SMTP_FROM"] || "noreply@imbobi.com";

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        const command = new SendEmailCommand({
          Source: fromEmail,
          Destination: { ToAddresses: [opcoes.to] },
          Message: {
            Subject: { Data: opcoes.subject, Charset: "UTF-8" },
            Body: {
              Html: { Data: opcoes.html, Charset: "UTF-8" },
              Text: opcoes.text ? { Data: opcoes.text, Charset: "UTF-8" } : undefined,
            },
          },
        });

        await this.sesClient!.send(command);
        this.logger.debug(`Email enviado para ${opcoes.to} via SES (attempt ${attempt}/${this.retryConfig.maxAttempts})`);
        return true;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Email send attempt ${attempt} failed for ${opcoes.to}: ${lastError.message}`);

        if (attempt < this.retryConfig.maxAttempts) {
          await this.sleep(delayMs);
          delayMs *= this.retryConfig.backoffMultiplier;
        }
      }
    }

    this.logger.error(`Email failed after ${this.retryConfig.maxAttempts} attempts for ${opcoes.to}: ${lastError?.message}`);
    return false;
  }

  private async enviarEmailViaTransporter(opcoes: EmailOptions): Promise<boolean> {
    let lastError: Error | null = null;
    let delayMs = this.retryConfig.delayMs;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        await this.transporter!.sendMail({
          from: process.env["SMTP_FROM"] || "noreply@imbobi.com",
          to: opcoes.to,
          subject: opcoes.subject,
          html: opcoes.html,
          text: opcoes.text,
        });

        this.logger.debug(`Email enviado para ${opcoes.to} (attempt ${attempt}/${this.retryConfig.maxAttempts})`);
        return true;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Email send attempt ${attempt} failed for ${opcoes.to}: ${lastError.message}`);

        if (attempt < this.retryConfig.maxAttempts) {
          await this.sleep(delayMs);
          delayMs *= this.retryConfig.backoffMultiplier;
        }
      }
    }

    this.logger.error(`Email failed after ${this.retryConfig.maxAttempts} attempts for ${opcoes.to}: ${lastError?.message}`);
    return false;
  }

  async bemVindoEmail(nome: string, email: string): Promise<boolean> {
    const html = `
      <h2>Bem-vindo ao imbobi, ${nome}!</h2>
      <p>Sua conta foi criada com sucesso.</p>
      <p>Próximos passos:</p>
      <ul>
        <li>Complete seu perfil</li>
        <li>Valide sua identidade (KYC)</li>
        <li>Solicite um crédito</li>
        <li>Crie suas primeiras obras</li>
      </ul>
      <p><a href="${process.env["APP_URL"] || "http://localhost:3000"}/dashboard">Acessar Dashboard</a></p>
    `;

    return this.enviarEmail({
      to: email,
      subject: "Bem-vindo ao imbobi!",
      html,
    });
  }

  async etapaAprovadaEmail(
    nome: string,
    email: string,
    etapaNome: string,
    obraNome: string,
    valor: number
  ): Promise<boolean> {
    const html = `
      <h2>Etapa Aprovada: ${etapaNome}</h2>
      <p>Olá ${nome},</p>
      <p>A etapa "<strong>${etapaNome}</strong>" de sua obra "<strong>${obraNome}</strong>" foi aprovada!</p>
      <p>A liberação de R$ ${valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} foi agendada e será processada em breve.</p>
      <p><a href="${process.env["APP_URL"] || "http://localhost:3000"}/dashboard/obras">Ver Obras</a></p>
    `;

    return this.enviarEmail({
      to: email,
      subject: `Etapa Aprovada: ${etapaNome}`,
      html,
    });
  }

  async parcelaLiberadaEmail(
    nome: string,
    email: string,
    valor: number,
    obraNome: string
  ): Promise<boolean> {
    const html = `
      <h2>Parcela Liberada</h2>
      <p>Olá ${nome},</p>
      <p>Uma parcela de R$ ${valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} foi liberada em sua conta!</p>
      <p>Obra: ${obraNome}</p>
      <p><a href="${process.env["APP_URL"] || "http://localhost:3000"}/dashboard/credito">Ver Extrato</a></p>
    `;

    return this.enviarEmail({
      to: email,
      subject: "Parcela Liberada",
      html,
    });
  }

  async kycAprovadoEmail(nome: string, email: string): Promise<boolean> {
    const html = `
      <h2>Validação de Identidade Aprovada!</h2>
      <p>Olá ${nome},</p>
      <p>Sua validação de identidade (KYC) foi aprovada com sucesso!</p>
      <p>Agora você tem acesso a todas as funcionalidades da plataforma.</p>
      <p><a href="${process.env["APP_URL"] || "http://localhost:3000"}/dashboard">Ir para Dashboard</a></p>
    `;

    return this.enviarEmail({
      to: email,
      subject: "Validação Aprovada",
      html,
    });
  }

  async kycRejeitadoEmail(
    nome: string,
    email: string,
    motivo: string
  ): Promise<boolean> {
    const html = `
      <h2>Validação de Identidade Rejeitada</h2>
      <p>Olá ${nome},</p>
      <p>Infelizmente sua validação de identidade foi rejeitada.</p>
      <p><strong>Motivo:</strong> ${motivo}</p>
      <p>Por favor, envie novamente seu documento.</p>
      <p><a href="${process.env["APP_URL"] || "http://localhost:3000"}/dashboard/kyc">Enviar Novo Documento</a></p>
    `;

    return this.enviarEmail({
      to: email,
      subject: "Documento Rejeitado - Acao Necessária",
      html,
    });
  }

  async recuperacaoSenhaEmail(
    nome: string,
    email: string,
    token: string
  ): Promise<boolean> {
    const resetLink = `${process.env["APP_URL"] || "http://localhost:3000"}/reset-password?token=${token}`;
    const html = `
      <h2>Recuperar Senha</h2>
      <p>Olá ${nome},</p>
      <p>Você solicitou a recuperação de sua senha.</p>
      <p><a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Resetar Senha</a></p>
      <p>Este link expira em 1 hora.</p>
      <p>Se não solicitou esta ação, ignore este email.</p>
    `;

    return this.enviarEmail({
      to: email,
      subject: "Recuperar sua senha",
      html,
    });
  }
}
