"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { 
  ActivityTimelineSection, 
  getUserActivityTimeline, 
  ActivityFilterOptions 
} from "@/actions/activity";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  History, 
  Search, 
  Filter, 
  RotateCw, 
  Calendar, 
  Layers, 
  Sparkles, 
  X, 
  Clock 
} from "lucide-react";
import { ActivityCard } from "@/components/activity/activity-card";

interface ActivityTimelineViewProps {
  initialSections: ActivityTimelineSection[];
  initialTotalCount: number;
  groups: Array<{ id: number; name: string }>;
}

export function ActivityTimelineView({
  initialSections,
  initialTotalCount,
  groups,
}: ActivityTimelineViewProps) {
  const [sections, setSections] = useState<ActivityTimelineSection[]>(initialSections);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadActivities = useCallback(() => {
    startTransition(async () => {
      try {
        const filters: ActivityFilterOptions = {
          search: searchQuery.trim() || undefined,
          action: selectedAction === "all" ? undefined : selectedAction,
          groupId: selectedGroup === "all" ? undefined : Number(selectedGroup),
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        };
        const res = await getUserActivityTimeline(filters);
        setSections(res.sections);
        setTotalCount(res.totalCount);
      } catch (e) {
        console.error(e);
      }
    });
  }, [searchQuery, selectedAction, selectedGroup, startDate, endDate]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Listen for real-time activity events
  useEffect(() => {
    const handleSync = (_e: any) => {
      loadActivities();
    };
    window.addEventListener("splitledger:sync", handleSync);
    return () => window.removeEventListener("splitledger:sync", handleSync);
  }, [loadActivities]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedAction("all");
    setSelectedGroup("all");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters = searchQuery || selectedAction !== "all" || selectedGroup !== "all" || startDate || endDate;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Activity Timeline
            </h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary font-bold text-xs">
              Live Audit Trail
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time chronological activity feed of expenses, settlements, group changes, and reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl text-xs gap-1.5"
            onClick={loadActivities}
          >
            <RotateCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
            <span>Refresh Feed</span>
          </Button>
        </div>
      </div>

      {/* Multi-Criteria Filter Bar */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm bg-card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by action or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-xl text-xs bg-background"
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

          {/* Action Type Filter */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="h-9 px-3 rounded-xl border border-input bg-background font-medium text-xs"
          >
            <option value="all">All Action Types</option>
            <option value="create_transaction">Expenses & Transactions Added</option>
            <option value="update_transaction">Expenses Edited</option>
            <option value="delete_transaction">Expenses Deleted</option>
            <option value="create_settlement">Settlements Requested</option>
            <option value="complete_settlement">Settlements Completed</option>
            <option value="create_group">Groups Created</option>
            <option value="member_joined">Members Joined</option>
            <option value="receipt_uploaded">Receipts Uploaded</option>
            <option value="report_export">Reports Exported</option>
            <option value="budget_created">Budgets Created</option>
          </select>

          {/* Group Filter */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="h-9 px-3 rounded-xl border border-input bg-background font-medium text-xs"
          >
            <option value="all">All Groups & Personal</option>
            {groups.map((g) => (
              <option key={g.id} value={String(g.id)}>{g.name}</option>
            ))}
          </select>

          {/* Date Picker Range */}
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 rounded-xl text-xs bg-background"
              title="Start Date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 rounded-xl text-xs bg-background"
              title="End Date"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 font-medium">
              Filtered: Showing matching timeline entries
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-rose-500 hover:text-rose-700"
              onClick={handleResetFilters}
            >
              Reset Filters
            </Button>
          </div>
        )}
      </Card>

      {/* Grouped Timeline Sections (SECTION 2: Today, Yesterday, This Week, Earlier) */}
      <div className="space-y-8">
        {sections.length > 0 ? (
          sections.map((section) => (
            <div key={section.title} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {section.title}
                </span>
                <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                <Badge variant="secondary" className="text-[10px] font-mono font-semibold">
                  {section.items.length} {section.items.length === 1 ? "event" : "events"}
                </Badge>
              </div>

              <div className="space-y-2.5">
                {section.items.map((item) => (
                  <ActivityCard key={item.id} activity={item} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <Card className="rounded-3xl border-2 border-dashed p-16 text-center space-y-2">
            <History className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No Activity Recorded
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your actions and group updates will appear here in chronological order.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
