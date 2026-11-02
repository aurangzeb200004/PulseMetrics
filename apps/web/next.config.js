/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow API routes to use Node.js built-ins
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Ensure API routes are not treated as static
  output: undefined,
};

module.exports = nextConfig;
