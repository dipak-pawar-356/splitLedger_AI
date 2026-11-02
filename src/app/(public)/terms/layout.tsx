import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/config";
import { JsonLd, createBreadcrumbSchema, createTermsSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "Terms of Service — Transparent Accounting Standards",
  description:
    "Review the SplitLedger AI Terms of Service governing the use of our smart financial management platform, group debt netting, and settlement tools.",
  path: "/terms",
  keywords: [
    "Terms of Service",
    "Terms of Use",
    "Financial SaaS Agreement",
    "SplitLedger Legal",
    "User Agreement",
  ],
});

export default function TermsLayout({
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
            { name: "Terms of Service", path: "/terms" },
          ]),
          createTermsSchema(),
        ]}
      />
      {children}
    </>
  );
}
