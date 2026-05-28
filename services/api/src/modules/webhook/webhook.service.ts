import { Injectable, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Queue, Job } from "bull";
import { InjectQueue } from "@nestjs/bull";
import * as crypto from "crypto";

export type WebhookEvent =
  | "user.signup"
  | "user.kyc.approved"
  | "user.kyc.rejected"
  | "credit.approved"
  | "credit.rejected"
  | "work.completed"
  | "stage.approved"
  | "stage.rejected"
  | "payment.released";

interface CreateWebhookDto {
  url: string;
  eventos: WebhookEvent[];
}

interface TriggerEventDto {
  evento: WebhookEvent;
  dados: Record<string, any>;
}

interface WebhookLogFilters {
  evento?: string;
  status?: "success" | "failed" | "pending";
  limit?: number;
  offset?: number;
}

const WEBHOOK_RETRY_DELAYS = [
  0,        // Primeira tentativa: imediata
  5 * 60,   // Segunda tentativa: 5 minutos
  30 * 60,  // Terceira tentativa: 30 minutos
];

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("webhooks") private readonly webhookQueue: Queue,
  ) {}

  /**
   * Registra um novo webhook
   */
  async create(dto: CreateWebhookDto): Promise<any> {
    if (!dto.url || !dto.eventos?.length) {
      throw new BadRequestException("URL e eventos são obrigatórios");
    }

    // Valida URL
    try {
      new URL(dto.url);
    } catch {
      throw new BadRequestException("URL inválida");
    }

    // Gera secret para HMAC
    const secret = crypto.randomBytes(32).toString("hex");

    const webhook = await this.prisma.webhook.create({
      data: {
        url: dto.url,
        eventos: dto.eventos,
        secret,
        ativo: true,
      },
    });

    return {
      webhookId: webhook.webhookId,
      url: webhook.url,
      eventos: webhook.eventos,
      ativo: webhook.ativo,
      criadoEm: webhook.criadoEm,
      secret: secret, // Retorna apenas na criação para que o cliente salve
    };
  }

  /**
   * Deleta um webhook
   */
  async delete(webhookId: string): Promise<void> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { webhookId },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook ${webhookId} não encontrado`);
    }

    await this.prisma.webhook.delete({
      where: { webhookId },
    });

    this.logger.log(`Webhook ${webhookId} deletado`);
  }

  /**
   * Lista todos os webhooks
   */
  async list(ativo?: boolean): Promise<any[]> {
    const webhooks = await this.prisma.webhook.findMany({
      where: ativo !== undefined ? { ativo } : undefined,
      orderBy: { criadoEm: "desc" },
      select: {
        webhookId: true,
        url: true,
        eventos: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    return webhooks;
  }

  /**
   * Obtém um webhook específico
   */
  async getById(webhookId: string): Promise<any> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { webhookId },
      select: {
        webhookId: true,
        url: true,
        eventos: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook ${webhookId} não encontrado`);
    }

    return webhook;
  }

  /**
   * Atualiza um webhook
   */
  async update(webhookId: string, dto: Partial<CreateWebhookDto>): Promise<any> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { webhookId },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook ${webhookId} não encontrado`);
    }

    if (dto.url) {
      try {
        new URL(dto.url);
      } catch {
        throw new BadRequestException("URL inválida");
      }
    }

    const updated = await this.prisma.webhook.update({
      where: { webhookId },
      data: {
        url: dto.url,
        eventos: dto.eventos,
      },
    });

    return {
      webhookId: updated.webhookId,
      url: updated.url,
      eventos: updated.eventos,
      ativo: updated.ativo,
      criadoEm: updated.criadoEm,
      atualizadoEm: updated.atualizadoEm,
    };
  }

  /**
   * Ativa/desativa um webhook
   */
  async toggleActive(webhookId: string, ativo: boolean): Promise<any> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { webhookId },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook ${webhookId} não encontrado`);
    }

    const updated = await this.prisma.webhook.update({
      where: { webhookId },
      data: { ativo },
    });

    return {
      webhookId: updated.webhookId,
      ativo: updated.ativo,
    };
  }

  /**
   * Dispara um evento para todos os webhooks inscritos
   */
  async trigger(dto: TriggerEventDto): Promise<void> {
    const { evento, dados } = dto;

    // Busca webhooks inscritos neste evento e ativos
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        ativo: true,
        eventos: {
          has: evento,
        },
      },
    });

    if (!webhooks.length) {
      this.logger.debug(`Nenhum webhook inscrito para evento: ${evento}`);
      return;
    }

    this.logger.log(`Disparando evento ${evento} para ${webhooks.length} webhook(s)`);

    // Enfileira jobs de webhook para cada subscritor
    for (const webhook of webhooks) {
      const payload = {
        id: crypto.randomUUID(),
        evento,
        dados,
        timestamp: new Date().toISOString(),
      };

      // Calcula HMAC-SHA256 para assinar o payload
      const signature = this.signPayload(webhook.secret, JSON.stringify(payload));

      await this.webhookQueue.add(
        {
          webhookId: webhook.webhookId,
          url: webhook.url,
          payload,
          signature,
        },
        {
          attempts: WEBHOOK_RETRY_DELAYS.length,
          backoff: {
            type: "fixed",
            delay: 1000, // Delay inicial antes do job ser processado
          },
          removeOnComplete: {
            age: 3600, // Manter por 1 hora
          },
        }
      );
    }
  }

  /**
   * Registra um log de webhook
   */
  async logWebhookAttempt(
    webhookId: string,
    evento: string,
    payload: Record<string, any>,
    status: number | null,
    resposta: string | null,
    tentativa: number
  ): Promise<void> {
    try {
      const proxImagem =
        tentativa < WEBHOOK_RETRY_DELAYS.length
          ? new Date(Date.now() + (WEBHOOK_RETRY_DELAYS[tentativa] * 1000))
          : null;

      await this.prisma.webhookLog.create({
        data: {
          webhookId,
          evento,
          payload,
          status,
          resposta,
          tentativas: tentativa,
          proxImagem,
        },
      });
    } catch (error) {
      this.logger.error(`Erro ao registrar log de webhook: ${error}`);
    }
  }

  /**
   * Lista logs de um webhook
   */
  async getLogs(webhookId: string, filters: WebhookLogFilters = {}): Promise<any> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { webhookId },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook ${webhookId} não encontrado`);
    }

    const { evento, status, limit = 50, offset = 0 } = filters;

    const where: any = { webhookId };
    if (evento) where.evento = evento;

    if (status) {
      if (status === "success") {
        where.status = { in: [200, 201, 204] };
      } else if (status === "failed") {
        where.status = { not: { in: [200, 201, 204] } };
      } else if (status === "pending") {
        where.status = null;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.webhookLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.webhookLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit,
      offset,
    };
  }

  /**
   * Testa um webhook enviando um payload de teste
   */
  async test(webhookId: string): Promise<any> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { webhookId },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook ${webhookId} não encontrado`);
    }

    const payload = {
      id: crypto.randomUUID(),
      evento: "webhook.test",
      dados: {
        message: "Teste de webhook",
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    const signature = this.signPayload(webhook.secret, JSON.stringify(payload));

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-ID": webhook.webhookId,
        },
        body: JSON.stringify(payload),
        timeout: 30000,
      });

      const responseText = await response.text();

      await this.logWebhookAttempt(
        webhookId,
        "webhook.test",
        payload,
        response.status,
        responseText,
        0
      );

      return {
        sucesso: response.ok,
        status: response.status,
        resposta: responseText.substring(0, 500), // Limita tamanho
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      await this.logWebhookAttempt(
        webhookId,
        "webhook.test",
        payload,
        null,
        errorMsg,
        0
      );

      return {
        sucesso: false,
        erro: errorMsg,
      };
    }
  }

  /**
   * Calcula assinatura HMAC-SHA256
   */
  private signPayload(secret: string, payload: string): string {
    return crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
  }

  /**
   * Valida assinatura de um webhook recebido
   */
  static validateSignature(
    secret: string,
    payload: string,
    signature: string
  ): boolean {
    const calculatedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculatedSignature)
    );
  }
}
