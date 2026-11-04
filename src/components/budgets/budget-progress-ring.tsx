"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";

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
  const clampedPercent = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  // Color selection based on financial state
  const ringColors = useMemo(() => {
    if (status === "overspent" || percentage > 100) {
      return {
        start: "#ef4444",
        end: "#dc2626",
        glow: "rgba(239, 68, 68, 0.35)",
        textClass: "text-rose-600 dark:text-rose-400",
        badge: "Overspent",
        badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/30",
      };
    }
    if (status === "near_limit" || percentage >= 85) {
      return {
        start: "#f97316",
        end: "#ea580c",
        glow: "rgba(249, 115, 22, 0.35)",
        textClass: "text-orange-600 dark:text-orange-400",
        badge: "Near Limit",
        badgeClass: "bg-orange-500/10 text-orange-600 border-orange-500/30",
      };
    }
    if (status === "warning" || percentage >= 70) {
      return {
        start: "#fbbf24",
        end: "#d97706",
        glow: "rgba(245, 158, 11, 0.35)",
        textClass: "text-amber-600 dark:text-amber-400",
        badge: "Warning Pace",
        badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/30",
      };
    }
    if (status === "completed") {
      return {
        start: "#22c55e",
        end: "#16a34a",
        glow: "rgba(34, 197, 94, 0.35)",
        textClass: "text-green-600 dark:text-green-400",
        badge: "Goal Achieved",
        badgeClass: "bg-green-500/10 text-green-600 border-green-500/30",
      };
    }
    return {
      start: "#3b82f6",
      end: "#4f46e5",
      glow: "rgba(59, 130, 246, 0.35)",
      textClass: "text-indigo-600 dark:text-indigo-400",
      badge: "Healthy Velocity",
      badgeClass: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
    };
  }, [percentage, status]);

  const gradientId = `budget-ring-grad-${percentage}-${size}`;

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 transition-transform duration-500"
          style={{ filter: `drop-shadow(0 0 12px ${ringColors.glow})` }}
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
            <AnimatedCounter value={percentage} suffix="%" />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[120px]">
            {formatCurrency(spent, currency)} spent
          </span>
        </div>
      </div>

      {/* Status Pill below ring */}
      <div className="mt-2 text-center">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${ringColors.badgeClass}`}>
          {ringColors.badge}
        </span>
      </div>
    </div>
  );
}

