import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import type { Queue } from "bull";
import { OutboxService } from "../modules/outbox/outbox.service";
import { WebhooksService } from "../modules/webhooks/webhooks.service";
import { QUEUE_LIBERACAO } from "../common/constants";

export const QUEUE_OUTBOX = "outbox-processor";

@Injectable()
export class OutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorker.name);
  private running = false;
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly outbox: OutboxService,
    private readonly webhooks: WebhooksService,
    @InjectQueue(QUEUE_LIBERACAO) private readonly liberacaoQueue: Queue,
  ) {}

  onModuleInit() {
    const interval = Number(process.env["OUTBOX_POLL_INTERVAL_MS"] ?? "10000");
    this.timer = setInterval(() => void this.processar(), interval);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Chamado pelo scheduler (setInterval) para processar eventos pendentes. */
  async processar() {
    if (this.running) return;
    this.running = true;
    try {
      const eventos = await this.outbox.buscarPendentes(50);
      for (const evento of eventos) {
        await this.processarEvento(evento);
      }
    } finally {
      this.running = false;
    }
  }

  private async processarEvento(evento: { eventId: string; tipo: string; payload: unknown; tentativas: number }) {
    await this.outbox.marcarProcessando(evento.eventId);
    try {
      await this.dispatch(evento.tipo, evento.payload as Record<string, unknown>);
      await this.outbox.marcarConcluido(evento.eventId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Outbox evento ${evento.eventId} (${evento.tipo}) falhou: ${msg}`);
      await this.outbox.marcarFalha(evento.eventId, msg, evento.tentativas + 1);
    }
  }

  private async dispatch(tipo: string, payload: Record<string, unknown>) {
    switch (tipo) {
      case "LIBERACAO_PARCELA":
        await this.liberacaoQueue.add(payload, {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 500 },
        });
        break;
      case "WEBHOOK_EMIT":
        await this.webhooks.entregar(
          payload["webhookId"] as string,
          payload["evento"] as string,
          payload["data"] as Record<string, unknown>,
        );
        break;
      default:
        this.logger.warn(`Outbox: tipo desconhecido ${tipo}`);
    }
  }
}
