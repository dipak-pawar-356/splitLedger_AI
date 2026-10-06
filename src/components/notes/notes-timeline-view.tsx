"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Clock,
  FileText,
  Pin,
  Archive,
  Trash2,
  Edit3,
  CheckCircle2,
  Search,
  Filter,
  ArrowRight,
  Folder,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface NotesTimelineViewProps {
  timeline: any[];
  onSelectNote: (publicId: string) => void;
}

export function NotesTimelineView({ timeline, onSelectNote }: NotesTimelineViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");

  const filteredTimeline = useMemo(() => {
    return timeline.filter((item) => {
      const matchSearch =
        !searchQuery ||
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.action?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchAction =
        filterAction === "all" ||
        (filterAction === "pinned" && item.isPinned) ||
        (filterAction === "archived" && item.isArchived) ||
        (filterAction === "deleted" && item.isDeleted) ||
        item.action?.toLowerCase() === filterAction.toLowerCase();

      return matchSearch && matchAction;
    });
  }, [timeline, searchQuery, filterAction]);

  // Group events by day label
  const groupedEvents = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const item of filteredTimeline) {
      const dateKey = formatDate(item.updatedAt || item.createdAt);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    }
    return groups;
  }, [filteredTimeline]);

  return (
    <Card className="rounded-2xl border shadow-sm p-4 sm:p-5 space-y-4 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Activity & Audit Timeline
            </h3>
            <p className="text-xs text-slate-400">
              Chronological stream of note creations, updates, pins, and archive events.
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-xs font-mono">
          {filteredTimeline.length} Events Recorded
        </Badge>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search timeline events..."
            className="pl-8 h-8 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
          {[
            { id: "all", label: "All Events" },
            { id: "created", label: "Created" },
            { id: "updated", label: "Updated" },
            { id: "pinned", label: "Pinned" },
            { id: "archived", label: "Archived" },
            { id: "deleted", label: "Trash" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterAction(tab.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                filterAction === tab.id
                  ? "bg-primary text-white"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped Timeline Stream */}
      <div className="space-y-6 pt-2">
        {Object.entries(groupedEvents).map(([dateLabel, items]) => (
          <div key={dateLabel} className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{dateLabel}</span>
              <span className="text-[10px] font-mono">({items.length})</span>
            </div>

            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-2.5 space-y-3 py-1">
              {items.map((item, idx) => {
                const isTrash = item.isDeleted;
                const isArchived = item.isArchived;
                const isPinned = item.isPinned;

                return (
                  <div key={idx} className="relative pl-5 group">
                    {/* Timeline Dot */}
                    <div className="absolute -left-[5px] top-3.5 h-2 w-2 rounded-full bg-white dark:bg-slate-900 border-2 border-primary group-hover:scale-125 transition-transform" />

                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary/50 transition-colors shadow-xs flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => onSelectNote(item.publicId)}
                            className="font-bold text-xs text-slate-800 dark:text-slate-100 hover:text-primary transition-colors truncate text-left"
                          >
                            {item.title || "Untitled Note"}
                          </button>

                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 rounded-md font-medium capitalize ${
                              isTrash
                                ? "border-rose-200 text-rose-700 bg-rose-50 dark:bg-rose-950/20"
                                : isArchived
                                ? "border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-950/20"
                                : isPinned
                                ? "border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-950/20"
                                : "border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20"
                            }`}
                          >
                            {item.action || "Active"}
                          </Badge>

                          {item.categoryName && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              in {item.categoryName}
                            </span>
                          )}
                        </div>

                        {item.details && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {item.details}
                          </p>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectNote(item.publicId)}
                        className="h-7 text-xs rounded-xl px-2 gap-1 text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span>Open</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filteredTimeline.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <Clock className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="font-semibold text-slate-600 dark:text-slate-400">No events found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your timeline search or filters.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
