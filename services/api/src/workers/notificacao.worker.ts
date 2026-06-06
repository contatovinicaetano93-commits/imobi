import { Processor, Process, OnQueueFailed, OnQueueCompleted } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable, Logger } from "@nestjs/common";
import { NotificacoesService } from "../modules/notificacoes/notificacoes.service";
import { EmailService } from "../modules/email/email.service";
import { PushNotificacoesService } from "../modules/push-notificacoes/push-notificacoes.service";
import { QUEUE_NOTIFICACAO, type NotificacaoJob } from "../common/constants";

@Injectable()
@Processor(QUEUE_NOTIFICACAO)
export class NotificacaoWorker {
  private readonly logger = new Logger(NotificacaoWorker.name);

  constructor(
    private readonly notificacoes: NotificacoesService,
    private readonly email: EmailService,
    private readonly push: PushNotificacoesService
  ) {}

  @Process()
  async handle(job: Job<NotificacaoJob>) {
    const { usuarioId, canal, tipoNotificacao, titulo, mensagem, link, email, nomeUsuario, pushTipo, dados } = job.data;

    const canais = canal === "todos" ? ["inApp", "push", "email"] : [canal];

    if (canais.includes("inApp")) {
      await this.notificacoes
        .criar(usuarioId, tipoNotificacao as never, titulo, mensagem, link)
        .catch((e) => this.logger.error(`Erro ao criar notificação in-app: ${e}`));
    }

    if (canais.includes("push")) {
      await this.push
        .enviarPush({ usuarioId, titulo, mensagem, tipo: pushTipo ?? "GERAL", dados })
        .catch((e) => this.logger.error(`Erro ao enviar push: ${e}`));
    }

    if (canais.includes("email") && email && nomeUsuario) {
      await this.despacharEmail(job.data, email, nomeUsuario);
    }

    this.logger.log(`Notificação processada: ${tipoNotificacao} → usuário ${usuarioId} (canais: ${canais.join(", ")})`);
  }

  private async despacharEmail(job: NotificacaoJob, emailDest: string, nome: string) {
    const { tipoNotificacao, dados } = job;

    switch (tipoNotificacao) {
      case "KYC_APROVADO":
        await this.email.kycAprovadoEmail(nome, emailDest).catch((e) => this.logger.warn(e));
        break;

      case "KYC_REJEITADO":
        await this.email
          .kycRejeitadoEmail(nome, emailDest, dados?.motivo ?? "Não especificado")
          .catch((e) => this.logger.warn(e));
        break;

      case "ETAPA_APROVADA":
        await this.email
          .etapaAprovadaEmail(
            nome,
            emailDest,
            dados?.etapaNome ?? "Etapa",
            dados?.obraNome ?? "Obra",
            Number(dados?.valor ?? 0)
          )
          .catch((e) => this.logger.warn(e));
        break;

      case "PARCELA_LIBERADA":
        await this.email
          .parcelaLiberadaEmail(nome, emailDest, Number(dados?.valor ?? 0), dados?.obraNome ?? "Obra")
          .catch((e) => this.logger.warn(e));
        break;

      default:
        await this.email
          .enviarEmail({ to: emailDest, subject: job.titulo, html: `<p>${job.mensagem}</p>` })
          .catch((e) => this.logger.warn(e));
    }
  }

  @OnQueueFailed()
  onFailed(job: Job<NotificacaoJob>, err: Error) {
    this.logger.error(
      `Job de notificação ${job.id} falhou após ${job.attemptsMade} tentativas: ${err.message}`
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.debug(`Job de notificação ${job.id} concluído`);
  }
}
