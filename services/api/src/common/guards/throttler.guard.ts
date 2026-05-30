import { Reflector } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { ThrottlerModuleOptions, ThrottlerStorage } from "@nestjs/throttler";

export class CustomThrottlerGuard extends ThrottlerGuard {
  // Guard is instantiated via factory provider in app.module.ts
  // Injects: THROTTLER_OPTIONS, ThrottlerStorage, and Reflector

  async getTracker(req: Record<string, any>): Promise<string> {
    // For authenticated requests, track by user ID from JWT
    if (req.user && typeof req.user === 'object' && req.user.usuarioId) {
      return `user:${req.user.usuarioId}`;
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
