import * as Sentry from "@sentry/nextjs";

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Should be called once on application startup
 */
export function initSentry(): void {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const environment = process.env.NODE_ENV || "development";

  // Only initialize Sentry if DSN is provided
  if (!dsn) {
    console.log(
      "Sentry DSN not configured. Error tracking disabled. Set NEXT_PUBLIC_SENTRY_DSN to enable."
    );
    return;
  }

  Sentry.init({
    dsn,
    environment,
    // Performance Monitoring: capture 10% of transactions in production, 100% in development
    tracesSampleRate: environment === "production" ? 0.1 : 1.0,
    // Release tracking (optional, set via CI/CD)
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    // Capture console logs as breadcrumbs
    integrations: [
      Sentry.captureConsoleIntegration({
        levels: ["warn", "error"],
      }),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Replay sampling
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Request filtering
    beforeSend(event, hint) {
      // Filter out health check requests
      if (event.request?.url?.includes("/api/health")) {
        return null;
      }
      return event;
    },
  });

  console.log(`Sentry initialized in ${environment} mode`);
}

/**
 * Capture an exception manually
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
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info"
): void {
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

/**
 * Add a breadcrumb for tracking user actions
 */
export function addBreadcrumb(
  message: string,
  category: string = "user-action",
  level: Sentry.SeverityLevel = "info"
): void {
  Sentry.captureMessage(message, level);
  Sentry.addBreadcrumb({
    message,
    category,
    level,
  });
}
