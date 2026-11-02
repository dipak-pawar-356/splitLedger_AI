import type { Metadata } from "next";
import { createPageMetadata, SITE_CONFIG } from "@/lib/seo/config";
import { JsonLd, createBreadcrumbSchema, createFaqSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "Pricing & Plans — Transparent Financial Ledger Solutions",
  description:
    "Choose the right SplitLedger AI plan for your personal finance or team expense management. Free forever community tier with premium automated audit reports and unlimited groups.",
  path: "/pricing",
  keywords: [
    "Expense Tracker Pricing",
    "Free Budget Planner",
    "Group Accounting Plans",
    "SaaS Expense Management",
    "Split Ledger Subscription",
  ],
});

const pricingFaqs = [
  {
    question: "Is SplitLedger AI free to use?",
    answer:
      "Yes, SplitLedger AI offers a comprehensive Free Forever tier that includes unlimited personal expense tracking, group splitting, and dynamic UPI QR settlements.",
  },
  {
    question: "Are there any hidden fees or transaction cut?",
    answer:
      "None. SplitLedger AI does not take any percentage or commission from your peer-to-peer UPI settlements.",
  },
  {
    question: "Can I export my financial reports?",
    answer:
      "Yes, all users can export ledger summaries, settlement statements, and transaction histories in PDF and CSV formats.",
  },
];

const pricingProductSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "SplitLedger AI Subscription",
  description: "Enterprise and personal expense management platform.",
  offers: [
    {
      "@type": "Offer",
      name: "Community Edition",
      price: "0",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: `${SITE_CONFIG.url}/pricing`,
    },
    {
      "@type": "Offer",
      name: "Pro Ledger Edition",
      price: "299",
      priceCurrency: "INR",
      priceValidUntil: "2027-12-31",
      availability: "https://schema.org/InStock",
      url: `${SITE_CONFIG.url}/pricing`,
    },
  ],
};

export default function PricingLayout({
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
            { name: "Pricing", path: "/pricing" },
          ]),
          createFaqSchema(pricingFaqs),
          pricingProductSchema,
        ]}
      />
      {children}
    </>
  );
}
