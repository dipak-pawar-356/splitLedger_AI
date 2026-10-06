"use client";

import { ClerkProvider } from "@clerk/nextjs";

export function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
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
