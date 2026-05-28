/**
 * Sentry Configuration for Next.js Web Application
 *
 * Error tracking and session replay for the imbobi web platform
 * Free tier: 5,000 events/month
 * Get DSN from: https://sentry.io/ → Settings → Projects → Next.js
 */

import * as Sentry from "@sentry/nextjs";

const isEnabled = process.env.SENTRY_ENABLED === "true";
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || "";

if (isEnabled && !dsn) {
  console.warn(
    "Sentry is enabled but NEXT_PUBLIC_SENTRY_DSN is not configured"
  );
}

export const initSentry = () => {
  if (!isEnabled || !dsn) {
    console.info("Sentry error tracking disabled");
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "development",
    integrations: [],
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0.5,
    // Session Replay is configured via next.config.js withSentryConfig
    beforeSend(event) {
      // Filter out certain errors in development
      if (process.env.NODE_ENV === "development") {
        // You can add custom filtering logic here
      }
      return event;
    },
  });
};

// Export Sentry for manual error tracking
export { Sentry };
