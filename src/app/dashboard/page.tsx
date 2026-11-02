import type { Metadata } from "next";
import { Suspense } from "react";
import { createPageMetadata } from "@/lib/seo/config";
import { getDashboardData, type DashboardOptions } from "@/actions/dashboard";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardDateFilter } from "@/components/dashboard/dashboard-date-filter";
import { DashboardSummaryCards } from "@/components/dashboard/dashboard-summary-cards";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { DashboardPendingTasks } from "@/components/dashboard/dashboard-pending-tasks";
import { DashboardFinancialInsights } from "@/components/dashboard/dashboard-financial-insights";
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  ReceiptIndianRupee, 
  ArrowRight, 
  Paperclip, 
  PlusCircle, 
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import Link from "next/link";
import { TransactionDialog } from "@/components/dialogs/transaction-dialog";

export const metadata: Metadata = createPageMetadata({
  title: "Personal Finance Dashboard | SplitLedger AI",
  description:
    "Real-time personal finance dashboard, expense tracking, group settlements, receivables, and payables.",
  path: "/dashboard",
  noIndex: true,
});

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams?: Promise<{
    period?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

async function DashboardContent({ options }: { options?: DashboardOptions }) {
  const data = await getDashboardData(options);
  const latestFiveTransactions = data.recentTransactions.slice(0, 5);
  const latestFiveActivities = data.recentActivity.slice(0, 5);

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Greeting & Profile Overview */}
      <DashboardHeader user={data.user} />

      {/* Date Range Filter Bar */}
      <DashboardDateFilter activePeriod={data.activePeriod} />

      {/* 2. Financial Summary (8 Core Cards) */}
      <DashboardSummaryCards
        summary={data.summary}
        trends={data.trends}
        activePeriod={data.activePeriod}
      />

      {/* 3. Quick Actions */}
      <DashboardQuickActions />

      {/* 4 & 5: Pending Tasks (Action-Required) & Financial Insights (3-5 Short Insights) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
        <DashboardPendingTasks tasks={data.pendingTasks} className="h-full flex flex-col justify-between" />
        <DashboardFinancialInsights insights={data.financialInsights} className="h-full flex flex-col justify-between" />
      </div>

      {/* 6 & 7: Recent Transactions (Latest 5) & Recent Activity (Latest 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
        {/* 6. Recent Transactions (Latest 5) */}
        <div className="lg:col-span-2 flex flex-col h-full">
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden bg-card flex-1 flex flex-col justify-between h-full">
            <CardHeader className="p-3.5 sm:p-4 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className="p-1.5 sm:p-2 rounded-xl bg-primary/10 text-primary">
                    <ReceiptIndianRupee className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                      Recent Transactions
                    </CardTitle>
                    <CardDescription className="text-[11px] sm:text-xs">
                      Latest active expenses, income & contact entries
                    </CardDescription>
                  </div>
                </div>
                <Link
                  href="/dashboard/transactions"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>View All</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 flex flex-col justify-between">
              {latestFiveTransactions.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 flex-1">
                  {latestFiveTransactions.map((tx) => {
                    const isPositive = tx.type === "received" || tx.type === "lent" || tx.type === "repaid";
                    const formattedDate = new Intl.DateTimeFormat("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(tx.date));

                    return (
                      <Link
                        key={tx.id}
                        href={`/dashboard/transactions/${tx.publicId}`}
                        className="p-3 sm:p-4 flex items-center justify-between gap-2.5 sm:gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors block group touch-press"
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <div className={`p-2 sm:p-2.5 rounded-2xl shrink-0 group-hover:scale-105 transition-transform ${
                            isPositive 
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" 
                              : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                          }`}>
                            {isPositive ? <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ArrowDownLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate max-w-[150px] sm:max-w-none">
                                {tx.title || tx.description}
                              </span>
                              {tx.paymentMethod && (
                                <Badge variant="outline" className="text-[9px] uppercase font-mono px-1.5 py-0 text-slate-500 border-slate-200 dark:border-slate-700 hidden sm:inline-flex">
                                  {tx.paymentMethod}
                                </Badge>
                              )}
                              {tx.receiptUrl && (
                                <Paperclip className="h-3 w-3 text-indigo-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5">
                              {tx.categoryName || "General"} • {tx.groupName ? `Group: ${tx.groupName}` : (tx.contactName || "Personal")} • {formattedDate}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-xs sm:text-sm font-black block tracking-tight ${
                            isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          }`}>
                            {isPositive ? "+" : "-"}{formatCurrency(tx.amount / 100, tx.currency)}
                          </span>
                          <span className="text-[9px] sm:text-[10px] uppercase font-mono text-slate-400 capitalize">
                            {tx.status}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 px-4 text-center space-y-3 flex-1 flex flex-col items-center justify-center">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-slate-400">
                    <ReceiptIndianRupee className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200">No transactions recorded yet</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Start recording your daily expenses, group bills, or income entries.
                    </p>
                  </div>
                  <TransactionDialog
                    trigger={
                      <Button size="sm" className="rounded-xl text-xs gap-1.5 font-semibold">
                        <PlusCircle className="h-4 w-4" />
                        <span>Add First Transaction</span>
                      </Button>
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 7. Recent Activity Feed (Latest 5) */}
        <div className="lg:col-span-1 flex flex-col h-full">
          <DashboardRecentActivity activities={latestFiveActivities} className="h-full flex flex-col justify-between flex-1" />
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage(props: DashboardPageProps) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const options: DashboardOptions = {
    period: searchParams.period as any,
    startDate: searchParams.startDate,
    endDate: searchParams.endDate,
  };

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent options={options} />
    </Suspense>
  );
}
