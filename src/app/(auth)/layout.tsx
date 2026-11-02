import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/config";

export const metadata: Metadata = createPageMetadata({
  title: "Authentication & Secure Session",
  description: "Secure authentication portal for SplitLedger AI personal finance and shared expense accounts.",
  path: "/sign-in",
  noIndex: true,
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
