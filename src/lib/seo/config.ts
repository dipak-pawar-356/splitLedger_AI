import type { Metadata } from "next";

export const SITE_CONFIG = {
  name: "SplitLedger AI",
  legalName: "SplitLedger Technologies Inc.",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://splitledger.ai",
  defaultTitle: "SplitLedger AI | Smart Expense Tracker, Personal Finance & Group Expense Management",
  titleTemplate: "%s | SplitLedger AI",
  defaultDescription:
    "SplitLedger AI is an intelligent financial management platform that helps individuals and groups manage expenses, settlements, receivables, payables, notes, analytics, reports, AI-assisted transaction management, and financial insights securely in real time.",
  keywords: [
    "Expense Tracker",
    "Expense Splitter",
    "Split Expenses",
    "Personal Finance",
    "Budget Planner",
    "Money Manager",
    "Financial Notes",
    "Group Expenses",
    "Trip Expense Manager",
    "Settlement Tracker",
    "Receivables",
    "Payables",
    "Financial Reports",
    "Expense Analytics",
    "Smart Ledger",
    "AI Expense Tracking",
    "Personal Accounting",
    "Financial Dashboard",
    "Budget Analytics",
    "Cashflow Management",
    "Financial Intelligence",
    "UPI Split",
    "NPCI UPI QR",
    "Debt Simplification",
    "Bill Splitter",
    "Group Accounting",
  ],
  authors: [
    {
      name: "SplitLedger AI Engineering Team",
      url: "https://splitledger.ai",
    },
  ],
  creator: "SplitLedger AI",
  publisher: "SplitLedger AI",
  social: {
    twitter: "@splitledgerai",
    github: "https://github.com/dipak-pawar-356/splitLedger_AI",
  },
  ogImage: "/icon-512.png",
  locale: "en_IN",
  alternateLocales: ["en_US"],
};

export interface PageMetadataOptions {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string;
  noIndex?: boolean;
  type?: "website" | "article";
}

/**
 * Creates standardized enterprise Next.js Metadata with strict canonical tags,
 * OpenGraph attributes, Twitter summary cards, and search engine directives.
 */
export function createPageMetadata({
  title,
  description,
  path,
  keywords = [],
  image = SITE_CONFIG.ogImage,
  noIndex = false,
  type = "website",
}: PageMetadataOptions): Metadata {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const canonicalUrl = `${SITE_CONFIG.url}${cleanPath}`;
  const fullTitle = `${title} | ${SITE_CONFIG.name}`;
  const imageUrl = image.startsWith("http") ? image : `${SITE_CONFIG.url}${image}`;

  return {
    title,
    description,
    keywords: [...SITE_CONFIG.keywords, ...keywords],
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-IN": canonicalUrl,
        "en-US": `${SITE_CONFIG.url}/en-US${cleanPath}`,
        "x-default": canonicalUrl,
      },
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noarchive: true,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: SITE_CONFIG.name,
      locale: SITE_CONFIG.locale,
      type,
      images: [
        {
          url: imageUrl,
          width: 512,
          height: 512,
          alt: `${SITE_CONFIG.name} — ${title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [imageUrl],
      creator: SITE_CONFIG.social.twitter,
      site: SITE_CONFIG.social.twitter,
    },
  };
}
