import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/config";
import { JsonLd, createBreadcrumbSchema, createPrivacyPolicySchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy — Bank-Grade Security & Zero-Knowledge Ledger",
  description:
    "Read the SplitLedger AI Privacy Policy. Learn how we safeguard your financial transactions, ledger records, and personal information with enterprise encryption.",
  path: "/privacy",
  keywords: [
    "Privacy Policy",
    "Financial Data Protection",
    "Zero Trust Security",
    "Data Privacy Standards",
    "Encrypted Financial Records",
    "SplitLedger Security",
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
        data={[
          createBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Privacy Policy", path: "/privacy" },
          ]),
          createPrivacyPolicySchema(),
        ]}
      />
      {children}
    </>
  );
}
