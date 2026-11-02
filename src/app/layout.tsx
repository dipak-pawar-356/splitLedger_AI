import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ClerkAuthProvider } from "@/components/providers/clerk-provider";
import { Toaster } from "@/components/ui/sonner";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { SITE_CONFIG } from "@/lib/seo/config";
import {
  JsonLd,
  createOrganizationSchema,
  createWebSiteSchema,
  createSoftwareApplicationSchema,
} from "@/lib/seo/structured-data";
import { EnterpriseAnalytics } from "@/components/analytics/enterprise-analytics";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: SITE_CONFIG.defaultTitle,
    template: SITE_CONFIG.titleTemplate,
  },
  description: SITE_CONFIG.defaultDescription,
  applicationName: SITE_CONFIG.name,
  authors: SITE_CONFIG.authors,
  creator: SITE_CONFIG.creator,
  publisher: SITE_CONFIG.publisher,
  keywords: SITE_CONFIG.keywords,
  alternates: {
    canonical: SITE_CONFIG.url,
    languages: {
      "en-IN": SITE_CONFIG.url,
      "en-US": `${SITE_CONFIG.url}/en-US`,
      "x-default": SITE_CONFIG.url,
    },
  },
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
  },
  openGraph: {
    type: "website",
    locale: SITE_CONFIG.locale,
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.name,
    title: SITE_CONFIG.defaultTitle,
    description: SITE_CONFIG.defaultDescription,
    images: [
      {
        url: `${SITE_CONFIG.url}${SITE_CONFIG.ogImage}`,
        width: 512,
        height: 512,
        alt: `${SITE_CONFIG.name} — Intelligent Financial Platform`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_CONFIG.defaultTitle,
    description: SITE_CONFIG.defaultDescription,
    images: [`${SITE_CONFIG.url}${SITE_CONFIG.ogImage}`],
    creator: SITE_CONFIG.social.twitter,
    site: SITE_CONFIG.social.twitter,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || undefined,
    other: {
      "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION || "",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <JsonLd
          data={[
            createOrganizationSchema(),
            createWebSiteSchema(),
            createSoftwareApplicationSchema(),
          ]}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ClerkAuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <RealtimeProvider>
              {children}
            </RealtimeProvider>
            <Toaster />
            <EnterpriseAnalytics />
          </ThemeProvider>
        </ClerkAuthProvider>
      </body>
    </html>
  );
}
