import { Injectable, Logger } from "@nestjs/common";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private provider: string = process.env["EMAIL_PROVIDER"] || "console";

  async enviarEmail(opcoes: EmailOptions): Promise<boolean> {
    try {
      if (this.provider === "console" || !process.env["SMTP_HOST"]) {
        this.logger.debug(`[EMAIL] ${opcoes.to} - ${opcoes.subject}`);
        this.logger.debug(`[EMAIL CONTENT]\n${opcoes.html}`);
        return true;
      }

      // Real email implementation would go here
      // For now, we're just logging
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar email: ${error}`);
      return false;
    }
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
