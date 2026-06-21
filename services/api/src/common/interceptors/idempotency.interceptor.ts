import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
} from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { Observable, tap } from "rxjs";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../modules/prisma/prisma.service";

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    const method = req.method?.toUpperCase();

    if (method !== "POST" && method !== "PATCH") return next.handle();

    const key = (req.headers as Record<string, string>)["idempotency-key"];
    if (!key) return next.handle();

    const endpoint = `${method}:${req.url}`;

    const existing = await this.prisma.idempotencyRecord.findUnique({ where: { key } });
    if (existing) {
      // Endpoint-collision check applies regardless of expiry: a key that was bound to
      // endpoint A should never silently execute against endpoint B, even after expiry.
      if (existing.endpoint !== endpoint) {
        throw new ConflictException("Idempotency-Key já usada em outro endpoint.");
      }

      const expired = existing.expiraEm < new Date();
      if (!expired) {
        const reply = ctx.switchToHttp().getResponse<FastifyReply>();
        reply.status(existing.statusCode).send(existing.responseBody);
        return new Observable((subscriber) => subscriber.complete());
      }

      // Expired with same endpoint: attempt to claim the key optimistically before re-executing.
      // PostgreSQL row-level locking ensures only one concurrent request wins the UPDATE;
      // the loser sees count=0 and replays whichever response the winner writes.
      const sentinel: Prisma.InputJsonValue = {};
      const claimed = await this.prisma.idempotencyRecord.updateMany({
        where: { key, expiraEm: { lte: new Date() } },
        data: { endpoint, statusCode: 0, responseBody: sentinel, expiraEm: new Date(Date.now() + TTL_MS) },
      });
      if (claimed.count === 0) {
        // Another concurrent request claimed this expired key; wait for their response to land
        // and replay it, or reject if they haven't written it yet.
        const fresh = await this.prisma.idempotencyRecord.findUnique({ where: { key } });
        if (fresh && fresh.statusCode > 0) {
          const reply = ctx.switchToHttp().getResponse<FastifyReply>();
          reply.status(fresh.statusCode).send(fresh.responseBody);
          return new Observable((subscriber) => subscriber.complete());
        }
        throw new ConflictException("Requisição duplicada em processamento.");
      }
      // Won the claim — fall through to execute and overwrite the sentinel in the tap below.
    }

    return next.handle().pipe(
      tap(async (body) => {
        const reply = ctx.switchToHttp().getResponse<FastifyReply>();
        const statusCode = reply.statusCode ?? 200;
        await this.prisma.idempotencyRecord.upsert({
          where: { key },
          create: {
            key,
            endpoint,
            statusCode,
            responseBody: body as Prisma.InputJsonValue,
            expiraEm: new Date(Date.now() + TTL_MS),
          },
          update: {
            statusCode,
            responseBody: body as Prisma.InputJsonValue,
            expiraEm: new Date(Date.now() + TTL_MS),
          },
        });
      }),
    );
  }
}
