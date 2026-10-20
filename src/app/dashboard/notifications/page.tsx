"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import { 
  NotificationItem, 
  getNotifications, 
  markAllAsRead, 
  clearAllReadNotifications 
} from "@/actions/notifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Search, 
  Filter, 
  Settings, 
  RotateCw, 
  Sparkles, 
  Pin, 
  Archive, 
  Mail, 
  Calendar, 
  ShieldAlert,
  Layers,
  X,
  Loader2
} from "lucide-react";
import { NotificationCard } from "@/components/notifications/notification-card";
import { NotificationPreferencesDialog } from "@/components/notifications/notification-preferences-dialog";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "expense", label: "Expenses" },
  { value: "settlement", label: "Settlements" },
  { value: "group", label: "Groups" },
  { value: "budget", label: "Budgets" },
  { value: "ai_insight", label: "AI Insights" },
  { value: "security", label: "Security" },
  { value: "report", label: "Reports" },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pinnedCount, setPinnedCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "pinned" | "archived">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Debounce search query changes with 250ms delay
  useEffect(() => {
    setIsDebouncing(true);
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setIsDebouncing(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleImmediateSearch = (query: string) => {
    setSearchQuery(query);
    setDebouncedSearch(query);
    setIsDebouncing(false);
  };

  const loadData = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await getNotifications({
          tab: activeTab,
          category: selectedCategory === "all" ? undefined : selectedCategory,
          priority: selectedPriority === "all" ? undefined : selectedPriority,
          search: debouncedSearch.trim() || undefined,
        });
        setNotifications(res.notifications);
        setTotalCount(res.totalCount);
        setUnreadCount(res.unreadCount);
        setPinnedCount(res.pinnedCount);
        setArchivedCount(res.archivedCount);
      } catch (e) {
        console.error(e);
      }
    });
  }, [activeTab, selectedCategory, selectedPriority, debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Synchronize unread count in real-time across tabs and components
  useEffect(() => {
    const handleUpdated = (e: Event) => {
      const custom = e as CustomEvent<{ count?: number; unreadDelta?: number }>;
      if (custom.detail?.count !== undefined) {
        setUnreadCount(custom.detail.count);
      } else if (custom.detail?.unreadDelta !== undefined) {
        setUnreadCount((prev) => Math.max(0, prev + custom.detail.unreadDelta!));
      }
    };
    window.addEventListener("notifications:updated", handleUpdated);
    return () => window.removeEventListener("notifications:updated", handleUpdated);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setUnreadCount(0);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("notifications:updated", { detail: { count: 0 } })
        );
      }
      toast.success("All notifications marked as read");
      loadData();
    } catch (e) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleClearAllRead = async () => {
    if (!confirm("Are you sure you want to clear all read notifications?")) return;
    try {
      await clearAllReadNotifications();
      toast.success("Read notifications cleared");
      loadData();
    } catch (e) {
      toast.error("Failed to clear notifications");
    }
  };

  const criticalCount = notifications.filter((n) => n.priority === "critical" || n.priority === "high").length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Notification Center
            </h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary font-bold text-xs">
              Live Feed
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track expenses, settlement activities, budget threshold alerts, and group invitations
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/dashboard/notifications/preferences">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl text-xs gap-1.5 border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/50 transition-all"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Preferences</span>
            </Button>
          </Link>

          {unreadCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/10 transition-all font-semibold"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark All Read</span>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-xl text-xs gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            onClick={loadData}
          >
            <RotateCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* 4 Stat Overview Cards with Interactive Theme-Adapted Hover Effects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Alerts Card */}
        <Card
          onClick={() => {
            setActiveTab("all");
            setSelectedPriority("all");
            setSelectedCategory("all");
          }}
          className={`rounded-3xl border p-4 sm:p-5 shadow-xs cursor-pointer relative overflow-hidden transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg ${
            activeTab === "all" && selectedPriority === "all" && selectedCategory === "all"
              ? "bg-gradient-to-br from-primary/10 via-card to-background border-primary/50 shadow-primary/10 ring-2 ring-primary/20"
              : "bg-card border-slate-200/80 dark:border-slate-800/90 hover:border-primary/40 dark:hover:border-primary/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 hover:shadow-primary/5"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">Total Alerts</span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
              <Bell className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-2 tracking-tight group-hover:text-primary transition-colors">
            {totalCount}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Active notification history</p>
        </Card>

        {/* Unread Alerts Card */}
        <Card
          onClick={() => {
            setActiveTab("unread");
            setSelectedPriority("all");
          }}
          className={`rounded-3xl border p-4 sm:p-5 shadow-xs cursor-pointer relative overflow-hidden transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg ${
            activeTab === "unread"
              ? "bg-gradient-to-br from-blue-500/10 via-card to-background border-blue-500/60 shadow-blue-500/10 ring-2 ring-blue-500/20"
              : "bg-card border-slate-200/80 dark:border-slate-800/90 hover:border-blue-400 dark:hover:border-blue-500/60 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 hover:shadow-blue-500/10"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px] text-blue-600 dark:text-blue-400">Unread</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
              <Mail className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-2 tracking-tight">
            {unreadCount}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Pending user review</p>
        </Card>

        {/* High / Critical Alerts Card */}
        <Card
          onClick={() => {
            setSelectedPriority(selectedPriority === "high" || selectedPriority === "critical" ? "all" : "high");
          }}
          className={`rounded-3xl border p-4 sm:p-5 shadow-xs cursor-pointer relative overflow-hidden transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg ${
            selectedPriority === "high" || selectedPriority === "critical"
              ? "bg-gradient-to-br from-rose-500/10 via-card to-background border-rose-500/60 shadow-rose-500/10 ring-2 ring-rose-500/20"
              : "bg-card border-slate-200/80 dark:border-slate-800/90 hover:border-rose-400 dark:hover:border-rose-500/60 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 hover:shadow-rose-500/10"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px] text-rose-600 dark:text-rose-400">High / Critical</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-2 tracking-tight">
            {criticalCount}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Urgent actions required</p>
        </Card>

        {/* Pinned & Saved Alerts Card */}
        <Card
          onClick={() => {
            setActiveTab(activeTab === "pinned" ? "all" : "pinned");
          }}
          className={`rounded-3xl border p-4 sm:p-5 shadow-xs cursor-pointer relative overflow-hidden transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg ${
            activeTab === "pinned"
              ? "bg-gradient-to-br from-amber-500/10 via-card to-background border-amber-500/60 shadow-amber-500/10 ring-2 ring-amber-500/20"
              : "bg-card border-slate-200/80 dark:border-slate-800/90 hover:border-amber-400 dark:hover:border-amber-500/60 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 hover:shadow-amber-500/10"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-600 dark:text-amber-400">Pinned & Saved</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
              <Pin className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-2 tracking-tight">
            {pinnedCount}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Flagged for later</p>
        </Card>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input (SECTION 8) */}
          <div className="relative flex-1 group">
            {isPending || isDebouncing ? (
              <Loader2 className="absolute left-3 top-2.5 h-4 w-4 text-primary animate-spin" />
            ) : (
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            )}
            <Input
              placeholder="Search notifications by title, member, group, amount (e.g. 1333)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleImmediateSearch(searchQuery);
                } else if (e.key === "Escape") {
                  handleImmediateSearch("");
                }
              }}
              className="pl-9 pr-8 h-9 rounded-xl text-xs bg-background transition-all focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleImmediateSearch("")}
                title="Clear search (Esc)"
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Priority Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as any)}
              className="h-9 px-3 rounded-xl border border-input bg-background font-medium text-xs"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical Only</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Tabs & Category Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
            <TabsList className="h-8 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
              <TabsTrigger value="all" className="rounded-lg text-xs font-semibold py-1">
                All ({totalCount})
              </TabsTrigger>
              <TabsTrigger value="unread" className="rounded-lg text-xs font-semibold py-1">
                Unread ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="pinned" className="rounded-lg text-xs font-semibold py-1">
                Pinned ({pinnedCount})
              </TabsTrigger>
              <TabsTrigger value="archived" className="rounded-lg text-xs font-semibold py-1">
                Archived ({archivedCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => {
              const isSelected = selectedCategory === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setSelectedCategory(c.value)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "bg-background border border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Search Results Banner */}
      {debouncedSearch.trim().length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-primary/5 border border-primary/20 text-xs animate-in fade-in-50 duration-200">
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Found <strong className="text-primary font-bold">{notifications.length}</strong> {notifications.length === 1 ? "notification" : "notifications"} matching &ldquo;<span className="font-semibold text-slate-900 dark:text-slate-100">{debouncedSearch}</span>&rdquo;
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleImmediateSearch("")}
            className="text-xs text-primary hover:underline font-semibold shrink-0 ml-2"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Notifications Stream */}
      <div className="space-y-3">
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              searchQuery={debouncedSearch}
              onRefresh={loadData}
            />
          ))
        ) : debouncedSearch.trim().length > 0 ? (
          <Card className="rounded-3xl border-2 border-dashed p-12 sm:p-16 text-center space-y-3 bg-slate-50/40 dark:bg-slate-900/20">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No notifications matching &ldquo;{debouncedSearch}&rdquo;
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              We couldn&apos;t find any alerts matching this query. Try searching by numeric amount (e.g. 1333), member name, group name, or reset your search filter.
            </p>
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleImmediateSearch("")}
                className="rounded-xl text-xs gap-1.5 font-semibold"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear search filter</span>
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="rounded-3xl border-2 border-dashed p-16 text-center space-y-2">
            <Bell className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No Notifications Found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You are all caught up! New expenses, settlement requests, budget alerts, and group invitations will appear here.
            </p>
          </Card>
        )}
      </div>

      {/* Preferences Dialog */}
      <NotificationPreferencesDialog
        open={isPreferencesOpen}
        onOpenChange={setIsPreferencesOpen}
      />
    </div>
  );
}
