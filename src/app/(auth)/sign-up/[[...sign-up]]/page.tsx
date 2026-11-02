import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { createPageMetadata } from "@/lib/seo/config";

export const metadata: Metadata = createPageMetadata({
  title: "Create Your Free SplitLedger AI Account",
  description: "Join SplitLedger AI to track personal expenses, split group bills with friends, and settle balances with dynamic UPI QR codes.",
  path: "/sign-up",
  noIndex: true,
});

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md">
        <SignUp
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
