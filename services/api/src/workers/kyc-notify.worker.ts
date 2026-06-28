import { Processor, Process, OnQueueFailed } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable, Logger } from "@nestjs/common";
import { EmailService } from "../modules/email/email.service";
import { QUEUE_KYC_NOTIFY } from "../common/constants";

export type KycNotifyJob =
  | {
      kind: "aprovado";
      kycDocumentoId: string;
      nome: string;
      email: string;
    }
  | {
      kind: "rejeitado";
      kycDocumentoId: string;
      nome: string;
      email: string;
      motivo: string;
    };

@Injectable()
@Processor(QUEUE_KYC_NOTIFY)
export class KycNotifyWorker {
  private readonly logger = new Logger(KycNotifyWorker.name);

  constructor(private readonly email: EmailService) {}

  @Process("notificar-usuario")
  async handle(job: Job<KycNotifyJob>) {
    const data = job.data;

    if (data.kind === "aprovado") {
      await this.email.kycAprovadoEmail(data.nome, data.email);
      return;
    }

    await this.email.kycRejeitadoEmail(data.nome, data.email, data.motivo);
  }

  @OnQueueFailed()
  onFailed(job: Job<KycNotifyJob>, err: Error) {
    this.logger.error(
      `Notificação KYC ${job.data.kycDocumentoId} (${job.data.kind}) falhou: ${err.message}`,
    );
  }
}
