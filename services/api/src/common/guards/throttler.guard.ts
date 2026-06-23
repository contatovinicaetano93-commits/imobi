import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { ThrottlerModuleOptions, ThrottlerStorage } from "@nestjs/throttler";

const MONITORING_CONTROLLER_NAMES = new Set(["HealthController", "MetricsController"]);

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (await super.shouldSkip(context)) return true;

    if (MONITORING_CONTROLLER_NAMES.has(context.getClass()?.name ?? "")) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{
      url?: string;
      raw?: { url?: string };
      routeOptions?: { url?: string };
      routerPath?: string;
    }>();
    const path = req.url ?? req.raw?.url ?? req.routeOptions?.url ?? req.routerPath ?? "";
    // Render / uptime monitors hit /health and /metrics every few seconds — never limit
    if (path.includes("/health") || path.includes("/metrics")) return true;

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
      // Fallback: use a random token to avoid rate-limit bucket collision
      return `unknown:${Math.random()}`;
    }
    return `ip:${ip}`;
  }
}
