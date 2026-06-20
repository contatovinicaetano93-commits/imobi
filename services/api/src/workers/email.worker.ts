import { Processor, Process, OnQueueFailed, OnQueueCompleted } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable, Logger } from "@nestjs/common";
import { EmailService } from "../modules/email/email.service";
import { QUEUE_EMAIL, EmailJob } from "../common/constants";
import { alertarSlack } from "../common/slack-alert";

@Injectable()
@Processor(QUEUE_EMAIL)
export class EmailWorker {
  private readonly logger = new Logger(EmailWorker.name);

  constructor(private readonly email: EmailService) {}

  @Process()
  async handle(job: Job<EmailJob>) {
    const { tipo, payload } = job.data;

    switch (tipo) {
      case "BEM_VINDO":
        await this.email.bemVindoEmail(payload.nome, payload.email);
        break;
      case "ETAPA_APROVADA":
        await this.email.etapaAprovadaEmail(
          payload.nome,
          payload.email,
          payload.etapaNome!,
          payload.obraNome!,
          payload.valor!
        );
        break;
      case "PARCELA_LIBERADA":
        await this.email.parcelaLiberadaEmail(
          payload.nome,
          payload.email,
          payload.valor!,
          payload.obraNome!
        );
        break;
      case "KYC_APROVADO":
        await this.email.kycAprovadoEmail(payload.nome, payload.email);
        break;
      case "KYC_REJEITADO":
        await this.email.kycRejeitadoEmail(
          payload.nome,
          payload.email,
          payload.motivo!
        );
        break;
      case "RECUPERACAO_SENHA":
        await this.email.recuperacaoSenhaEmail(
          payload.nome,
          payload.email,
          payload.token!
        );
        break;
      case "CONTA_EXCLUIDA":
        await this.email.contaExcluida(payload.nome, payload.email);
        break;
      default:
        this.logger.warn(`Tipo de email desconhecido: ${tipo}`);
    }
  }

  @OnQueueFailed()
  async onFailed(job: Job<EmailJob>, err: Error) {
    this.logger.error(`Job de email ${job.id} (${job.data.tipo}) falhou após ${job.attemptsMade} tentativas: ${err.message}`);
    await alertarSlack(
      `🚨 *Email Worker — Falha*\nTipo: \`${job.data.tipo}\`\nDestinatário: ${job.data.payload.email}\nErro: ${err.message}\nJob ID: ${job.id} | Tentativas: ${job.attemptsMade}`
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job<EmailJob>) {
    this.logger.log(`Email enviado com sucesso: ${job.data.tipo} → ${job.data.payload.email}`);
  }
}
