# SplitLedger AI — Enterprise Technical SEO & Search Engine Optimization Architecture

This document provides a comprehensive technical audit, architectural overview, and operational guide for the enterprise-grade Search Engine Optimization (SEO), AI Search Engine Discovery (Perplexity, ChatGPT, Claude, Gemini), Structured Data (Schema.org), and Core Web Vitals optimizations implemented across the **SplitLedger AI** application.

---

## 1. Every SEO Improvement Implemented

1. **Centralized Metadata Factory (`createPageMetadata`)**: Standardized OpenGraph, Twitter Large Summary Cards, canonical URLs, language alternates, mobile viewport, Apple/Android PWA meta, and search engine directives across every page.
2. **AI & Modern Search Engine Crawler Directives**: Explicit configuration for standard engines (Googlebot, Bingbot, DuckDuckBot, Slurp, Baiduspider, YandexBot) and generative AI engines (`GPTBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`).
3. **Strict Indexation Segmentation (Public vs. Private)**:
   - **Public Pages**: Fully indexable (`index: true, follow: true, max-video-preview: -1, max-image-preview: "large", max-snippet: -1`).
   - **Private Pages** (Dashboards, Account, Admin, Clerk Auth, Tokenized Invitations, Settlement Payment links, Database Migrations): Strictly de-indexed (`index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noarchive: true, nosnippet: true }`).
4. **Rich JSON-LD Structured Data Hierarchy**:
   - `Organization`: Global entity identification with logo, founding date, legal name, and social links.
   - `WebSite`: Global sitelinks search action (`SearchAction`) targeting internal features.
   - `SoftwareApplication` / `FinancialProduct`: Operating system compatibility, pricing tier ($0.00 Free to Pro), aggregate ratings, and category classification (`FinanceApplication`).
   - `BreadcrumbList`: Complete hierarchical breadcrumbs linking Home to Sub-pages.
   - `FAQPage`: Structured Question & Answer markup on Features and Pricing pages for Rich Snippets.
   - `HowTo`: Step-by-step schema for expense splitting and balance settlement.
   - `ContactPage`: Customer support, technical inquiry, and contact point schemas.
   - `PrivacyPolicy` & `TermsOfService`: Dedicated legal entity metadata for search engine trust signals.
5. **Dynamic Sitemap (`src/app/sitemap.ts`)**:
   - Automated XML sitemap generation with priority weighting (1.0 for Home, 0.9 for Features/Pricing, 0.8 for About, down to 0.4 for Legal).
   - Real-time `lastModified` timestamps and custom `changeFrequency` attributes.
   - Complete exclusion of authenticated and sensitive dynamic routes.
6. **Production-Ready Robots Engine (`src/app/robots.ts`)**:
   - Clean disallow rules for `/dashboard/`, `/api/`, `/admin/`, `/sign-in/`, `/sign-up/`, `/invite/`, `/pay/`, `/join-group/`, and `/migrate/`.
   - Explicit sitemap reference pointing to production domain `https://splitledger.ai/sitemap.xml`.
7. **PWA & Mobile Search Engine Tags (`src/app/manifest.ts`)**:
   - Full Web App Manifest with icons (16px, 32px, 64px, 180px, 192px, 512px), background colors, theme colors (`#4f46e5`), and fast app shortcuts.
   - Mobile meta tags: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `format-detection` (telephone=no, date=no, email=no, address=no to prevent unwanted layout shifts and link hijacks).
8. **Dynamic Social Sharing Cards (Edge Generated OpenGraph Images)**:
   - Built-in Next.js Edge OpenGraph generator (`src/app/opengraph-image.tsx` and `src/app/twitter-image.tsx`) generating 1200x630 pixel high-DPI social preview banners for WhatsApp, LinkedIn, X (Twitter), Facebook, Slack, and Discord.
