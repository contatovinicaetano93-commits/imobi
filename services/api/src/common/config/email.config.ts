/**
 * Production-ready email configuration
 *
 * Supports three email providers:
 * 1. SendGrid - Recommended for production (best deliverability)
 * 2. AWS SES - Cost-effective for high volumes
 * 3. SMTP - Most flexible option
 */

export type EmailProvider = "sendgrid" | "ses" | "smtp";

export interface EmailConfig {
  provider: EmailProvider;
  from: string;
  appUrl: string;
  retryConfig: {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier: number;
  };
}

export interface SendGridConfig extends EmailConfig {
  apiKey: string;
}

export interface SESConfig extends EmailConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface SMTPConfig extends EmailConfig {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  secure: boolean;
}

/**
 * Get email configuration based on environment variables
 */
export const getEmailConfig = (): SendGridConfig | SESConfig | SMTPConfig => {
  const provider = (process.env["EMAIL_PROVIDER"] || "smtp").toLowerCase() as EmailProvider;
  const from = process.env["SMTP_FROM"] || "noreply@imbobi.com.br";
  const appUrl = process.env["APP_URL"] || "https://imbobi.com.br";

  const baseConfig = {
    from,
    appUrl,
    retryConfig: {
      maxAttempts: Number(process.env["EMAIL_RETRY_ATTEMPTS"] || 3),
      delayMs: Number(process.env["EMAIL_RETRY_DELAY_MS"] || 1000),
      backoffMultiplier: Number(process.env["EMAIL_RETRY_BACKOFF"] || 2),
    },
  };

  if (provider === "sendgrid") {
    return {
      provider,
      apiKey: process.env["SENDGRID_API_KEY"] || "",
      ...baseConfig,
    } as SendGridConfig;
  }

  if (provider === "ses") {
    return {
      provider,
      region: process.env["AWS_REGION"] || "us-east-1",
      accessKeyId: process.env["AWS_ACCESS_KEY_ID"] || "",
      secretAccessKey: process.env["AWS_SECRET_ACCESS_KEY"] || "",
      ...baseConfig,
    } as SESConfig;
  }

  // Default to SMTP
  const port = Number(process.env["SMTP_PORT"] || 587);
  return {
    provider: "smtp",
    host: process.env["SMTP_HOST"] || "localhost",
    port,
    user: process.env["SMTP_USER"],
    pass: process.env["SMTP_PASS"],
    secure: port === 465, // Port 465 uses SSL, 587 uses STARTTLS
    ...baseConfig,
  } as SMTPConfig;
};

/**
 * Email template types
 */
export enum EmailTemplateType {
  WELCOME = "welcome",
  ETAPA_APROVADA = "etapa_aprovada",
  PARCELA_LIBERADA = "parcela_liberada",
  KYC_APROVADO = "kyc_aprovado",
  KYC_REJEITADO = "kyc_rejeitado",
  RECUPERACAO_SENHA = "recuperacao_senha",
  EMAIL_VERIFICATION = "email_verification",
  DISPUTE_NOTIFICATION = "dispute_notification",
}

/**
 * Email template defaults
 */
export const EMAIL_TEMPLATES = {
  [EmailTemplateType.WELCOME]: {
    subject: "Bem-vindo ao imbobi!",
    category: "welcome",
  },
  [EmailTemplateType.ETAPA_APROVADA]: {
    subject: "Etapa Aprovada",
    category: "approval",
  },
  [EmailTemplateType.PARCELA_LIBERADA]: {
    subject: "Parcela Liberada",
    category: "transaction",
  },
  [EmailTemplateType.KYC_APROVADO]: {
    subject: "Validação Aprovada",
    category: "approval",
  },
  [EmailTemplateType.KYC_REJEITADO]: {
    subject: "Documento Rejeitado - Ação Necessária",
    category: "alert",
  },
  [EmailTemplateType.RECUPERACAO_SENHA]: {
    subject: "Recuperar sua senha",
    category: "security",
  },
  [EmailTemplateType.EMAIL_VERIFICATION]: {
    subject: "Verificar seu email",
    category: "security",
  },
  [EmailTemplateType.DISPUTE_NOTIFICATION]: {
    subject: "Nova Disputa Reportada",
    category: "alert",
  },
} as const;

/**
 * Production-ready email defaults
 */
export const EMAIL_DEFAULTS = {
  // Retry configuration
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  RETRY_BACKOFF: 2,

  // SendGrid specific
  SENDGRID_HOST: "smtp.sendgrid.net",
  SENDGRID_PORT: 587,
  SENDGRID_USER: "apikey",

  // AWS SES specific
  SES_PORT: 587,

  // SMTP generic defaults
  SMTP_DEFAULT_HOST: "smtp.sendgrid.net",
  SMTP_DEFAULT_PORT: 587,
} as const;
