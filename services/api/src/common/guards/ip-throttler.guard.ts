import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { ExecutionContext } from "@nestjs/common";

/**
 * IP-based rate limiter for public endpoints (no authentication required)
 * Tracks requests by client IP address only
 */
@Injectable()
export class IpThrottlerGuard extends ThrottlerGuard {
  async getTracker(req: Record<string, any>): Promise<string> {
    // Use X-Forwarded-For for proxied requests, otherwise use direct IP
    const ip = req.ip ?? req.headers?.["x-forwarded-for"] ?? "unknown";
    return `ip-${ip}`;
  }

  protected getKey(
    context: ExecutionContext,
    limit: number,
    ttl: number
  ): string {
    const req = context.switchToHttp().getRequest();
    const tracker = this.getTracker(req);
    return `throttle:${context.getClass().name}:${context.getHandler().name}:${tracker}:${limit}:${ttl}`;
  }
}
