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
    isrMemoryCacheSize: 0,
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
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

module.exports = nextConfig;
