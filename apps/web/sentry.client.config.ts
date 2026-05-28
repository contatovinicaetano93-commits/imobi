import * as Sentry from "@sentry/react";

const environment = process.env.NODE_ENV || "development";
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

/**
 * Initialize Sentry for client-side error tracking and performance monitoring
 */
export function initSentryClient() {
  // Skip initialization if DSN is not configured
  if (!sentryDsn) {
    console.warn("NEXT_PUBLIC_SENTRY_DSN not configured, error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment,
    // Set sample rates for production to avoid quota exhaustion
    tracesSampleRate: environment === "production" ? 0.1 : 1.0,
    // Enable automatic capturing of performance metrics
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Capture replays for 10% of all sessions, plus all sessions with an error
    replaysSessionSampleRate: environment === "production" ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    // Attach stack trace to all messages
    attachStacktrace: true,
    // Track breadcrumbs for better context
    maxBreadcrumbs: 50,
  });
}

/**
 * Get the current Sentry scope for adding custom context
 */
export function getSentryScope(): Sentry.Scope {
  return Sentry.getCurrentScope();
}

/**
 * Set user context
 */
export function setSentryUser(userId: string, email?: string, username?: string) {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
}

/**
 * Clear user context
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Manually capture an error
 */
export function captureError(error: Error, context?: Record<string, unknown>) {
  if (!sentryDsn) {
    return;
  }

  if (context) {
    Sentry.setContext("additional", context);
  }

  Sentry.captureException(error);
}

/**
 * Manually capture a message
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  context?: Record<string, unknown>,
) {
  if (!sentryDsn) {
    return;
  }

  if (context) {
    Sentry.setContext("additional", context);
  }

  Sentry.captureMessage(message, level);
}
