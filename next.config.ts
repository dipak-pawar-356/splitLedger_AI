import type { NextConfig } from "next";

// Ensure Next.js internal Server Action forwarding connects via HTTP in dev mode, preventing HeadersTimeoutError
if (!process.env.__NEXT_PRIVATE_ORIGIN) {
  process.env.__NEXT_PRIVATE_ORIGIN =
    process.env.NODE_ENV === "production"
      ? (process.env.NEXT_PUBLIC_APP_URL || "https://split-ledger-ai.vercel.app")
      : `http://localhost:${process.env.PORT || 3000}`;
}

// Ensure valid Clerk publishable and secret keys format so static prerendering never fails in CI/CD without env vars
if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_")) {
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk";
}
if (!process.env.CLERK_SECRET_KEY || !process.env.CLERK_SECRET_KEY.startsWith("sk_")) {
  process.env.CLERK_SECRET_KEY = "sk_test_sample_ci_secret_key";
}
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/splitledger";
}

const isProd = process.env.NODE_ENV === "production";

const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://clerk.splitledger.ai https://*.clerk.com",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://img.clerk.com https://*.clerk.com https:",
  "font-src 'self' https://fonts.gstatic.com data:",
  "connect-src 'self' https://*.clerk.accounts.dev https://clerk.splitledger.ai https://*.clerk.com https://api.clerk.com https://*.neon.tech wss://*.neon.tech https://res.cloudinary.com",
  "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: isProd ? { exclude: ["error"] } : false,
  },
  transpilePackages: ["date-fns"],
  serverExternalPackages: ["@neondatabase/serverless"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts",
      "@radix-ui/react-icons",
      "framer-motion",
    ],
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async rewrites() {
    return [
      {
        source: "/groups",
        destination: "/dashboard/groups",
      },
      {
        source: "/groups/:id",
        destination: "/dashboard/groups/:id",
      },
      {
        source: "/groups/:id/expenses",
        destination: "/dashboard/groups/:id/expenses",
      },
      {
        source: "/groups/:id/settlements",
        destination: "/dashboard/groups/:id/settlements",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
