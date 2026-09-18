/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), '@vladmandic/face-api'];
    }
    config.module = {
      ...config.module,
      exprContextCritical: false,
    };
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /face-api/ },
      /Critical dependency/,
    ];
    return config;
  },
};

module.exports = nextConfig;
