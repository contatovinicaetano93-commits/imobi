export type EmailProvider = "sendgrid" | "ses" | "smtp";

export interface SendGridConfig {
  provider: "sendgrid";
  apiKey: string;
}

export interface SESConfig {
  provider: "ses";
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface SMTPConfig {
  provider: "smtp";
  host: string;
  port: number;
  user?: string;
  pass?: string;
  secure?: boolean;
}

export type EmailConfig = SendGridConfig | SESConfig | SMTPConfig;

export function getEmailConfig(): EmailConfig {
  const provider = (process.env.EMAIL_PROVIDER || "smtp").toLowerCase();
  const nodeEnv = process.env.NODE_ENV || "development";

  if (provider === "sendgrid") {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error(
        "SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid",
      );
    }
    return {
      provider: "sendgrid",
      apiKey,
    };
  }

  if (provider === "ses") {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY are required when EMAIL_PROVIDER=ses",
      );
    }

    return {
      provider: "ses",
      region,
      accessKeyId,
      secretAccessKey,
    };
  }

  // Default to SMTP
  const host = process.env.SMTP_HOST;
  const portStr = process.env.SMTP_PORT;
  const port = portStr ? Number(portStr) : 587;

  if (!host) {
    if (nodeEnv === "production") {
      throw new Error(
        "SMTP_HOST is required when EMAIL_PROVIDER=smtp or undefined in production",
      );
    }
    return {
      provider: "smtp",
      host: "localhost",
      port: 1025,
      secure: false,
    };
  }

  if (port < 1 || port > 65535) {
    throw new Error(`Invalid SMTP port: ${port}`);
  }

  return {
    provider: "smtp",
    host,
    port,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    secure: process.env.SMTP_SECURE === "true",
  };
}

export function validateEmailConfig(config: EmailConfig): string[] {
  const errors: string[] = [];

  if (config.provider === "sendgrid") {
    if (!config.apiKey || typeof config.apiKey !== "string") {
      errors.push("SendGrid API key is missing or invalid");
    }
  }

  if (config.provider === "ses") {
    if (!config.region || typeof config.region !== "string") {
      errors.push("AWS region is missing or invalid");
    }
    if (!config.accessKeyId || typeof config.accessKeyId !== "string") {
      errors.push("AWS access key ID is missing or invalid");
    }
    if (!config.secretAccessKey || typeof config.secretAccessKey !== "string") {
      errors.push("AWS secret access key is missing or invalid");
    }
  }

  if (config.provider === "smtp") {
    if (!config.host || typeof config.host !== "string") {
      errors.push("SMTP host is missing or invalid");
    }
    if (
      typeof config.port !== "number" ||
      config.port < 1 ||
      config.port > 65535
    ) {
      errors.push(`SMTP port is invalid: ${config.port}`);
    }
  }

  return errors;
}
