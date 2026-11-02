import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/config";
import { JsonLd, createBreadcrumbSchema, createFaqSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "Features & Capabilities — AI Expense Management & Split Ledger",
  description:
    "Explore SplitLedger AI features: conversational natural language expense parsing, dynamic NPCI UPI QR settlements, graph-minimized debt netting, and real-time ledger intelligence.",
  path: "/features",
  keywords: [
    "AI Expense Tracking",
    "Expense Parser",
    "UPI QR Settlements",
    "Debt Minimization Algorithm",
    "Shared Ledger",
    "Real-Time Expense Sync",
    "Group Expense Management",
    "Trip Expense Tracker",
    "Bill Splitter Features",
  ],
});

const featuresFaqs = [
  {
    question: "How does SplitLedger AI's natural language expense parsing work?",
    answer:
      "SplitLedger AI interprets unstructured natural language messages, extracts dates, amounts, categories, and participants, and converts them into structured ledger entries automatically.",
  },
  {
    question: "How does the debt simplification algorithm minimize transactions?",
    answer:
      "SplitLedger AI computes net debtor and creditor balances across all group members and executes bipartite graph reduction, turning complex circular debts into the minimum possible settlement transactions.",
  },
  {
    question: "Does SplitLedger AI generate NPCI compliant UPI QR codes?",
    answer:
      "Yes, SplitLedger AI produces instant dynamic NPCI UPI QR codes prefilled with the exact settlement amount and payee VPA for zero-error instant settlements across Google Pay, PhonePe, Paytm, and BHIM.",
  },
];

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd
        data={[
          createBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Features", path: "/features" },
          ]),
          createFaqSchema(featuresFaqs),
        ]}
      />
      {children}
    </>
  );
}
