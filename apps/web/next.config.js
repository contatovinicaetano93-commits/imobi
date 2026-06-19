/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: "X-Content-Type-Options",        value: "nosniff" },
  { key: "X-Frame-Options",               value: "DENY" },
  { key: "X-XSS-Protection",             value: "1; mode=block" },
  { key: "Referrer-Policy",               value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",            value: "geolocation=(), microphone=(), camera=()" },
  { key: "Strict-Transport-Security",     value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy",    value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy",  value: "same-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.amazonaws.com https://*.r2.cloudflarestorage.com",
      "connect-src 'self' https://sentry.io https://*.ingest.sentry.io",
      "worker-src 'none'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  transpilePackages: ["@imbobi/core", "@imbobi/schemas", "@imbobi/ui"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
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

module.exports = nextConfig;
