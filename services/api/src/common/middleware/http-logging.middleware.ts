import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import { StructuredLogger } from '../logger/structured-logger';

const SKIP_PATHS = new Set(['/health', '/favicon.ico']);

@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  private readonly logger = new StructuredLogger('HTTP');

  use(req: IncomingMessage & { user?: { id?: string } }, res: ServerResponse, next: () => void): void {
    const path = req.url?.split('?')[0] ?? '/';

    if (SKIP_PATHS.has(path)) {
      return next();
    }

    const requestId = randomUUID();
    const startMs = Date.now();
    const method = req.method ?? 'GET';
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
      ?? req.socket?.remoteAddress
      ?? 'unknown';

    res.setHeader('X-Request-Id', requestId);

    res.on('finish', () => {
      const duration = Date.now() - startMs;
      const status = res.statusCode;
      const userId = (req as any).user?.id ?? undefined;
      const ctx = { requestId, method, path, status, duration, ip, userId };
      const msg = `${method} ${path} ${status}`;

      if (status >= 500) {
        this.logger.error(msg, undefined, ctx);
      } else if (status >= 400) {
        this.logger.warn(msg, ctx);
      } else {
        this.logger.log(msg, ctx);
      }
    });

    next();
  }
}