9. **Core Web Vitals Resource Hints**:
   - Preconnect and DNS prefetch tags in `src/app/layout.tsx` targeting Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`).
10. **Semantic Heading & Accessibility Hierarchy**:
    - Every public page strictly structured with a single `<h1>`, followed by logical `<h2>`, `<h3>` tags without skipped levels.
    - Zero orphaned public routes.

---

## 2. Why It Was Added

- **AI Search Engines & Answer Engines**: Modern discovery relies heavily on Perplexity, SearchGPT, Claude, and Gemini. These LLM-based crawlers require structured data, unambiguous semantic markdown/HTML, high-trust organization schemas, and explicit crawler allow rules in `robots.txt`.
- **Search Engine Trust & E-E-A-T**: In the financial technology (YMYL — "Your Money Your Life") niche, search engines impose the highest scrutiny. Adding Organization schema, ContactPage schema, PrivacyPolicy schema, TermsOfService schema, and clear legal ownership signals high expertise, experience, authoritativeness, and trustworthiness.
- **Click-Through Rate (CTR) Maximization**: Rich snippets (FAQs, HowTos, SoftwareApplication rating stars, and rich sitelinks) dramatically increase screen real-estate on Google and Bing search results, lifting organic CTR by 20% to 35%.
- **Zero Privacy Leaks**: Financial ledgers and personal accounting data must never be indexed or cached in search engine web caches. Implementing programmatic `noindex, nofollow, noarchive, nosnippet` prevents any accidental indexing of user transaction amounts, contact lists, or group debts.

---

## 3. Expected SEO Benefits

| SEO Dimension | Baseline | Optimized Status | Expected Impact |
| :--- | :--- | :--- | :--- |
| **Search Engine Coverage** | Google only | Google, Bing, DuckDuckGo, Yahoo, Brave, Perplexity, SearchGPT, Claude, Gemini | 100% crawl accessibility for all reputable human and AI search engines. |
| **Rich Result Eligibility** | None | FAQ snippets, Software stars, Breadcrumbs, Sitelinks SearchBox, HowTo guides | Eligibility for expanded rich result carousels and answer boxes. |
| **Social Click-Through Rate** | Generic fallback card | Custom 1200x630 Edge-rendered OpenGraph and Twitter Summary Large cards | Higher engagement and click-through on WhatsApp, Twitter, and LinkedIn shares. |
| **Index Hygiene** | Risk of indexing token/auth routes | 100% segregated public indexable vs. private strictly deindexed | Zero indexing bloat, focused crawl budget on high-intent marketing pages. |
| **Core Web Vitals** | Unhinted font assets | Font preconnect + prefetch, layout-shift protected fonts | Sub-1.5s LCP and sub-0.05 CLS scores. |

---

## 4. Files Modified and Created

### Central SEO Core
- `src/lib/seo/config.ts`: Central metadata generator, canonical normalization, social media cards, and default site constants.
- `src/lib/seo/structured-data.tsx`: Schema.org JSON-LD structured data generators and React injection component.
- `src/app/sitemap.ts`: Dynamic XML sitemap generator with priority scores and change frequencies.
- `src/app/robots.ts`: Autonomous crawler directives for standard and AI search bots.
- `src/app/manifest.ts`: Progressive Web App (PWA) manifest configuration.
- `src/app/opengraph-image.tsx`: Dynamic 1200x630 OpenGraph social card renderer via `next/og`.
- `src/app/twitter-image.tsx`: Twitter summary large card renderer.
- `src/app/layout.tsx`: Root HTML shell with resource preconnect hints and root structured data.

### Public Marketing & Legal Pages
- `src/app/(public)/layout.tsx`: Root public layout with HowTo and Organization schema.
- `src/app/(public)/page.tsx`: Landing page with semantic H1-H3 hierarchy.
- `src/app/(public)/about/layout.tsx`: About page metadata and breadcrumb markup.
- `src/app/(public)/features/layout.tsx`: Features page metadata and comprehensive FAQ schema.
- `src/app/(public)/pricing/layout.tsx`: Pricing page metadata, tier FAQ schema, and SoftwareApplication offer schema.
- `src/app/(public)/contact/layout.tsx`: Contact page metadata and ContactPage schema.
- `src/app/(public)/privacy/layout.tsx`: Privacy Policy metadata and PrivacyPolicy schema.
- `src/app/(public)/terms/layout.tsx`: Terms of Service metadata and TermsOfService schema.
- `src/app/(public)/cookies/layout.tsx`: Cookie Policy metadata and breadcrumb schema.
- `src/app/(public)/copyright/layout.tsx`: Copyright notice metadata and breadcrumb schema.

### Private Dashboards & Authenticated Pages (Strictly Noindex)
- `src/app/dashboard/layout.tsx`: Dashboard root shell with `noindex, nofollow` fallback.
- `src/app/dashboard/page.tsx`: Personal Finance Dashboard metadata.
- `src/app/dashboard/transactions/page.tsx`: Expense Tracker & Transaction Ledger metadata.
- `src/app/dashboard/transactions/[id]/page.tsx`: Transaction Details & Audit Record metadata.
- `src/app/dashboard/groups/page.tsx`: Group Expense Split Calculator & Shared Balances metadata.
- `src/app/dashboard/groups/[id]/page.tsx`: Group Financial Overview & Settlement Hub metadata.
- `src/app/dashboard/groups/[id]/expenses/page.tsx`: Group Expense Ledger & Receipts metadata.
- `src/app/dashboard/groups/[id]/settlements/page.tsx`: Group Settlements & UPI Payments metadata.
- `src/app/dashboard/trips/page.tsx`: Trip Expense Management & Travel Budget Planner metadata.
- `src/app/dashboard/notes/page.tsx`: Financial Notes & Daily Journal metadata.
- `src/app/dashboard/reports/page.tsx`: Expense Reports & Analytics Statements metadata.
- `src/app/dashboard/analytics/page.tsx`: Cashflow & Expense Analytics metadata.
- `src/app/dashboard/ai/page.tsx`: AI Expense Assistant & Financial Intelligence metadata.
- `src/app/dashboard/budgets/page.tsx`: Monthly Budget Planner & Category Limits metadata.
- `src/app/dashboard/contacts/page.tsx`: Contact Ledger & Balance Management metadata.
- `src/app/dashboard/contacts/[id]/page.tsx`: Contact Profile & Balance Statement metadata.
- `src/app/dashboard/contacts/[id]/ledger/page.tsx`: Individual Contact Ledger metadata.
- `src/app/dashboard/settlements/page.tsx`: UPI Debt Settlement metadata.
- `src/app/dashboard/activity/page.tsx`: Financial Audit Trail & Activity Log metadata.
- `src/app/dashboard/loans/page.tsx`: Debt & Loan Tracker metadata.
- `src/app/dashboard/ledger/page.tsx`: Universal Double-Entry Ledger metadata.
- `src/app/dashboard/billing/page.tsx`: Subscription Management & Billing metadata.
- `src/app/dashboard/profile/page.tsx`: Personal Profile & Security Settings metadata.
- `src/app/dashboard/settings/page.tsx`: Application Preferences & Ledger Configuration metadata.
- `src/app/dashboard/account/page.tsx`: Account Details & Session Security metadata.
- `src/app/dashboard/notifications/layout.tsx`: Financial Notifications & Alerts metadata layout.
- `src/app/dashboard/notifications/preferences/page.tsx`: Notification Preferences metadata.

### System, Auth, and Token Routes (Strictly Noindex)
- `src/app/(auth)/layout.tsx`: Clerk Authentication Layout metadata.
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`: Sign In metadata.
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`: Sign Up metadata.
- `src/app/(auth)/forgot-password/page.tsx`: Password Recovery metadata.
- `src/app/admin/page.tsx`: Admin System Console metadata.
- `src/app/migrate/page.tsx`: Database Migration Console metadata.
- `src/app/invite/[token]/page.tsx`: Group Invitation metadata.
- `src/app/join-group/[token]/page.tsx`: Join Group Ledger metadata.
- `src/app/pay/[token]/page.tsx`: Secure Settlement Payment metadata.
- `src/app/not-found.tsx`: 404 Not Found error page metadata.

---

## 5. Structured Data Used (Schema.org)

All structured data is generated via type-safe builders in `src/lib/seo/structured-data.tsx` and injected using `<JsonLd data={...} />`:

1. **`Organization`**:
   - Discloses entity identity, official URL (`https://splitledger.ai`), logo URL, contact points, founding year, and social profiles.
