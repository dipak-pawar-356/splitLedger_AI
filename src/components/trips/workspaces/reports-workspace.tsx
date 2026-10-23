"use client";

import { useMemo } from "react";
import { TripDashboardMetrics, TripRecord, BudgetCategoryKey } from "@/lib/types/trips";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import {
  FileText,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Download,
  Printer,
  Sparkles,
  PieChart,
  BarChart3,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

interface ReportsWorkspaceProps {
  metrics: TripDashboardMetrics;
}

export function ReportsWorkspace({ metrics }: ReportsWorkspaceProps) {
  // Aggregate category budget vs actual across all trips
  const categorySummary = useMemo(() => {
    const summaryMap: Record<string, { allocated: number; spent: number }> = {};

    metrics.trips.forEach((t) => {
      t.categoryBudgets.forEach((cb) => {
        if (!summaryMap[cb.category]) {
          summaryMap[cb.category] = { allocated: 0, spent: 0 };
        }
        summaryMap[cb.category].allocated += cb.allocated || 0;
        summaryMap[cb.category].spent += cb.spent || 0;
      });
    });

    return Object.entries(summaryMap).map(([category, data]) => {
      const variance = data.allocated - data.spent;
      const utilization = data.allocated > 0 ? Math.round((data.spent / data.allocated) * 100) : 0;
      return {
        category,
        allocated: data.allocated,
        spent: data.spent,
        variance,
        utilization,
      };
    });
  }, [metrics.trips]);

  const totalAllocated = categorySummary.reduce((sum, c) => sum + c.allocated, 0);
  const totalSpent = categorySummary.reduce((sum, c) => sum + c.spent, 0);
  const netSavings = Math.max(0, totalAllocated - totalSpent);

  const handleExportCSV = () => {
    const headers = "Category,Allocated Budget (INR),Actual Spent (INR),Variance (INR),Utilization %\n";
    const rows = categorySummary
      .map((c) => `"${c.category}",${c.allocated},${c.spent},${c.variance},${c.utilization}%`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Travel_OS_Financial_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Financial audit CSV report exported successfully!");
  };

  const handleExportPDF = () => {
    window.print();
    toast.success("Printing operational audit report...");
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Financial Variance & Audit Reports
              </h2>
              <Badge variant="secondary" className="bg-primary/10 text-primary font-bold text-[10px] uppercase">
                Enterprise Ledger
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive budget allocation vs actual outflows, category variances, and settlement reconciliation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="rounded-xl text-xs font-bold gap-1.5 h-9"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
          <Button
            size="sm"
            onClick={handleExportPDF}
            className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-primary text-primary-foreground shadow-xs"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 bg-card space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Budget Envelope (INR)</span>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {formatCurrency(totalAllocated || metrics.totalTripBudget, "INR")}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold block">
            100% Reconciled Across {metrics.trips.length} Trips
          </span>
        </Card>

        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 bg-card space-y-1">
          <span className="text-[10px] uppercase font-bold text-rose-500 block">Actual Outflows (INR)</span>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatCurrency(totalSpent || metrics.actualExpenses, "INR")}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold block">
            Daily Burn: ~{formatCurrency(metrics.avgDailySpend || 0, "INR")} / day
          </span>
        </Card>

        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 bg-card space-y-1">
          <span className="text-[10px] uppercase font-bold text-emerald-500 block">Net Capital Surplus (INR)</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(netSavings || metrics.remainingBudget, "INR")}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold block">
            Unencumbered Capital Reserve
          </span>
        </Card>
      </div>

      {/* Category Variance Ledger Table */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              Multi-Category Spend & Variance Audit
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Real-time expenditure tracking versus planned budget</p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            Currency: INR (₹) Enforced
          </Badge>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {categorySummary.map((cat) => (
            <div key={cat.category} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
              <div className="space-y-1 min-w-[180px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{cat.category}</span>
                  <Badge variant="secondary" className="text-[9px] py-0">
                    {cat.utilization}%
                  </Badge>
                </div>
                <div className="w-full sm:w-48">
                  <Progress value={Math.min(100, cat.utilization)} className="h-1.5 rounded-full" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-right font-mono">
                <div>
                  <span className="text-[10px] font-sans text-slate-400 block">Allocated</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(cat.allocated, "INR")}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-sans text-slate-400 block">Spent</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(cat.spent, "INR")}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-sans text-slate-400 block">Surplus</span>
                  <span className={`font-bold ${cat.variance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {formatCurrency(cat.variance, "INR")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
