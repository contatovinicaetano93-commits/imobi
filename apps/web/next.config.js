/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
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
    isrMemoryCacheSize: 52 * 1024 * 1024,
  },
  onDemandEntries: {
    maxInactiveAge: 60000,
    pagesBufferLength: 5,
  },
  staticPageGenerationTimeout: 300,
  webpack: (config) => {
    config.ignoreWarnings = [
      { module: /require-in-the-middle/ },
      { module: /@opentelemetry\/instrumentation/ },
    ];
    return config;
  },
};

// Allow export errors for special pages (404/500) - they'll be generated on-demand
const withBuildFallback = (config) => {
  return config;
};

module.exports = withBuildFallback(nextConfig);

module.exports = nextConfig;
