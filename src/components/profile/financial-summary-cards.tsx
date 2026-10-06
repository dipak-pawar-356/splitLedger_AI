"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  Users, 
  CheckCircle2, 
  Clock, 
  Layers, 
  FileText, 
  Upload 
} from "lucide-react";

interface FinancialSummaryCardsProps {
  summary: {
    totalReceivable: number;
    totalPayable: number;
    netBalance: number;
    personalTransactionsCount: number;
    groupTransactionsCount: number;
    monthlySpending: number;
    monthlyIncome: number;
    pendingSettlementsCount: number;
    completedSettlementsCount: number;
    groupsJoinedCount: number;
    uniqueMembersConnected: number;
    receiptsUploadedCount: number;
  };
}

export function FinancialSummaryCards({ summary }: FinancialSummaryCardsProps) {
  const cards = [
    {
      title: "Total Receivable",
      value: formatCurrency(summary.totalReceivable),
      subtitle: "Pending from group members",
      icon: ArrowDownLeft,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/60",
    },
    {
      title: "Total Payable",
      value: formatCurrency(summary.totalPayable),
      subtitle: "You owe to others",
      icon: ArrowUpRight,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-900/60",
    },
    {
      title: "Net Balance",
      value: `${summary.netBalance >= 0 ? "+" : ""}${formatCurrency(summary.netBalance)}`,
      subtitle: summary.netBalance >= 0 ? "You are owed overall" : "You owe overall",
      icon: Wallet,
      color: summary.netBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
      bg: "bg-card border-slate-200/80 dark:border-slate-800",
    },
    {
      title: "Monthly Spending",
      value: formatCurrency(summary.monthlySpending),
      subtitle: "This calendar month",
      icon: TrendingDown,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-card border-slate-200/80 dark:border-slate-800",
    },
    {
      title: "Monthly Income",
      value: formatCurrency(summary.monthlyIncome),
      subtitle: "Recorded this month",
      icon: TrendingUp,
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-card border-slate-200/80 dark:border-slate-800",
    },
    {
      title: "Personal Ledger",
      value: `${summary.personalTransactionsCount} Records`,
      subtitle: "Private transactions",
      icon: Receipt,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-card border-slate-200/80 dark:border-slate-800",
    },
    {
      title: "Group Expenses",
      value: `${summary.groupTransactionsCount} Recorded`,
      subtitle: "Paid by you across groups",
      icon: Layers,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-card border-slate-200/80 dark:border-slate-800",
    },
    {
      title: "Pending Settlements",
      value: `${summary.pendingSettlementsCount} Awaiting`,
      subtitle: "Active payment requests",
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-card border-slate-200/80 dark:border-slate-800",
    },
    {
      title: "Settled Payments",
      value: `${summary.completedSettlementsCount} Completed`,
      subtitle: "Successful settlements",
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-card border-slate-200/80 dark:border-slate-800",
    },
    {
      title: "Groups Joined",
      value: `${summary.groupsJoinedCount} Active Groups`,
      subtitle: "Shared expense spaces",
      icon: Users,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-card border-slate-200/80 dark:border-slate-800",
    },
    {
      title: "Connected Members",
      value: `${summary.uniqueMembersConnected} Peers`,
      subtitle: "Collaborators across groups",
      icon: Users,
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-card border-slate-200/80 dark:border-slate-800",
    },
    {
      title: "Receipts Uploaded",
      value: `${summary.receiptsUploadedCount} Receipts`,
      subtitle: "Digitized with OCR",
      icon: Upload,
      color: "text-slate-600 dark:text-slate-400",
      bg: "bg-card border-slate-200/80 dark:border-slate-800",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Live Financial Snapshot
        </h3>
        <p className="text-xs text-slate-500">
          Calculated in real-time across your personal ledger, linked groups, and settlement balances (INR ₹)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={idx} className={`rounded-2xl border ${card.bg} shadow-xs p-4`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">{card.title}</span>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div className="mt-2">
                <span className={`text-lg font-black tracking-tight ${card.color}`}>
                  {card.value}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">{card.subtitle}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
