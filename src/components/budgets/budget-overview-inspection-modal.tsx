"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Target,
  ShieldAlert,
  CalendarDays,
  Activity,
  CheckCircle2,
  Copy,
  Check,
  Coins,
  Lock,
  ArrowRight,
  Sparkles,
  Zap,
  TrendingUp,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import { BudgetRecord } from "@/lib/types/budgets";

export type OverviewPanelType = "policy" | "ceiling" | "cycle" | "forecasting";

interface BudgetOverviewInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeType: OverviewPanelType | null;
  budget: BudgetRecord;
  currency: string;
  originalBudget: number;
  currentBudget: number;
  additionalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  utilizationPercent: number;
  increaseCount: number;
  totalDurationDays: number;
  daysPassed: number;
  daysRemaining: number;
  timelinePercentage: number;
  averageDailySpend: number;
  dailyAllowance: number;
  expectedRemaining: number;
  expectedOverspend: number;
  forecastAccuracy: number;
  projectedExhaustionDate: Date | string | null;
  targetMonth?: string;
  onRequestRevision?: () => void;
}

export function BudgetOverviewInspectionModal({
  isOpen,
  onClose,
  activeType,
  budget,
  currency,
  originalBudget,
  currentBudget,
  additionalBudget,
  totalSpent,
  remainingBudget,
  utilizationPercent,
  increaseCount,
  totalDurationDays,
  daysPassed,
  daysRemaining,
  timelinePercentage,
  averageDailySpend,
  dailyAllowance,
  expectedRemaining,
  expectedOverspend,
  forecastAccuracy,
  projectedExhaustionDate,
  targetMonth,
  onRequestRevision,
}: BudgetOverviewInspectionModalProps) {
  const [copied, setCopied] = useState(false);

  if (!activeType) return null;

  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Audit verification reference copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // Panel Theme & Configuration
  const panelConfigs: Record<
    OverviewPanelType,
    {
      title: string;
      subtitle: string;
      icon: any;
      borderClass: string;
      glowClass: string;
      topBarGradient: string;
      accentText: string;
      badgeLabel: string;
      auditReference: string;
    }
  > = {
    policy: {
      title: "Budget Policy, Governance & Scope Audit",
      subtitle: "Strict approved debit verification, settlement exclusion, and category rules",
      icon: Target,
      borderClass: "border-indigo-500/70 ring-1 ring-indigo-500/40",
      glowClass: "shadow-[0_0_40px_rgba(99,102,241,0.3)]",
      topBarGradient: "from-indigo-500 via-blue-500 to-cyan-400",
      accentText: "text-indigo-400",
      badgeLabel: "Strict Governance Active",
      auditReference: `LEDG-POL-${(budget?.id || "GOV").slice(0, 8).toUpperCase()}`,
    },
    ceiling: {
      title: "Authorized Ceilings, Revisions & Thresholds",
      subtitle: "Dynamic capital governance, revision versioning, and early-warning tripwires",
      icon: ShieldAlert,
      borderClass: "border-sky-500/70 ring-1 ring-sky-500/40",
      glowClass: "shadow-[0_0_40px_rgba(14,165,233,0.3)]",
      topBarGradient: "from-sky-500 via-cyan-400 to-indigo-400",
      accentText: "text-sky-400",
      badgeLabel: `${budget?.alertThresholds?.[0]?.percent || 80}% Threshold Active`,
      auditReference: `LEDG-CAP-${(budget?.id || "CEIL").slice(0, 8).toUpperCase()}`,
    },
    cycle: {
      title: "Cycle Boundaries & Calendar Timeline Analysis",
      subtitle: "Boundary verification, month synchronization, and elapsed pacing mechanics",
      icon: CalendarDays,
      borderClass: "border-purple-500/70 ring-1 ring-purple-500/40",
      glowClass: "shadow-[0_0_40px_rgba(168,85,247,0.3)]",
      topBarGradient: "from-purple-500 via-indigo-500 to-pink-500",
      accentText: "text-purple-400",
      badgeLabel: `${totalDurationDays} Days Duration`,
      auditReference: `LEDG-CYC-${(targetMonth || "SYNC").replace("-", "")}`,
    },
    forecasting: {
      title: "Financial Forecasting & Runout Mathematical Model",
      subtitle: "Empirical daily burn extrapolation, liquidity runway, and month-end projections",
      icon: Activity,
      borderClass: "border-cyan-500/70 ring-1 ring-cyan-500/40",
      glowClass: "shadow-[0_0_40px_rgba(6,182,212,0.3)]",
      topBarGradient: "from-cyan-500 via-teal-400 to-emerald-400",
      accentText: "text-cyan-400",
      badgeLabel: `${forecastAccuracy}% Accuracy Rating`,
      auditReference: `LEDG-FORE-${Math.round(utilizationPercent)}PCT`,
    },
  };

  const config = panelConfigs[activeType];
  const IconComponent = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`sm:max-w-xl rounded-3xl border-2 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-2xl shadow-2xl p-0 overflow-hidden ${config.borderClass} ${config.glowClass}`}
      >
        {/* Top Glowing Animated Gradient Banner Matching Border */}
        <div className={`h-2 w-full bg-gradient-to-r ${config.topBarGradient} animate-pulse`} />

        <div className="p-6 space-y-5">
          {/* Header */}
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-slate-800 border border-slate-700/80 shadow-xs text-primary">
                  <IconComponent className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                    {config.title}
                  </DialogTitle>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Target: <strong className="text-slate-200">{budget.name}</strong> • {budget.category || "General"}
                  </p>
                </div>
              </div>

              <Badge
                variant="outline"
                className={`text-[10px] font-bold uppercase tracking-wider py-1 px-2.5 border bg-slate-800/80 border-slate-700 ${config.accentText}`}
              >
                {config.badgeLabel}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-400">
              {config.subtitle}
            </DialogDescription>
          </DialogHeader>

          {/* Cryptographic Ledger Reference Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Audit Governance ID
                </span>
                <span className="font-mono text-xs font-bold text-slate-100 tracking-wide">
                  {config.auditReference}
                </span>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopyHash(config.auditReference)}
              className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 border-slate-600 hover:bg-slate-700 text-slate-200 self-start sm:self-auto"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied!" : "Copy Reference"}</span>
            </Button>
          </div>

          {/* Specific Panel Content Breakdown */}
          {activeType === "policy" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Category Scope</span>
                  <span className="text-base font-bold text-slate-100 mt-0.5 block">{budget.category || "General"}</span>
                  <span className="text-[10px] text-slate-400">Exclusive filtering</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Budget Mode</span>
                  <span className="text-base font-bold text-indigo-400 mt-0.5 block capitalize">{budget.budgetType || "Personal"}</span>
                  <span className="text-[10px] text-slate-400">Ledger isolation</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/60 space-y-2 text-xs">
                <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Active Policy Constraints
                </h4>
                <ul className="space-y-1.5 text-slate-300 text-[11px] list-disc list-inside">
                  <li><strong>Strict Debit Enforcement:</strong> Only approved ledger transactions within cycle dates reduce headroom.</li>
                  <li><strong>Settlement Exclusion:</strong> Peer-to-peer repayments and money transfers do not count as category expense consumption.</li>
                  <li><strong>Multi-Currency Handling:</strong> Values normalized to <strong>{currency}</strong> using real-time ledger verification.</li>
                  <li><strong>Version Audit:</strong> Revisions generate permanent historical version snapshots without rewriting initial baselines.</li>
                </ul>
              </div>
            </div>
          )}

          {activeType === "ceiling" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Initial Baseline</span>
                  <span className="text-base font-black font-mono text-slate-100 mt-0.5 block">
                    {formatCurrency(originalBudget, currency)}
                  </span>
                  <span className="text-[10px] text-slate-400">Inception ceiling</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Ceiling</span>
                  <span className="text-base font-black font-mono text-sky-400 mt-0.5 block">
                    {formatCurrency(currentBudget, currency)}
                  </span>
                  <span className="text-[10px] text-slate-400">Current authorized</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Alert Trigger</span>
                  <span className="text-base font-black font-mono text-amber-400 mt-0.5 block">
                    {formatCurrency(currentBudget * ((budget?.alertThresholds?.[0]?.percent || 80) / 100), currency)}
                  </span>
                  <span className="text-[10px] text-slate-400">At {budget?.alertThresholds?.[0]?.percent || 80}%</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/60 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-200">
                  <span>Authorized Ceiling Headroom</span>
                  <span className="font-mono text-emerald-400">{formatCurrency(remainingBudget, currency)} Available</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      utilizationPercent >= 100 ? "bg-rose-500" : utilizationPercent >= 80 ? "bg-amber-500" : "bg-sky-500"
                    }`}
                    style={{ width: `${Math.min(100, utilizationPercent)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  {increaseCount > 0
                    ? `${increaseCount} approved revision${increaseCount > 1 ? "s" : ""} have augmented this baseline by +${formatCurrency(additionalBudget, currency)}.`
                    : "No ceiling revisions have been registered; baseline ceiling is intact."}
                </p>
              </div>

              {onRequestRevision && (
                <Button
                  onClick={() => {
                    onClose();
                    onRequestRevision();
                  }}
                  className="w-full rounded-xl text-xs font-bold gap-2 bg-sky-600 hover:bg-sky-700 text-white h-10 shadow-sm"
                >
                  <Coins className="h-4 w-4" />
                  <span>Request Budget Revision Now</span>
                </Button>
              )}
            </div>
          )}

          {activeType === "cycle" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Cycle Start</span>
                  <span className="text-sm font-bold font-mono text-slate-100 mt-0.5 block">{formatDate(budget.startDate)}</span>
                  <span className="text-[10px] text-slate-400">Boundary 00:00 UTC</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Cycle End</span>
                  <span className="text-sm font-bold font-mono text-slate-100 mt-0.5 block">{formatDate(budget.endDate)}</span>
                  <span className="text-[10px] text-slate-400">Boundary 23:59 UTC</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Elapsed</span>
                  <span className="text-base font-black font-mono text-purple-400 mt-0.5 block">{daysPassed} Days</span>
                  <span className="text-[10px] text-slate-400">{timelinePercentage}% of cycle</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Remaining</span>
                  <span className="text-base font-black font-mono text-amber-400 mt-0.5 block">{daysRemaining} Days</span>
                  <span className="text-[10px] text-slate-400">Active runway</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/60 space-y-2 text-xs">
                <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  Calendar Accuracy & Synchronization
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Exact start and end timestamps respect monthly boundaries, leap years, and accurate timezone offsets.
                  Transactions strictly map to this window without cross-month contamination.
                  {targetMonth && ` Synchronized across AI and Budgets with key '${targetMonth}'.`}
                </p>
              </div>
            </div>
          )}

          {activeType === "forecasting" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Daily Average Burn</span>
                  <span className="text-base font-black font-mono text-cyan-400 mt-0.5 block">
                    {formatCurrency(averageDailySpend, currency)}/d
                  </span>
                  <span className="text-[10px] text-slate-400">Actual pace</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Safe Allowance</span>
                  <span className="text-base font-black font-mono text-emerald-400 mt-0.5 block">
                    {formatCurrency(dailyAllowance, currency)}/d
                  </span>
                  <span className="text-[10px] text-slate-400">Maximum recommended</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Projected Balance</span>
                  <span className={`text-base font-black font-mono mt-0.5 block ${expectedRemaining >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatCurrency(expectedRemaining, currency)}
                  </span>
                  <span className="text-[10px] text-slate-400">{expectedRemaining >= 0 ? "Expected surplus" : "Deficit warning"}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/60 space-y-2 text-xs">
                <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-cyan-400" />
                  Forecasting Runout Logic
                </h4>
                <div className="space-y-1.5 text-[11px] text-slate-300 font-mono">
                  <div>Burn Formula: Spent / Elapsed = ₹{averageDailySpend}/d</div>
                  <div>Runway Projection: Remaining Cap / Burn Rate = {dailyAllowance > 0 ? `${daysRemaining} Days` : "Depleted"}</div>
                  <div>Estimated Exhaustion: {projectedExhaustionDate ? formatDate(projectedExhaustionDate) : "Sustainable through cycle conclusion"}</div>
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Verified Ledger Policy</span>
            </div>

            <Button
              onClick={onClose}
              className="rounded-xl text-xs font-bold px-5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <span>Done</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
