/**
 * New Relic Configuration File
 *
 * This file configures the New Relic APM agent.
 * The agent is initialized in src/main.ts using initializeNewRelic()
 *
 * Documentation: https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration/
 */

'use strict';

module.exports = {
  /**
   * Array of application names for the agent to report to.
   * IMPORTANT: The license key must be set via NEW_RELIC_LICENSE_KEY env var
   */
  app_name: [process.env.NEW_RELIC_APP_NAME || 'imbobi-api'],

  /**
   * Use the license key specified in the NEW_RELIC_LICENSE_KEY env var
   */
  license_key: process.env.NEW_RELIC_LICENSE_KEY,

  /**
   * Logging configuration
   */
  logging: {
    level: 'info',
    filepath: 'stdout',
  },

  /**
   * Enable/disable distributed tracing
   */
  distributed_tracing: {
    enabled: true,
  },

  /**
   * Enable/disable transaction events
   */
  transaction_events: {
    enabled: true,
  },

  /**
   * Custom instrumentation: capture errors from unhandled promise rejections
   */
  capture_params: true,

  /**
   * Only send data if NEW_RELIC_ENABLED is not explicitly false
   */
  agent_enabled: process.env.NEW_RELIC_ENABLED !== 'false',

  /**
   * Environment name for New Relic
   */
  environment: [process.env.NODE_ENV || 'development'],
};
