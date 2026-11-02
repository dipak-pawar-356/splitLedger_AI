import type { Metadata } from "next";
import { createPageMetadata, SITE_CONFIG } from "@/lib/seo/config";
import { JsonLd, createBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "About Us — Engineering the Future of Financial Ledgers",
  description:
    "Learn about SplitLedger AI's mission to eliminate financial friction with intelligent graph accounting, automated debt simplification, and real-time ledger intelligence.",
  path: "/about",
  keywords: [
    "About SplitLedger",
    "Financial SaaS Mission",
    "Smart Accounting Team",
    "Debt Simplification Engineering",
  ],
});

const aboutPageSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About SplitLedger AI",
  url: `${SITE_CONFIG.url}/about`,
  description:
    "SplitLedger AI was engineered to bring mathematical rigor and conversational intelligence to personal and shared finances.",
  mainEntity: {
    "@type": "Organization",
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
  },
};

export default function AboutLayout({
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
            { name: "About", path: "/about" },
          ]),
          aboutPageSchema,
        ]}
      />
      {children}
    </>
  );
}
