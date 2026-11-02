import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/config";
import { JsonLd, createBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy — Zero-Trust Data Protection & Security",
  description:
    "Read the SplitLedger AI Privacy Policy. Learn how we safeguard your financial transactions, ledger records, and personal information with enterprise-grade encryption.",
  path: "/privacy",
  keywords: [
    "Privacy Policy",
    "Financial Data Protection",
    "Zero Trust Security",
    "Data Privacy Standards",
  ],
});

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd
        data={createBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Privacy Policy", path: "/privacy" },
        ])}
      />
      {children}
    </>
  );
}
