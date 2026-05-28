import { SetMetadata } from "@nestjs/common";

export type ThrottlerName = "general" | "auth" | "upload" | "manager" | "api-key" | "password-reset";

/**
 * Decorator to specify rate limit throttler for specific endpoints
 *
 * @example
 * @Post('login')
 * @RateLimit('auth')
 * async login() { ... }
 *
 * @example
 * @Post('upload')
 * @RateLimit('upload')
 * async upload() { ... }
 */
export const RateLimit = (throttler: ThrottlerName) =>
  SetMetadata("throttler:key", throttler);

/**
 * Decorator to skip rate limiting for specific endpoints
 * Use with caution - only for truly public endpoints
 *
 * @example
 * @Get('health')
 * @SkipThrottle()
 * async health() { ... }
 */
export const SkipRateLimit = () => SetMetadata("throttler:skip", true);
