/**
 * Sentry Configuration for NestJS API
 *
 * Error tracking and performance monitoring for the imbobi API
 * Free tier: 5,000 events/month
 * Get DSN from: https://sentry.io/ → Settings → Projects → Node.js
 */

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

export interface SentryConfig {
  isEnabled: boolean;
  dsn: string;
  environment: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
}

export const getSentryConfig = (): SentryConfig => {
  const isEnabled = process.env.SENTRY_ENABLED === "true";
  const dsn = process.env.SENTRY_DSN || "";
  const environment = process.env.SENTRY_ENVIRONMENT || "development";
  const nodeEnv = process.env.NODE_ENV || "development";

  if (isEnabled && !dsn) {
    console.warn("Sentry is enabled but SENTRY_DSN is not configured");
  }

  return {
    isEnabled: isEnabled && !!dsn,
    dsn,
    environment,
    // Higher sample rate in development, lower in production
    tracesSampleRate: nodeEnv === "production" ? 0.1 : 0.5,
    // Profiling sample rate
    profilesSampleRate: nodeEnv === "production" ? 0.1 : 0.5,
  };
};

/**
 * Initialize Sentry for NestJS application
 * Call this in main.ts before NestFactory.create()
 */
export const initSentry = (config?: SentryConfig) => {
  const sentryConfig = config || getSentryConfig();

  if (!sentryConfig.isEnabled) {
    console.info("Sentry error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: sentryConfig.dsn,
    environment: sentryConfig.environment,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: sentryConfig.tracesSampleRate,
    profilesSampleRate: sentryConfig.profilesSampleRate,
    beforeSend(event) {
      // Filter out health check errors
      if (event.request?.url?.includes("/api/v1/health")) {
        return null;
      }

      // Filter out 4xx errors in development
      if (process.env.NODE_ENV === "development") {
        // Optional: uncomment to skip client errors in development
        // if (event.level === 'warning') {
        //   return null;
        // }
      }

      return event;
    },
  });
};

/**
 * Wrap Fastify request handler with Sentry tracing
 * The Fastify integration is handled automatically by Sentry.init()
 * This middleware is for reference and is called in main.ts.
 */
export { Sentry };
