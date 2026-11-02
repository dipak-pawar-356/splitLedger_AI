import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo/config";

export const metadata: Metadata = createPageMetadata({
  title: "UPI Debt Settlement & Balance Netting | SplitLedger AI",
  description:
    "Settle debts with optimized balance netting and direct UPI payment links across all groups.",
  path: "/dashboard/settlements",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default function SettlementsPage() {
  // Settlements section removed as settlements are managed per-group (/dashboard/groups/[id]/settlements)
  redirect("/dashboard/groups");
}
