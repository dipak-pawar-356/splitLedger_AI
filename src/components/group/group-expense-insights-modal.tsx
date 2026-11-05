"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  PieChart,
  Award,
  Activity,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Scale,
} from "lucide-react";

export type InsightModalType =
  | "today"
  | "month"
  | "average"
  | "highest_expense"
  | "lowest_expense"
  | "categories"
  | "contributors"
  | "liquidity";

interface GroupExpenseInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: InsightModalType | null;
  expenseSummary: {
    totalExpense: number;
    todayExpense: number;
    thisMonthExpense: number;
    averagePerMember: number;
    highestExpense: { title: string; amount: number; paidBy: string } | null;
    lowestExpense: { title: string; amount: number; paidBy: string } | null;
    categoryBreakdown: Array<{ name: string; amount: number; count: number }>;
  };
  insights: {
    highestContributor: { name: string; amount: number; percentage: number } | null;
    lowestContributor: { name: string; amount: number; percentage: number } | null;
    mostActiveMember: { name: string; count: number } | null;
    largestExpense: { title: string; amount: number; date: Date | string } | null;
    totalReceivableInGroup: number;
    totalPayableInGroup: number;
  };
}

export function GroupExpenseInsightsModal({
  isOpen,
  onClose,
  type,
  expenseSummary,
  insights,
}: GroupExpenseInsightsModalProps) {
  if (!type) return null;

  let theme = {
    title: "Expense Insights & Stats",
    subtitle: "Detailed ledger analytics and spending distributions",
    icon: Activity,
    borderClass: "border-2 border-purple-500/70 ring-1 ring-purple-500/40",
    glowClass: "shadow-[0_0_40px_rgba(168,85,247,0.3)]",
    topBarGradient: "from-purple-500 via-indigo-500 to-pink-500",
    accentText: "text-purple-400",
  };

  if (type === "highest_expense" || type === "lowest_expense") {
    theme = {
      title: type === "highest_expense" ? "Peak Expense Transaction Audit" : "Minimum Expense Transaction Audit",
      subtitle: "Highest single debit transaction recorded in group ledger",
      icon: TrendingUp,
      borderClass: "border-2 border-emerald-500/70 ring-1 ring-emerald-500/40",
      glowClass: "shadow-[0_0_40px_rgba(16,185,129,0.3)]",
      topBarGradient: "from-emerald-500 via-teal-400 to-cyan-400",
      accentText: "text-emerald-400",
    };
  } else if (type === "today" || type === "month") {
    theme = {
      title: type === "today" ? "Today's Group Velocity & Burn" : "Monthly Group Spend Analysis",
      subtitle: "Real-time duration tracking and expenditure pace",
      icon: Calendar,
      borderClass: "border-2 border-indigo-500/70 ring-1 ring-indigo-500/40",
      glowClass: "shadow-[0_0_40px_rgba(99,102,241,0.3)]",
      topBarGradient: "from-indigo-500 via-blue-500 to-cyan-400",
      accentText: "text-indigo-400",
    };
  } else if (type === "average") {
    theme = {
      title: "Average Per Member Responsibility",
      subtitle: "Calculated liability and fair-share distribution",
      icon: Scale,
      borderClass: "border-2 border-sky-500/70 ring-1 ring-sky-500/40",
      glowClass: "shadow-[0_0_40px_rgba(14,165,233,0.3)]",
      topBarGradient: "from-sky-500 via-cyan-400 to-indigo-400",
      accentText: "text-sky-400",
    };
  } else if (type === "categories") {
    theme = {
      title: "Category Breakdown & Distribution",
      subtitle: "Categorized spending share across group activity",
      icon: PieChart,
      borderClass: "border-2 border-cyan-500/70 ring-1 ring-cyan-500/40",
      glowClass: "shadow-[0_0_40px_rgba(6,182,212,0.3)]",
      topBarGradient: "from-cyan-500 via-teal-400 to-emerald-400",
      accentText: "text-cyan-400",
    };
  } else if (type === "contributors") {
    theme = {
      title: "Member Contribution Leaderboard",
      subtitle: "Capital commitments, funding share, and activity frequency",
      icon: Award,
      borderClass: "border-2 border-amber-500/70 ring-1 ring-amber-500/40",
      glowClass: "shadow-[0_0_40px_rgba(245,158,11,0.3)]",
      topBarGradient: "from-amber-500 via-orange-400 to-rose-400",
      accentText: "text-amber-400",
    };
  } else if (type === "liquidity") {
    theme = {
      title: "Group Liquidity Pool & Debt Matrix",
      subtitle: "Aggregate peer balances, pending receivables, and debt clearance",
      icon: Activity,
      borderClass: "border-2 border-emerald-500/70 ring-1 ring-emerald-500/40",
      glowClass: "shadow-[0_0_40px_rgba(16,185,129,0.3)]",
      topBarGradient: "from-emerald-500 via-indigo-500 to-rose-500",
      accentText: "text-emerald-400",
    };
  }

  const IconComponent = theme.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`sm:max-w-xl rounded-3xl p-0 overflow-hidden bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-2xl shadow-2xl ${theme.borderClass} ${theme.glowClass}`}
      >
        <div className={`h-2 w-full bg-gradient-to-r ${theme.topBarGradient} animate-pulse`} />

        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-slate-800 border border-slate-700/80 text-primary">
                <IconComponent className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-100 tracking-tight">
                  {theme.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  {theme.subtitle}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Dynamic Content Body */}
          {(type === "today" || type === "month") && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Today's Spend</span>
                  <span className="text-xl font-black font-mono text-indigo-400 block mt-0.5">
                    {formatCurrency(expenseSummary.todayExpense)}
                  </span>
                  <span className="text-[10px] text-slate-400">Current date debits</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">This Month</span>
                  <span className="text-xl font-black font-mono text-purple-400 block mt-0.5">
                    {formatCurrency(expenseSummary.thisMonthExpense)}
                  </span>
                  <span className="text-[10px] text-slate-400">Monthly cumulative</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/60 text-xs space-y-1.5">
                <span className="font-bold text-slate-200">Velocity Analysis</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Total group expenditure stands at <strong>{formatCurrency(expenseSummary.totalExpense)}</strong>.
                  All calculations strictly filter approved group transactions from verified database ledger entries.
                </p>
              </div>
            </div>
          )}

          {type === "average" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-center space-y-1">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Fair Share Per Member</span>
                <span className="text-3xl font-black font-mono text-sky-400 block">
                  {formatCurrency(expenseSummary.averagePerMember)}
                </span>
                <span className="text-xs text-slate-400">Evenly split across all group participants</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed p-3.5 rounded-2xl bg-slate-800/30 border border-slate-700/60">
                Calculated by dividing total approved group expenses of <strong>{formatCurrency(expenseSummary.totalExpense)}</strong> by participating active members.
              </p>
            </div>
          )}

          {(type === "highest_expense" || type === "lowest_expense") && (
            <div className="space-y-4">
              {type === "highest_expense" && expenseSummary.highestExpense ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-100">{expenseSummary.highestExpense.title}</span>
                    <span className="text-lg font-black font-mono text-emerald-400">
                      {formatCurrency(expenseSummary.highestExpense.amount)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Paid by <strong className="text-white">{expenseSummary.highestExpense.paidBy}</strong>
                  </p>
                </div>
              ) : type === "lowest_expense" && expenseSummary.lowestExpense ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-100">{expenseSummary.lowestExpense.title}</span>
                    <span className="text-lg font-black font-mono text-amber-400">
                      {formatCurrency(expenseSummary.lowestExpense.amount)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Paid by <strong className="text-white">{expenseSummary.lowestExpense.paidBy}</strong>
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">No transactions recorded yet.</p>
              )}
            </div>
          )}

          {type === "categories" && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Category Allocations ({expenseSummary.categoryBreakdown.length})
              </span>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {expenseSummary.categoryBreakdown.map((cat, idx) => {
                  const percent = expenseSummary.totalExpense > 0 
                    ? Math.round((cat.amount / expenseSummary.totalExpense) * 100) 
                    : 0;
                  return (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-100">{cat.name}</span>
                        <span className="font-mono text-cyan-400">{formatCurrency(cat.amount)} ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-400">{cat.count} transactions recorded</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {type === "contributors" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {insights.highestContributor && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">Top Funder</span>
                    <span className="text-sm font-bold text-slate-100 block">{insights.highestContributor.name}</span>
                    <span className="text-base font-black font-mono text-amber-400 block">
                      {formatCurrency(insights.highestContributor.amount)}
                    </span>
                    <span className="text-[10px] text-slate-400">{insights.highestContributor.percentage}% of all expenses</span>
                  </div>
                )}
                {insights.mostActiveMember && (
                  <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-purple-400 tracking-wider">Most Active</span>
                    <span className="text-sm font-bold text-slate-100 block">{insights.mostActiveMember.name}</span>
                    <span className="text-base font-black font-mono text-purple-400 block">
                      {insights.mostActiveMember.count} entries
                    </span>
                    <span className="text-[10px] text-slate-400">Expense records created</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {type === "liquidity" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">Total Receivable</span>
                  <span className="text-xl font-black font-mono text-emerald-400 block">
                    {formatCurrency(insights.totalReceivableInGroup)}
                  </span>
                  <span className="text-[10px] text-slate-400">Awaiting collection</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-rose-400 tracking-wider">Total Payable</span>
                  <span className="text-xl font-black font-mono text-rose-400 block">
                    {formatCurrency(insights.totalPayableInGroup)}
                  </span>
                  <span className="text-[10px] text-slate-400">Outstanding liabilities</span>
                </div>
              </div>
              <p className="text-xs text-slate-300 p-3 rounded-2xl bg-slate-800/30 border border-slate-700/60 leading-relaxed">
                Represents all active debt transfers in this group. Equal matching guarantees perfect zero-sum settlement clearance.
              </p>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Verified Ledger Analytics</span>
            </div>

            <Button
              onClick={onClose}
              className="rounded-xl text-xs font-bold px-5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <span>Close Insights</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
