import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/config";
import { JsonLd, createBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "Copyright & Intellectual Property Notice",
  description:
    "Copyright notice and intellectual property guidelines for SplitLedger AI software, algorithm implementations, branding, and content.",
  path: "/copyright",
  keywords: [
    "Copyright Notice",
    "Intellectual Property",
    "SplitLedger Legal Notice",
    "Trademark Guidelines",
  ],
});

export default function CopyrightLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd
        data={createBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Copyright Notice", path: "/copyright" },
        ])}
      />
      {children}
    </>
  );
}

