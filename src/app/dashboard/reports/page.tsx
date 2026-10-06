import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, groups, contacts } from "@/lib/db/schema/schema";
import { eq, and } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileCheck
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { 
  getReportDashboardSummary, 
  getComprehensiveReport, 
  getReportAnalytics
} from "@/actions/reports";
import { ReportsClientView } from "@/components/reports/reports-client-view";
import { AnimatedCounter } from "@/components/ui/animated-counter";

export const dynamic = 'force-dynamic';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    period?: string;
    reportType?: string;
    groupId?: string;
    categoryId?: string;
  }>;
}) {
  const user = await requireAuth();
  const sParams = await searchParams;

  const initialPeriod = (sParams?.period || "all") as any;
  const initialType = (sParams?.reportType || "overview") as any;
  const initialGroupId = sParams?.groupId ? Number(sParams?.groupId) : undefined;
  const initialCategoryId = sParams?.categoryId ? Number(sParams?.categoryId) : undefined;

  // Fetch all dashboard summary metrics, comprehensive report, analytics, categories, groups, contacts
  const [
    summaryMetrics,
    reportData,
    analyticsData,
    categoriesList,
    groupsList,
    contactsList,
  ] = await Promise.all([
    getReportDashboardSummary(),
    getComprehensiveReport({
      period: initialPeriod,
      reportType: initialType,
      groupId: initialGroupId,
      categoryId: initialCategoryId,
      limit: 50,
      page: 1,
    }),
    getReportAnalytics({
      period: initialPeriod,
    }),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(orCondition(eq(categories.userId, user.id), eq(categories.isDefault, true))),
    db
      .select({ id: groups.id, name: groups.name })
      .from(groups)
      .where(and(eq(groups.isDeleted, false))),
    db
      .select({ id: contacts.id, name: contacts.name })
      .from(contacts)
      .where(and(eq(contacts.userId, user.id), eq(contacts.isDeleted, false))),
  ]);

  function orCondition(cond1: any, cond2: any) {
    return cond1;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Financial Reports & Analytics</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Real-time financial intelligence, multi-criteria audit reports & automated export (INR ₹)
          </p>
        </div>
      </div>

      {/* SECTION 1: Summary Cards Grid (All Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. Total Income */}
        <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 cursor-pointer hover:border-emerald-500/50 transition-all bg-card">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Total Income</span>
            <div className="p-1 rounded-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            </div>
          </div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 truncate tracking-tight">
            <AnimatedCounter value={formatCurrency(summaryMetrics.totalIncome)} />
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Received / Lent</p>
        </Card>

        {/* 2. Total Expenses */}
        <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 cursor-pointer hover:border-rose-500/50 transition-all bg-card">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Total Expenses</span>
            <div className="p-1 rounded-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
            </div>
          </div>
          <div className="text-lg font-bold text-rose-600 dark:text-rose-400 truncate tracking-tight">
            <AnimatedCounter value={formatCurrency(summaryMetrics.totalExpense)} />
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Paid / Borrowed</p>
        </Card>

        {/* 3. Net Balance */}
        <Card className={`card-lift group rounded-2xl border shadow-sm p-3.5 cursor-pointer transition-all ${
          summaryMetrics.netBalance >= 0 ? "hover:border-emerald-500/50" : "hover:border-rose-500/50"
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Net Balance</span>
            <div className="p-1 rounded-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <DollarSign className="h-3.5 w-3.5 text-primary" />
            </div>
          </div>
          <div className={`text-lg font-bold truncate tracking-tight ${summaryMetrics.netBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            <AnimatedCounter value={`${summaryMetrics.netBalance >= 0 ? "+" : ""}${formatCurrency(summaryMetrics.netBalance)}`} />
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Cash position</p>
        </Card>

        {/* 4. Total Receivable */}
        <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 cursor-pointer hover:border-blue-500/50 transition-all bg-card">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Total Receivable</span>
            <div className="p-1 rounded-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <ArrowUpRight className="h-3.5 w-3.5 text-blue-500" />
            </div>
          </div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400 truncate tracking-tight">
            <AnimatedCounter value={formatCurrency(summaryMetrics.totalReceivable)} />
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Owed to you</p>
        </Card>

        {/* 5. Total Payable */}
        <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 cursor-pointer hover:border-amber-500/50 transition-all bg-card">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Total Payable</span>
            <div className="p-1 rounded-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <ArrowDownLeft className="h-3.5 w-3.5 text-amber-500" />
            </div>
          </div>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400 truncate tracking-tight">
            <AnimatedCounter value={formatCurrency(summaryMetrics.totalPayable)} />
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">You owe others</p>
        </Card>

        {/* 6. Total Settlements */}
        <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 cursor-pointer hover:border-teal-500/50 transition-all bg-card">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Settled Amount</span>
            <div className="p-1 rounded-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <FileCheck className="h-3.5 w-3.5 text-teal-500" />
            </div>
          </div>
          <div className="text-lg font-bold text-teal-600 dark:text-teal-400 truncate tracking-tight">
            <AnimatedCounter value={formatCurrency(summaryMetrics.totalSettlements)} />
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{summaryMetrics.totalSettlementCount} settlements completed</p>
        </Card>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
        <div>
          <span className="text-slate-400 block text-[11px]">Active Groups</span>
          <span className="font-semibold text-sm">{summaryMetrics.activeGroupsCount} groups</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Personal Transactions</span>
          <span className="font-semibold text-sm">{summaryMetrics.personalTxCount}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Group Transactions</span>
          <span className="font-semibold text-sm">{summaryMetrics.groupTxCount}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Total Members</span>
          <span className="font-semibold text-sm">{summaryMetrics.totalMembersCount}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Pending Settlements</span>
          <span className={`font-semibold text-sm ${summaryMetrics.pendingSettlementsCount > 0 ? "text-amber-600" : "text-slate-600"}`}>
            {summaryMetrics.pendingSettlementsCount} pending
          </span>
        </div>
      </div>

      {/* Main Reports & Analytics Client View */}
      <ReportsClientView
        initialReportData={reportData}
        analyticsData={analyticsData}
        categories={categoriesList}
        groups={groupsList}
        contacts={contactsList}
        userEmail={user.email || ""}
      />
    </div>
  );
}
