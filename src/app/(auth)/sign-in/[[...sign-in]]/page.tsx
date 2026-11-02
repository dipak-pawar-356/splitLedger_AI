import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { createPageMetadata } from "@/lib/seo/config";

export const metadata: Metadata = createPageMetadata({
  title: "Sign In to Your Financial Ledger",
  description: "Securely sign in to your SplitLedger AI personal finance and shared expense management account.",
  path: "/sign-in",
  noIndex: true,
});

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md">
        <SignIn
          appearance={{
            elements: {
              card: {
                boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.04)",
              },
            },
          }}
          fallbackRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
