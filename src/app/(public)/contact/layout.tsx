import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/config";
import { JsonLd, createBreadcrumbSchema, createContactPageSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "Contact & Support — Reach the SplitLedger AI Team",
  description:
    "Get in touch with the SplitLedger AI customer support, engineering, and product team for inquiries, bug reports, feature requests, or enterprise integrations.",
  path: "/contact",
  keywords: [
    "Contact SplitLedger",
    "Customer Support",
    "Financial SaaS Help",
    "Technical Assistance",
    "SplitLedger Help Center",
    "Expense Tracker Support",
  ],
});

export default function ContactLayout({
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
            { name: "Contact", path: "/contact" },
          ]),
          createContactPageSchema(),
        ]}
      />
      {children}
    </>
  );
}
