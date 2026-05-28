import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";

/**
 * Initialize Sentry error tracking and performance monitoring
 * Must be called before app bootstrap in main.ts
 */
export function initializeSentry() {
  const environment = process.env["NODE_ENV"] || "development";
  const sentryDsn = process.env["SENTRY_DSN"];

  // Skip Sentry initialization if DSN is not configured
  if (!sentryDsn) {
    console.warn("SENTRY_DSN not configured, error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment,
    // Set sample rates for production to avoid quota exhaustion
    tracesSampleRate: environment === "production" ? 0.1 : 1.0,
    profilesSampleRate: environment === "production" ? 0.1 : 1.0,
    // Enable automatic capturing of performance metrics
    integrations: [
      nodeProfilingIntegration(),
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
    // Ignore health check endpoints to reduce noise
    ignoreErrors: [
      "/health",
      "/metrics",
      "NetworkError",
      "TimeoutError",
    ],
    // Attach stack trace to all messages
    attachStacktrace: true,
    // Track breadcrumbs for better context
    maxBreadcrumbs: 50,
  });
}

/**
 * Setup Sentry error handler middleware for Fastify
 */
export function setupSentryMiddleware(app: NestFastifyApplication) {
  const sentryDsn = process.env["SENTRY_DSN"];

  if (!sentryDsn) {
    return;
  }

  // Request handler must be the first middleware
  app.use(Sentry.Handlers.requestHandler() as any);

  // Error handler must be last
  app.use(Sentry.Handlers.errorHandler() as any);
}

/**
 * Manually capture an error to Sentry
 */
export function captureError(error: Error, context?: Record<string, unknown>) {
  const sentryDsn = process.env["SENTRY_DSN"];

  if (!sentryDsn) {
    return;
  }

  if (context) {
    Sentry.setContext("additional", context);
  }

  Sentry.captureException(error);
}

/**
 * Manually capture a message to Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = "info", context?: Record<string, unknown>) {
  const sentryDsn = process.env["SENTRY_DSN"];

  if (!sentryDsn) {
    return;
  }

  if (context) {
    Sentry.setContext("additional", context);
  }

  Sentry.captureMessage(message, level);
}

/**
 * Get the current Sentry scope for adding custom context
 */
export function getSentryScope(): Sentry.Scope {
  return Sentry.getCurrentScope();
}
