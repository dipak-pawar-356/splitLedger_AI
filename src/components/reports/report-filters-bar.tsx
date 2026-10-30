"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  Calendar, 
  X, 
  RotateCcw, 
  IndianRupee, 
  CreditCard, 
  Tag, 
  Layers,
  ChevronDown,
  ChevronUp,
  Users,
  UserCheck
} from "lucide-react";
import { type ReportFilterOptions } from "@/actions/reports";

interface ReportFiltersBarProps {
  filters: ReportFilterOptions;
  onFiltersChange: (filters: ReportFilterOptions) => void;
  categories: Array<{ id: number; name: string }>;
  groups: Array<{ id: number; name: string }>;
  contacts: Array<{ id: number; name: string }>;
}

const PERIOD_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
  { value: "custom", label: "Custom Range" },
];

const PAYMENT_METHODS = ["UPI", "Cash", "Bank Transfer", "Credit Card", "Debit Card", "Other"];

export function ReportFiltersBar({
  filters,
  onFiltersChange,
  categories,
  groups,
  contacts,
}: ReportFiltersBarProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(filters.search || "");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal search query if parent resets or clears
  useEffect(() => {
    setSearchQuery(filters.search || "");
  }, [filters.search]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onFiltersChange({ ...filters, search: val, page: 1 });
    }, 320);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    onFiltersChange({ ...filters, search: "", page: 1 });
  };

  const activeFiltersCount = [
    filters.search,
    filters.period && filters.period !== "all",
    filters.categoryId,
    filters.groupId,
    filters.contactId,
    filters.paymentMethod,
    filters.type && filters.type !== "all",
    filters.status && filters.status !== "all",
    filters.minAmount,
    filters.maxAmount,
    filters.hasReceipt,
    filters.tag,
    filters.reportScope && filters.reportScope !== "combined",
  ].filter(Boolean).length;

  const handleReset = () => {
    setSearchQuery("");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    onFiltersChange({
      reportType: filters.reportType || "overview",
      period: "all",
      search: "",
      sortBy: "date_desc",
      reportScope: "combined",
    });
  };

  return (
    <div className="space-y-3 bg-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
      {/* Scope Selector: Combined | Overall Group | Personal Report */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Report Filter:
          </span>
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-xl gap-1">
            <Button
              type="button"
              variant={(filters.reportScope || "combined") === "combined" ? "default" : "ghost"}
              size="sm"
              className="rounded-lg text-xs h-7 px-3 font-semibold transition-all duration-150 active:scale-95"
              onClick={() => onFiltersChange({ ...filters, reportScope: "combined", page: 1 })}
            >
              <Layers className="h-3.5 w-3.5 mr-1" />
              Combined Report
            </Button>
            <Button
              type="button"
              variant={filters.reportScope === "group" ? "default" : "ghost"}
              size="sm"
              className="rounded-lg text-xs h-7 px-3 font-semibold transition-all duration-150 active:scale-95"
              onClick={() => onFiltersChange({ ...filters, reportScope: "group", page: 1 })}
            >
              <Users className="h-3.5 w-3.5 mr-1" />
              Overall Group Report
            </Button>
            <Button
              type="button"
              variant={filters.reportScope === "personal" ? "default" : "ghost"}
              size="sm"
              className="rounded-lg text-xs h-7 px-3 font-semibold transition-all duration-150 active:scale-95"
              onClick={() => onFiltersChange({ ...filters, reportScope: "personal", page: 1 })}
            >
              <UserCheck className="h-3.5 w-3.5 mr-1" />
              Personal Report
            </Button>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          {(filters.reportScope || "combined") === "combined" && "Combined overview of group financial activity & personal finances"}
          {filters.reportScope === "group" && "Showing combined expenses & settlements for selected groups only"}
          {filters.reportScope === "personal" && "Showing only expenses paid by you or your allocated split share"}
        </div>
      </div>

      {/* Top Search & Period Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by ID, keyword, title, tag, notes..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-8 rounded-xl h-9 text-xs transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Quick Period Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {PERIOD_OPTIONS.map((p) => {
            const isSelected = (filters.period || "all") === p.value;
            return (
              <Button
                key={p.value}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className={`rounded-xl text-xs h-8 px-3 whitespace-nowrap transition-all duration-150 active:scale-95 ${
                  isSelected ? "font-semibold bg-primary text-primary-foreground shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
                onClick={() => onFiltersChange({ ...filters, period: p.value as any, page: 1 })}
              >
                {p.label}
              </Button>
            );
          })}
        </div>

        {/* Toggle Advanced Filters Button */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl text-xs h-8 gap-1.5"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="rounded-full text-[10px] px-1.5 h-4 font-mono">
                {activeFiltersCount}
              </Badge>
            )}
            {isAdvancedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>

          {activeFiltersCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl text-xs h-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
              onClick={handleReset}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Custom Date Range Picker (shown when period === 'custom') */}
      {filters.period === "custom" && (
        <div className="pt-2 flex items-center gap-3 border-t border-slate-100 dark:border-slate-800/80 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">From:</span>
            <input
              type="date"
              value={filters.startDate ? new Date(filters.startDate).toISOString().split("T")[0] : ""}
              onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value, page: 1 })}
              className="px-2.5 py-1 text-xs rounded-xl border border-input bg-background"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">To:</span>
            <input
              type="date"
              value={filters.endDate ? new Date(filters.endDate).toISOString().split("T")[0] : ""}
              onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value, page: 1 })}
              className="px-2.5 py-1 text-xs rounded-xl border border-input bg-background"
            />
          </div>
        </div>
      )}

      {/* Advanced Filters Drawer */}
      {isAdvancedOpen && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Category Filter */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-600 dark:text-slate-400">Category</label>
            <select
              value={filters.categoryId ? String(filters.categoryId) : "all"}
              onChange={(e) => onFiltersChange({ 
                ...filters, 
                categoryId: e.target.value === "all" ? undefined : Number(e.target.value),
                page: 1 
              })}
              className="w-full h-8 px-2.5 rounded-xl border border-input bg-background font-medium"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Group Filter */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-600 dark:text-slate-400">Group</label>
            <select
              value={filters.groupId ? String(filters.groupId) : "all"}
              onChange={(e) => onFiltersChange({ 
                ...filters, 
                groupId: e.target.value === "all" ? undefined : Number(e.target.value),
                page: 1 
              })}
              className="w-full h-8 px-2.5 rounded-xl border border-input bg-background font-medium"
            >
              <option value="all">All Groups & Personal</option>
              {groups.map((g) => (
                <option key={g.id} value={String(g.id)}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Member / Contact Filter */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-600 dark:text-slate-400">Contact / Member</label>
            <select
              value={filters.contactId ? String(filters.contactId) : "all"}
              onChange={(e) => onFiltersChange({ 
                ...filters, 
                contactId: e.target.value === "all" ? undefined : Number(e.target.value),
                page: 1 
              })}
              className="w-full h-8 px-2.5 rounded-xl border border-input bg-background font-medium"
            >
              <option value="all">All Contacts</option>
              {contacts.map((cnt) => (
                <option key={cnt.id} value={String(cnt.id)}>{cnt.name}</option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-600 dark:text-slate-400">Payment Method</label>
            <select
              value={filters.paymentMethod || "all"}
              onChange={(e) => onFiltersChange({ 
                ...filters, 
                paymentMethod: e.target.value === "all" ? undefined : e.target.value,
                page: 1 
              })}
              className="w-full h-8 px-2.5 rounded-xl border border-input bg-background font-medium"
            >
              <option value="all">All Methods</option>
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>{pm}</option>
              ))}
            </select>
          </div>

          {/* Amount Range Min & Max */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-600 dark:text-slate-400">Min Amount (₹)</label>
            <Input
              type="number"
              placeholder="e.g. 100"
              value={filters.minAmount ? filters.minAmount / 100 : ""}
              onChange={(e) => onFiltersChange({ 
                ...filters, 
                minAmount: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined,
                page: 1 
              })}
              className="h-8 rounded-xl text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-600 dark:text-slate-400">Max Amount (₹)</label>
            <Input
              type="number"
              placeholder="e.g. 5000"
              value={filters.maxAmount ? filters.maxAmount / 100 : ""}
              onChange={(e) => onFiltersChange({ 
                ...filters, 
                maxAmount: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined,
                page: 1 
              })}
              className="h-8 rounded-xl text-xs"
            />
          </div>

          {/* Sort By */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-600 dark:text-slate-400">Sort By</label>
            <select
              value={filters.sortBy || "date_desc"}
              onChange={(e) => onFiltersChange({ ...filters, sortBy: e.target.value as any })}
              className="w-full h-8 px-2.5 rounded-xl border border-input bg-background font-medium"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
              <option value="title_asc">Alphabetical</option>
            </select>
          </div>

          {/* Receipt Toggle */}
          <div className="space-y-1 flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer h-8">
              <input
                type="checkbox"
                checked={filters.hasReceipt || false}
                onChange={(e) => onFiltersChange({ ...filters, hasReceipt: e.target.checked, page: 1 })}
                className="rounded text-primary focus:ring-primary h-4 w-4"
              />
              <span className="font-medium text-slate-700 dark:text-slate-300">Has Receipt Attached</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
