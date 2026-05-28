/**
 * New Relic APM Configuration
 *
 * This module initializes the New Relic agent for application performance monitoring.
 * The agent must be imported BEFORE any other dependencies in main.ts.
 *
 * Features:
 * - Distributed tracing across services
 * - Real-time performance monitoring
 * - Error tracking and alerting
 * - Custom instrumentation for NestJS + Fastify
 */

/**
 * Initialize New Relic APM Agent
 * Must be called before any other code is loaded
 */
export const initializeNewRelic = (): void => {
  // Only initialize if enabled and license key is present
  if (!process.env["NEW_RELIC_ENABLED"] || process.env["NEW_RELIC_ENABLED"] === "false") {
    console.log("[NewRelic] APM monitoring disabled via NEW_RELIC_ENABLED=false");
    return;
  }

  const licenseKey = process.env["NEW_RELIC_LICENSE_KEY"];
  if (!licenseKey) {
    console.warn(
      "[NewRelic] NEW_RELIC_LICENSE_KEY not set. APM monitoring will not work. " +
        "Configure it in your .env file to enable monitoring."
    );
    return;
  }

  try {
    // Require the New Relic agent - this MUST happen early
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("newrelic");

    const appName = process.env["NEW_RELIC_APP_NAME"] || "imbobi-api";
    const environment = process.env["NODE_ENV"] || "development";

    console.log(`[NewRelic] APM initialized for "${appName}" in ${environment} environment`);
  } catch (error) {
    console.error("[NewRelic] Failed to initialize APM agent:", error);
    // Don't fail the app startup if New Relic fails - monitoring is optional
  }
};

/**
 * Get New Relic configuration summary
 */
export const getNewRelicConfig = () => {
  return {
    enabled: process.env["NEW_RELIC_ENABLED"] === "true",
    appName: process.env["NEW_RELIC_APP_NAME"] || "imbobi-api",
    licenseKeySet: !!process.env["NEW_RELIC_LICENSE_KEY"],
    environment: process.env["NODE_ENV"] || "development",
  };
};
