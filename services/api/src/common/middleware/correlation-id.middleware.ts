import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';

export const CORRELATION_ID_HEADER = 'x-request-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const existing = req.headers[CORRELATION_ID_HEADER] as string | undefined;
    const id = existing && /^[\w-]{8,64}$/.test(existing) ? existing : randomUUID();
    req.headers[CORRELATION_ID_HEADER] = id;
    res.setHeader(CORRELATION_ID_HEADER, id);
    next();
  }
}
