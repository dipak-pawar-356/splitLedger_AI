import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/config";
import { JsonLd, createBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "Cookie Policy — Transparent Cookie Preferences",
  description:
    "Understand how SplitLedger AI utilizes strictly necessary, analytical, and functional cookies to provide high-performance session security and financial insights.",
  path: "/cookies",
  keywords: [
    "Cookie Policy",
    "Tracking Preferences",
    "Privacy and Cookies",
    "Session Cookies",
  ],
});

export default function CookiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd
        data={createBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Cookie Policy", path: "/cookies" },
        ])}
      />
      {children}
    </>
  );
}
