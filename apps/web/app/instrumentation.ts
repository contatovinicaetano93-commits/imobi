/**
 * Next.js Instrumentation for Sentry
 * This file is automatically loaded by Next.js during server startup
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { initSentry } from "../sentry.config";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialize Sentry on server startup
    initSentry();
  }
}
