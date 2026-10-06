"use client";

import { useState, useTransition } from "react";
import { 
  FinancialAnalyticsData, 
  AnalyticsFilterOptions, 
  getComprehensiveAnalytics 
} from "@/actions/analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  PieChart, 
  Sparkles, 
  Layers, 
  Activity, 
  Calendar, 
  Clock, 
  FileText,
  RotateCw,
  TrendingUp,
  Download
} from "lucide-react";
import { formatRelativeTime, formatDate } from "@/lib/utils";
import { AnalyticsFiltersBar } from "@/components/analytics/analytics-filters-bar";
import { AnalyticsSummaryCards } from "@/components/analytics/analytics-summary-cards";
import { AnalyticsDateComparison } from "@/components/analytics/analytics-date-comparison";
import { AnalyticsChartsGrid } from "@/components/analytics/analytics-charts-grid";
import { SpendingInsightsView } from "@/components/analytics/spending-insights-view";
import { CategoryAnalyticsTable } from "@/components/analytics/category-analytics-table";
import { PersonalVsGroupView } from "@/components/analytics/personal-vs-group-view";
import { toast } from "sonner";
import Link from "next/link";

interface AnalyticsClientViewProps {
  initialData: FinancialAnalyticsData;
  categories: Array<{ id: number; name: string }>;
  groups: Array<{ id: number; name: string }>;
}

export function AnalyticsClientView({
  initialData,
  categories,
  groups,
}: AnalyticsClientViewProps) {
  const [data, setData] = useState<FinancialAnalyticsData>(initialData);
  const [filters, setFilters] = useState<AnalyticsFilterOptions>({ period: "this_month" });
  const [isPending, startTransition] = useTransition();

  const handleFiltersChange = (newFilters: AnalyticsFilterOptions) => {
    setFilters(newFilters);
    startTransition(async () => {
      try {
        const res = await getComprehensiveAnalytics(newFilters);
        setData(res);
      } catch (err: any) {
        toast.error("Failed to load filtered analytics");
      }
    });
  };

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const res = await getComprehensiveAnalytics(filters);
        setData(res);
        toast.success("Analytics updated");
      } catch (err: any) {
        toast.error("Failed to refresh analytics");
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Financial Analytics
            </h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary font-bold text-xs">
              ₹ INR
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time financial intelligence, monthly velocity trends, and spending allocation
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            className="rounded-xl text-xs gap-1.5"
            onClick={handleRefresh}
          >
            <RotateCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Link href="/dashboard/reports">
            <Button size="sm" className="rounded-xl text-xs font-semibold gap-1.5 bg-primary">
              <FileText className="h-3.5 w-3.5" />
              <span>Export Report</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* SECTION 7: Analytics Filters Toolbar */}
      <AnalyticsFiltersBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        categories={categories}
        groups={groups}
      />

      {/* SECTION 1: 13 Metric Financial Summary Cards */}
      <AnalyticsSummaryCards summary={data.summary} />

      {/* SECTION 8: Period-Over-Period Date Comparison */}
      <AnalyticsDateComparison comparison={data.dateComparison} />

      {/* TABS VIEW: Charts, Insights, Category Deep Dive, Personal vs Group, Activity */}
      <Tabs defaultValue="charts" className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
          <TabsTrigger value="charts" className="rounded-xl text-xs font-semibold">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5 inline" />
            Financial Charts (10)
          </TabsTrigger>
          <TabsTrigger value="insights" className="rounded-xl text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 mr-1.5 inline text-amber-500" />
            Spending Insights & Velocity
          </TabsTrigger>
          <TabsTrigger value="categories" className="rounded-xl text-xs font-semibold">
            <PieChart className="h-3.5 w-3.5 mr-1.5 inline" />
            Category Analytics ({data.categoryAnalytics.length})
          </TabsTrigger>
          <TabsTrigger value="personal-group" className="rounded-xl text-xs font-semibold">
            <Layers className="h-3.5 w-3.5 mr-1.5 inline" />
            Personal vs Group
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-xl text-xs font-semibold">
            <Activity className="h-3.5 w-3.5 mr-1.5 inline" />
            Recent Activity
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: 10 Interactive Charts */}
        <TabsContent value="charts" className="space-y-6">
          <AnalyticsChartsGrid charts={data.charts} />
        </TabsContent>

        {/* TAB 2: Spending Insights & Velocity */}
        <TabsContent value="insights" className="space-y-6">
          <SpendingInsightsView
            monthlyTrends={data.monthlyTrends}
            spendingInsights={data.spendingInsights}
          />
        </TabsContent>

        {/* TAB 3: Category Deep Dive Table */}
        <TabsContent value="categories" className="space-y-6">
          <CategoryAnalyticsTable
            categories={data.categoryAnalytics}
            totalExpense={data.summary.totalExpenses}
          />
        </TabsContent>

        {/* TAB 4: Personal vs Group Comparison */}
        <TabsContent value="personal-group" className="space-y-6">
          <PersonalVsGroupView data={data.personalVsGroup} />
        </TabsContent>

        {/* TAB 5: Recent Financial Activity Timeline (SECTION 9) */}
        <TabsContent value="activity" className="space-y-4">
          <Card className="rounded-3xl border shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <CardTitle className="text-base font-bold">Recent Financial Activity</CardTitle>
              <CardDescription className="text-xs">
                Real-time audit log stream of transaction and settlement modifications
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {data.recentActivity.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.recentActivity.map((act) => (
                    <div key={act.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {act.userName} • <span className="capitalize font-semibold text-primary">{act.action}</span> {act.entityType}
                        </p>
                        {act.reason && <p className="text-slate-500 mt-0.5">{act.reason}</p>}
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {formatDate(act.date)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">No recent activity</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
