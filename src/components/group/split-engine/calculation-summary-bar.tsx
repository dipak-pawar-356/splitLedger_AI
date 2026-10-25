"use client";

import React from "react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { 
  Calculator, 
  Scale, 
  PieChart, 
  Layers, 
  Users, 
  Wallet, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Clock 
} from "lucide-react";

export interface CalculationSummaryBarProps {
  totalExpenseRupees: number;
  participantsCount: number;
  totalAlreadyPaidRupees: number;
  totalCalculatedPayableRupees: number;
  remainingAllocationValue: string | number;
  remainingAllocationLabel: string;
  pendingSettlementRupees: number;
  splitMethod: "equal" | "exact" | "percentage" | "shares";
  isValid: boolean;
  validationError?: string | null;
  lastUpdated?: string | Date;
}

export function CalculationSummaryBar({
  totalExpenseRupees,
  participantsCount,
  totalAlreadyPaidRupees,
  totalCalculatedPayableRupees,
  remainingAllocationValue,
  remainingAllocationLabel,
  pendingSettlementRupees,
  splitMethod,
  isValid,
  validationError,
  lastUpdated,
}: CalculationSummaryBarProps) {
  const methodLabel =
    splitMethod === "exact"
      ? "Exact Amount Engine"
      : splitMethod === "percentage"
      ? "Percentage Split Engine"
      : splitMethod === "shares"
      ? "Shares Ratio Engine"
      : "Equal Split (1/N)";

  const methodIcon =
    splitMethod === "exact" ? (
      <Scale className="h-3.5 w-3.5 text-indigo-400" />
    ) : splitMethod === "percentage" ? (
      <PieChart className="h-3.5 w-3.5 text-indigo-400" />
    ) : splitMethod === "shares" ? (
      <Layers className="h-3.5 w-3.5 text-indigo-400" />
    ) : (
      <Calculator className="h-3.5 w-3.5 text-indigo-400" />
    );

  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "Live";

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 sm:p-5 space-y-4 shadow-xl backdrop-blur-md">
      {/* Top Status & Health Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/70">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
            {methodIcon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                {methodLabel}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isValid
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                }`}
              >
                {isValid ? "100% Balanced" : "Rebalance Required"}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Enterprise financial ledger • Indian Rupee (₹ INR) precision
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Health: <strong className="text-slate-200">{isValid ? "Optimal" : "Attention"}</strong></span>
          </span>
          <span className="text-slate-700">•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Synced: {formattedTime}</span>
          </span>
        </div>
      </div>

      {/* 6-Column Enterprise Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Metric 1: Total Expense */}
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block truncate">
            Total Expense
          </span>
          <div className="text-sm sm:text-base font-black text-slate-100 font-mono">
            {formatCurrency(totalExpenseRupees)}
          </div>
        </div>

        {/* Metric 2: Participants */}
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block truncate">
            Participants
          </span>
          <div className="text-sm sm:text-base font-black text-slate-100 font-mono flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>{participantsCount} Members</span>
          </div>
        </div>

        {/* Metric 3: Already Paid */}
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block truncate">
            Already Paid
          </span>
          <div className="text-sm sm:text-base font-black text-slate-100 font-mono">
            {formatCurrency(totalAlreadyPaidRupees)}
          </div>
        </div>

        {/* Metric 4: Calculated Payable */}
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block truncate">
            Calculated Payable
          </span>
          <div className="text-sm sm:text-base font-black text-indigo-300 font-mono">
            {formatCurrency(totalCalculatedPayableRupees)}
          </div>
        </div>

        {/* Metric 5: Remaining Allocation */}
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block truncate">
            {remainingAllocationLabel}
          </span>
          <div className={`text-sm sm:text-base font-black font-mono ${
            isValid ? "text-emerald-400" : "text-rose-400"
          }`}>
            {remainingAllocationValue}
          </div>
        </div>

        {/* Metric 6: Pending Settlement */}
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block truncate">
            Pending Settlement
          </span>
          <div className="text-sm sm:text-base font-black text-amber-400 font-mono flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span>{formatCurrency(pendingSettlementRupees)}</span>
          </div>
        </div>
      </div>

      {/* Validation Warning Alert if needed */}
      {validationError && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium animate-in fade-in-50">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}
