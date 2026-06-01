import * as Sentry from "@sentry/nestjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

export function initSentry(environment: string, release?: string) {
  const sentryDsn = process.env.SENTRY_DSN;

  if (!sentryDsn) {
    console.warn("⚠️  SENTRY_DSN not configured. Error tracking disabled.");
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment,
    release,
    tracesSampleRate: environment === "production" ? 0.1 : 1.0,
    profilesSampleRate: environment === "production" ? 0.1 : 1.0,
    integrations: [nodeProfilingIntegration()],
    beforeSend(event, hint) {
      if (event.request?.url?.includes("/health")) {
        return null;
      }
      return event;
    },
  });

  console.log(`✅ Sentry initialized for ${environment} environment`);
}

export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.captureException(error, { extra: context });
  } else {
    Sentry.captureException(error);
  }
}

export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
) {
  Sentry.captureMessage(message, level);
}

export function setUserContext(userId: string, userData?: Record<string, any>) {
  Sentry.setUser({ id: userId, ...userData });
}

export function clearUserContext() {
  Sentry.setUser(null);
}
