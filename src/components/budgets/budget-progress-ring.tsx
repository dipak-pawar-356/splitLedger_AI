"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BudgetProgressRingProps {
  percentage: number;
  spent: number;
  total: number;
  currency?: string;
  status?: string;
  size?: number;
  strokeWidth?: number;
}

export function BudgetProgressRing({
  percentage,
  spent,
  total,
  currency = "INR",
  status = "active",
  size = 160,
  strokeWidth = 12,
}: BudgetProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePercent = Number(percentage) || 0;
  const clampedPercent = Math.min(100, Math.max(0, safePercent));
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;
  const remaining = Math.max(0, total - spent);

  // Color selection based on financial state
  const ringColors = useMemo(() => {
    if (status === "overspent" || safePercent > 100) {
      return {
        start: "#ef4444",
        end: "#dc2626",
        glow: "rgba(239, 68, 68, 0.4)",
        textClass: "text-rose-600 dark:text-rose-400",
        badge: "Overspent",
        badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/30",
      };
    }
    if (status === "near_limit" || percentage >= 85) {
      return {
        start: "#f97316",
        end: "#ea580c",
        glow: "rgba(249, 115, 22, 0.4)",
        textClass: "text-orange-600 dark:text-orange-400",
        badge: "Near Limit",
        badgeClass: "bg-orange-500/10 text-orange-600 border-orange-500/30",
      };
    }
    if (status === "warning" || percentage >= 70) {
      return {
        start: "#fbbf24",
        end: "#d97706",
        glow: "rgba(245, 158, 11, 0.4)",
        textClass: "text-amber-600 dark:text-amber-400",
        badge: "Warning Pace",
        badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/30",
      };
    }
    if (status === "completed") {
      return {
        start: "#22c55e",
        end: "#16a34a",
        glow: "rgba(34, 197, 94, 0.4)",
        textClass: "text-emerald-600 dark:text-emerald-400",
        badge: "Goal Achieved",
        badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
      };
    }
    return {
      start: "#3b82f6",
      end: "#4f46e5",
      glow: "rgba(59, 130, 246, 0.4)",
      textClass: "text-indigo-600 dark:text-indigo-400",
      badge: "Healthy Velocity",
      badgeClass: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
    };
  }, [safePercent, status, percentage]);

  const gradientId = `budget-ring-grad-${safePercent}-${size}`;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center justify-center relative select-none cursor-pointer group">
            <div
              className="relative transition-transform duration-200 group-hover:scale-[1.03]"
              style={{ width: size, height: size }}
            >
              <svg
                width={size}
                height={size}
                className="transform -rotate-90 transition-all duration-300"
                style={{ filter: `drop-shadow(0 0 14px ${ringColors.glow})` }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={ringColors.start} />
                    <stop offset="100%" stopColor={ringColors.end} />
                  </linearGradient>
                </defs>

                {/* Background Track */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  className="text-slate-100 dark:text-slate-800/80"
                  fill="transparent"
                />

                {/* Animated Progress Arc */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={`url(#${gradientId})`}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Center Text Container */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Utilized
                </span>
                <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${ringColors.textClass}`}>
                  <AnimatedCounter value={percentage} suffix="%" duration={0.5} />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[120px]">
                  {formatCurrency(spent, currency)} spent
                </span>
              </div>
            </div>

            {/* Status Pill below ring */}
            <div className="mt-2 text-center">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border transition-transform duration-180 group-hover:scale-105 ${ringColors.badgeClass}`}>
                {ringColors.badge}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-3 rounded-2xl max-w-xs shadow-2xl bg-slate-900 text-slate-100 border border-slate-800 text-xs space-y-1.5">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
            <strong className="text-primary font-bold">Budget Utilization Barometer</strong>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ringColors.badgeClass}`}>
              {ringColors.badge}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 font-mono">
            <div>
              <span className="text-slate-400 block text-[9px] font-sans">Spent / Cap</span>
              <span>{formatCurrency(spent, currency)} / {formatCurrency(total, currency)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] font-sans">Remaining Buffer</span>
              <span className="text-emerald-400 font-bold">{formatCurrency(remaining, currency)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] font-sans">Utilization Rate</span>
              <span>{safePercent}%</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] font-sans">Available Buffer</span>
              <span className="text-teal-400">{Math.max(0, 100 - safePercent)}%</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

