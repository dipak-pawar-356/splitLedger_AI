"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ChevronDown, Check, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PERIOD_OPTIONS = [
  { value: "current_month", label: "Current Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_week", label: "This Week" },
  { value: "today", label: "Today" },
  { value: "year", label: "This Year" },
  { value: "all_time", label: "All Time" },
  { value: "custom", label: "Custom Range..." },
] as const;

export function DashboardDateFilter({ activePeriod = "current_month" }: { activePeriod?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentPeriod = searchParams.get("period") || activePeriod;
  const currentStart = searchParams.get("startDate") || "";
  const currentEnd = searchParams.get("endDate") || "";

  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState(currentStart);
  const [customEnd, setCustomEnd] = useState(currentEnd);

  const setFilter = (period: string, start?: string, end?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    if (period === "custom" && start && end) {
      params.set("startDate", start);
      params.set("endDate", end);
    } else {
      params.delete("startDate");
      params.delete("endDate");
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const activeLabel = PERIOD_OPTIONS.find((p) => p.value === currentPeriod)?.label || "Current Month";

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) return;
    setFilter("custom", customStart, customEnd);
    setIsCustomOpen(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Filter className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Period Filter:
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {currentPeriod === "custom" && currentStart && currentEnd
              ? `${customStart} → ${customEnd}`
              : activeLabel}
          </span>
        </div>

        {/* Quick Pills for Common Windows */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {PERIOD_OPTIONS.slice(0, 4).map((option) => {
            const isActive = currentPeriod === option.value;
            return (
              <Button
                key={option.value}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                disabled={isPending}
                onClick={() => setFilter(option.value)}
                className={`text-xs rounded-xl h-8 px-3 transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {option.label}
              </Button>
            );
          })}

          {/* Dropdown for More Options (Year, All Time, Custom) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={
                  currentPeriod === "year" || currentPeriod === "all_time" || currentPeriod === "custom"
                    ? "default"
                    : "outline"
                }
                size="sm"
                disabled={isPending}
                className="text-xs rounded-xl h-8 px-3 gap-1.5 font-semibold"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {currentPeriod === "year" || currentPeriod === "all_time" || currentPeriod === "custom"
                    ? activeLabel
                    : "More"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl">
              <DropdownMenuItem
                onClick={() => setFilter("year")}
                className="text-xs font-medium cursor-pointer flex justify-between"
              >
                <span>This Year</span>
                {currentPeriod === "year" && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFilter("all_time")}
                className="text-xs font-medium cursor-pointer flex justify-between"
              >
                <span>All Time</span>
                {currentPeriod === "all_time" && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsCustomOpen(true)}
                className="text-xs font-medium cursor-pointer flex justify-between text-primary"
              >
                <span>Custom Range...</span>
                {currentPeriod === "custom" && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Custom Date Range Dialog */}
      <Dialog open={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>Select Custom Date Window</span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Start Date</Label>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">End Date</Label>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCustomOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!customStart || !customEnd}
              onClick={handleApplyCustom}
              className="rounded-xl text-xs font-bold"
            >
              Apply Filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
