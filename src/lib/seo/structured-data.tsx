import React from "react";
import { SITE_CONFIG } from "./config";

/**
 * Enterprise JSON-LD script injector for rich Google search results.
 */
export function JsonLd({ data }: { data: Record<string, any> | Array<Record<string, any>> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * Schema.org Organization for SplitLedger AI
 */
export function createOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_CONFIG.name,
    legalName: SITE_CONFIG.legalName,
    url: SITE_CONFIG.url,
    logo: `${SITE_CONFIG.url}/icon-512.png`,
    description: SITE_CONFIG.defaultDescription,
    foundingDate: "2024",
    founders: [
      {
        "@type": "Person",
        name: "Dipak Pawar",
      },
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@splitledger.ai",
        availableLanguage: ["English", "Hindi"],
      },
    ],
    sameAs: [
      "https://twitter.com/splitledgerai",
      "https://github.com/dipak-pawar-356/splitLedger_AI",
    ],
  };
}

/**
 * Schema.org WebSite with Sitelinks Searchbox
 */
export function createWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    description: SITE_CONFIG.defaultDescription,
    publisher: {
      "@type": "Organization",
      name: SITE_CONFIG.name,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_CONFIG.url}/icon-512.png`,
      },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_CONFIG.url}/dashboard/transactions?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Schema.org SoftwareApplication / FinancialService
 */
export function createSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["SoftwareApplication", "FinancialProduct"],
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    operatingSystem: "Web, iOS, Android, macOS, Windows (PWA)",
    applicationCategory: "FinanceApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      category: "Free Tier Available",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "1250",
      bestRating: "5",
      worstRating: "1",
    },
    featureList: [
      "AI-Assisted Natural Language Expense Tracking",
      "Dynamic NPCI UPI QR Code Settlement Generator",
      "Graph-Minimized Debt Settlement Engine",
      "Real-Time Shared Group Accounting",
      "Offline-First Progressive Web App with Sync",
      "Corporate & Personal GST Tax Audit Reports",
      "Multi-Currency and INR Paise Precision",
    ],
  };
}

/**
 * Schema.org BreadcrumbList
 */
export function createBreadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_CONFIG.url}${item.path.startsWith("/") ? item.path : `/${item.path}`}`,
    })),
  };
}

/**
 * Schema.org FAQPage for features and pricing pages
 */
export function createFaqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
