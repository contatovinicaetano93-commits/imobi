import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { CORRELATION_ID_HEADER } from './correlation-id.middleware';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: any, res: any, next: () => void) {
    const { method } = req;
    const url: string = req.originalUrl ?? req.url ?? '';
    const requestId = (req.headers[CORRELATION_ID_HEADER] as string) ?? '-';
    const start = Date.now();

    const finish = () => {
      const ms = Date.now() - start;
      const status: number = res.statusCode;
      this.logger.log(`[${requestId}] ${method} ${url} ${status} ${ms}ms`);
    };

    res.on('finish', finish);
    next();
  }
}
