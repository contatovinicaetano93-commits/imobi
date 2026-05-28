import { SetMetadata } from "@nestjs/common";

export type ThrottlerName = "general" | "auth" | "kyc" | "marketplace" | "upload" | "manager" | "api-key" | "password-reset";

/**
 * Decorator to specify rate limit throttler for specific endpoints
 *
 * Supports two formats:
 * 1. Named throttler: @RateLimit('auth')
 * 2. Custom limits: @RateLimit(limit, windowMinutes)
 *
 * @example
 * @Post('login')
 * @RateLimit('auth')
 * async login() { ... }
 *
 * @example
 * @Post('kyc/validate')
 * @RateLimit(10, 5) // 10 requests per 5 minutes
 * async validate() { ... }
 */
export const RateLimit = (throttlerOrLimit: ThrottlerName | number, windowMinutes?: number) => {
  if (typeof throttlerOrLimit === "number") {
    // Custom limit format: RateLimit(limit, windowMinutes)
    return SetMetadata("throttler:custom", {
      limit: throttlerOrLimit,
      ttl: (windowMinutes ?? 1) * 60 * 1000, // Convert minutes to milliseconds
    });
  }
  // Named throttler format: RateLimit('auth')
  return SetMetadata("throttler:key", throttlerOrLimit);
};

/**
 * Decorator to skip rate limiting for specific endpoints
 * Use with caution - only for truly public endpoints
 *
 * @example
 * @Get('health')
 * @SkipRateLimit()
 * async health() { ... }
 */
export const SkipRateLimit = () => SetMetadata("throttler:skip", true);
