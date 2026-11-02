import { MetadataRoute } from "next";

/**
 * Enterprise Next.js Metadata Route for PWA Web Manifest
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SplitLedger AI — Smart Expense Tracker & Group Finance",
    short_name: "SplitLedger AI",
    description:
      "Enterprise financial management platform for tracking expenses, settlements, group debt netting, and real-time AI ledger analytics.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#4f46e5",
    orientation: "portrait-primary",
    scope: "/",
    categories: ["finance", "productivity", "business"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "Record Transaction",
        short_name: "Add Expense",
        description: "Quickly record a personal or shared group expense",
        url: "/dashboard/transactions",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Group Ledgers",
        short_name: "Groups",
        description: "View shared group balances and settlements",
        url: "/dashboard/groups",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Financial Intelligence",
        short_name: "Assistant",
        description: "Ask your chartered AI ledger assistant",
        url: "/dashboard/ai",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Financial Reports",
        short_name: "Reports",
        description: "Generate executive summaries and tax audits",
        url: "/dashboard/reports",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}

