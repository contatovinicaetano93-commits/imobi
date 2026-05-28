import { Processor, Process, OnQueueFailed, OnQueueCompleted } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable, Logger } from "@nestjs/common";
import { WebhookService } from "./webhook.service";

export const QUEUE_WEBHOOKS = "webhooks";

interface WebhookJob {
  webhookId: string;
  url: string;
  payload: Record<string, any>;
  signature: string;
}

@Injectable()
@Processor(QUEUE_WEBHOOKS)
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Process()
  async handleWebhook(job: Job<WebhookJob>) {
    const { webhookId, url, payload, signature } = job.data;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-ID": webhookId,
          "X-Webhook-Delivery": payload.id,
        },
        body: JSON.stringify(payload),
        timeout: 30000,
      });

      const responseText = await response.text();

      // Log sucesso
      await this.webhookService.logWebhookAttempt(
        webhookId,
        payload.evento,
        payload,
        response.status,
        responseText,
        job.attemptsMade
      );

      if (!response.ok) {
        const error = new Error(
          `HTTP ${response.status}: ${responseText.substring(0, 200)}`
        );
        throw error;
      }

      this.logger.log(
        `Webhook entregue com sucesso: ${webhookId} (evento: ${payload.evento})`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Log falha
      await this.webhookService.logWebhookAttempt(
        webhookId,
        payload.evento,
        payload,
        null,
        errorMsg,
        job.attemptsMade
      );

      // Propaga erro para trigger retries
      this.logger.warn(
        `Falha ao entregar webhook ${webhookId}: ${errorMsg} (tentativa ${job.attemptsMade})`
      );
      throw error;
    }
  }

  @OnQueueFailed()
  async onFailed(job: Job<WebhookJob>, err: Error) {
    this.logger.error(
      `Job webhook ${job.id} falhou após todas as tentativas: ${err.message}`
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job<WebhookJob>) {
    this.logger.debug(`Job webhook ${job.id} completado com sucesso`);
  }
}
