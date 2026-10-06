import { Suspense } from "react";
import { getDashboardData } from "@/actions/dashboard";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSummaryCards } from "@/components/dashboard/dashboard-summary-cards";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { DashboardFinancialInsights } from "@/components/dashboard/dashboard-financial-insights";
import { DashboardPendingTasks } from "@/components/dashboard/dashboard-pending-tasks";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  Receipt, 
  ArrowRight, 
  Paperclip, 
  PlusCircle, 
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Clock
} from "lucide-react";
import Link from "next/link";
import { TransactionDialog } from "@/components/dialogs/transaction-dialog";

export const dynamic = "force-dynamic";

async function DashboardContent() {
  const data = await getDashboardData();

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Welcome Header (Avatar, Name, Verified, Profile Completion %, Current Date, Greeting) */}
      <DashboardHeader user={data.user} />

      {/* 2. Quick Financial Summary (Strictly 8 Cards) */}
      <DashboardSummaryCards
        summary={data.summary}
        trends={data.trends}
      />

      {/* 3. Quick Actions (Strictly 6 direct actions, no duplicate invite modal) */}
      <DashboardQuickActions />

      {/* 6 & 7: Pending Tasks & Financial Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardFinancialInsights insights={data.financialInsights} />
        <DashboardPendingTasks tasks={data.pendingTasks} />
      </div>

      {/* 8. Charts: Income vs Expense, Category Breakdown, Cashflow Trend */}
      <DashboardCharts charts={data.charts} />

      {/* 4 & 5: Recent Transactions & Streamlined Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Latest 8 Transactions */}
        <div className="lg:col-span-2">
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden bg-card">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Recent Transactions
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Latest 8 active expenses, income & settlement entries
                    </CardDescription>
                  </div>
                </div>
                <Link
                  href="/dashboard/transactions"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {data.recentTransactions.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {data.recentTransactions.map((tx) => {
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
                        className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors block group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2.5 rounded-2xl shrink-0 group-hover:scale-105 transition-transform ${
                            isPositive 
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" 
                              : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                          }`}>
                            {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate">
                                {tx.title || tx.description}
                              </span>
                              {tx.paymentMethod && (
                                <Badge variant="outline" className="text-[9px] uppercase font-mono px-1.5 py-0 text-slate-500 border-slate-200 dark:border-slate-700">
                                  {tx.paymentMethod}
                                </Badge>
                              )}
                              {tx.receiptUrl && (
                                <Paperclip className="h-3 w-3 text-indigo-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {tx.categoryName || "General"} • {tx.groupName ? `Group: ${tx.groupName}` : (tx.contactName || "Personal")} • {formattedDate}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-xs font-black block ${
                            isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          }`}>
                            {isPositive ? "+" : "-"}{formatCurrency(tx.amount / 100, tx.currency)}
                          </span>
                          <span className="text-[10px] uppercase font-mono text-slate-400 capitalize">
                            {tx.status}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 px-4 text-center space-y-3">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-slate-400">
                    <Receipt className="h-6 w-6" />
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

        {/* Right 1 Column: Streamlined Recent Activity Feed (10 records) */}
        <div className="lg:col-span-1">
          <DashboardRecentActivity activities={data.recentActivity} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
