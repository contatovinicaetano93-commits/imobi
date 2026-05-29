import { Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(private reflector: Reflector) {
    super();
  }

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
