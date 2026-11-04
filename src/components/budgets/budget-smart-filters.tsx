"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Filter,
  Calendar,
  X,
  Layers,
  Clock,
  Coins,
  ShieldAlert,
  Sparkles,
  ChevronDown,
} from "lucide-react";

export interface BudgetFilterState {
  timeRange: "all" | "today" | "week" | "month" | "quarter" | "half_year" | "year" | "custom";
  customStartDate?: string;
  customEndDate?: string;
  status: "all" | "active" | "ending_soon" | "exceeded" | "completed" | "expired" | "upcoming";
  category: string;
  budgetType: string;
  duration: string;
  revisionFilter: "all" | "increased" | "not_increased";
  quickTag: "all" | "over_budget" | "ending_soon" | "expired";
}

interface BudgetSmartFiltersProps {
  filters: BudgetFilterState;
  onFilterChange: (newFilters: BudgetFilterState) => void;
  availableCategories: string[];
  totalBudgetsCount: number;
  filteredBudgetsCount: number;
}

export function BudgetSmartFilters({
  filters,
  onFilterChange,
  availableCategories,
  totalBudgetsCount,
  filteredBudgetsCount,
}: BudgetSmartFiltersProps) {
  const [showCustomRange, setShowCustomRange] = useState(filters.timeRange === "custom");

  const handleTimeRangeChange = (range: BudgetFilterState["timeRange"]) => {
    if (range === "custom") {
      setShowCustomRange(true);
      onFilterChange({ ...filters, timeRange: "custom" });
    } else {
      setShowCustomRange(false);
      onFilterChange({ ...filters, timeRange: range });
    }
  };

  const resetFilters = () => {
    setShowCustomRange(false);
    onFilterChange({
      timeRange: "all",
      status: "all",
      category: "all",
      budgetType: "all",
      duration: "all",
      revisionFilter: "all",
      quickTag: "all",
    });
  };

  const hasActiveFilters =
    filters.timeRange !== "all" ||
    filters.status !== "all" ||
    filters.category !== "all" ||
    filters.budgetType !== "all" ||
    filters.duration !== "all" ||
    filters.revisionFilter !== "all" ||
    filters.quickTag !== "all";

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card/60 backdrop-blur-md p-3.5 space-y-3 shadow-xs">
      {/* Top Filter Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-bold text-slate-500 flex items-center gap-1 mr-1">
            <Filter className="h-3.5 w-3.5 text-primary" />
            Filters:
          </span>

          {/* Time Range Filter Pills */}
          {[
            { id: "all", label: "All Time" },
            { id: "today", label: "Today" },
            { id: "week", label: "This Week" },
            { id: "month", label: "This Month" },
            { id: "quarter", label: "Quarter" },
            { id: "half_year", label: "Half Year" },
            { id: "year", label: "This Year" },
            { id: "custom", label: "Custom Range" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTimeRangeChange(item.id as any)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all duration-150 ${
                filters.timeRange === item.id
                  ? "bg-primary text-primary-foreground font-bold shadow-xs scale-105"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Quick Reset & Count */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredBudgetsCount}</strong> of {totalBudgetsCount}
          </span>
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={resetFilters}
              className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl px-2 gap-1"
            >
              <X className="h-3 w-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {showCustomRange && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 text-xs">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-slate-600 dark:text-slate-300">Custom Date Range:</span>
          <Input
            type="date"
            value={filters.customStartDate || ""}
            onChange={(e) => onFilterChange({ ...filters, customStartDate: e.target.value })}
            className="h-8 w-36 text-xs rounded-lg"
          />
          <span className="text-slate-400">to</span>
          <Input
            type="date"
            value={filters.customEndDate || ""}
            onChange={(e) => onFilterChange({ ...filters, customEndDate: e.target.value })}
            className="h-8 w-36 text-xs rounded-lg"
          />
        </div>
      )}

      {/* Second Row: Status, Category, Duration, Revisions, Quick Badges */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-xs">
        {/* Status Dropdown */}
        <select
          value={filters.status}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value as any })}
          className="h-8 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-background px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          <option value="all">Status: All</option>
          <option value="active">Active</option>
          <option value="ending_soon">Ending Soon</option>
          <option value="exceeded">Over Budget / Exceeded</option>
          <option value="completed">Completed</option>
          <option value="expired">Expired</option>
          <option value="upcoming">Upcoming</option>
        </select>

        {/* Category Dropdown */}
        <select
          value={filters.category}
          onChange={(e) => onFilterChange({ ...filters, category: e.target.value })}
          className="h-8 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-background px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          <option value="all">Category: All</option>
          {availableCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Budget Duration Dropdown */}
        <select
          value={filters.duration}
          onChange={(e) => onFilterChange({ ...filters, duration: e.target.value })}
          className="h-8 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-background px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          <option value="all">Duration: All</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="half_yearly">Half-Yearly</option>
          <option value="yearly">Yearly</option>
          <option value="custom">Custom Range</option>
        </select>

        {/* Budget Revision Filter */}
        <select
          value={filters.revisionFilter}
          onChange={(e) => onFilterChange({ ...filters, revisionFilter: e.target.value as any })}
          className="h-8 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-background px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          <option value="all">Revisions: All</option>
          <option value="increased">Budget Increased</option>
          <option value="not_increased">Budget Not Increased</option>
        </select>

        {/* Quick Chips */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, quickTag: filters.quickTag === "over_budget" ? "all" : "over_budget" })}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
              filters.quickTag === "over_budget"
                ? "bg-rose-500 text-white shadow-xs"
                : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
            }`}
          >
            Over Budget
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, quickTag: filters.quickTag === "ending_soon" ? "all" : "ending_soon" })}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
              filters.quickTag === "ending_soon"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
            }`}
          >
            Ending Soon
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, quickTag: filters.quickTag === "expired" ? "all" : "expired" })}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
              filters.quickTag === "expired"
                ? "bg-slate-700 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
            }`}
          >
            Expired
          </button>
        </div>
      </div>
    </div>
  );
}

