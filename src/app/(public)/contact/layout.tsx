import type { Metadata } from "next";
import { createPageMetadata, SITE_CONFIG } from "@/lib/seo/config";
import { JsonLd, createBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "Contact & Support — Reach the SplitLedger AI Team",
  description:
    "Get in touch with the SplitLedger AI engineering and customer support team for inquiries, product feedback, technical assistance, or enterprise integrations.",
  path: "/contact",
  keywords: [
    "Contact SplitLedger",
    "Customer Support",
    "Financial SaaS Help",
    "Technical Assistance",
  ],
});

const contactPageSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact SplitLedger AI",
  url: `${SITE_CONFIG.url}/contact`,
  description: "Connect with SplitLedger AI support and engineering.",
  mainEntity: {
    "@type": "Organization",
    name: SITE_CONFIG.name,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "support@splitledger.ai",
      availableLanguage: ["English", "Hindi"],
    },
  },
};

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
          contactPageSchema,
        ]}
      />
      {children}
    </>
  );
}
