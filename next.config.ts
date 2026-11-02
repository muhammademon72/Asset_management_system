import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  // Cloudflare Pages needs static files served from /public — Next.js does this
  // automatically when output: 'standalone' is set (the public folder is copied
  // to .next/standalone/public during build).
  experimental: {
    // Allow larger inlining of assets (avoids build warnings)
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

export default nextConfig;
