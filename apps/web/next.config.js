/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://imobi-api-staging.onrender.com";
const apiOrigin = (() => {
  try { return new URL(apiUrl).origin; } catch { return apiUrl; }
})();

// Scoped to the configured bucket so Next.js won't proxy images from
// arbitrary AWS accounts (the previous **.amazonaws.com wildcard allowed that).
const s3Bucket = process.env.AWS_S3_BUCKET ?? "imbobi-evidencias";
const s3Region = process.env.AWS_S3_REGION ?? "us-east-1";

const csp = [
  "default-src 'self'",
  // Next.js requires unsafe-inline for its inline script hydration chunks
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `img-src 'self' data: blob: https://${s3Bucket}.s3.${s3Region}.amazonaws.com https://${s3Bucket}.s3.amazonaws.com`,
  `connect-src 'self' ${apiOrigin} https://*.sentry.io https://*.ingest.sentry.io`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy",  value: csp },
  { key: "X-Content-Type-Options",   value: "nosniff" },
  { key: "X-Frame-Options",          value: "DENY" },
  { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",       value: "geolocation=(), microphone=(), camera=()" },
];

const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  transpilePackages: ["@imbobi/core", "@imbobi/schemas", "@imbobi/ui"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: `${s3Bucket}.s3.${s3Region}.amazonaws.com` },
      { protocol: "https", hostname: `${s3Bucket}.s3.amazonaws.com` },
    ],
  },
  experimental: {
    typedRoutes: true,
    serverComponentsExternalPackages: ["@opentelemetry/instrumentation", "require-in-the-middle"],
  },
  webpack: (config) => {
    config.ignoreWarnings = [
      { module: /require-in-the-middle/ },
      { module: /@opentelemetry\/instrumentation/ },
    ];
    return config;
  },
};

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(withBundleAnalyzer(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});
