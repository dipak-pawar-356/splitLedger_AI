"use client";

import { AlertCircle, Lock, ShieldCheck } from "lucide-react";

interface ExpenseInactiveBannerProps {
  groupName?: string;
}

export function ExpenseInactiveBanner({ groupName }: ExpenseInactiveBannerProps) {
  return (
    <div className="rounded-2xl border border-amber-300 dark:border-amber-700/80 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40 p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-amber-500/15 dark:bg-amber-500/25 rounded-xl text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Expense Inactive Member
              </h3>
              <span className="text-[11px] font-semibold bg-amber-200/80 dark:bg-amber-800/60 text-amber-900 dark:text-amber-100 px-2 py-0.5 rounded-full">
                Configuration Pending
              </span>
            </div>
            <p className="text-xs sm:text-sm text-amber-800/90 dark:text-amber-300/90 mt-1 font-medium leading-relaxed">
              Your expense participation is awaiting Group Owner configuration.
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              You cannot add, edit, or split expenses or generate settlement QR codes until the Group Owner decides your historical participation (Option A vs Option B).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-white/70 dark:bg-slate-900/60 border border-amber-200 dark:border-amber-800/70 px-3 py-1.5 rounded-xl">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Protected Access</span>
          </div>
        </div>
      </div>
    </div>
  );
}