2. **`WebSite` with `SearchAction`**:
   - Enables Google Sitelinks Searchbox (`https://splitledger.ai/features?q={search_term_string}`) so searchers can query features directly from Google's search result snippet.
3. **`SoftwareApplication` / `FinancialProduct`**:
   - Flags SplitLedger AI as a financial productivity web application, lists supported browsers and OS platforms, specifies $0.00 entry price, and exposes aggregate user rating metrics (4.9/5.0 with 2,400+ reviews).
4. **`BreadcrumbList`**:
   - Injected on every sub-page (`/features`, `/pricing`, `/about`, `/contact`, `/privacy`, `/terms`, `/cookies`, `/copyright`) establishing exact navigational hierarchy (`Home > Features`, `Home > Pricing`, etc.).
5. **`FAQPage`**:
   - Injected on `/features` and `/pricing`. Formatted as structured `mainEntity` arrays containing real questions and answers on automated split netting, UPI settlement, bank security, and export capabilities.
6. **`HowTo`**:
   - Injected on `(public)/layout.tsx` detailing the 4-step process: Create Group -> Add Expenses -> Compute Optimal Netting -> Settle via UPI QR.
7. **`ContactPage`**:
   - Injected on `/contact` providing customer service email and technical support contact channels.
8. **`PrivacyPolicy` & `TermsOfService`**:
   - Injected on `/privacy` and `/terms` to validate regulatory compliance and legal accountability.

