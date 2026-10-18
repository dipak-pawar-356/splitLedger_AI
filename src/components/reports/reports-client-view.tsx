"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Printer, 
  FileText, 
  Calendar, 
  Activity, 
  Eye,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Users,
  UserCheck,
  Clock,
  CheckCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  PiggyBank,
  AlertCircle,
  PieChart as PieIcon,
  Layers,
  Receipt,
  ShieldCheck,
  Sparkles,
  Zap,
  BarChart3,
  Info,
  ArrowRight,
  Filter
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { ReportFiltersBar } from "@/components/reports/report-filters-bar";
import { ReportsAnalyticsView } from "@/components/reports/reports-analytics-view";
import { exportReportData, getComprehensiveReport, getReportAnalytics, type ReportFilterOptions } from "@/actions/reports";
import { toast } from "sonner";
import { AnimatedCounter } from "@/components/ui/animated-counter";

/**
 * Micro-Sparkline SVG renderer
 */
function MiniSparkline({ data, color = "#4f46e5" }: { data?: number[]; color?: string }) {
  if (!data || data.length < 2) {
    return <span className="inline-block w-12 h-3 bg-slate-100 dark:bg-slate-800 rounded" />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 18;
  const width = 52;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible inline-block opacity-80 group-hover:opacity-100 transition-opacity">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

interface ReportsClientViewProps {
  initialReportData: any;
  analyticsData: any;
  categories: Array<{ id: number; name: string }>;
  groups: Array<{ id: number; name: string }>;
  contacts: Array<{ id: number; name: string }>;
  userEmail: string;
}

export function ReportsClientView({
  initialReportData,
  analyticsData: initialAnalytics,
  categories,
  groups,
  contacts,
  userEmail,
}: ReportsClientViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useState<ReportFilterOptions>({
    reportType: (searchParams.get("reportType") as any) || "overview",
    period: (searchParams.get("period") as any) || "all",
    search: searchParams.get("search") || "",
    reportScope: (searchParams.get("reportScope") as any) || "combined",
    page: Number(searchParams.get("page") || "1"),
    limit: 50,
  });

  const [viewMode, setViewMode] = useState<"analytics" | "table" | "insights">("analytics");
  const [tableTab, setTableTab] = useState<"my_transactions" | "group_transactions">("my_transactions");
  const [reportData, setReportData] = useState(initialReportData);
  const [analyticsData, setAnalyticsData] = useState(initialAnalytics);
  const [isExporting, setIsExporting] = useState(false);

  // Update URL search params and fetch fresh data dynamically
  const updateFilters = (newFilters: ReportFilterOptions) => {
    setFilters(newFilters);

    // Build URL query params
    const params = new URLSearchParams();
    if (newFilters.reportType && newFilters.reportType !== "overview") params.set("reportType", newFilters.reportType);
    if (newFilters.period && newFilters.period !== "all") params.set("period", newFilters.period);
    if (newFilters.search) params.set("search", newFilters.search);
    if (newFilters.reportScope && newFilters.reportScope !== "combined") params.set("reportScope", newFilters.reportScope);
    if (newFilters.categoryId) params.set("categoryId", String(newFilters.categoryId));
    if (newFilters.groupId) params.set("groupId", String(newFilters.groupId));
    if (newFilters.paymentMethod) params.set("paymentMethod", newFilters.paymentMethod);
    if (newFilters.page && newFilters.page > 1) params.set("page", String(newFilters.page));

    const queryString = params.toString();
    const newPath = queryString ? `/dashboard/reports?${queryString}` : "/dashboard/reports";
    router.push(newPath, { scroll: false });

    // Fetch updated dataset
    startTransition(async () => {
      try {
        const [freshReport, freshAnalytics] = await Promise.all([
          getComprehensiveReport(newFilters),
          getReportAnalytics(newFilters),
        ]);
        setReportData(freshReport);
        setAnalyticsData(freshAnalytics);
      } catch (err: any) {
        toast.error("Failed to load report data");
      }
    });
  };

  // Handle export download
  const handleExport = async (format: "csv" | "json" | "pdf" | "excel") => {
    setIsExporting(true);
    try {
      const result = await exportReportData(format, filters);

      if (format === "pdf") {
        const typeCap = (filters.reportType || "Overview")
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join("_");
        const dateSlug = new Date().toISOString().split("T")[0];
        const pdfTitle = `${typeCap}_Report_SplitLedger_AI_${dateSlug}`;

        const win = window.open("", "_blank");
        if (win) {
          win.document.write(result.content);
          win.document.title = pdfTitle;
          win.document.close();
          setTimeout(() => {
            win.focus();
            win.print();
          }, 300);
        } else {
          toast.info("Pop-up blocked. Please allow pop-ups to print PDF.");
        }
      } else {
        const blob = new Blob([result.content], { type: result.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Exported as ${format.toUpperCase()}`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to export report");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    handleExport("pdf");
  };

  const kpis = analyticsData?.kpiCards || {};
  const gSum = analyticsData?.groupSummary || reportData?.groupSummary;
  const pSum = analyticsData?.personalSummary || reportData?.personalSummary;
  const paySum = analyticsData?.paymentSummary || reportData?.paymentSummary;
  const scope = filters.reportScope || "combined";

  const health = analyticsData?.financialHealthScore || pSum?.myFinancialHealth || {
    score: 85,
    grade: "A",
    label: "Healthy Cash Flow",
    breakdown: { settlementCompletion: 20, savingsRatio: 20, debtStability: 16, expensePredictability: 12, groupEngagement: 12 },
    tips: ["Record regular transactions to generate predictive analytics."],
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: TOP ACTION TOOLBAR & EXPORT BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800 no-print">
        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          <Button
            type="button"
            variant={viewMode === "analytics" ? "default" : "ghost"}
            size="sm"
            className="rounded-lg text-xs h-7 px-3 font-semibold"
            onClick={() => setViewMode("analytics")}
          >
            <Activity className="h-3.5 w-3.5 mr-1 text-primary" />
            Overview & Analytics
          </Button>
          <Button
            type="button"
            variant={viewMode === "insights" ? "default" : "ghost"}
            size="sm"
            className="rounded-lg text-xs h-7 px-3 font-semibold"
            onClick={() => setViewMode("insights")}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-500" />
            AI Insights
          </Button>
          <Button
            type="button"
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            className="rounded-lg text-xs h-7 px-3 font-semibold"
            onClick={() => setViewMode("table")}
          >
            <FileText className="h-3.5 w-3.5 mr-1" />
            Transactions ({reportData.totalCount})
          </Button>
        </div>

        {/* Action Buttons: Print & 4 Export Formats */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl text-xs h-8 gap-1.5 font-medium"
            onClick={handlePrint}
            title="Generate executive print/PDF report"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </Button>

          {/* Export Formats */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isExporting}
              className="rounded-xl text-xs h-8 px-2.5 font-medium"
              onClick={() => handleExport("csv")}
            >
              CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isExporting}
              className="rounded-xl text-xs h-8 px-2.5 font-medium"
              onClick={() => handleExport("excel")}
            >
              Excel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isExporting}
              className="rounded-xl text-xs h-8 px-2.5 font-medium"
              onClick={() => handleExport("json")}
            >
              JSON
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={isExporting}
              className="rounded-xl text-xs h-8 px-3 font-semibold bg-primary hover:bg-primary/90 text-white shadow-sm"
              onClick={() => handleExport("pdf")}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>
      {/* Advanced Filter Toolbar */}
      <div className="no-print">
        <ReportFiltersBar
          filters={filters}
          onFiltersChange={(newF) => updateFilters(newF)}
          categories={categories}
          groups={groups}
          contacts={contacts}
        />
      </div>

      {/* SECTION 1: OVERALL GROUP FINANCIAL SUMMARY (Shown for Combined or Group scope) */}
      {(scope === "combined" || scope === "group") && gSum && (
        <div className="space-y-2.5 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/20 dark:bg-blue-950/10">
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-600 text-white text-[10px] font-mono px-2 py-0.5">SECTION 1</Badge>
              <span className="font-bold uppercase tracking-wider text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-blue-600" />
                Overall Group Financial Summary
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Represents every member combined across active groups
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {/* 1. Total Group Expense */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card hover:border-blue-400 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Group Expense</span>
              <div className="text-base font-bold text-rose-600 dark:text-rose-400 mt-1">
                <AnimatedCounter value={formatCurrency(gSum.totalGroupExpense || 0)} />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">All members combined</span>
            </Card>

            {/* 2. Total Group Income */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card hover:border-blue-400 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Group Income</span>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                <AnimatedCounter value={formatCurrency(gSum.totalGroupIncome || 0)} />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Combined group deposits</span>
            </Card>

            {/* 3. Total Group Transactions */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card hover:border-blue-400 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Group Txns</span>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                <AnimatedCounter value={String(gSum.totalGroupTransactions || 0)} />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Shared group entries</span>
            </Card>

            {/* 4. Total Members */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card hover:border-blue-400 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Members</span>
              <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {gSum.totalMembers || 1}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Across all circles</span>
            </Card>

            {/* 5. Total Groups */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card hover:border-blue-400 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Groups</span>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                {gSum.totalGroups || 0}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Active expense circles</span>
            </Card>

            {/* 6. Total Pending Settlements */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card hover:border-blue-400 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Pending Settlements</span>
              <div className="text-base font-bold text-amber-600 dark:text-amber-400 mt-1">
                <AnimatedCounter value={formatCurrency(gSum.totalPendingSettlements?.amount || 0)} />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">{gSum.totalPendingSettlements?.count || 0} transfers waiting</span>
            </Card>

            {/* 7. Total Completed Settlements */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card hover:border-blue-400 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Completed Settl.</span>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                <AnimatedCounter value={formatCurrency(gSum.totalCompletedSettlements?.amount || 0)} />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">{gSum.totalCompletedSettlements?.count || 0} transfers cleared</span>
            </Card>

            {/* 8. Largest Group Expense */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card hover:border-blue-400 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Largest Group Expense</span>
              <div className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-1 truncate">
                {formatCurrency(gSum.largestGroupExpense?.amount || 0)}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block truncate" title={gSum.largestGroupExpense?.title}>
                {gSum.largestGroupExpense?.title || "None"}
              </span>
            </Card>

            {/* 9. Top Spending Group */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card hover:border-blue-400 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Top Spending Group</span>
              <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1 truncate">
                {formatCurrency(gSum.topSpendingGroup?.amount || 0)}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block truncate" title={gSum.topSpendingGroup?.name}>
                {gSum.topSpendingGroup?.name || "None"}
              </span>
            </Card>

            {/* 10. Group Average Expense */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card hover:border-blue-400 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Group Avg Expense</span>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                <AnimatedCounter value={formatCurrency(gSum.groupAverageExpense || 0)} />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Per group transaction</span>
            </Card>
          </div>
        </div>
      )}

      {/* SECTION 2: MY PERSONAL FINANCIAL SUMMARY (Shown for Combined or Personal scope) */}
      {(scope === "combined" || scope === "personal") && pSum && (
        <div className="space-y-2.5 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/20 dark:bg-emerald-950/10">
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-600 text-white text-[10px] font-mono px-2 py-0.5">SECTION 2</Badge>
              <span className="font-bold uppercase tracking-wider text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                My Personal Financial Summary
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Belongs ONLY to the logged-in user • Never includes expenses paid by other members
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* 1. My Total Spending */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card hover:border-rose-400 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">My Total Spending</span>
              <div className="text-base font-bold text-rose-600 dark:text-rose-400 mt-1">
                <AnimatedCounter value={formatCurrency(pSum.myTotalSpending || 0)} />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">My actual share of expenses</span>
            </Card>

            {/* 2. My Total Income */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card hover:border-emerald-400 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">My Total Income</span>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                <AnimatedCounter value={formatCurrency(pSum.myTotalIncome || 0)} />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Personal receipts</span>
            </Card>

            {/* 3. My Net Balance */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card hover:border-primary transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">My Net Balance</span>
              <div className={`text-base font-bold mt-1 ${(pSum.myNetBalance || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                <AnimatedCounter value={`${(pSum.myNetBalance || 0) >= 0 ? '+' : ''}${formatCurrency(pSum.myNetBalance || 0)}`} />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Personal surplus / deficit</span>
            </Card>

            {/* 4. Amount I Paid (Contribution) */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card hover:border-indigo-400 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Amount I Paid (Contribution)</span>
              <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                <AnimatedCounter value={formatCurrency(pSum.amountIPaid || 0)} />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Out-of-pocket money paid</span>
            </Card>

            {/* 5. Amount I Owe */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card hover:border-amber-400 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Pending Amount I Owe</span>
              <div className="text-base font-bold text-amber-600 dark:text-amber-400 mt-1">
                <AnimatedCounter value={formatCurrency(pSum.amountIOwe || 0)} />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Liabilities owed to others</span>
            </Card>

            {/* 6. Amount Others Owe Me */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card hover:border-blue-400 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Amount Others Owe Me</span>
              <div className="text-base font-bold text-blue-600 dark:text-blue-400 mt-1">
                <AnimatedCounter value={formatCurrency(pSum.amountOthersOweMe || 0)} />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Receivables from members</span>
            </Card>

            {/* 7. My Pending Settlements */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card hover:border-amber-400 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">My Pending Settl.</span>
              <div className="text-base font-bold text-amber-600 dark:text-amber-400 mt-1">
                <AnimatedCounter value={formatCurrency(pSum.myPendingSettlements?.amount || 0)} />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">{pSum.myPendingSettlements?.count || 0} transfers waiting</span>
            </Card>

            {/* 8. My Completed Settlements */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card hover:border-teal-400 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">My Completed Settl.</span>
              <div className="text-base font-bold text-teal-600 dark:text-teal-400 mt-1">
                <AnimatedCounter value={formatCurrency(pSum.myCompletedSettlements?.amount || 0)} />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">{pSum.myCompletedSettlements?.count || 0} transfers cleared</span>
            </Card>

            {/* 9. My Average Transaction */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">My Avg Transaction</span>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                <AnimatedCounter value={formatCurrency(pSum.myAverageTransaction || 0)} />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">My personal average ticket</span>
            </Card>

            {/* 10. My Largest Expense */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">My Largest Expense</span>
              <div className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-1 truncate">
                {formatCurrency(pSum.myLargestExpense?.amount || 0)}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block truncate" title={pSum.myLargestExpense?.title}>
                {pSum.myLargestExpense?.title || "None"}
              </span>
            </Card>

            {/* 11. My Monthly Spending */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">My Monthly Spend</span>
              <div className="text-base font-bold text-purple-600 dark:text-purple-400 mt-1">
                <AnimatedCounter value={formatCurrency(pSum.myMonthlySpending || 0)} />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">30-day run rate</span>
            </Card>

            {/* 12. My Savings */}
            <Card className="rounded-xl border shadow-sm p-3 bg-card">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">My Savings</span>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                <AnimatedCounter value={formatCurrency(pSum.mySavings || 0)} />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Retained income</span>
            </Card>

            {/* 13. Financial Health */}
            <Card className="rounded-xl border shadow-sm p-3 bg-gradient-to-br from-indigo-50/70 to-emerald-50/50 dark:from-indigo-950/20 dark:to-emerald-950/20 border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Financial Health</span>
                <Badge className="text-[9px] px-1.5 py-0 h-4 bg-indigo-600 text-white font-mono">{health.grade}</Badge>
              </div>
              <div className="text-base font-extrabold text-indigo-700 dark:text-indigo-300 mt-1">
                {health.score}<span className="text-xs font-normal text-slate-400">/100</span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">{health.label}</span>
            </Card>
          </div>
        </div>
      )}

      {/* SECTION 5: PAYMENT SUMMARY (Shown for Combined scope) */}
      {scope === "combined" && paySum && (
        <div className="space-y-2.5 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/30 bg-purple-50/20 dark:bg-purple-950/10">
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-600 text-white text-[10px] font-mono px-2 py-0.5">SECTION 5</Badge>
              <span className="font-bold uppercase tracking-wider text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-purple-600" />
                Payment Summary & Reconciliation
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Reconciled payment allocations between physical outflows and member liabilities
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
            <Card className="rounded-xl border shadow-sm p-3 bg-card">
              <span className="text-[9.5px] font-bold uppercase text-slate-500 block">Total Paid By Me</span>
              <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">{formatCurrency(paySum.totalPaidByMe)}</div>
            </Card>
            <Card className="rounded-xl border shadow-sm p-3 bg-card">
              <span className="text-[9.5px] font-bold uppercase text-slate-500 block">Total Paid By Others</span>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">{formatCurrency(paySum.totalPaidByOthers)}</div>
            </Card>
            <Card className="rounded-xl border shadow-sm p-3 bg-card">
              <span className="text-[9.5px] font-bold uppercase text-slate-500 block">Shared Expenses</span>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">{formatCurrency(paySum.totalSharedExpenses)}</div>
            </Card>
            <Card className="rounded-xl border shadow-sm p-3 bg-card">
              <span className="text-[9.5px] font-bold uppercase text-slate-500 block">Personal Expenses</span>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">{formatCurrency(paySum.totalPersonalExpenses)}</div>
            </Card>
            <Card className="rounded-xl border shadow-sm p-3 bg-card">
              <span className="text-[9.5px] font-bold uppercase text-slate-500 block">Settlement Amount</span>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(paySum.settlementAmount)}</div>
            </Card>
            <Card className="rounded-xl border shadow-sm p-3 bg-card">
              <span className="text-[9.5px] font-bold uppercase text-slate-500 block">Outstanding Receivables</span>
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">{formatCurrency(paySum.outstandingReceivables)}</div>
            </Card>
            <Card className="rounded-xl border shadow-sm p-3 bg-card">
              <span className="text-[9.5px] font-bold uppercase text-slate-500 block">Outstanding Payables</span>
              <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1">{formatCurrency(paySum.outstandingPayables)}</div>
            </Card>
          </div>
        </div>
      )}

      {/* VIEW 1: EXECUTIVE ANALYTICS (Charts & Visualizations) */}
      {viewMode === "analytics" && (
        <ReportsAnalyticsView data={analyticsData} />
      )}

      {/* VIEW 2: AI INSIGHTS & SMART RECOMMENDATIONS CENTER */}
      {viewMode === "insights" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="p-5 rounded-2xl border bg-gradient-to-r from-indigo-50/60 via-background to-purple-50/40 dark:from-indigo-950/30 dark:to-purple-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                AI Financial Intelligence & Behavioral Insights
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic mathematical synthesis separating overall group performance and personal financial activity.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono px-3 py-1 bg-background">
                {analyticsData?.aiInsights?.length || 0} Dynamic Observations
              </Badge>
            </div>
          </div>

          {/* SEPARATED AI INSIGHTS: GROUP INSIGHTS VS PERSONAL INSIGHTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GROUP INSIGHTS */}
            {(scope === "combined" || scope === "group") && (
              <Card className="p-5 rounded-2xl border-2 border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-600 text-white font-mono text-[10px] px-2 py-0.5">GROUP INSIGHTS</Badge>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                      Overall Group Financial Activity
                    </span>
                  </div>
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                  {(analyticsData?.groupInsights || [
                    `The group spent ${formatCurrency(gSum?.totalGroupExpense || 0)} during the selected period.`,
                    `Group average transaction value is ${formatCurrency(gSum?.groupAverageExpense || 0)}.`,
                    gSum?.largestGroupExpense?.amount ? `The largest group transaction was "${gSum.largestGroupExpense.title}" (${formatCurrency(gSum.largestGroupExpense.amount)}) in ${gSum.largestGroupExpense.groupName}.` : "No group transactions recorded."
                  ]).map((point: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* PERSONAL INSIGHTS */}
            {(scope === "combined" || scope === "personal") && (
              <Card className="p-5 rounded-2xl border-2 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-600 text-white font-mono text-[10px] px-2 py-0.5">PERSONAL INSIGHTS</Badge>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                      My Personal Financial Activity
                    </span>
                  </div>
                  <UserCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                  {(analyticsData?.personalInsights || [
                    `You personally contributed ${formatCurrency(pSum?.amountIPaid || 0)}.`,
                    (pSum?.amountOthersOweMe || 0) > 0 ? `You are expected to receive ${formatCurrency(pSum?.amountOthersOweMe || 0)} from other members.` : "You currently have no pending receivables.",
                    (pSum?.amountIOwe || 0) === 0 ? "You currently have no outstanding personal dues." : `You currently owe ${formatCurrency(pSum?.amountIOwe || 0)} in personal dues.`,
                    `Your average transaction value is ${formatCurrency(pSum?.myAverageTransaction || 0)}.`
                  ]).map((point: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* AI Dynamic Insights Grid (8–15 Insights) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyticsData?.aiInsights?.map((ins: any) => {
              const badgeColors: Record<string, string> = {
                positive: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
                warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
                trend: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800",
                saving: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-800",
                anomaly: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800",
                settlement: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
              };

              return (
                <Card key={ins.id} className="p-4 rounded-2xl border shadow-sm bg-card hover:shadow-md transition-shadow space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {ins.title}
                    </span>
                    <Badge variant="outline" className={`text-[9px] font-semibold uppercase tracking-wider ${badgeColors[ins.type] || "bg-slate-100"}`}>
                      {ins.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {ins.description}
                  </p>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate">{ins.impact}</span>
                    {ins.metric && (
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 ml-2">
                        {ins.metric}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Smart Recommendations Section */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Actionable Financial Recommendations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analyticsData?.recommendations?.map((rec: any) => (
                <div key={rec.id} className="p-4 rounded-2xl border bg-card shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {rec.title}
                    </span>
                    <Badge variant="outline" className={`text-[10px] uppercase font-semibold ${
                      rec.urgency === "high" ? "text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/20" : "text-slate-600"
                    }`}>
                      {rec.urgency} Priority
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {rec.action}
                  </p>
                  {rec.potentialSavings > 0 && (
                    <div className="text-[11px] font-semibold text-emerald-600 pt-1">
                      Potential Capital Optimization: ~{formatCurrency(rec.potentialSavings)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: ITEMIZED TRANSACTION LEDGER WITH SEPARATE MY VS GROUP TRANSACTIONS */}
      {viewMode === "table" && (
        <div className="space-y-4">
          {/* Sub-tab Switcher: My Transactions vs Group Transactions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border shadow-sm">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={tableTab === "my_transactions" ? "default" : "outline"}
                size="sm"
                className="rounded-xl text-xs h-8 px-3.5 font-semibold gap-1.5"
                onClick={() => setTableTab("my_transactions")}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>My Transactions (Section 3)</span>
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 font-mono">
                  {reportData?.myTransactions?.length || 0}
                </Badge>
              </Button>

              <Button
                type="button"
                variant={tableTab === "group_transactions" ? "default" : "outline"}
                size="sm"
                className="rounded-xl text-xs h-8 px-3.5 font-semibold gap-1.5"
                onClick={() => setTableTab("group_transactions")}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Group Transactions (Section 4)</span>
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 font-mono">
                  {reportData?.groupTransactions?.length || 0}
                </Badge>
              </Button>
            </div>

            {/* Quick Summary of Active Tab */}
            <div className="text-xs text-slate-500 flex items-center gap-2">
              {tableTab === "my_transactions" ? (
                <>
                  <span>Amount I Paid: <strong className="text-indigo-600 font-semibold">{formatCurrency(pSum?.amountIPaid || 0)}</strong></span>
                  <span>•</span>
                  <span>My Share: <strong className="text-rose-600 font-semibold">{formatCurrency(pSum?.myTotalSpending || 0)}</strong></span>
                  <span>•</span>
                  <span>Net: <strong className={`font-semibold ${(pSum?.myNetBalance || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatCurrency(pSum?.myNetBalance || 0)}</strong></span>
                </>
              ) : (
                <>
                  <span>Total Group Spend: <strong className="text-rose-600 font-semibold">{formatCurrency(gSum?.totalGroupExpense || 0)}</strong></span>
                  <span>•</span>
                  <span>Pending Group Settl: <strong className="text-amber-600 font-semibold">{formatCurrency(gSum?.totalPendingSettlements?.amount || 0)}</strong></span>
                </>
              )}
            </div>
          </div>

          {/* TABLE: SECTION 3 - MY TRANSACTIONS */}
          {tableTab === "my_transactions" && (
            <Card className="rounded-2xl border shadow-sm overflow-hidden bg-card">
              <div className="p-3 bg-indigo-50/30 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-600 text-white text-[10px] font-mono px-2 py-0.5">SECTION 3</Badge>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    My Transactions (Only transactions created or paid by me, or where I am a participant)
                  </span>
                </div>
                <span className="text-slate-400 text-[11px]">Includes running balance reconciliation</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                      <th className="text-left py-3 px-4">Transaction Title</th>
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-right py-3 px-4">Amount I Paid</th>
                      <th className="text-right py-3 px-4">My Share</th>
                      <th className="text-left py-3 px-4">Category</th>
                      <th className="text-left py-3 px-4">Group</th>
                      <th className="text-center py-3 px-4">Split Type</th>
                      <th className="text-center py-3 px-4">Settlement Status</th>
                      <th className="text-center py-3 px-4">Payment Method</th>
                      <th className="text-right py-3 px-4">Running Balance</th>
                      <th className="text-center py-3 px-4 no-print">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                    {(reportData.myTransactions || []).map((tx: any) => {
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-4 font-medium max-w-[200px]">
                            <Link 
                              href={`/dashboard/transactions/${tx.publicId}`}
                              className="hover:text-primary hover:underline truncate block text-slate-900 dark:text-slate-100 font-semibold"
                            >
                              {tx.title || tx.description}
                            </Link>
                            <span className="font-mono text-[10px] text-slate-400 block">{tx.publicId}</span>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 inline text-slate-400" />
                              {formatDate(tx.date)}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap font-bold">
                            <span className={tx.amountPaid > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}>
                              {formatCurrency(tx.amountPaid || 0)}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap font-semibold text-rose-600 dark:text-rose-400">
                            {formatCurrency(tx.myShare || 0)}
                          </td>

                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {tx.categoryName || "General"}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            {tx.groupName}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="text-[10px] font-mono uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {tx.splitType || "Equal"}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <Badge variant="outline" className={`text-[10px] capitalize font-medium ${
                              tx.settlementStatus === "completed" 
                                ? "border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20" 
                                : "border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-950/20"
                            }`}>
                              {tx.settlementStatus || "Pending"}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-300 font-mono text-[11px] uppercase">
                            {tx.paymentMethod || "UPI"}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-semibold">
                            <span className={tx.runningBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                              {formatCurrency(tx.runningBalance || 0)}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center no-print">
                            <Link href={`/dashboard/transactions/${tx.publicId}`}>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-slate-900">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}

                    {(!reportData.myTransactions || reportData.myTransactions.length === 0) && (
                      <tr>
                        <td colSpan={11} className="py-16 text-center text-slate-400">
                          <FileText className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">No personal transactions recorded in this period</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            Transactions where you are the payer or a split participant will be detailed here with your running balance.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TABLE: SECTION 4 - GROUP TRANSACTIONS */}
          {tableTab === "group_transactions" && (
            <Card className="rounded-2xl border shadow-sm overflow-hidden bg-card">
              <div className="p-3 bg-blue-50/30 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-600 text-white text-[10px] font-mono px-2 py-0.5">SECTION 4</Badge>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Group Transactions (Every transaction across active shared groups)
                  </span>
                </div>
                <span className="text-slate-400 text-[11px]">Displays full group ticket vs your allocated share</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                      <th className="text-left py-3 px-4">Transaction Name</th>
                      <th className="text-left py-3 px-4">Group</th>
                      <th className="text-right py-3 px-4">Total Amount</th>
                      <th className="text-left py-3 px-4">Paid By</th>
                      <th className="text-center py-3 px-4">Split Between</th>
                      <th className="text-right py-3 px-4">My Share</th>
                      <th className="text-right py-3 px-4">Other Members Share</th>
                      <th className="text-center py-3 px-4">Settlement Status</th>
                      <th className="text-center py-3 px-4 no-print">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                    {(reportData.groupTransactions || []).map((tx: any) => {
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-4 font-medium max-w-[220px]">
                            <Link 
                              href={`/dashboard/transactions/${tx.publicId}`}
                              className="hover:text-primary hover:underline truncate block text-slate-900 dark:text-slate-100 font-semibold"
                            >
                              {tx.title}
                            </Link>
                            <span className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3 inline text-slate-400" />
                              {formatDate(tx.date)}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-semibold text-primary">
                            {tx.groupName}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(tx.totalAmount || 0)}
                          </td>

                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                            {tx.paidBy}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {tx.splitBetweenCount || 2} members
                            </Badge>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-rose-600 dark:text-rose-400">
                            {formatCurrency(tx.myShare || 0)}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap font-semibold text-slate-500">
                            {formatCurrency(tx.otherMembersShare || 0)}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <Badge variant="outline" className={`text-[10px] capitalize font-medium ${
                              tx.settlementStatus === "completed" 
                                ? "border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20" 
                                : "border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-950/20"
                            }`}>
                              {tx.settlementStatus || "Pending"}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 text-center no-print">
                            <Link href={`/dashboard/transactions/${tx.publicId}`}>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-slate-900">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}

                    {(!reportData.groupTransactions || reportData.groupTransactions.length === 0) && (
                      <tr>
                        <td colSpan={9} className="py-16 text-center text-slate-400">
                          <Users className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">No group transactions recorded in this period</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            Group transactions with member share breakdowns will appear here when active groups have expense activity.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Pagination Toolbar */}
          {reportData.totalPages > 1 && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs no-print">
              <span className="text-slate-500">
                Page <strong>{reportData.currentPage}</strong> of <strong>{reportData.totalPages}</strong>
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={reportData.currentPage <= 1 || isPending}
                  className="h-8 px-2.5 rounded-xl gap-1"
                  onClick={() => updateFilters({ ...filters, page: reportData.currentPage - 1 })}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={reportData.currentPage >= reportData.totalPages || isPending}
                  className="h-8 px-2.5 rounded-xl gap-1"
                  onClick={() => updateFilters({ ...filters, page: reportData.currentPage + 1 })}
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
