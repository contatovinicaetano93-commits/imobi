import type { ThrottlerModuleOptions } from "@nestjs/throttler";

/**
 * Production-ready rate limiting configuration
 *
 * Different limits for different endpoint types:
 * - General endpoints: 100 requests per minute (standard API usage)
 * - Auth endpoints: 10 requests per minute (prevent brute force)
 * - File uploads: 5 requests per minute (prevent storage abuse)
 * - Manager operations: 20 requests per minute (admin actions)
 *
 * Rate limits are per IP address by default in @nestjs/throttler
 */
export const getRateLimitConfig = (): ThrottlerModuleOptions => {
  const isProduction = process.env["NODE_ENV"] === "production";

  if (isProduction) {
    // Stricter limits in production
    return [
      {
        ttl: 60000, // 1 minute window
        limit: 100, // General endpoints: 100 req/min
        name: "general",
      },
      {
        ttl: 60000,
        limit: 10, // Auth endpoints: 10 req/min (prevent brute force)
        name: "auth",
      },
      {
        ttl: 60000,
        limit: 5, // File uploads: 5 req/min (prevent storage abuse)
        name: "upload",
      },
      {
        ttl: 60000,
        limit: 20, // Manager operations: 20 req/min
        name: "manager",
      },
      {
        ttl: 60000,
        limit: 3, // API key generation: 3 req/min (critical operation)
        name: "api-key",
      },
      {
        ttl: 60000,
        limit: 5, // Password reset: 5 attempts per minute
        name: "password-reset",
      },
    ];
  }

  // Relaxed limits in development
  return [
    {
      ttl: 60000,
      limit: 1000,
      name: "general",
    },
    {
      ttl: 60000,
      limit: 100,
      name: "auth",
    },
    {
      ttl: 60000,
      limit: 100,
      name: "upload",
    },
    {
      ttl: 60000,
      limit: 100,
      name: "manager",
    },
  ];
};

/**
 * Endpoint patterns that should apply specific rate limits
 * Used by guards and interceptors to apply correct throttler names
 */
export const RATE_LIMIT_PATTERNS = {
  AUTH: [
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/refresh",
    "/api/v1/auth/logout",
  ],
  UPLOAD: [
    "/api/v1/evidencias/upload",
    "/api/v1/usuarios/avatar/upload",
    "/api/v1/manager/bulk-upload",
  ],
  MANAGER: [
    "/api/v1/manager",
    "/api/v1/manager/usuarios/approve",
    "/api/v1/manager/kyc",
    "/api/v1/manager/disputes",
  ],
  API_KEY: ["/api/v1/auth/api-key"],
  PASSWORD_RESET: [
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/reset-password",
  ],
} as const;