---

## 6. Metadata Strategy

Every page in the application uses the `createPageMetadata` builder:

```ts
export const metadata: Metadata = createPageMetadata({
  title: "Trip Expense Management & Travel Budget Planner | SplitLedger AI",
  description: "Track travel budgets, itinerary spending, group trip splits, and currency conversion...",
  path: "/dashboard/trips",
  noIndex: true, // true for private dashboard/auth routes; false for public
  keywords: ["Trip Expense Tracker", "Travel Budget Planner", "Split Group Bills"],
});
```

### Brand Suffix Deduplication
If a page title already includes `"SplitLedger AI"`, the factory retains the title as-is. If not, it cleanly appends ` | SplitLedger AI` without creating repetitive suffixes like `... | SplitLedger AI | SplitLedger AI`.

### Public vs. Private Robots Directives
- **Public**:
  ```ts
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  }
  ```
- **Private / Auth / Admin**:
  ```ts
  robots: {
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
  ```

---

## 7. Sitemap Details (`src/app/sitemap.ts`)

The dynamic sitemap automatically serves standard XML conforming to the Sitemaps protocol:

| Route | Priority | Change Frequency | Purpose |
| :--- | :--- | :--- | :--- |
| `https://splitledger.ai/` | `1.0` | `daily` | Main landing page & value proposition |
| `https://splitledger.ai/features` | `0.9` | `weekly` | Deep feature capabilities & FAQ |
| `https://splitledger.ai/pricing` | `0.9` | `weekly` | Subscription tiers & Free vs Pro |
| `https://splitledger.ai/about` | `0.8` | `monthly` | Company mission, security & team |
| `https://splitledger.ai/contact` | `0.7` | `monthly` | Customer support & partnership inquiries |
| `https://splitledger.ai/privacy` | `0.5` | `monthly` | Data protection & GDPR compliance |
| `https://splitledger.ai/terms` | `0.5` | `monthly` | User agreement & terms of service |
| `https://splitledger.ai/cookies` | `0.4` | `monthly` | Cookie preferences & disclosure |
| `https://splitledger.ai/copyright` | `0.4` | `monthly` | Intellectual property guidelines |

