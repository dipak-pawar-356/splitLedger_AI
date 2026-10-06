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
  X
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
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await getNotifications({
          tab: activeTab,
          category: selectedCategory === "all" ? undefined : selectedCategory,
          priority: selectedPriority === "all" ? undefined : selectedPriority,
          search: searchQuery.trim() || undefined,
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
  }, [activeTab, selectedCategory, selectedPriority, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
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
              className="rounded-xl text-xs gap-1.5"
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
              className="rounded-xl text-xs gap-1.5 text-primary"
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
            className="rounded-xl text-xs gap-1.5 text-slate-500 hover:text-slate-900"
            onClick={loadData}
          >
            <RotateCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-3xl border p-4 shadow-sm bg-card">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Alerts</span>
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600">
              <Bell className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {totalCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Active notification history</p>
        </Card>

        <Card className="rounded-3xl border p-4 shadow-sm bg-card">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Unread</span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
              <Mail className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {unreadCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Pending user review</p>
        </Card>

        <Card className="rounded-3xl border p-4 shadow-sm bg-card">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">High / Critical</span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {criticalCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Urgent actions required</p>
        </Card>

        <Card className="rounded-3xl border p-4 shadow-sm bg-card">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Pinned & Saved</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600">
              <Pin className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {pinnedCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Flagged for later</p>
        </Card>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input (SECTION 8) */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search notifications by title, member, group, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-xl text-xs bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
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

      {/* Notifications Stream */}
      <div className="space-y-3">
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              onRefresh={loadData}
            />
          ))
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
