import type { Metadata } from "next";
import Link from "next/link";
import { SplitLedgerAiIcon } from "@/components/ai/split-ledger-ai-icon";
import { Home, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "404 - Page Not Found",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-center space-y-6">
      <div className="p-4 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-3xl text-indigo-600 dark:text-indigo-400">
        <SplitLedgerAiIcon size={48} className="text-indigo-600 dark:text-indigo-400" />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">404 — Ledger Record Not Found</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The financial ledger record or destination you are seeking cannot be located or has been archived.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Home className="h-4 w-4" />
          <span>Go to Dashboard</span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Home</span>
        </Link>
      </div>
    </main>
  );
}
