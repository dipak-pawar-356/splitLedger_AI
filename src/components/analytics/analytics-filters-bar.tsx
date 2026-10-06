"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Filter, RotateCcw } from "lucide-react";
import { type AnalyticsFilterOptions } from "@/actions/analytics";

interface AnalyticsFiltersBarProps {
  filters: AnalyticsFilterOptions;
  onFiltersChange: (filters: AnalyticsFilterOptions) => void;
  categories: Array<{ id: number; name: string }>;
  groups: Array<{ id: number; name: string }>;
}

const PERIOD_PRESETS = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "3m", label: "Last 3 Months" },
  { value: "6m", label: "Last 6 Months" },
  { value: "1y", label: "Last Year" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom Range" },
];

const PAYMENT_METHODS = ["UPI", "Cash", "Bank Transfer", "Credit Card", "Debit Card", "Other"];

export function AnalyticsFiltersBar({
  filters,
  onFiltersChange,
  categories,
  groups,
}: AnalyticsFiltersBarProps) {
  const activePeriod = filters.period || "this_month";

  const handleReset = () => {
    onFiltersChange({
      period: "this_month",
    });
  };

  return (
    <div className="p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-sm space-y-3">
      {/* Top Presets Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {PERIOD_PRESETS.map((p) => {
            const isSelected = activePeriod === p.value;
            return (
              <Button
                key={p.value}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className={`rounded-xl text-xs h-8 px-3 whitespace-nowrap ${
                  isSelected ? "font-semibold bg-primary text-primary-foreground shadow-sm" : "text-slate-600 dark:text-slate-400"
                }`}
                onClick={() => onFiltersChange({ ...filters, period: p.value as any })}
              >
                {p.label}
              </Button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-xl text-xs h-8 text-slate-500 hover:text-slate-900"
          onClick={handleReset}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Reset
        </Button>
      </div>

      {/* Secondary Dropdown Selectors */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* Category Select */}
        <div className="space-y-1">
          <label className="font-semibold text-slate-500 dark:text-slate-400">Filter Category</label>
          <select
            value={filters.categoryId ? String(filters.categoryId) : "all"}
            onChange={(e) => onFiltersChange({
              ...filters,
              categoryId: e.target.value === "all" ? undefined : Number(e.target.value),
            })}
            className="w-full h-8 px-2.5 rounded-xl border border-input bg-background font-medium"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Group Select */}
        <div className="space-y-1">
          <label className="font-semibold text-slate-500 dark:text-slate-400">Filter Group</label>
          <select
            value={filters.groupId ? String(filters.groupId) : "all"}
            onChange={(e) => onFiltersChange({
              ...filters,
              groupId: e.target.value === "all" ? undefined : Number(e.target.value),
            })}
            className="w-full h-8 px-2.5 rounded-xl border border-input bg-background font-medium"
          >
            <option value="all">All Groups & Personal</option>
            {groups.map((g) => (
              <option key={g.id} value={String(g.id)}>{g.name}</option>
            ))}
          </select>
        </div>

        {/* Payment Method */}
        <div className="space-y-1">
          <label className="font-semibold text-slate-500 dark:text-slate-400">Payment Method</label>
          <select
            value={filters.paymentMethod || "all"}
            onChange={(e) => onFiltersChange({
              ...filters,
              paymentMethod: e.target.value === "all" ? undefined : e.target.value,
            })}
            className="w-full h-8 px-2.5 rounded-xl border border-input bg-background font-medium"
          >
            <option value="all">All Payment Methods</option>
            {PAYMENT_METHODS.map((pm) => (
              <option key={pm} value={pm}>{pm}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Custom Range Picker */}
      {activePeriod === "custom" && (
        <div className="pt-2 flex items-center gap-3 border-t border-slate-100 dark:border-slate-800/80 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">From:</span>
            <input
              type="date"
              value={filters.startDate ? new Date(filters.startDate).toISOString().split("T")[0] : ""}
              onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
              className="px-2.5 py-1 text-xs rounded-xl border border-input bg-background"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">To:</span>
            <input
              type="date"
              value={filters.endDate ? new Date(filters.endDate).toISOString().split("T")[0] : ""}
              onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
              className="px-2.5 py-1 text-xs rounded-xl border border-input bg-background"
            />
          </div>
        </div>
      )}
    </div>
  );
}
