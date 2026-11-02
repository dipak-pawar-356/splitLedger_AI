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
 * Schema.org SoftwareApplication / FinancialProduct
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

/**
 * Schema.org HowTo for splitting group expenses (Google Rich Snippet)
 */
export function createHowToSplitExpensesSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Split and Settle Group Expenses with SplitLedger AI",
    description: "Step-by-step guide to create shared groups, record multi-person expenses, and settle balances instantly via UPI QR codes.",
    totalTime: "PT2M",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Create a Shared Ledger Group",
        text: "Create a group for your household, trip, or event and invite members via link or email.",
        url: `${SITE_CONFIG.url}/features#step-group`,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Record Group Expenses",
        text: "Log bills using natural conversational commands (e.g. 'create transition Petrol 500') or manual entry with custom split rules.",
        url: `${SITE_CONFIG.url}/features#step-expenses`,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Automatic Debt Simplification",
        text: "SplitLedger AI runs graph minimization to simplify circular debts into the minimum number of direct payments.",
        url: `${SITE_CONFIG.url}/features#step-netting`,
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Settle Instantly with UPI QR",
        text: "Scan the generated NPCI-standard UPI QR code in Google Pay, PhonePe, or Paytm for zero-custody settlement.",
        url: `${SITE_CONFIG.url}/features#step-upi`,
      },
    ],
  };
}

/**
 * Schema.org ContactPage Schema
 */
export function createContactPageSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact SplitLedger AI",
    url: `${SITE_CONFIG.url}/contact`,
    description: "Get in touch with SplitLedger AI customer support, engineering, and enterprise sales.",
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
}

/**
 * Schema.org PrivacyPolicy Schema
 */
export function createPrivacyPolicySchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "SplitLedger AI Privacy Policy",
    url: `${SITE_CONFIG.url}/privacy`,
    description: "Comprehensive data protection, encryption standards, and privacy commitments for SplitLedger AI users.",
    isPartOf: {
      "@type": "WebSite",
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
  };
}

/**
 * Schema.org TermsOfService Schema
 */
export function createTermsSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "SplitLedger AI Terms of Service",
    url: `${SITE_CONFIG.url}/terms`,
    description: "Terms and conditions governing account usage, shared ledgers, and settlement features on SplitLedger AI.",
    isPartOf: {
      "@type": "WebSite",
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
  };
}
