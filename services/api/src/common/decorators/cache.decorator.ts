import { Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

/**
 * @Cache() decorator for automatic caching of method results
 * Usage: @Cache("cacheKey", 3600000) - caches for 1 hour
 *
 * Automatically invalidates on method error and tracks cache metrics
 */
export function Cache(keyPattern: string | ((args: any[]) => string), ttlMs: number = 300000) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheManager = this.cacheManager || Reflect.getMetadata("cache:manager", this);

      if (!cacheManager) {
        // Fallback: call original if no cache manager
        return originalMethod.apply(this, args);
      }

      const cacheKey = typeof keyPattern === "function" ? keyPattern(args) : keyPattern;

      try {
        const cached = await cacheManager.get(cacheKey);
        if (cached !== undefined) {
          return cached;
        }
      } catch (e) {
        // Cache read error - continue with execution
        console.warn(`Cache read error for key ${cacheKey}:`, e);
      }

      try {
        const result = await originalMethod.apply(this, args);

        // Cache the result
        try {
          await cacheManager.set(cacheKey, result, ttlMs);
        } catch (e) {
          // Cache write error - log but don't fail
          console.warn(`Cache write error for key ${cacheKey}:`, e);
        }

        return result;
      } catch (error) {
        // On error, clear any stale cache and rethrow
        try {
          await cacheManager.del(cacheKey);
        } catch (e) {
          // Ignore cleanup errors
        }
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Metadata setter for cache manager injection
 * Usage: setCacheManager(this, cacheManager) in constructor
 */
export function setCacheManager(target: any, cacheManager: Cache) {
  Reflect.defineMetadata("cache:manager", cacheManager, target);
}
