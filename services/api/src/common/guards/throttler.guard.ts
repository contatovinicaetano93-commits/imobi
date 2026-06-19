import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { ThrottlerModuleOptions, ThrottlerStorage } from "@nestjs/throttler";

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (await super.shouldSkip(context)) return true;

    const req = context.switchToHttp().getRequest<{ url?: string; raw?: { url?: string } }>();
    const path = req.url ?? req.raw?.url ?? "";
    // Render / uptime monitors batem /health a cada poucos segundos — nunca limitar
    if (path.includes("/health")) return true;

    return false;
  }

  async getTracker(req: Record<string, any>): Promise<string> {
    // For authenticated requests, track by user ID from JWT
    if (req.user && typeof req.user === 'object' && req.user.id) {
      return `user:${req.user.id}`;
    }

    // For unauthenticated or malformed user objects, track by IP address
    const ip = req.ip ?? req.headers?.["x-forwarded-for"] ?? req.socket?.remoteAddress ?? "unknown";
    if (ip === "unknown") {
      return `ip:unknown`;
    }
    return `ip:${ip}`;
  }
}
