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
  ChevronRight
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { ReportFiltersBar } from "@/components/reports/report-filters-bar";
import { ReportsAnalyticsView } from "@/components/reports/reports-analytics-view";
import { exportReportData, getComprehensiveReport, getReportAnalytics, type ReportFilterOptions } from "@/actions/reports";
import { toast } from "sonner";

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
  const [viewMode, setViewMode] = useState<"table" | "analytics">("table");
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
          }, 250);
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
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800 no-print">
        {/* Toggle Table vs Analytics View */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <Button
            type="button"
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            className="rounded-lg text-xs h-7 px-3 font-semibold"
            onClick={() => setViewMode("table")}
          >
            <FileText className="h-3.5 w-3.5 mr-1" />
            Report Data
          </Button>
          <Button
            type="button"
            variant={viewMode === "analytics" ? "default" : "ghost"}
            size="sm"
            className="rounded-lg text-xs h-7 px-3 font-semibold"
            onClick={() => setViewMode("analytics")}
          >
            <Activity className="h-3.5 w-3.5 mr-1" />
            Charts & Analytics
          </Button>
        </div>

        {/* Action Buttons: Print & 4 Export Formats Only */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl text-xs h-8 gap-1"
            onClick={handlePrint}
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
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
              className="rounded-xl text-xs h-8 px-3 font-semibold bg-primary"
              onClick={() => handleExport("pdf")}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Report Types Tabs */}
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
                  isSelected ? "font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-600 dark:text-slate-400"
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

      {/* VIEW 1: REPORT DATA TABLE */}
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
                        <FileText className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                        <p className="font-semibold text-sm">No transactions match your report filters</p>
                        <p className="text-xs text-slate-400 mt-0.5">Try resetting search or adjusting date ranges.</p>
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

      {/* VIEW 2: ANALYTICS CHARTS */}
      {viewMode === "analytics" && (
        <ReportsAnalyticsView data={analyticsData} />
      )}
    </div>
  );
}
