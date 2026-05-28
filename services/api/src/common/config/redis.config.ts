import { redisStore } from "cache-manager-redis-yet";

/**
 * Production-ready Redis configuration for caching and job queues
 *
 * Supports two connection modes:
 * 1. Connection string (REDIS_URL) - Recommended for cloud deployments
 * 2. Individual vars (REDIS_HOST, REDIS_PORT, etc) - For traditional setups
 */
export const getRedisConfig = async (): Promise<{ store: any }> => {
  const redisUrl =
    process.env["REDIS_URL"] ||
    `redis://${process.env["REDIS_PASSWORD"] ? `:${process.env["REDIS_PASSWORD"]}@` : ""}${process.env["REDIS_HOST"] ?? "localhost"}:${process.env["REDIS_PORT"] ?? 6379}/${process.env["REDIS_DB"] ?? 0}`;

  return {
    store: await redisStore({
      url: redisUrl,
      ttl: 300, // 5 min default TTL
    }),
  };
};

/**
 * Redis connection options for BullMQ job queues
 * Uses same connection details as cache for consistency
 */
export const getBullRedisConfig = () => {
  if (process.env["REDIS_URL"]) {
    return {
      url: process.env["REDIS_URL"],
    };
  }

  return {
    host: process.env["REDIS_HOST"] ?? "localhost",
    port: Number(process.env["REDIS_PORT"] ?? 6379),
    password: process.env["REDIS_PASSWORD"],
    db: Number(process.env["REDIS_DB"] ?? 0),
  };
};

/**
 * Cache key patterns for different features
 * Helps prevent cache collisions and enables strategic invalidation
 */
export const CACHE_KEYS = {
  // User caching
  USER: (id: string) => `user:${id}`,
  USER_CREDITS: (id: string) => `user:credits:${id}`,
  USER_OBRAS: (id: string) => `user:obras:${id}`,

  // Obra caching
  OBRA: (id: string) => `obra:${id}`,
  OBRA_ETAPAS: (id: string) => `obra:etapas:${id}`,
  OBRA_EVIDENCIAS: (id: string) => `obra:evidencias:${id}`,

  // Score caching
  SCORE: (id: string) => `score:${id}`,
  SCORE_HISTORY: (id: string) => `score:history:${id}`,

  // Credit caching
  CREDIT_SUMMARY: (id: string) => `credit:summary:${id}`,

  // Marketplace caching
  MARKETPLACE_PARCEIROS: `marketplace:parceiros`,
  MARKETPLACE_OFFERINGS: (id: string) => `marketplace:offerings:${id}`,

  // Geographical caching (PostGIS results)
  LOCATION_VALIDATION: (lat: number, lng: number) => `location:${lat}:${lng}`,
} as const;

/**
 * TTL settings for different cache types (in seconds)
 * Balances freshness vs. database load
 */
export const CACHE_TTL = {
  SHORT: 60, // 1 minute - for frequently changing data
  MEDIUM: 300, // 5 minutes - default for most data
  LONG: 1800, // 30 minutes - for stable data
  VERY_LONG: 3600, // 1 hour - for rarely changing data
} as const;
