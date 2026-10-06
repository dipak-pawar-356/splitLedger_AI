"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
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
  X,
  ExternalLink
} from "lucide-react";
import { 
  NotificationItem, 
  getNotifications, 
  markAllAsRead, 
  clearAllReadNotifications 
} from "@/actions/notifications";
import { NotificationCard } from "@/components/notifications/notification-card";
import { NotificationPreferencesDialog } from "@/components/notifications/notification-preferences-dialog";
import { toast } from "sonner";
import Link from "next/link";

interface NotificationCenterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnreadCountChange?: (count: number) => void;
}

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expenses" },
  { value: "settlement", label: "Settlements" },
  { value: "group", label: "Groups" },
  { value: "budget", label: "Budgets" },
  { value: "ai_insight", label: "AI Insights" },
  { value: "security", label: "Security" },
];

export function NotificationCenterDrawer({
  open,
  onOpenChange,
  onUnreadCountChange,
}: NotificationCenterDrawerProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
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
        setUnreadCount(res.unreadCount);
        setPinnedCount(res.pinnedCount);
        setArchivedCount(res.archivedCount);
        if (onUnreadCountChange) {
          onUnreadCountChange(res.unreadCount);
        }
      } catch (e) {
        console.error(e);
      }
    });
  }, [activeTab, selectedCategory, selectedPriority, searchQuery, onUnreadCountChange]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setUnreadCount(0);
      if (onUnreadCountChange) onUnreadCountChange(0);
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col justify-between bg-card">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <SheetTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Notifications
                  </SheetTitle>
                  <p className="text-[11px] text-slate-500">
                    {unreadCount > 0 ? `${unreadCount} unread alerts` : "All alerts are up to date"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-xl text-slate-500 hover:text-slate-900"
                  onClick={() => setIsPreferencesOpen(true)}
                  title="Notification Preferences"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-xl text-slate-500 hover:text-slate-900"
                  onClick={loadData}
                  title="Refresh"
                >
                  <RotateCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Search Input (SECTION 8) */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search notifications, groups, members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 rounded-xl text-xs bg-background"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Tabs View (All, Unread, Pinned, Archived) */}
            <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
              <TabsList className="grid grid-cols-4 h-8 p-0.5 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-[11px]">
                <TabsTrigger value="all" className="rounded-lg text-[11px] font-semibold py-1">
                  All
                </TabsTrigger>
                <TabsTrigger value="unread" className="rounded-lg text-[11px] font-semibold py-1">
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </TabsTrigger>
                <TabsTrigger value="pinned" className="rounded-lg text-[11px] font-semibold py-1">
                  Pinned {pinnedCount > 0 && `(${pinnedCount})`}
                </TabsTrigger>
                <TabsTrigger value="archived" className="rounded-lg text-[11px] font-semibold py-1">
                  Archived
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Category Filter Chips (SECTION 2 & 9) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {CATEGORIES.map((c) => {
                const isSelected = selectedCategory === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setSelectedCategory(c.value)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
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

          {/* Notification Items Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onRefresh={loadData}
                />
              ))
            ) : (
              <div className="py-16 text-center text-slate-400 space-y-2 text-xs">
                <Bell className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="font-bold text-slate-700 dark:text-slate-300">No Notifications</p>
                <p>You have caught up with all financial alerts and updates.</p>
              </div>
            )}
          </div>

          {/* Drawer Footer Actions (SECTION 1) */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-xs h-8 text-primary font-semibold gap-1"
                  onClick={handleMarkAllRead}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl text-xs h-8 text-slate-500 hover:text-rose-600 gap-1"
                onClick={handleClearAllRead}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear read</span>
              </Button>
            </div>

            <Link href="/dashboard/notifications" onClick={() => onOpenChange(false)}>
              <Button variant="outline" size="sm" className="rounded-xl text-xs h-8 gap-1">
                <span>View Full Page</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      {/* Preferences Dialog */}
      <NotificationPreferencesDialog
        open={isPreferencesOpen}
        onOpenChange={setIsPreferencesOpen}
      />
    </>
  );
}
