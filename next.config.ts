import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  eslint: {
    // ESLint errors will not fail the Vercel build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TypeScript errors will not fail the Vercel build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
