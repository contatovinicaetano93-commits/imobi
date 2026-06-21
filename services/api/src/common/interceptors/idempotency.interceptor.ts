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
      if (existing.expiraEm < new Date()) {
        await this.prisma.idempotencyRecord.delete({ where: { key } });
      } else if (existing.endpoint !== endpoint) {
        throw new ConflictException("Idempotency-Key já usada em outro endpoint.");
      } else {
        const reply = ctx.switchToHttp().getResponse<FastifyReply>();
        reply.status(existing.statusCode).send(existing.responseBody);
        return new Observable((subscriber) => subscriber.complete());
      }
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
