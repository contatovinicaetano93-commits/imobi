import { Controller, Get, Header, Req, UnauthorizedException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { timingSafeEqual } from 'crypto';
import { Registry, collectDefaultMetrics, Counter } from 'prom-client';
import type { FastifyRequest } from 'fastify';

const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'imobi_' });

export const liberacaoCounter = new Counter({
  name: 'imobi_liberacoes_total',
  help: 'Total de liberações de parcela processadas',
  labelNames: ['status'],
  registers: [registry],
});

export const reconciliacaoDivergenciasCounter = new Counter({
  name: 'imobi_reconciliacao_divergencias_total',
  help: 'Total de divergências detectadas na reconciliação',
  registers: [registry],
});

export const outboxEventCounter = new Counter({
  name: 'imobi_outbox_events_total',
  help: 'Total de outbox events processados',
  labelNames: ['status'],
  registers: [registry],
});

@SkipThrottle()
@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', registry.contentType)
  async getMetrics(@Req() req: FastifyRequest): Promise<string> {
    const token = process.env['METRICS_TOKEN'];
    if (token) {
      const auth = req.headers.authorization ?? '';
      const authBuf = Buffer.from(auth);
      const expectedBuf = Buffer.from(`Bearer ${token}`);
      const valid = authBuf.length === expectedBuf.length && timingSafeEqual(authBuf, expectedBuf);
      if (!valid) {
        throw new UnauthorizedException('Metrics token required.');
      }
    } else if (process.env['NODE_ENV'] === 'production') {
      // METRICS_TOKEN is required in production (env validator enforces this).
      // This else-branch is a defence-in-depth guard against empty-string misconfiguration
      // (METRICS_TOKEN= would be falsy, bypassing the auth check above).
      throw new UnauthorizedException('Metrics token not configured.');
    }
    return registry.metrics();
  }
}
