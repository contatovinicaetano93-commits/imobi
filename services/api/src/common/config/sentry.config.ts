import * as Sentry from "@sentry/node";
import { httpIntegration, onUncaughtExceptionIntegration, onUnhandledRejectionIntegration } from "@sentry/node";

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || "development";

  // Only initialize Sentry if DSN is provided
  if (!dsn) {
    console.log(
      "Sentry DSN not configured. Error tracking disabled. Set SENTRY_DSN to enable."
    );
    return;
  }

  Sentry.init({
    dsn,
    environment,
    integrations: [
      httpIntegration(),
      onUncaughtExceptionIntegration(),
      onUnhandledRejectionIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: environment === "production" ? 0.1 : 1.0,
    // Release tracking (optional, set via CI/CD)
    release: process.env.SENTRY_RELEASE,
    // Attachment capture
    attachStacktrace: true,
    // Request filtering
    beforeSend(event, hint) {
      // Filter out health check requests
      if (event.request?.url?.includes("/health")) {
        return null;
      }
      return event;
    },
  });

  console.log(`Sentry initialized in ${environment} mode`);
}

/**
 * Capture an exception manually (for non-thrown errors)
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (context) {
    Sentry.setContext("custom", context);
  }
  Sentry.captureException(error);
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = "info"): void {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, email?: string): void {
  Sentry.setUser({
    id: userId,
    email,
  });
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}
