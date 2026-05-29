import { Reflector } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { ThrottlerModuleOptions, ThrottlerStorage } from "@nestjs/throttler";

export class CustomThrottlerGuard extends ThrottlerGuard {
  // Guard is instantiated via factory provider in app.module.ts
  // Injects: THROTTLER_OPTIONS, ThrottlerStorage, and Reflector

  async getTracker(req: Record<string, any>): Promise<string> {
    // For authenticated requests, track by user ID from JWT
    if (req.user?.usuarioId) {
      return `user:${req.user.usuarioId}`;
    }

    // For unauthenticated requests, track by IP address
    const ip = req.ip ?? req.headers?.["x-forwarded-for"] ?? "unknown";
    return `ip:${ip}`;
  }
}
