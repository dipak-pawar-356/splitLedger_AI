import type { NextConfig } from "next";

// Ensure Next.js internal Server Action forwarding connects via HTTP in dev mode, preventing HeadersTimeoutError
if (!process.env.__NEXT_PRIVATE_ORIGIN) {
  process.env.__NEXT_PRIVATE_ORIGIN =
    process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
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
};

export default nextConfig;
