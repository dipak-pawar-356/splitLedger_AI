"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Clock,
  Sparkles,
  Tag,
  Star,
  Download,
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  ListChecks,
  Paperclip,
  HardDrive,
  Mic,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { toast } from "sonner";

interface NotesStatsDashboardProps {
  stats: any;
}

const PALETTE = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

export function NotesStatsDashboard({ stats }: NotesStatsDashboardProps) {
  const [chartMetric, setChartMetric] = useState<"count" | "words">("count");

  if (!stats) return null;

  // Prepare activity chart data
  const activityData = (stats.activityHistory || []).map((item: any) => ({
    date: item.date?.slice(5) || item.date, // MM-DD
    notes: item.count || 0,
    words: item.words || 0,
  }));

  // Prepare category breakdown data
  const categoryData = (stats.categoryBreakdown || []).map((c: any, idx: number) => ({
    name: c.name || "General",
    value: c.count || 0,
    color: c.color || PALETTE[idx % PALETTE.length],
  }));

  const handleExportJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stats, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `Notes_Analytics_${new Date().toISOString().split("T")[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Analytics JSON exported!");
    } catch (err) {
      toast.error("Export failed");
    }
  };

  const handleExportCSV = () => {
    try {
      let csv = "Metric,Value\n";
      csv += `Total Notes,${stats.totalNotes || 0}\n`;
      csv += `Total Words,${stats.totalWords || 0}\n`;
      csv += `Avg Words/Note,${stats.avgWordsPerNote || 0}\n`;
      csv += `Reading Time (mins),${stats.totalReadingTime || 0}\n`;
      csv += `Total Tasks,${stats.totalTasks || 0}\n`;
      csv += `Completed Tasks,${stats.completedTasks || 0}\n`;
      csv += `Task Completion Rate,${stats.taskCompletionRate || 0}%\n`;
      csv += `Voice Notes,${stats.voiceNotesCount || 0}\n`;
      csv += `Total Storage (KB),${Math.round((stats.totalStorageBytes || 0) / 1024)}\n`;

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Notes_Analytics_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Analytics CSV exported!");
    } catch (err) {
      toast.error("Export failed");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Export Actions */}
      <Card className="rounded-2xl border shadow-sm p-4 sm:p-5 bg-card">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Notes & Productivity Analytics
              </h3>
              <p className="text-xs text-slate-400">
                Writing frequency, category distributions, task execution rates, and storage consumption.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-8 text-xs rounded-xl px-2.5 gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              className="h-8 text-xs rounded-xl px-2.5 gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export JSON</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="rounded-2xl border shadow-sm p-4 bg-card">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase text-[10px] tracking-wider">Total Notes</span>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.totalNotes || 0}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">{stats.todayNotes || 0} today</p>
        </Card>

        <Card className="rounded-2xl border shadow-sm p-4 bg-card">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase text-[10px] tracking-wider">Total Words</span>
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {(stats.totalWords || 0).toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Avg {stats.avgWordsPerNote || 0}/note</p>
        </Card>

        <Card className="rounded-2xl border shadow-sm p-4 bg-card">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase text-[10px] tracking-wider">Read Time</span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
            {stats.totalReadingTime || 0} mins
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{(stats.totalChars || 0).toLocaleString()} chars</p>
        </Card>

        <Card className="rounded-2xl border shadow-sm p-4 bg-card">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase text-[10px] tracking-wider">Tasks Done</span>
            <ListChecks className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
            {stats.taskCompletionRate ?? 0}%
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {stats.completedTasks || 0}/{stats.totalTasks || 0} tasks
          </p>
        </Card>

        <Card className="rounded-2xl border shadow-sm p-4 bg-card">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase text-[10px] tracking-wider">Voice Notes</span>
            <Mic className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
            {stats.voiceNotesCount || 0}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{stats.totalAttachments || 0} total files</p>
        </Card>

        <Card className="rounded-2xl border shadow-sm p-4 bg-card">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase text-[10px] tracking-wider">Storage</span>
            <HardDrive className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            {Math.round((stats.totalStorageBytes || 0) / 1024)} KB
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{stats.categoriesCount || 0} categories</p>
        </Card>
      </div>

      {/* Recharts Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Writing Activity Trend Chart */}
        <Card className="lg:col-span-8 rounded-2xl border shadow-sm p-5 space-y-4 bg-card">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" />
                Writing Activity (Recent Days)
              </h4>
              <p className="text-[11px] text-slate-400">Frequency of notes and words authored</p>
            </div>

            <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-xl p-0.5 bg-slate-50 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setChartMetric("count")}
                className={`px-2 py-0.5 text-xs rounded-lg font-medium transition-all ${
                  chartMetric === "count" ? "bg-white dark:bg-slate-800 text-primary shadow-xs" : "text-slate-500"
                }`}
              >
                Notes
              </button>
              <button
                type="button"
                onClick={() => setChartMetric("words")}
                className={`px-2 py-0.5 text-xs rounded-lg font-medium transition-all ${
                  chartMetric === "words" ? "bg-white dark:bg-slate-800 text-primary shadow-xs" : "text-slate-500"
                }`}
              >
                Words
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            {activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#fff",
                      borderRadius: 12,
                      fontSize: 12,
                      border: "none",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={chartMetric === "count" ? "notes" : "words"}
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMetric)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Not enough historical data to plot chart yet.
              </div>
            )}
          </div>
        </Card>

        {/* Category Breakdown Donut Chart */}
        <Card className="lg:col-span-4 rounded-2xl border shadow-sm p-5 space-y-4 bg-card flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <PieIcon className="h-4 w-4 text-emerald-500" />
              Category Breakdown
            </h4>
            <p className="text-[11px] text-slate-400">Distribution of notes across folders</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#fff",
                      borderRadius: 12,
                      fontSize: 12,
                      border: "none",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">No categories recorded</p>
            )}
          </div>

          {/* Legend */}
          <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
            {categoryData.map((c: any) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="truncate text-slate-700 dark:text-slate-300">{c.name}</span>
                </div>
                <span className="font-mono text-slate-500 shrink-0">{c.value} notes</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Popular Tags Cloud */}
      {stats.popularTags && stats.popularTags.length > 0 && (
        <Card className="rounded-2xl border shadow-sm p-4 space-y-2 bg-card">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-primary" />
            Most Used Tags
          </h4>
          <div className="flex items-center gap-1.5 flex-wrap">
            {stats.popularTags.map((pt: any) => (
              <Badge
                key={pt.tag}
                variant="outline"
                className="text-xs rounded-xl px-2.5 py-0.5 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
              >
                <span className="font-mono text-primary mr-1">{pt.tag}</span>
                <span className="text-[10px] text-slate-400 font-semibold">({pt.count})</span>
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
