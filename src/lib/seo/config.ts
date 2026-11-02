import type { Metadata } from "next";

export const SITE_CONFIG = {
  name: "SplitLedger AI",
  legalName: "SplitLedger Technologies Inc.",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://splitledger.ai",
  defaultTitle: "SplitLedger AI – Smart Expense Tracker & Group Expense Manager",
  titleTemplate: "%s | SplitLedger AI",
  defaultDescription:
    "SplitLedger AI is an intelligent financial management platform that helps individuals and groups manage expenses, settlements, receivables, payables, notes, analytics, reports, AI-assisted transaction management, and financial insights securely in real time.",
  keywords: [
    "Expense Tracker",
    "Expense Manager",
    "Personal Finance Tracker",
    "Budget Planner",
    "Budget Management",
    "Expense Split App",
    "Split Bills",
    "Group Expense Tracker",
    "Shared Expenses",
    "Trip Expense Tracker",
    "Travel Budget Planner",
    "Expense Analytics",
    "Financial Reports",
    "AI Finance Assistant",
    "Money Manager",
    "Daily Expense Tracker",
    "Expense Notes",
    "Cash Flow Tracker",
    "Settlement Tracker",
    "Income & Expense Manager",
    "UPI Expense Tracker",
    "India Expense Tracker",
    "Smart Ledger",
    "Debt Simplification",
    "NPCI UPI QR Code",
    "Graph Debt Netting",
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
  themeColor: "#4f46e5",
  backgroundColor: "#0f172a",
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
  const canonicalUrl = `${SITE_CONFIG.url}${cleanPath === "/" ? "" : cleanPath}`;
  
  // Format title: avoid duplicate "SplitLedger AI" suffixes
  const fullTitle = title.includes("SplitLedger AI") 
    ? title 
    : `${title} | ${SITE_CONFIG.name}`;

  const imageUrl = image.startsWith("http") ? image : `${SITE_CONFIG.url}${image}`;

  return {
    title: fullTitle,
    description,
    applicationName: SITE_CONFIG.name,
    authors: SITE_CONFIG.authors,
    creator: SITE_CONFIG.creator,
    publisher: SITE_CONFIG.publisher,
    keywords: Array.from(new Set([...SITE_CONFIG.keywords, ...keywords])),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-IN": canonicalUrl,
        "en-US": `${SITE_CONFIG.url}/en-US${cleanPath === "/" ? "" : cleanPath}`,
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
            nosnippet: true,
          },
        }
      : {
          index: true,
          follow: true,
          nocache: false,
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
      alternateLocale: SITE_CONFIG.alternateLocales,
      type,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${SITE_CONFIG.name} — ${title}`,
          type: "image/png",
        },
        {
          url: `${SITE_CONFIG.url}/icon-512.png`,
          width: 512,
          height: 512,
          alt: `${SITE_CONFIG.name} Icon`,
          type: "image/png",
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
    category: "Finance",
    classification: "Personal Finance & Group Expense Management SaaS",
    other: {
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-title": SITE_CONFIG.name,
      "apple-mobile-web-app-status-bar-style": "black-translucent",
      "format-detection": "telephone=no",
      "mobile-web-app-capable": "yes",
      "msapplication-TileColor": SITE_CONFIG.themeColor,
      "msapplication-config": "/browserconfig.xml",
      "theme-color": SITE_CONFIG.themeColor,
    },
  };
}
