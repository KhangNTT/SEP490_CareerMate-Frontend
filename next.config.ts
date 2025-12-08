import type { NextConfig } from "next";

// Bundle analyzer configuration
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  outputFileTracingRoot: __dirname,

  // ========================================
  // 🚀 PERFORMANCE OPTIMIZATIONS
  // ========================================

  // Temporarily ignore TypeScript and ESLint errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Enable compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  // Optimize production builds
  reactStrictMode: true,

  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn-icons-png.flaticon.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
        port: "",
        pathname: "/**",
      },
    ],
    // Image optimization settings
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  // Optimize production builds
  experimental: {
    // Enable optimized CSS
    optimizeCss: true,
    // Optimize package imports
    optimizePackageImports: [
      "lucide-react",
      "react-icons",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-label",
      "@radix-ui/react-slot",
    ],
    // ========================================
    // ✅ FIX: Mark packages as external for serverless
    // ========================================
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  },

  // ========================================
  // ✅ FIX: Force include chromium binary files in Lambda
  // ========================================
  outputFileTracingIncludes: {
    '/api/export-pdf': ['./node_modules/@sparticuz/chromium/bin/**'],
    '/api/export-pdf/job': ['./node_modules/@sparticuz/chromium/bin/**'],
    '/api/export-pdf/job/[jobId]': ['./node_modules/@sparticuz/chromium/bin/**'],
    '/candidate/cv/api/export-pdf': ['./node_modules/@sparticuz/chromium/bin/**'],
  },

  // Reduce bundle size
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
    },
  },
} satisfies NextConfig;

export default withBundleAnalyzer(nextConfig);
