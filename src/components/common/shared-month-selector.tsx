"use client";

import { useMemo, useState } from "react";
import { MonthInfo, parseMonthParam } from "@/lib/month-sync";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  RotateCcw,
  Sparkles,
  Check,
} from "lucide-react";

interface SharedMonthSelectorProps {
  monthInfo: MonthInfo;
  onSelectMonth: (monthStr: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
  className?: string;
  compact?: boolean;
}

export function SharedMonthSelector({
  monthInfo,
  onSelectMonth,
  onPrevMonth,
  onNextMonth,
  onCurrentMonth,
  className = "",
  compact = false,
}: SharedMonthSelectorProps) {
  const currentMonthStr = useMemo(() => parseMonthParam().monthStr, []);

  // Quick 12-month selector list around selected year
  const quickMonths = useMemo(() => {
    const list: Array<{ str: string; label: string; isCurrent: boolean }> = [];
    const baseYear = monthInfo.year;
    // Current year months
    for (let m = 1; m <= 12; m++) {
      const str = `${baseYear}-${String(m).padStart(2, "0")}`;
      const info = parseMonthParam(str);
      list.push({
        str,
        label: info.label,
        isCurrent: str === currentMonthStr,
      });
    }
    return list;
  }, [monthInfo.year, currentMonthStr]);

  return (
    <div
      className={`inline-flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-md shadow-xs ${className}`}
      role="region"
      aria-label="Financial Month Selector"
    >
      {/* Prev Month Button */}
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={onPrevMonth}
        className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
        aria-label={`Go to previous month, ${monthInfo.prevMonthStr}`}
        title={`Previous: ${monthInfo.prevMonthStr}`}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Month Dropdown / Picker */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-800/80 text-xs font-bold text-slate-100 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group cursor-pointer"
            aria-label={`Selected month: ${monthInfo.label}. Click to switch month`}
          >
            <Calendar className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform" />
            <span className="font-mono tracking-tight text-xs sm:text-sm">
              {compact ? monthInfo.shortLabel : monthInfo.label}
            </span>

            {/* Pacing Badge */}
            {monthInfo.isCurrentMonth ? (
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-bold px-1.5 py-0 hidden xs:inline-flex items-center gap-1"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live</span>
              </Badge>
            ) : monthInfo.isPastMonth ? (
              <Badge
                variant="outline"
                className="bg-slate-800 text-slate-400 border-slate-700 text-[10px] font-medium px-1.5 py-0 hidden xs:inline-flex"
              >
                Closed
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 text-[10px] font-medium px-1.5 py-0 hidden xs:inline-flex"
              >
                Upcoming
              </Badge>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="center"
          className="w-56 p-2 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-xl text-xs z-50"
        >
          <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
            <span>Select Financial Month</span>
            <span className="font-mono text-primary">{monthInfo.year}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-slate-800 my-1" />

          {/* Year Switcher quick row */}
          <div className="flex items-center justify-between px-2 py-1 mb-1 bg-slate-900/50 rounded-lg text-slate-300">
            <button
              type="button"
              onClick={() => onSelectMonth(`${monthInfo.year - 1}-${String(monthInfo.month).padStart(2, "0")}`)}
              className="text-[11px] font-bold hover:text-primary px-1"
            >
              ← {monthInfo.year - 1}
            </button>
            <span className="font-bold text-slate-100">{monthInfo.year}</span>
            <button
              type="button"
              onClick={() => onSelectMonth(`${monthInfo.year + 1}-${String(monthInfo.month).padStart(2, "0")}`)}
              className="text-[11px] font-bold hover:text-primary px-1"
            >
              {monthInfo.year + 1} →
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-0.5 scrollbar-thin">
            {quickMonths.map((item) => {
              const isSelected = item.str === monthInfo.monthStr;
              return (
                <DropdownMenuItem
                  key={item.str}
                  onClick={() => onSelectMonth(item.str)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer font-medium text-xs transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold"
                      : "text-slate-300 hover:bg-slate-900 hover:text-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {item.label}
                    {item.isCurrent && (
                      <span className="text-[9px] px-1 rounded-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Current
                      </span>
                    )}
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </DropdownMenuItem>
              );
            })}
          </div>

          {!monthInfo.isCurrentMonth && (
            <>
              <DropdownMenuSeparator className="bg-slate-800 my-1" />
              <DropdownMenuItem
                onClick={onCurrentMonth}
                className="text-xs text-primary font-bold hover:bg-primary/10 rounded-xl px-2.5 py-1.5 cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Jump to Current Month</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Next Month Button */}
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={onNextMonth}
        className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
        aria-label={`Go to next month, ${monthInfo.nextMonthStr}`}
        title={`Next: ${monthInfo.nextMonthStr}`}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Quick Jump to Today if not on current month */}
      {!monthInfo.isCurrentMonth && (
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={onCurrentMonth}
          className="h-7 px-2 text-[10px] font-bold rounded-xl text-primary border-primary/30 hover:bg-primary/10 ml-0.5"
          title="Reset to current month"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          <span>Current</span>
        </Button>
      )}
    </div>
  );
}

