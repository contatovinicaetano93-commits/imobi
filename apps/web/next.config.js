const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@imbobi/core", "@imbobi/schemas", "@imbobi/ui"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
    ],
  },
  experimental: {
    typedRoutes: true,
  },
  // Sentry configuration
  sentry: {
    // Suppress logs for all integrations, not just Sentry
    autoSessionTracking: false,
  },
};

// Wrap the config with Sentry
const sentryConfig = withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin/blob/master/README.md
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // An auth token is required for uploading source maps.
  // You can get an auth token from https://sentry.io/settings/account/tokens/
  // and you can set the auth token as an environment variable.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Suppresses all logs during source map uploads.
  silent: true,

  // For CI environments, you can set the SENTRY_SUPPRESS_SOURCE_MAP_UPLOAD
  // environment variable to skip uploading source maps.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});

module.exports = sentryConfig;
