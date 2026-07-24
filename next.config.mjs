/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer uses canvas and other Node-only APIs.
  // Mark it as external so webpack doesn't try to bundle it for the browser.
  webpack: (config, { isServer }) => {
    if (isServer) {
      return config;
    }
    // Client bundle: tell webpack to ignore these Node-only packages
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      fs: false,
      stream: false,
      zlib: false,
    };
    return config;
  },

  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
};

export default nextConfig;
