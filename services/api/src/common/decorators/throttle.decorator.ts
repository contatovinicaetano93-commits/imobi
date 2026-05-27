import { SetMetadata } from "@nestjs/common";

export const THROTTLER_LIMIT = "throttler_limit";
export const THROTTLER_TTL = "throttler_ttl";

/**
 * Decorator to set custom rate limit and TTL for a specific endpoint
 * @param limit - Maximum number of requests
 * @param ttl - Time to live in milliseconds
 *
 * @example
 * @Throttle(5, 15 * 60 * 1000) // 5 requests per 15 minutes
 */
export const Throttle = (limit: number, ttl: number) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    SetMetadata(THROTTLER_LIMIT, limit)(target, propertyKey, descriptor);
    return SetMetadata(THROTTLER_TTL, ttl)(target, propertyKey, descriptor);
  };
};
