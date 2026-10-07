"use client";

import { ClerkProvider } from "@clerk/nextjs";

function getSafePublishableKey(): string {
  const envKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!envKey) return "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk";

  // Check if valid Clerk publishable key format (starts with pk_test_ or pk_live_ and contains valid base64 ending with $)
  if (/^pk_(test|live)_[A-Za-z0-9+/=]+$/.test(envKey)) {
    try {
      const b64 = envKey.replace(/^pk_(test|live)_/, "");
      if (typeof atob === "function") {
        const decoded = atob(b64);
        if (decoded.endsWith("$")) return envKey;
      } else {
        return envKey;
      }
    } catch (_) {
      // Malformed base64
    }
  }

  // Fallback to valid-format test key to prevent prerendering / build crashes
  return "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk";
}

export function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = getSafePublishableKey();

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        elements: {
          card: {
            boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.04)",
          },
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
