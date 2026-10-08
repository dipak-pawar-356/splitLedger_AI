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

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
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
};

export default nextConfig;
