"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  Clock,
  LayoutGrid,
  List,
  Pin,
  BookOpen,
  Bell,
  CheckSquare,
  Search,
  Filter,
  Copy,
  Trash2,
  Clipboard,
  CalendarDays,
  X,
  Mic,
  Paperclip,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface CalendarEntryData {
  total: number;
  notesCount?: number;
  remindersCount?: number;
  tasksCount?: number;
  voiceCount?: number;
  attachmentsCount?: number;
  pinned: number;
  drafts: number;
  archived: number;
  items?: Array<{ title: string; publicId: string }>;
}

interface NotesCalendarViewProps {
  calendarData: Record<string, CalendarEntryData>;
  onSelectDate: (dateStr: string) => void;
  onCreateNoteOnDate?: (dateStr: string, type?: "note" | "journal" | "reminder" | "task") => void | Promise<void>;
  onOpenTimeline?: (dateStr: string) => void;
  onDuplicateDay?: (dateStr: string) => void;
  onDeleteDayNotes?: (dateStr: string) => void;
}

export function NotesCalendarView({
  calendarData,
  onSelectDate,
  onCreateNoteOnDate,
  onOpenTimeline,
  onDuplicateDay,
  onDeleteDayNotes,
}: NotesCalendarViewProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [calendarMode, setCalendarMode] = useState<"month" | "week" | "agenda">("month");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "notes" | "reminders" | "tasks" | "voice">("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Selected Day Details for Mobile Bottom Sheet / Modal
  const [selectedDayDetails, setSelectedDayDetails] = useState<{
    dateStr: string;
    data?: CalendarEntryData;
  } | null>(null);

  // Floating Context Menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    dateStr: string;
  } | null>(null);

  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close context menu on outside click or escape key
  useEffect(() => {
    if (!contextMenu) return;

    const handleDismiss = () => setContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };

    window.addEventListener("click", handleDismiss);
    window.addEventListener("contextmenu", handleDismiss);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleDismiss, true);

    return () => {
      window.removeEventListener("click", handleDismiss);
      window.removeEventListener("contextmenu", handleDismiss);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleDismiss, true);
    };
  }, [contextMenu]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const handleContextMenu = (e: React.MouseEvent, dateStr: string) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 230;
    const menuHeight = 340;
    const x = e.clientX + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 10 : Math.max(10, e.clientX);
    const y = e.clientY + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 10 : Math.max(10, e.clientY);

    setContextMenu({ x, y, dateStr });
  };

  // Mobile Long-Press Handling
  const handleTouchStart = (e: React.TouchEvent, dateStr: string) => {
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;

    touchTimerRef.current = setTimeout(() => {
      const menuWidth = 230;
      const menuHeight = 340;
      const x = clientX + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 10 : Math.max(10, clientX - 20);
      const y = clientY + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 10 : Math.max(10, clientY - 20);
      setContextMenu({ x, y, dateStr });
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try { navigator.vibrate(40); } catch (_) {}
      }
    }, 500);
  };

  const handleTouchEndOrMove = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
  const blankArray = Array.from({ length: firstDayIndex }, (_, i) => i);

  // Today string formatted as YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // Filter and search on agenda items
  const agendaItems = useMemo(() => {
    return Object.entries(calendarData)
      .filter(([dateStr, data]) => {
        if (!data) return false;
        const hasActivity = (data.total > 0 || (data.remindersCount || 0) > 0 || (data.tasksCount || 0) > 0 || (data.voiceCount || 0) > 0);
        if (!hasActivity) return false;

        if (selectedFilter === "notes" && !(data.notesCount || data.total)) return false;
        if (selectedFilter === "reminders" && !(data.remindersCount || 0)) return false;
        if (selectedFilter === "tasks" && !(data.tasksCount || 0)) return false;
        if (selectedFilter === "voice" && !(data.voiceCount || 0)) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesDate = dateStr.includes(q);
          const matchesTitle = data.items?.some((it) => it.title.toLowerCase().includes(q));
          if (!matchesDate && !matchesTitle) return false;
        }

        return true;
      })
      .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime());
  }, [calendarData, selectedFilter, searchQuery]);

  // Week view dates calculation
  const currentWeekDays = useMemo(() => {
    const now = new Date(currentMonth);
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);

    const weekDays: Array<{ date: Date; dateStr: string }> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      weekDays.push({ date: d, dateStr: dStr });
    }
    return weekDays;
  }, [currentMonth]);

  const handlePasteNote = async (dateStr: string) => {
    try {
      let clipboardText = "";
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        clipboardText = await navigator.clipboard.readText();
      }
      if (!clipboardText) {
        toast.error("Clipboard is empty");
        return;
      }
      onCreateNoteOnDate?.(dateStr, "note");
      toast.success("Pasted clipboard text into new note!");
    } catch (e) {
      onCreateNoteOnDate?.(dateStr, "note");
    }
  };

  return (
    <Card className="rounded-2xl border shadow-sm p-3 sm:p-5 space-y-3 sm:space-y-4 bg-card relative" suppressHydrationWarning>
      {/* Top Header & Mobile Responsive Navigation */}
      <div className="flex flex-col gap-2.5 sm:gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
                Interactive Notes Calendar
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block">
                Double-click or long-press any date for actions & timeline.
              </p>
            </div>
          </div>

          {/* Month Navigator + Today Button */}
          <div className="flex items-center gap-1.5 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="h-7 sm:h-8 text-xs rounded-xl px-2.5 font-semibold text-primary border-primary/20 hover:bg-primary/5"
            >
              Today
            </Button>

            <div className="flex items-center gap-0.5 border border-slate-200 dark:border-slate-800 rounded-xl p-0.5 bg-slate-50 dark:bg-slate-900">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={prevMonth}
                className="h-7 w-7 p-0 rounded-lg"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-bold text-xs min-w-[100px] sm:min-w-[120px] text-center px-1">
                {monthNames[month]} {year}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={nextMonth}
                className="h-7 w-7 p-0 rounded-lg"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable Responsive Toolbar Chips (No Wrapping on Mobile) */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
          {/* View Mode Chips */}
          <div className="flex items-center gap-1 shrink-0 border border-slate-200 dark:border-slate-800 rounded-xl p-0.5 bg-slate-50 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setCalendarMode("month")}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all shrink-0 ${
                calendarMode === "month"
                  ? "bg-white dark:bg-slate-800 text-primary shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5 inline mr-1" />
              Month
            </button>
            <button
              type="button"
              onClick={() => setCalendarMode("week")}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all shrink-0 ${
                calendarMode === "week"
                  ? "bg-white dark:bg-slate-800 text-primary shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5 inline mr-1" />
              Week
            </button>
            <button
              type="button"
              onClick={() => setCalendarMode("agenda")}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all shrink-0 ${
                calendarMode === "agenda"
                  ? "bg-white dark:bg-slate-800 text-primary shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <List className="h-3.5 w-3.5 inline mr-1" />
              Agenda
            </button>
          </div>

          {/* Quick Filter & Search Chips */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {/* Filter Toggle */}
            <div className="relative">
              <Button
                type="button"
                variant={selectedFilter !== "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="h-7 text-xs rounded-xl px-2 gap-1"
              >
                <Filter className="h-3 w-3" />
                <span className="capitalize">{selectedFilter === "all" ? "Filters" : selectedFilter}</span>
              </Button>

              {isFilterOpen && (
                <div className="absolute right-0 top-8 z-30 w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-1 space-y-0.5 animate-in fade-in-0 zoom-in-95 duration-100">
                  {(["all", "notes", "reminders", "tasks", "voice"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setSelectedFilter(f);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1 text-xs rounded-lg capitalize ${
                        selectedFilter === f ? "bg-primary/10 text-primary font-bold" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {f === "all" ? "All Activity" : f}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search Input Toggle */}
            {isSearchOpen ? (
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 h-7">
                <Search className="h-3 w-3 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search date or title..."
                  className="bg-transparent text-xs w-28 sm:w-36 outline-hidden border-none text-slate-700 dark:text-slate-200"
                  autoFocus
                />
                <button type="button" onClick={() => { setSearchQuery(""); setIsSearchOpen(false); }}>
                  <X className="h-3 w-3 text-slate-400 hover:text-slate-600" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSearchOpen(true)}
                className="h-7 w-7 p-0 rounded-xl"
                title="Search dates"
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* MONTH VIEW */}
      {calendarMode === "month" && (
        <div className="space-y-1">
          {/* Weekday Grid Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] sm:text-[11px] text-slate-400 py-1 uppercase tracking-wider">
            <span><span className="sm:hidden">S</span><span className="hidden sm:inline">Sun</span></span>
            <span><span className="sm:hidden">M</span><span className="hidden sm:inline">Mon</span></span>
            <span><span className="sm:hidden">T</span><span className="hidden sm:inline">Tue</span></span>
            <span><span className="sm:hidden">W</span><span className="hidden sm:inline">Wed</span></span>
            <span><span className="sm:hidden">T</span><span className="hidden sm:inline">Thu</span></span>
            <span><span className="sm:hidden">F</span><span className="hidden sm:inline">Fri</span></span>
            <span><span className="sm:hidden">S</span><span className="hidden sm:inline">Sat</span></span>
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {blankArray.map((_, i) => (
              <div
                key={`blank-${i}`}
                className="min-h-[48px] sm:min-h-[85px] rounded-xl bg-slate-50/20 dark:bg-slate-900/10 border border-transparent"
              />
            ))}

            {daysArray.map((day) => {
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayData = calendarData[dateStr];

              const notesCount = dayData?.notesCount ?? dayData?.total ?? 0;
              const remindersCount = dayData?.remindersCount ?? 0;
              const tasksCount = dayData?.tasksCount ?? 0;
              const voiceCount = dayData?.voiceCount ?? 0;
              const attachmentsCount = dayData?.attachmentsCount ?? 0;

              // Collect active badge indicators
              const activeBadges: Array<{ icon: string; count: number; color: string }> = [];
              if (notesCount > 0) activeBadges.push({ icon: "📝", count: notesCount, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40" });
              if (remindersCount > 0) activeBadges.push({ icon: "📌", count: remindersCount, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" });
              if (tasksCount > 0) activeBadges.push({ icon: "✅", count: tasksCount, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" });
              if (voiceCount > 0) activeBadges.push({ icon: "🎤", count: voiceCount, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40" });
              if (attachmentsCount > 0) activeBadges.push({ icon: "📎", count: attachmentsCount, color: "text-slate-600 bg-slate-100 dark:bg-slate-800" });

              const isToday = isMounted && todayStr === dateStr;
              const hasActivity = activeBadges.length > 0;

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setSelectedDayDetails({ dateStr, data: dayData });
                    } else {
                      onSelectDate(dateStr);
                    }
                  }}
                  onDoubleClick={() => onCreateNoteOnDate?.(dateStr, "note")}
                  onContextMenu={(e) => handleContextMenu(e, dateStr)}
                  onTouchStart={(e) => handleTouchStart(e, dateStr)}
                  onTouchEnd={handleTouchEndOrMove}
                  onTouchMove={handleTouchEndOrMove}
                  className={`min-h-[48px] sm:min-h-[85px] p-1 sm:p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer group select-none relative ${
                    isToday
                      ? "border-primary ring-2 ring-primary/40 bg-primary/5"
                      : hasActivity
                      ? "border-primary/30 bg-white dark:bg-slate-900 hover:border-primary shadow-xs"
                      : "border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {/* Day Number & Primary Counter */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] sm:text-xs font-bold leading-none ${
                        isToday
                          ? "h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {day}
                    </span>

                    {/* Desktop Counter */}
                    {notesCount > 0 && (
                      <Badge
                        variant="default"
                        className="hidden sm:inline-flex text-[9px] px-1 py-0 rounded-md font-mono bg-primary text-white"
                      >
                        {notesCount}
                      </Badge>
                    )}
                  </div>

                  {/* Badges Stacking (Responsive: Max 2 + '+N' counter on mobile, rich chips on desktop) */}
                  <div className="my-0.5 sm:my-1 flex-1">
                    {/* Mobile Compact Indicators (< md) */}
                    <div className="flex sm:hidden items-center gap-0.5 flex-wrap">
                      {activeBadges.slice(0, 2).map((b, idx) => (
                        <span
                          key={idx}
                          className={`text-[9px] px-1 py-0 rounded font-medium ${b.color}`}
                        >
                          {b.icon} {b.count}
                        </span>
                      ))}
                      {activeBadges.length > 2 && (
                        <span className="text-[8px] font-bold px-1 py-0 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          +{activeBadges.length - 2}
                        </span>
                      )}
                    </div>

                    {/* Desktop Detailed Indicators (>= md) */}
                    <div className="hidden sm:flex items-center gap-1 flex-wrap">
                      {activeBadges.map((b, idx) => (
                        <span
                          key={idx}
                          className={`text-[9px] px-1 py-0.5 rounded font-medium ${b.color}`}
                        >
                          {b.icon} {b.count}
                        </span>
                      ))}
                    </div>

                    {/* Note title preview (desktop only) */}
                    <div className="hidden sm:block space-y-0.5 mt-1 overflow-hidden">
                      {dayData?.items?.slice(0, 1).map((item, idx) => (
                        <p
                          key={idx}
                          className="text-[9px] text-slate-600 dark:text-slate-400 truncate bg-slate-100/80 dark:bg-slate-800/80 px-1 py-0.5 rounded"
                        >
                          {item.title}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Day Footer Hint */}
                  <div className="hidden sm:flex items-center justify-between text-[8px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Click options</span>
                    <Plus className="h-2.5 w-2.5 hover:text-primary" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {calendarMode === "week" && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
            {currentWeekDays.map(({ date, dateStr }) => {
              const dayData = calendarData[dateStr];
              const notesCount = dayData?.notesCount ?? dayData?.total ?? 0;
              const remindersCount = dayData?.remindersCount ?? 0;
              const tasksCount = dayData?.tasksCount ?? 0;
              const isToday = isMounted && todayStr === dateStr;

              return (
                <div
                  key={dateStr}
                  onClick={() => onSelectDate(dateStr)}
                  onContextMenu={(e) => handleContextMenu(e, dateStr)}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer min-h-[140px] bg-card ${
                    isToday ? "border-primary ring-2 ring-primary/40 bg-primary/5" : "border-slate-200 dark:border-slate-800 hover:border-primary/50"
                  }`}
                >
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        {date.toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {date.getDate()}
                      </span>
                    </div>
                    {notesCount > 0 && (
                      <Badge variant="default" className="text-[9px] px-1.5 py-0 font-mono">
                        {notesCount} notes
                      </Badge>
                    )}
                  </div>

                  <div className="my-2 space-y-1 flex-1">
                    {dayData?.items?.slice(0, 3).map((item, idx) => (
                      <p key={idx} className="text-[10px] text-slate-600 dark:text-slate-400 truncate bg-slate-100/70 dark:bg-slate-800/70 px-1 py-0.5 rounded">
                        {item.title}
                      </p>
                    ))}
                    {remindersCount > 0 && <span className="inline-block text-[9px] text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1 py-0.5 rounded mr-1">📌 {remindersCount}</span>}
                    {tasksCount > 0 && <span className="inline-block text-[9px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.5 rounded">✅ {tasksCount}</span>}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateNoteOnDate?.(dateStr, "note");
                    }}
                    className="h-6 text-[10px] w-full rounded-lg text-primary font-semibold hover:bg-primary/10 mt-auto"
                  >
                    + Add Note
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AGENDA VIEW */}
      {calendarMode === "agenda" && (
        <div className="space-y-2">
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {agendaItems.map(([dateStr, data]) => {
              const notesCount = data.notesCount ?? data.total ?? 0;
              const remindersCount = data.remindersCount ?? 0;
              const tasksCount = data.tasksCount ?? 0;
              const voiceCount = data.voiceCount ?? 0;

              return (
                <div
                  key={dateStr}
                  onContextMenu={(e) => handleContextMenu(e, dateStr)}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card flex items-center justify-between gap-3 hover:border-primary/50 transition-colors flex-wrap sm:flex-nowrap"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {formatDate(dateStr)}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 flex-wrap">
                        {notesCount > 0 && <span>📝 {notesCount} Notes</span>}
                        {remindersCount > 0 && <span>📌 {remindersCount} Reminders</span>}
                        {tasksCount > 0 && <span>✅ {tasksCount} Tasks</span>}
                        {voiceCount > 0 && <span>🎤 {voiceCount} Voice</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectDate(dateStr)}
                      className="h-7 text-xs rounded-xl px-2.5 text-primary border-primary/20"
                    >
                      View
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleContextMenu(e, dateStr)}
                      className="h-7 text-xs rounded-xl px-2 text-slate-500 hover:text-primary"
                    >
                      + Action
                    </Button>
                  </div>
                </div>
              );
            })}

            {agendaItems.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <CalendarIcon className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="font-semibold text-slate-600 dark:text-slate-400">No matching activities found</p>
                <p className="text-[11px] text-slate-400 mt-1">Select another filter or tap a date on the month view</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MOBILE DAY ACTIVITY BOTTOM SHEET / MODAL */}
      {selectedDayDetails && (
        <Dialog open={!!selectedDayDetails} onOpenChange={() => setSelectedDayDetails(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl p-4 sm:p-5">
            <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <DialogTitle className="text-sm sm:text-base font-bold flex items-center justify-between">
                <span>{formatDate(selectedDayDetails.dateStr)}</span>
                <Badge variant="outline" className="text-xs">
                  {selectedDayDetails.data?.total || 0} Total Items
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Day Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onCreateNoteOnDate?.(selectedDayDetails.dateStr, "note");
                    setSelectedDayDetails(null);
                  }}
                  className="rounded-xl text-xs gap-1.5 h-8 bg-primary text-white"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Create Note</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onCreateNoteOnDate?.(selectedDayDetails.dateStr, "journal");
                    setSelectedDayDetails(null);
                  }}
                  className="rounded-xl text-xs gap-1.5 h-8 text-emerald-600 border-emerald-300 dark:border-emerald-800"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Daily Journal</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onCreateNoteOnDate?.(selectedDayDetails.dateStr, "reminder");
                    setSelectedDayDetails(null);
                  }}
                  className="rounded-xl text-xs gap-1.5 h-8 text-amber-600 border-amber-300 dark:border-amber-800"
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span>Set Reminder</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onCreateNoteOnDate?.(selectedDayDetails.dateStr, "task");
                    setSelectedDayDetails(null);
                  }}
                  className="rounded-xl text-xs gap-1.5 h-8 text-blue-600 border-blue-300 dark:border-blue-800"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>Add Task</span>
                </Button>
              </div>

              {/* Items List for Day */}
              <div className="space-y-2">
                <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Recorded on this Day
                </h5>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedDayDetails.data?.items?.map((it, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        onSelectDate(selectedDayDetails.dateStr);
                        setSelectedDayDetails(null);
                      }}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs hover:border-primary cursor-pointer transition-colors"
                    >
                      <span className="truncate font-medium">{it.title}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    </div>
                  ))}

                  {(!selectedDayDetails.data?.items || selectedDayDetails.data.items.length === 0) && (
                    <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                      No notes created on this date yet. Tap any button above to create one.
                    </p>
                  )}
                </div>
              </div>

              {/* View Full Timeline Button */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  onSelectDate(selectedDayDetails.dateStr);
                  setSelectedDayDetails(null);
                }}
                className="w-full text-xs rounded-xl h-8 font-semibold"
              >
                View Full Notes & Timeline for Day
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* FLOATING CONTEXT MENU (Desktop Right-Click & Mobile Long-Press) */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 animate-in fade-in-0 zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {formatDate(contextMenu.dateStr)}
            </p>
            <span className="text-[9px] text-primary font-mono font-bold">Actions</span>
          </div>

          <button
            type="button"
            onClick={() => {
              onCreateNoteOnDate?.(contextMenu.dateStr, "note");
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-primary/10 hover:text-primary rounded-xl transition-colors font-medium text-left"
          >
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span>Create Note</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onCreateNoteOnDate?.(contextMenu.dateStr, "journal");
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-600 rounded-xl transition-colors font-medium text-left"
          >
            <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
            <span>Create Journal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onCreateNoteOnDate?.(contextMenu.dateStr, "reminder");
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-amber-500/10 hover:text-amber-600 rounded-xl transition-colors font-medium text-left"
          >
            <Bell className="h-3.5 w-3.5 text-amber-500" />
            <span>Create Reminder</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onCreateNoteOnDate?.(contextMenu.dateStr, "task");
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-blue-500/10 hover:text-blue-600 rounded-xl transition-colors font-medium text-left"
          >
            <CheckSquare className="h-3.5 w-3.5 text-blue-500" />
            <span>Create Task</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handlePasteNote(contextMenu.dateStr);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium text-left"
          >
            <Clipboard className="h-3.5 w-3.5 text-purple-500" />
            <span>Paste Note</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onDuplicateDay?.(contextMenu.dateStr);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium text-left"
          >
            <Copy className="h-3.5 w-3.5 text-cyan-500" />
            <span>Duplicate Previous Day</span>
          </button>

          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

          <button
            type="button"
            onClick={() => {
              onSelectDate(contextMenu.dateStr);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium text-left"
          >
            <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
            <span>View Notes</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenTimeline?.(contextMenu.dateStr);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium text-left"
          >
            <Clock className="h-3.5 w-3.5 text-indigo-500" />
            <span>Open Day Timeline</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onDeleteDayNotes?.(contextMenu.dateStr);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors font-medium text-left"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
            <span>Delete Day Notes</span>
          </button>
        </div>
      )}
    </Card>
  );
}
