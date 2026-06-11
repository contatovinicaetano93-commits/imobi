import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'http';

@Injectable()
export class ProductionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ProductionMiddleware.name);

  use(req: IncomingMessage, res: ServerResponse, next: () => void): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    const path = req.url?.split('?')[0] ?? '/';
    const ip = req.socket?.remoteAddress ?? 'unknown';
    const userAgent = (req.headers['user-agent'] ?? '').substring(0, 100);

    this.logger.debug(`${req.method} ${path} ${ip} ${userAgent}`);

    next();
  }
}
