import { Injectable, NestMiddleware, Logger } from '@nestjs/common';

@Injectable()
export class ProductionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ProductionMiddleware.name);

  use(req: any, res: any, next: any): void {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Remove server info
    res.removeHeader('X-Powered-By');

    // Log request (but not credentials)
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'production') {
      const sensitivePatterns = [
        /password/i,
        /token/i,
        /key/i,
        /authorization/i,
        /x-api-key/i,
      ];

      const logInfo = {
        method: req.method,
        path: req.path,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent')?.substring(0, 100),
        timestamp: new Date().toISOString(),
      };

      // Check if sensitive data in body
      if (req.body && typeof req.body === 'object') {
        const bodySummary: Record<string, string> = {};
        Object.keys(req.body).forEach((key) => {
          const isSensitive = sensitivePatterns.some((pattern) =>
            pattern.test(key),
          );
          bodySummary[key] = isSensitive ? '[REDACTED]' : typeof req.body[key];
        });
        Object.assign(logInfo, { bodySummary });
      }

      this.logger.debug(`${req.method} ${req.path}`, logInfo);
    }

    next();
  }
}
