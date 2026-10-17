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

const REPORT_TYPES = [
  { id: "overview", label: "Overview" },
  { id: "personal", label: "Personal" },
  { id: "group", label: "Groups" },
  { id: "member", label: "Members" },
  { id: "settlement", label: "Settlements" },
  { id: "category", label: "Categories" },
  { id: "monthly", label: "Monthly" },
  { id: "weekly", label: "Weekly" },
  { id: "daily", label: "Daily" },
  { id: "payment_method", label: "Payment Methods" },
  { id: "activity", label: "Activity Logs" },
];

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
  initialReportData: {
    transactions: any[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    summary: {
      totalIncome: number;
      totalExpense: number;
      netBalance: number;
      transactionCount: number;
    };
  };
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
    page: Number(searchParams.get("page") || "1"),
    limit: 50,
  });

  const [activeTab, setActiveTab] = useState<string>(filters.reportType || "overview");
  const [viewMode, setViewMode] = useState<"analytics" | "table" | "insights">("analytics");
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

  const handleTabChange = (type: string) => {
    setActiveTab(type);
    updateFilters({
      ...filters,
      reportType: type as any,
      page: 1,
    });
  };

  const handlePrint = () => {
    handleExport("pdf");
  };

  const kpis = analyticsData?.kpiCards || {};
  const health = analyticsData?.financialHealthScore || {
    score: 80,
    grade: "A",
    label: "Balanced Baseline",
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

      {/* Report Types Tabs Bar */}
      <div className="overflow-x-auto pb-1 no-print">
        <div className="flex items-center gap-1.5 min-w-max">
          {REPORT_TYPES.map((rt) => {
            const isSelected = activeTab === rt.id;
            return (
              <Button
                key={rt.id}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className={`rounded-xl text-xs h-8 px-3.5 ${
                  isSelected 
                    ? "font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm" 
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
                onClick={() => handleTabChange(rt.id)}
              >
                {rt.label}
              </Button>
            );
          })}
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

      {/* SECTION 2: TOP SUMMARY - THE 17 ENTERPRISE KPI CARDS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            Financial Summary & Key Metrics
          </span>
          <span className="text-[11px] text-slate-400">
            Real-time data • Period: <strong>{(filters.period || "all").replace(/_/g, " ").toUpperCase()}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* 1. Total Expenses */}
          <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 bg-card hover:border-rose-500/50 transition-all cursor-pointer" title={kpis.totalExpenses?.tooltip}>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Total Expenses</span>
              <div className="p-1 rounded-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
              </div>
            </div>
            <div className="text-base font-bold text-rose-600 dark:text-rose-400 truncate tracking-tight">
              <AnimatedCounter value={formatCurrency(kpis.totalExpenses?.value || 0)} />
            </div>
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 truncate max-w-[55px]">
                {kpis.totalExpenses?.percentChange ? `${kpis.totalExpenses.percentChange > 0 ? "+" : ""}${kpis.totalExpenses.percentChange}%` : "0%"}
              </span>
              <MiniSparkline data={kpis.totalExpenses?.sparkline} color="#ef4444" />
            </div>
          </Card>

          {/* 2. Total Income */}
          <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 bg-card hover:border-emerald-500/50 transition-all cursor-pointer" title={kpis.totalIncome?.tooltip}>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Total Income</span>
              <div className="p-1 rounded-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              </div>
            </div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 truncate tracking-tight">
              <AnimatedCounter value={formatCurrency(kpis.totalIncome?.value || 0)} />
            </div>
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 truncate max-w-[55px]">
                {kpis.totalIncome?.percentChange ? `${kpis.totalIncome.percentChange > 0 ? "+" : ""}${kpis.totalIncome.percentChange}%` : "0%"}
              </span>
              <MiniSparkline data={kpis.totalIncome?.sparkline} color="#10b981" />
            </div>
          </Card>

          {/* 3. Net Balance */}
          <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 bg-card hover:border-primary/50 transition-all cursor-pointer" title={kpis.netBalance?.tooltip}>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Net Balance</span>
              <div className="p-1 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <IndianRupee className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
            <div className={`text-base font-bold truncate tracking-tight ${(kpis.netBalance?.value || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              <AnimatedCounter value={`${(kpis.netBalance?.value || 0) >= 0 ? "+" : ""}${formatCurrency(kpis.netBalance?.value || 0)}`} />
            </div>
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 truncate">Cash flow</span>
              <MiniSparkline data={kpis.netBalance?.sparkline} color="#4f46e5" />
            </div>
          </Card>

          {/* 4. Money You Owe */}
          <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 bg-card hover:border-amber-500/50 transition-all cursor-pointer" title={kpis.moneyYouOwe?.tooltip}>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Money You Owe</span>
              <div className="p-1 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <ArrowDownLeft className="h-3.5 w-3.5 text-amber-500" />
              </div>
            </div>
            <div className="text-base font-bold text-amber-600 dark:text-amber-400 truncate tracking-tight">
              <AnimatedCounter value={formatCurrency(kpis.moneyYouOwe?.value || 0)} />
            </div>
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 truncate">You owe</span>
              <MiniSparkline data={kpis.moneyYouOwe?.sparkline} color="#f59e0b" />
            </div>
          </Card>

          {/* 5. Money Owed To You */}
          <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 bg-card hover:border-blue-500/50 transition-all cursor-pointer" title={kpis.moneyOwedToYou?.tooltip}>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Owed To You</span>
              <div className="p-1 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <ArrowUpRight className="h-3.5 w-3.5 text-blue-500" />
              </div>
            </div>
            <div className="text-base font-bold text-blue-600 dark:text-blue-400 truncate tracking-tight">
              <AnimatedCounter value={formatCurrency(kpis.moneyOwedToYou?.value || 0)} />
            </div>
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 truncate">Receivable</span>
              <MiniSparkline data={kpis.moneyOwedToYou?.sparkline} color="#3b82f6" />
            </div>
          </Card>

          {/* 6. Pending Settlements */}
          <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 bg-card hover:border-amber-500/50 transition-all cursor-pointer" title={kpis.pendingSettlements?.tooltip}>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Pending Settl.</span>
              <div className="p-1 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
              </div>
            </div>
            <div className="text-base font-bold text-amber-600 dark:text-amber-400 truncate tracking-tight">
              <AnimatedCounter value={formatCurrency(kpis.pendingSettlements?.value || 0)} />
            </div>
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 truncate">{kpis.pendingSettlements?.count || 0} pending</span>
              <MiniSparkline data={kpis.pendingSettlements?.sparkline} color="#f59e0b" />
            </div>
          </Card>

          {/* 7. Completed Settlements */}
          <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 bg-card hover:border-teal-500/50 transition-all cursor-pointer" title={kpis.completedSettlements?.tooltip}>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Completed Settl.</span>
              <div className="p-1 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="h-3.5 w-3.5 text-teal-500" />
              </div>
            </div>
            <div className="text-base font-bold text-teal-600 dark:text-teal-400 truncate tracking-tight">
              <AnimatedCounter value={formatCurrency(kpis.completedSettlements?.value || 0)} />
            </div>
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 truncate">{kpis.completedSettlements?.count || 0} cleared</span>
              <MiniSparkline data={kpis.completedSettlements?.sparkline} color="#14b8a6" />
            </div>
          </Card>

          {/* 8. Total Groups */}
          <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 bg-card hover:border-slate-400/50 transition-all cursor-pointer" title={kpis.totalGroups?.tooltip}>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Total Groups</span>
              <div className="p-1 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="h-3.5 w-3.5 text-slate-500" />
              </div>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 truncate tracking-tight">
              {kpis.totalGroups?.value || 0}
            </div>
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 truncate">Circles</span>
              <span className="text-[10px] text-slate-400 font-mono">active</span>
            </div>
          </Card>

          {/* 9. Active Members */}
          <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 bg-card hover:border-slate-400/50 transition-all cursor-pointer" title={kpis.activeMembers?.tooltip}>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Active Members</span>
              <div className="p-1 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
              </div>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 truncate tracking-tight">
              {kpis.activeMembers?.value || 0}
            </div>
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 truncate">Peers</span>
              <span className="text-[10px] text-slate-400 font-mono">connected</span>
            </div>
          </Card>

          {/* 10. Monthly Spending */}
          <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 bg-card hover:border-purple-500/50 transition-all cursor-pointer" title={kpis.monthlySpending?.tooltip}>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Monthly Spending</span>
              <div className="p-1 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <CreditCard className="h-3.5 w-3.5 text-purple-500" />
              </div>
            </div>
            <div className="text-base font-bold text-purple-600 dark:text-purple-400 truncate tracking-tight">
              <AnimatedCounter value={formatCurrency(kpis.monthlySpending?.value || 0)} />
            </div>
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 truncate">30d run-rate</span>
              <MiniSparkline data={kpis.monthlySpending?.sparkline} color="#8b5cf6" />
            </div>
          </Card>

          {/* 11. Monthly Saving */}
          <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 bg-card hover:border-emerald-500/50 transition-all cursor-pointer" title={kpis.monthlySaving?.tooltip}>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Monthly Saving</span>
              <div className="p-1 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <PiggyBank className="h-3.5 w-3.5 text-emerald-500" />
              </div>
            </div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 truncate tracking-tight">
              <AnimatedCounter value={formatCurrency(kpis.monthlySaving?.value || 0)} />
            </div>
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 truncate">Retained</span>
              <MiniSparkline data={kpis.monthlySaving?.sparkline} color="#10b981" />
            </div>
          </Card>

          {/* 12. Average Daily Spending */}
          <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 bg-card hover:border-slate-400/50 transition-all cursor-pointer" title={kpis.avgDailySpending?.tooltip}>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Avg Daily Spend</span>
              <div className="p-1 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
              </div>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 truncate tracking-tight">
              <AnimatedCounter value={formatCurrency(kpis.avgDailySpending?.value || 0)} />
            </div>
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 truncate">Burn rate</span>
              <MiniSparkline data={kpis.avgDailySpending?.sparkline} color="#64748b" />
            </div>
          </Card>

          {/* 13. Largest Expense */}
          <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 bg-card hover:border-rose-500/50 transition-all cursor-pointer" title={kpis.largestExpense?.tooltip}>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Largest Expense</span>
              <div className="p-1 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
              </div>
            </div>
            <div className="text-base font-bold text-rose-600 dark:text-rose-400 truncate tracking-tight">
              <AnimatedCounter value={formatCurrency(kpis.largestExpense?.value || 0)} />
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              {kpis.largestExpense?.subtitle || "None"}
            </div>
          </Card>

          {/* 14. Largest Category */}
          <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 bg-card hover:border-indigo-500/50 transition-all cursor-pointer" title={kpis.largestCategory?.tooltip}>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Top Category</span>
              <div className="p-1 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <PieIcon className="h-3.5 w-3.5 text-indigo-500" />
              </div>
            </div>
            <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 truncate tracking-tight">
              {kpis.largestCategory?.name || "General"}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span>{formatCurrency(kpis.largestCategory?.value || 0)}</span>
              <span className="font-mono font-semibold">{kpis.largestCategory?.percentage || 0}%</span>
            </div>
          </Card>

          {/* 15. Most Active Group */}
          <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 bg-card hover:border-emerald-500/50 transition-all cursor-pointer" title={kpis.mostActiveGroup?.tooltip}>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Active Group</span>
              <div className="p-1 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <Layers className="h-3.5 w-3.5 text-emerald-500" />
              </div>
            </div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 truncate tracking-tight">
              {kpis.mostActiveGroup?.name || "Personal"}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span>{formatCurrency(kpis.mostActiveGroup?.value || 0)}</span>
              <span className="font-mono">{kpis.mostActiveGroup?.txCount || 0} txs</span>
            </div>
          </Card>

          {/* 16. Total Transactions */}
          <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 bg-card hover:border-slate-400/50 transition-all cursor-pointer" title={kpis.totalTransactions?.tooltip}>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Total Txns</span>
              <div className="p-1 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <Receipt className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 truncate tracking-tight">
              <AnimatedCounter value={String(kpis.totalTransactions?.value || 0)} />
            </div>
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 truncate">Entries</span>
              <MiniSparkline data={kpis.totalTransactions?.sparkline} color="#6366f1" />
            </div>
          </Card>

          {/* 17. Financial Health Score (Hero Pill Card) */}
          <Card className="card-lift group rounded-2xl border shadow-sm p-3.5 bg-gradient-to-br from-indigo-50/70 via-background to-emerald-50/50 dark:from-indigo-950/20 dark:via-background dark:to-emerald-950/20 border-indigo-200 dark:border-indigo-800 hover:border-indigo-500/70 transition-all cursor-pointer" title={health.tooltip || "Financial Health Score"}>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-indigo-700 dark:text-indigo-400">Health Score</span>
              <Badge className="text-[9px] px-1.5 py-0 h-4 bg-indigo-600 text-white font-mono">
                {health.grade}
              </Badge>
            </div>
            <div className="text-base font-extrabold text-indigo-700 dark:text-indigo-300 tracking-tight flex items-baseline gap-1">
              <span>{health.score}</span>
              <span className="text-[11px] font-normal text-slate-400">/100</span>
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate mt-1 pt-1 border-t border-indigo-100 dark:border-indigo-900/40">
              {health.label}
            </div>
          </Card>
        </div>
      </div>

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
                Dynamic mathematical synthesis of your transactions, settlements, and shared ledger habits.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono px-3 py-1 bg-background">
                {analyticsData?.aiInsights?.length || 0} Dynamic Observations
              </Badge>
            </div>
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

      {/* VIEW 3: ITEMIZED TRANSACTION LEDGER */}
      {viewMode === "table" && (
        <div className="space-y-4">
          {/* Quick Summary of Filtered Items */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing <strong>{reportData.transactions.length}</strong> of <strong>{reportData.totalCount}</strong> transactions
            </span>
            <div className="flex items-center gap-3">
              <span>Income: <strong className="text-emerald-600 font-semibold">{formatCurrency(reportData.summary.totalIncome)}</strong></span>
              <span>•</span>
              <span>Expenses: <strong className="text-rose-600 font-semibold">{formatCurrency(reportData.summary.totalExpense)}</strong></span>
              <span>•</span>
              <span>Net: <strong className={`font-semibold ${reportData.summary.netBalance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatCurrency(reportData.summary.netBalance)}</strong></span>
            </div>
          </div>

          <Card className="rounded-2xl border shadow-sm overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="text-left py-3 px-4">Txn ID / Date</th>
                    <th className="text-left py-3 px-4">Title & Description</th>
                    <th className="text-left py-3 px-4">Category</th>
                    <th className="text-left py-3 px-4">Group / Contact</th>
                    <th className="text-left py-3 px-4">Paid By</th>
                    <th className="text-right py-3 px-4">Amount (₹)</th>
                    <th className="text-center py-3 px-4">Status</th>
                    <th className="text-center py-3 px-4 no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {reportData.transactions.map((tx) => {
                    const isPositive = tx.type === "received" || tx.type === "lent" || tx.type === "repaid";

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Link
                            href={`/dashboard/transactions/${tx.publicId}`}
                            className="font-mono text-primary font-semibold hover:underline block"
                          >
                            {tx.publicId}
                          </Link>
                          <span className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3 inline" />
                            {formatDate(tx.date)}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-medium max-w-[220px]">
                          <Link 
                            href={`/dashboard/transactions/${tx.publicId}`}
                            className="hover:text-primary hover:underline truncate block text-slate-900 dark:text-slate-100"
                          >
                            {tx.title || tx.description}
                          </Link>
                          {tx.notes && (
                            <span className="text-[11px] text-slate-400 truncate block mt-0.5">{tx.notes}</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {tx.categoryName || "General"}
                        </td>

                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {tx.groupName ? (
                            <span className="font-semibold text-primary">Group: {tx.groupName}</span>
                          ) : (
                            tx.contactName || "Personal"
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {tx.paidByName || "Self"}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap font-bold">
                          <span className={isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                            {isPositive ? "+" : "-"}
                            {formatCurrency(tx.amount / 100, tx.currency)}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-normal capitalize">
                            {tx.paymentMethod || "UPI"}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <Badge variant="outline" className={`text-[10px] capitalize font-medium ${
                            tx.status === "completed" 
                              ? "border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20" 
                              : "border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-950/20"
                          }`}>
                            {tx.status}
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

                  {reportData.transactions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400">
                        <FileText className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">No transactions match your report filters</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Adjust your date filters, reset search keywords, or add your first transaction to populate financial analytics.
                        </p>
                        <div className="mt-4 flex items-center justify-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-xl text-xs"
                            onClick={() => updateFilters({ reportType: "overview", period: "all", search: "" })}
                          >
                            Reset Filters
                          </Button>
                          <Link href="/dashboard/transactions/new">
                            <Button size="sm" className="rounded-xl text-xs bg-primary font-semibold">
                              + Add New Expense
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

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
          </Card>
        </div>
      )}
    </div>
  );
}
