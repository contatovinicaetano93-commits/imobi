import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

function buildTransporter(): Transporter | null {
  const provider = (process.env.EMAIL_PROVIDER ?? "smtp").toLowerCase();

  if (provider === "sendgrid") {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) return null;
    return nodemailer.createTransport({ host: "smtp.sendgrid.net", port: 587, auth: { user: "apikey", pass: apiKey } });
  }

  if (provider === "ses") {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!region || !accessKeyId || !secretAccessKey) return null;
    return nodemailer.createTransport({
      host: `email-smtp.${region}.amazonaws.com`,
      port: 587,
      secure: false,
      auth: { user: accessKeyId, pass: secretAccessKey },
    });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  if (!smtpHost || !smtpPort) return null;
  return nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort),
    secure: parseInt(smtpPort) === 465,
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

const transporter = buildTransporter();

export async function enviarEmail(opcoes: EmailOptions): Promise<boolean> {
  if (!transporter) {
    console.debug(`[EMAIL-CONSOLE] ${opcoes.to} - ${opcoes.subject}`);
    return true;
  }
  try {
    await transporter.sendMail({ from: process.env.SMTP_FROM ?? "noreply@imobi.com.br", ...opcoes });
    return true;
  } catch (error) {
    console.error(`Email falhou para ${opcoes.to}:`, error);
    return false;
  }
}

export async function recuperacaoSenhaEmail(nome: string, email: string, token: string): Promise<boolean> {
  const resetLink = `${process.env.APP_URL ?? "http://localhost:3000"}/redefinir-senha?token=${token}`;
  const html = `
    <h2>Recuperar Senha</h2>
    <p>Olá ${nome},</p>
    <p>Você solicitou a recuperação de sua senha.</p>
    <p><a href="${resetLink}">Resetar Senha</a></p>
    <p>Este link expira em 1 hora.</p>
  `;
  return enviarEmail({ to: email, subject: "Recuperar sua senha", html });
}
