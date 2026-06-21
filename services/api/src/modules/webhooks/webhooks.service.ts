import { Injectable, Logger, NotFoundException, ForbiddenException } from "@nestjs/common";
import * as crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CircuitBreaker } from "../../common/utils/circuit-breaker.util";
import { withRetry } from "../../common/utils/retry.util";

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  // Per-service circuit breaker — trips after 5 consecutive HTTP failures, resets after 60s
  private readonly breaker = new CircuitBreaker({ threshold: 5, timeoutMs: 60_000 });

  constructor(private readonly prisma: PrismaService) {}

  async registrar(usuarioId: string, url: string, eventos: string[]) {
    const secret = crypto.randomBytes(32).toString("hex");
    return this.prisma.webhookEndpoint.create({
      data: { usuarioId, url, secret, eventos },
      select: { webhookId: true, url: true, eventos: true, ativo: true, criadoEm: true, secret: true },
    });
  }

  async listar(usuarioId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { usuarioId },
      select: { webhookId: true, url: true, eventos: true, ativo: true, criadoEm: true },
      take: 50,
    });
  }

  async deletar(webhookId: string, usuarioId: string) {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({ where: { webhookId } });
    if (!endpoint) throw new NotFoundException("Webhook não encontrado.");
    if (endpoint.usuarioId !== usuarioId) throw new ForbiddenException("Acesso negado.");
    await this.prisma.webhookEndpoint.delete({ where: { webhookId } });
    return { ok: true };
  }

  async listarDeliveries(webhookId: string, usuarioId: string, take = 50) {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({ where: { webhookId } });
    if (!endpoint) throw new NotFoundException("Webhook não encontrado.");
    if (endpoint.usuarioId !== usuarioId) throw new ForbiddenException("Acesso negado.");
    return this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { criadoEm: "desc" },
      take,
    });
  }

  /** Entrega o evento via HTTP POST com assinatura HMAC-SHA256. */
  async entregar(webhookId: string, evento: string, data: Record<string, unknown>) {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({ where: { webhookId } });
    if (!endpoint || !endpoint.ativo) return;
    if (!endpoint.eventos.includes(evento) && !endpoint.eventos.includes("*")) return;

    const payload = JSON.stringify({ evento, data, timestamp: new Date().toISOString() });
    const signature = this.assinar(payload, endpoint.secret);

    const delivery = await this.prisma.webhookDelivery.create({
      data: { webhookId, evento, payload: JSON.parse(payload) as Prisma.InputJsonValue, tentativas: 1 },
    });

    try {
      const res = await this.breaker.execute(() =>
        withRetry(
          async () => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10_000);
            try {
              return await fetch(endpoint.url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Imbobi-Signature": `sha256=${signature}`,
                  "X-Imbobi-Event": evento,
                  "X-Imbobi-Delivery": delivery.deliveryId,
                },
                body: payload,
                signal: controller.signal,
              });
            } finally {
              clearTimeout(timeout);
            }
          },
          { retries: 2, baseMs: 500 },
        ),
      );

      await this.prisma.webhookDelivery.update({
        where: { deliveryId: delivery.deliveryId },
        data: { statusCode: res.status, sucesso: res.ok, ultimaTentativa: new Date() },
      });

      if (!res.ok) {
        this.logger.warn(`Webhook ${webhookId} retornou ${res.status} para evento ${evento}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Webhook ${webhookId} falhou: ${msg}`);
      await this.prisma.webhookDelivery.update({
        where: { deliveryId: delivery.deliveryId },
        data: { erro: msg, ultimaTentativa: new Date() },
      });
    }
  }

  private assinar(payload: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }
}
