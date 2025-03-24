/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    config.module.rules.push({
      test: /\.(wasm)$/,
      type: 'webassembly/async'
    });

    return config;
  },
  
  // Disable SWC in favor of Babel
  swcMinify: false,
  
  // Enable WebAssembly
  experimental: {
    webpackBuildWorker: true
  }
};

module.exports = nextConfig;