import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Retry strategy with exponential backoff
 * - Attempt 1: immediate
 * - Attempt 2: 2 seconds (2^1)
 * - Attempt 3: 4 seconds (2^2)
 */
interface RetryConfig {
  maxAttempts: number;
  delays: number[]; // Delays in milliseconds for each attempt
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly retryConfig: RetryConfig = {
    maxAttempts: 3,
    delays: [0, 2000, 4000], // 0ms, 2s, 4s (exponential backoff)
  };

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = process.env["SMTP_HOST"];
    const smtpPort = process.env["SMTP_PORT"];
    const smtpUser = process.env["SMTP_USER"];
    const smtpPass = process.env["SMTP_PASS"];

    if (!smtpHost || !smtpPort) {
      this.logger.warn(
        "SMTP configuration not found - emails will be logged to console only"
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: parseInt(smtpPort, 10) === 465,
        auth:
          smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
      });

      this.logger.log(
        `Email service initialized: ${smtpHost}:${smtpPort} (secure: ${parseInt(smtpPort, 10) === 465})`
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize email transporter: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Delays execution for the specified milliseconds
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Sends email with exponential backoff retry logic
   * On failure, logs error but does not throw exception (graceful degradation)
   */
  async enviarEmail(opcoes: EmailOptions): Promise<boolean> {
    // Fallback to console mode if SMTP not configured
    if (!this.transporter) {
      this.logger.debug(
        `[EMAIL-CONSOLE] To: ${opcoes.to} | Subject: ${opcoes.subject}`
      );
      return true;
    }

    const fromEmail = process.env["SMTP_FROM"] || "noreply@imbobi.com";

    // Retry loop with exponential backoff
    for (let attempt = 0; attempt < this.retryConfig.maxAttempts; attempt++) {
      try {
        // Wait before retry (0ms on first attempt)
        if (attempt > 0) {
          const delayMs = this.retryConfig.delays[attempt];
          this.logger.debug(
            `Email retry attempt ${attempt + 1}/${this.retryConfig.maxAttempts} - waiting ${delayMs}ms`
          );
          await this.delay(delayMs);
        }

        await this.transporter.sendMail({
          from: fromEmail,
          to: opcoes.to,
          subject: opcoes.subject,
          html: opcoes.html,
          text: opcoes.text,
        });

        this.logger.log(
          `Email successfully sent to ${opcoes.to} (${opcoes.subject})`
        );
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (attempt === this.retryConfig.maxAttempts - 1) {
          // Last attempt failed
          this.logger.error(
            `Failed to send email to ${opcoes.to} after ${this.retryConfig.maxAttempts} attempts: ${errorMessage}`
          );
          return false;
        }

        // Log the attempt failure but continue retrying
        this.logger.warn(
          `Email send attempt ${attempt + 1}/${this.retryConfig.maxAttempts} failed for ${opcoes.to}: ${errorMessage}`
        );
      }
    }

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
