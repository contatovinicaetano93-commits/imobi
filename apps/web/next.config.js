/** @type {import('next').NextConfig} */

// Initialize Sentry for error tracking
const { withSentryConfig } = require("@sentry/nextjs");

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
};

module.exports = withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,

  // Org slug and project name - set via SENTRY_AUTH_TOKEN in CI/CD
  org: process.env.SENTRY_ORG || "imbobi",
  project: process.env.SENTRY_PROJECT_WEB || "web",

  // Only upload source maps in production builds
  shouldHideSourcemaps: true,
});
