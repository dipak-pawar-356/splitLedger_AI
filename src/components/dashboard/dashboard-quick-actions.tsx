"use client";

import { Button } from "@/components/ui/button";
import { 
  PlusCircle, 
  Users, 
  UserPlus, 
  CheckCircle2, 
  Sparkles,
  PieChart
} from "lucide-react";
import Link from "next/link";
import { TransactionDialog } from "@/components/dialogs/transaction-dialog";
import { GroupDialog } from "@/components/dialogs/group-dialog";
import { ContactDialog } from "@/components/dialogs/contact-dialog";
import { SettleAllDialog } from "@/components/dialogs/settle-all-dialog";

export function DashboardQuickActions() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Quick Actions
        </h3>
        <span className="text-xs text-slate-400">Direct shortcuts</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Add Transaction */}
        <TransactionDialog
          trigger={
            <Button
              type="button"
              variant="outline"
              className="card-lift h-auto py-3.5 px-3 flex flex-col items-center justify-center gap-2 rounded-2xl border-slate-200/80 dark:border-slate-800 hover:border-primary/60 hover:bg-primary/[0.03] transition-all group w-full cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200">
                <PlusCircle className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 text-center leading-tight">
                Add Transaction
              </span>
            </Button>
          }
        />

        {/* 2. Create Group */}
        <GroupDialog
          trigger={
            <Button
              type="button"
              variant="outline"
              className="card-lift h-auto py-3.5 px-3 flex flex-col items-center justify-center gap-2 rounded-2xl border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/60 hover:bg-emerald-500/[0.03] transition-all group w-full cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200">
                <Users className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 text-center leading-tight">
                Create Group
              </span>
            </Button>
          }
        />

        {/* 3. Add Contact */}
        <ContactDialog
          trigger={
            <Button
              type="button"
              variant="outline"
              className="card-lift h-auto py-3.5 px-3 flex flex-col items-center justify-center gap-2 rounded-2xl border-slate-200/80 dark:border-slate-800 hover:border-blue-500/60 hover:bg-blue-500/[0.03] transition-all group w-full cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200">
                <UserPlus className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 text-center leading-tight">
                Add Contact
              </span>
            </Button>
          }
        />

        {/* 4. Settle All */}
        <SettleAllDialog
          trigger={
            <Button
              type="button"
              variant="outline"
              className="card-lift h-auto py-3.5 px-3 flex flex-col items-center justify-center gap-2 rounded-2xl border-slate-200/80 dark:border-slate-800 hover:border-teal-500/60 hover:bg-teal-500/[0.03] transition-all group w-full cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 text-center leading-tight">
                Settle All
              </span>
            </Button>
          }
        />

        {/* 5. AI Assistant */}
        <Link href="/dashboard/ai" className="w-full">
          <Button
            type="button"
            variant="outline"
            className="card-lift h-auto py-3.5 px-3 flex flex-col items-center justify-center gap-2 rounded-2xl border-slate-200/80 dark:border-slate-800 hover:border-amber-500/60 hover:bg-amber-500/[0.03] transition-all group w-full cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 text-center leading-tight">
              AI Assistant
            </span>
          </Button>
        </Link>

        {/* 6. Budget */}
        <Link href="/dashboard/budgets" className="w-full">
          <Button
            type="button"
            variant="outline"
            className="card-lift h-auto py-3.5 px-3 flex flex-col items-center justify-center gap-2 rounded-2xl border-slate-200/80 dark:border-slate-800 hover:border-purple-500/60 hover:bg-purple-500/[0.03] transition-all group w-full cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200">
              <PieChart className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 text-center leading-tight">
              Budgets
            </span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
