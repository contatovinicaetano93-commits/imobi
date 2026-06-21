import { Controller, Get, Header, Req, UnauthorizedException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { timingSafeEqual } from 'crypto';
import type { FastifyRequest } from 'fastify';
import { registry } from '../utils/metrics.registry';

export { liberacaoCounter, reconciliacaoDivergenciasCounter, outboxEventCounter } from '../utils/metrics.registry';

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
