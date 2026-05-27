import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { ExecutionContext } from "@nestjs/common";

/**
 * User-based rate limiter for authenticated endpoints
 * Tracks requests by User ID, falls back to IP if user not authenticated
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  async getTracker(req: Record<string, any>): Promise<string> {
    // Try to get user ID from JWT payload
    const userId = req.user?.id;

    if (userId) {
      return `user-${userId}`;
    }

    // Fallback to IP if no user authenticated
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
