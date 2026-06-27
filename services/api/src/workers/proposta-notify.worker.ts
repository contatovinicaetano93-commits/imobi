import { Processor, Process, OnQueueFailed } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable, Logger } from "@nestjs/common";
import { EmailService } from "../modules/email/email.service";
import { QUEUE_PROPOSTA_NOTIFY } from "../common/constants";

export interface PropostaNotifyJob {
  propostaId: string;
  tipoCredito: string;
  tipoLabel: string;
  nomeEmpreendimento: string;
  nomeContato: string;
  email: string;
  telefone: string;
  empresa: string | null;
  totalArquivos: number;
}

@Injectable()
@Processor(QUEUE_PROPOSTA_NOTIFY)
export class PropostaNotifyWorker {
  private readonly logger = new Logger(PropostaNotifyWorker.name);

  constructor(private readonly email: EmailService) {}

  @Process("notificar-equipe")
  async handle(job: Job<PropostaNotifyJob>) {
    const destino =
      process.env["IMOBI_PROPOSTA_NOTIFY_EMAIL"] ??
      process.env["ADMIN_NOTIFY_EMAIL"] ??
      null;

    if (!destino) {
      this.logger.log(
        `Proposta ${job.data.propostaId} recebida (${job.data.totalArquivos} arquivos) — e-mail não configurado`,
      );
      return;
    }

    const p = job.data;
    const html = `
      <h2>Nova proposta de crédito — ${p.nomeEmpreendimento}</h2>
      <p><strong>Tipo:</strong> ${p.tipoLabel}</p>
      <p><strong>Contato:</strong> ${p.nomeContato} · ${p.email} · ${p.telefone}</p>
      ${p.empresa ? `<p><strong>Empresa:</strong> ${p.empresa}</p>` : ""}
      <p><strong>Arquivos:</strong> ${p.totalArquivos}</p>
      <p><strong>ID:</strong> ${p.propostaId}</p>
    `;

    await this.email.enviarEmail({
      to: destino,
      subject: `[IMOBI] Nova proposta — ${p.nomeEmpreendimento}`,
      html,
    });
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(`Notificação proposta ${job.data.propostaId} falhou: ${err.message}`);
  }
}
