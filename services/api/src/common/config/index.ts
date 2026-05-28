/**
 * Production-ready configuration module
 *
 * Centralized configuration for:
 * - APM & Monitoring (New Relic)
 * - Redis (cache + job queues)
 * - Rate limiting
 * - Email (SendGrid, AWS SES, SMTP)
 * - Firebase/FCM (push notifications)
 */

export * from "./newrelic.config";
export * from "./redis.config";
export * from "./rate-limit.config";
export * from "./email.config";
export * from "./firebase.config";

/**
 * Environment validation helper
 */
export const validateProductionEnv = (): string[] => {
  const errors: string[] = [];

  // JWT_SECRET is ALWAYS required
  if (!process.env["JWT_SECRET"] || process.env["JWT_SECRET"].length < 32) {
    errors.push(
      "JWT_SECRET must be set and at least 32 characters long (use openssl rand -base64 48)"
    );
  }

  // Redis is required in production
  if (process.env["NODE_ENV"] === "production") {
    if (
      !process.env["REDIS_URL"] &&
      (!process.env["REDIS_HOST"] || !process.env["REDIS_PORT"])
    ) {
      errors.push("Redis configuration required (REDIS_URL or REDIS_HOST/PORT)");
    }

    // At least one email provider should be configured
    if (!process.env["EMAIL_PROVIDER"]) {
      errors.push("EMAIL_PROVIDER must be set (sendgrid, ses, or smtp)");
    }

    // Firebase is recommended for mobile push notifications
    if (!process.env["FIREBASE_PROJECT_ID"]) {
      console.warn(
        "Warning: Firebase not configured - push notifications disabled"
      );
    }
  }

  return errors;
};

/**
 * Production configuration summary for logging
 */
export const getConfigSummary = () => {
  return {
    environment: process.env["NODE_ENV"] || "development",
    redis: {
      enabled: !!(
        process.env["REDIS_URL"] ||
        (process.env["REDIS_HOST"] && process.env["REDIS_PORT"])
      ),
      url: process.env["REDIS_URL"] ? "***" : "not configured",
    },
    email: {
      provider: process.env["EMAIL_PROVIDER"] || "smtp",
      from: process.env["SMTP_FROM"] || "noreply@imbobi.com.br",
    },
    firebase: {
      enabled: !!process.env["FIREBASE_PROJECT_ID"],
      projectId: process.env["FIREBASE_PROJECT_ID"] || "not configured",
    },
    cors: {
      origin: process.env["CORS_ORIGIN"] || "http://localhost:3000",
    },
  };
};
