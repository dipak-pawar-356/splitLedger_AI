import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/config";

export const metadata: Metadata = createPageMetadata({
  title: "Financial Notifications & Alerts | SplitLedger AI",
  description:
    "Real-time notifications, group split alerts, payment reminders, and settlement updates for your ledger.",
  path: "/dashboard/notifications",
  noIndex: true,
});

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