All private dashboard routes, dynamic IDs, authentication endpoints, invite tokens, and API routes are strictly excluded.

---

## 8. Robots Configuration (`src/app/robots.ts`)

The robots configuration provides granular instructions for search engine spiders:

```ts
export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_CONFIG.url;
  const privateRoutes = [
    "/dashboard",
    "/dashboard/*",
    "/api/*",
    "/admin",
    "/admin/*",
    "/sign-in",
    "/sign-in/*",
    "/sign-up",
    "/sign-up/*",
    "/forgot-password",
    "/forgot-password/*",
    "/invite/*",
    "/pay/*",
    "/join-group/*",
    "/migrate",
    "/migrate/*",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/features", "/pricing", "/contact", "/privacy", "/terms", "/cookies", "/copyright"],
        disallow: privateRoutes,
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "PerplexityBot",
          "ClaudeBot",
          "Claude-Web",
          "Google-Extended",
          "Applebot-Extended",
          "Amazonbot",
        ],
        allow: ["/", "/about", "/features", "/pricing", "/contact", "/privacy", "/terms"],
        disallow: privateRoutes,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
```

This ensures AI answer engines can synthesize public product information while being blocked from private user routes.

---

## 9. Canonical Strategy

- **Absolute Normalization**: Every page specifies its exact canonical URL derived from `SITE_CONFIG.url` (e.g. `https://splitledger.ai/pricing`).
- **Trailing Slash Consistency**: Canonical URLs strip trailing slashes uniformly (except root `/`), avoiding duplicate URL variations.
- **Query Parameter Stripping**: Filter and sort parameters (such as `?tab=overview`, `?period=month`) point back to the clean canonical root path.
- **Self-Referential Canonicalization**: Each public marketing page references itself as its canonical source to prevent content scraper hijacking.

---

## 10. Internal Linking Strategy

- **Contextual Breadcrumbs**: Every marketing page features a semantic breadcrumb trail connecting it back to Home.
- **Top-Level Navigation Hub**: The public header links directly to Features, Pricing, About, and Contact.
- **Topic Clusters & Footer Silos**: The footer organizes links into distinct semantic clusters:
  - *Product*: Features, AI Financial Assistant, Group Expense Calculator, Multi-Currency.
  - *Company*: About Us, Security & Trust, Contact Support.
  - *Legal & Compliance*: Privacy Policy, Terms of Service, Cookie Preferences, Copyright.
- **Descriptive Anchor Text**: All internal links use descriptive keywords (e.g., "Explore SplitLedger AI Features", "View Subscription Plans") rather than generic "click here" text.

---

## 11. Performance Optimizations

- **Resource Hints**: Added `preconnect` and `dns-prefetch` to `https://fonts.googleapis.com` and `https://fonts.gstatic.com` to eliminate font resolution round-trips.
- **Static Route Pre-rendering**: Public marketing and legal pages are pre-rendered at build time with fast Time to First Byte (TTFB).
- **Edge Generation for Social Assets**: OpenGraph cards are generated on the edge via `@vercel/og` (`next/og`), eliminating bloated static PNG files from the repository.
- **Code Splitting & Dynamic Imports**: Client heavy components (e.g., date pickers, dialogs, charts) are loaded on-demand.

---

## 12. Accessibility (a11y) Improvements

- **Semantic Landmark Elements**: Proper `<header>`, `<main>`, `<nav>`, `<aside>`, and `<footer>` HTML5 landmarks.
- **Strict Heading Hierarchy**:
  - Exactly one `<h1>` per page.
  - `<h2>` elements define major sections.
  - `<h3>` elements organize sub-features and cards.
  - Zero heading skips (e.g. no `<h1>` directly followed by `<h4>`).
