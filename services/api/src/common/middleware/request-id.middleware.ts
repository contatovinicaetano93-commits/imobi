import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "crypto";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: any) {
    const id = (req.headers["x-request-id"] as string) || randomUUID();
    const traceId = (req.headers["x-trace-id"] as string) || randomUUID();

    req.id = id;
    req.traceId = traceId;
    req.startTime = Date.now();

    res.setHeader("x-request-id", id);
    res.setHeader("x-trace-id", traceId);

    next();
  }
}
