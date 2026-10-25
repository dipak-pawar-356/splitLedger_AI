"use client";

import React from "react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
  Clock,
  Receipt,
  CreditCard
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
      <Scale className="h-4 w-4 text-indigo-400" />
    ) : splitMethod === "percentage" ? (
      <PieChart className="h-4 w-4 text-indigo-400" />
    ) : splitMethod === "shares" ? (
      <Layers className="h-4 w-4 text-indigo-400" />
    ) : (
      <Calculator className="h-4 w-4 text-indigo-400" />
    );

  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "Live";

  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-4 sm:p-5 space-y-4 shadow-xl backdrop-blur-md">
      {/* Top Status & Health Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800/70">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
            {methodIcon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-100">
                {methodLabel}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold uppercase tracking-wider py-0 px-2 rounded-md ${
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

        <div className="flex items-center gap-3 self-start sm:self-auto text-[11px] text-slate-400 font-mono flex-wrap">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/60 border border-slate-800">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Health: <strong className="text-slate-200">{isValid ? "Optimal" : "Attention"}</strong></span>
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/60 border border-slate-800">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Synced: {formattedTime}</span>
          </span>
        </div>
      </div>

      {/* 6 Metric Cards Grid - 2 cols on mobile, 3 cols on tablet/laptop/desktop modal */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
        {/* Metric 1: Total Expense */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between gap-1 text-slate-400">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider leading-tight">
              Total Expense
            </span>
            <Receipt className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          </div>
          <div className="text-sm sm:text-base font-black text-slate-100 font-mono tracking-tight">
            {formatCurrency(totalExpenseRupees)}
          </div>
        </div>

        {/* Metric 2: Participants */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between gap-1 text-slate-400">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider leading-tight">
              Participants
            </span>
            <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          </div>
          <div className="text-sm sm:text-base font-black text-slate-100 font-mono tracking-tight">
            {participantsCount} {participantsCount === 1 ? "Member" : "Members"}
          </div>
        </div>

        {/* Metric 3: Already Paid */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between gap-1 text-slate-400">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider leading-tight">
              Already Paid
            </span>
            <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
          <div className="text-sm sm:text-base font-black text-slate-100 font-mono tracking-tight">
            {formatCurrency(totalAlreadyPaidRupees)}
          </div>
        </div>

        {/* Metric 4: Calculated Payable */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between gap-1 text-slate-400">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider leading-tight">
              Calculated Payable
            </span>
            <Calculator className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          </div>
          <div className="text-sm sm:text-base font-black text-indigo-300 font-mono tracking-tight">
            {formatCurrency(totalCalculatedPayableRupees)}
          </div>
        </div>

        {/* Metric 5: Remaining Allocation / Share */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between gap-1 text-slate-400">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider leading-tight">
              {remainingAllocationLabel}
            </span>
            <PieChart className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          </div>
          <div className={`text-sm sm:text-base font-black font-mono tracking-tight ${
            isValid ? "text-emerald-400" : "text-rose-400"
          }`}>
            {remainingAllocationValue}
          </div>
        </div>

        {/* Metric 6: Pending Settlement */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between gap-1 text-slate-400">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider leading-tight">
              Pending Settlement
            </span>
            <Wallet className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </div>
          <div className="text-sm sm:text-base font-black text-amber-400 font-mono tracking-tight">
            {formatCurrency(pendingSettlementRupees)}
          </div>
        </div>
      </div>

      {/* Validation Warning Alert if needed */}
      {validationError && (
        <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium animate-in fade-in-50">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}