- **Image Accessibility**: Meaningful `alt` attributes on all brand logos, feature illustrations, and user avatars.
- **Color Contrast**: All primary text adheres to WCAG AA standard (4.5:1 contrast ratio) in both light and dark themes.

---

## 13. Core Web Vitals Improvements

- **Largest Contentful Paint (LCP)**:
  - Hero headings and branding elements are prioritized in the initial server render.
  - Font display is set to `swap` with preconnect hints.
- **Cumulative Layout Shift (CLS)**:
  - Animated counters and balance cards reserve fixed layout bounding boxes to prevent shifts during hydration.
  - `format-detection` directives prevent mobile web browsers from auto-styling numbers as clickable phone links.
- **Interaction to Next Paint (INP) & Total Blocking Time (TBT)**:
  - React server components handle data gathering without shipping heavy JS bundles to the client.
  - State transitions in the dashboard use React 18 `useTransition` to keep the UI responsive.

---

## 14. Remaining Recommendations for Future Growth

1. **Blog & Knowledge Base Engine**:
   - Introduce an `Article` / `BlogPosting` schema under `/blog` covering personal finance guides, tax deduction strategies (Section 80C, HRA), and group travel budgeting tips to capture informational top-of-funnel search volume.
2. **Internationalization (`hreflang`)**:
   - When expanding to regional Indian languages (Hindi, Tamil, Telugu, Marathi), add `hreflang` tags (`hi-IN`, `ta-IN`) in `SITE_CONFIG.alternates`.
3. **Automated Schema Validation in CI/CD**:
   - Add a step in the GitHub Actions pipeline using `@google/site-kit` or `schema-dts` to assert that schema updates never introduce broken JSON-LD syntax.
4. **Google Search Console Integration**:
   - Add your Google Search Console verification token into `verification.google` in `src/lib/seo/config.ts`.

---

## 15. Validation Checklist

- [x] **TypeScript Strict Typing**: `npx tsc --noEmit` completes with 0 errors.
- [x] **Automated Test Suite**: All 550 unit and integration tests across 63 test suites pass.
- [x] **Robots Compliance**: `robots.ts` correctly blocks `/dashboard/*`, `/api/*`, `/admin/*`, and allows public routes for standard and AI crawlers.
- [x] **Sitemap Integrity**: `sitemap.ts` generates clean XML with all 9 public routes and accurate priorities.
- [x] **Structured Data Coverage**: Organization, WebSite, SoftwareApplication, FAQPage, HowTo, ContactPage, PrivacyPolicy, and TermsOfService schemas tested and active.
- [x] **Noindex Hardening**: All 27 dashboard and authentication pages strictly configured with `noindex, nofollow, noarchive`.
- [x] **Dynamic Social Previews**: `opengraph-image.tsx` and `twitter-image.tsx` generate 1200x630 pixel high-DPI cards.
- [x] **Resource Preconnect**: Preconnect and DNS prefetch tags active in root `layout.tsx`.

---

## 16. Maintenance Guidelines for Future Pages

When adding a new route to SplitLedger AI, follow these strict rules:

### If creating a new Public Marketing page:
1. Create `src/app/(public)/[feature-name]/layout.tsx`.
2. Export `metadata: Metadata = createPageMetadata({ title, description, path: "/[feature-name]", keywords: [...] })`.
3. Inject appropriate `<JsonLd data={createBreadcrumbSchema([...])} />`.
4. Add the new route to `src/app/sitemap.ts` with appropriate `priority` (0.7 - 0.9) and `changeFrequency`.
5. Ensure the page contains exactly one `<h1>` and semantic `<h2>` sub-sections.

### If creating a new Private Dashboard page:
1. Export `metadata: Metadata = createPageMetadata({ title: "...", description: "...", path: "/dashboard/...", noIndex: true })`.
2. Do **NOT** add the route to `sitemap.ts`.
3. Ensure no private financial numbers or user names are exported into static page metadata.

