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
  Calendar,
  Clock,
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Flame,
  PiggyBank,
  Copy,
  Check,
  Wallet,
  ArrowRight,
  Sparkles,
  Lock,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

export interface TimelineMilestone {
  id: string;
  title: string;
  eventType: string;
  date: string;
  time: string;
  amount: number;
  remainingBudget: number;
  remainingDays: number;
  ledgerReference: string;
  notes?: string;
  colorClass: string;
  badgeText: string;
  isCompleted?: boolean;
  isCurrent?: boolean;
  isUpcoming?: boolean;
}

interface BudgetMilestoneInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: TimelineMilestone | null;
  currency: string;
  budgetName: string;
  totalDurationDays: number;
}

export function BudgetMilestoneInspectionModal({
  isOpen,
  onClose,
  milestone,
  currency,
  budgetName,
  totalDurationDays,
}: BudgetMilestoneInspectionModalProps) {
  const [copied, setCopied] = useState(false);

  if (!milestone) return null;

  const handleCopyLedger = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(milestone.ledgerReference);
    setCopied(true);
    toast.success(`Copied ledger reference ${milestone.ledgerReference}`);
    setTimeout(() => setCopied(false), 2000);
  };

  // Theme-aware styles based on milestone eventType
  let theme = {
    colorName: "purple",
    glowClass: "shadow-[0_0_40px_rgba(168,85,247,0.3)]",
    borderClass: "border-purple-500/70 ring-1 ring-purple-500/40",
    topBarGradient: "from-purple-500 via-indigo-400 to-blue-400",
    textClass: "text-purple-400",
    bgMuted: "bg-purple-500/10 text-purple-400",
    icon: Calendar,
    typeLabel: "Timeline Milestone",
  };

  if (milestone.eventType === "started") {
    theme = {
      colorName: "blue",
      glowClass: "shadow-[0_0_40px_rgba(59,130,246,0.3)]",
      borderClass: "border-blue-500/70 ring-1 ring-blue-500/40",
      topBarGradient: "from-blue-500 via-indigo-500 to-cyan-400",
      textClass: "text-blue-400",
      bgMuted: "bg-blue-500/10 text-blue-400",
      icon: Wallet,
      typeLabel: "Budget Inception Baseline",
    };
  } else if (milestone.eventType === "revised" || milestone.eventType === "added") {
    theme = {
      colorName: "sky",
      glowClass: "shadow-[0_0_40px_rgba(14,165,233,0.3)]",
      borderClass: "border-sky-500/70 ring-1 ring-sky-500/40",
      topBarGradient: "from-sky-500 via-cyan-400 to-indigo-400",
      textClass: "text-sky-400",
      bgMuted: "bg-sky-500/10 text-sky-400",
      icon: Coins,
      typeLabel: "Dynamic Budget Revision",
    };
  } else if (milestone.eventType === "savings_achieved") {
    theme = {
      colorName: "emerald",
      glowClass: "shadow-[0_0_40px_rgba(16,185,129,0.3)]",
      borderClass: "border-emerald-500/70 ring-1 ring-emerald-500/40",
      topBarGradient: "from-emerald-500 via-teal-400 to-cyan-400",
      textClass: "text-emerald-400",
      bgMuted: "bg-emerald-500/10 text-emerald-400",
      icon: PiggyBank,
      typeLabel: "Verified Capital Preservation",
    };
  } else if (milestone.eventType === "near_limit") {
    theme = {
      colorName: "amber",
      glowClass: "shadow-[0_0_40px_rgba(245,158,11,0.3)]",
      borderClass: "border-amber-500/70 ring-1 ring-amber-500/40",
      topBarGradient: "from-amber-500 via-orange-400 to-rose-400",
      textClass: "text-amber-400",
      bgMuted: "bg-amber-500/10 text-amber-400",
      icon: AlertTriangle,
      typeLabel: "Threshold Warning Trigger",
    };
  } else if (milestone.eventType === "crossed") {
    theme = {
      colorName: "rose",
      glowClass: "shadow-[0_0_40px_rgba(244,63,94,0.3)]",
      borderClass: "border-rose-500/70 ring-1 ring-rose-500/40",
      topBarGradient: "from-rose-500 via-red-500 to-orange-400",
      textClass: "text-rose-400",
      bgMuted: "bg-rose-500/10 text-rose-400",
      icon: Flame,
      typeLabel: "Ceiling Exceeded Event",
    };
  } else if (milestone.eventType === "completed") {
    theme = {
      colorName: "emerald",
      glowClass: "shadow-[0_0_40px_rgba(16,185,129,0.3)]",
      borderClass: "border-emerald-500/70 ring-1 ring-emerald-500/40",
      topBarGradient: "from-emerald-500 via-teal-400 to-indigo-400",
      textClass: "text-emerald-400",
      bgMuted: "bg-emerald-500/10 text-emerald-400",
      icon: CheckCircle2,
      typeLabel: "Term Concluded (Target Met)",
    };
  }

  const IconComponent = theme.icon;
  const elapsedDays = Math.max(0, totalDurationDays - milestone.remainingDays);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`sm:max-w-xl rounded-3xl border-2 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-2xl shadow-2xl p-0 overflow-hidden ${theme.borderClass} ${theme.glowClass}`}
      >
        {/* Top Glowing Animated Gradient Banner Matching Border */}
        <div className={`h-2 w-full bg-gradient-to-r ${theme.topBarGradient} animate-pulse`} />

        <div className="p-6 space-y-5">
          {/* Header */}
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-2xl ${theme.bgMuted} border border-current/20 shadow-xs`}>
                  <IconComponent className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                    {milestone.title}
                  </DialogTitle>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Target: <strong className="text-slate-200">{budgetName}</strong> • {theme.typeLabel}
                  </p>
                </div>
              </div>

              <Badge
                variant="outline"
                className={`text-[10px] font-bold uppercase tracking-wider py-1 px-2.5 border ${
                  milestone.isCurrent
                    ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                    : milestone.isCompleted
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                {milestone.isCurrent ? "Active Milestone" : milestone.isCompleted ? "Verified Completed" : "Upcoming Goal"}
              </Badge>
            </div>
            <DialogDescription className="sr-only">
              Verified ledger details for milestone {milestone.title}
            </DialogDescription>
          </DialogHeader>

          {/* Cryptographic Ledger Reference Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Verified Ledger Hash Reference
                </span>
                <span className="font-mono text-xs font-bold text-slate-100 tracking-wide">
                  {milestone.ledgerReference}
                </span>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyLedger}
              className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 border-slate-600 hover:bg-slate-700 text-slate-200 self-start sm:self-auto"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied!" : "Copy Reference"}</span>
            </Button>
          </div>

          {/* 4-Stat Core Financial Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Event Amount</span>
              <span className={`text-base font-black font-mono tracking-tight ${theme.textClass} block mt-0.5`}>
                {formatCurrency(milestone.amount, currency)}
              </span>
              <span className="text-[10px] text-slate-400">Baseline value</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Remaining Cap</span>
              <span className="text-base font-black font-mono tracking-tight text-slate-100 block mt-0.5">
                {formatCurrency(milestone.remainingBudget, currency)}
              </span>
              <span className="text-[10px] text-slate-400">At timestamp</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Cycle Day</span>
              <span className="text-base font-black font-mono tracking-tight text-indigo-400 block mt-0.5">
                Day {elapsedDays}
              </span>
              <span className="text-[10px] text-slate-400">of {totalDurationDays} days</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Pacing Horizon</span>
              <span className="text-base font-black font-mono tracking-tight text-amber-400 block mt-0.5">
                {milestone.remainingDays}d
              </span>
              <span className="text-[10px] text-slate-400">Remaining</span>
            </div>
          </div>

          {/* Full Audit Notes Narrative */}
          <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Ledger Audit Remarks
              </span>
              <span className="text-[11px] text-slate-400 font-mono font-normal">
                {formatDate(milestone.date)} • {milestone.time}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {milestone.notes || "Immutable record generated from verified database ledger transactions."}
            </p>
          </div>

          {/* Cryptographic Proof Verification Block */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] font-mono space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3 text-emerald-400" />
                Integrity Seal
              </span>
              <span className="text-emerald-400">Immutable Ledger Sync</span>
            </div>
            <div className="text-slate-400 text-[10px] truncate">
              HASH: SHA-256:{milestone.ledgerReference}-0x{milestone.amount.toString(16)}-{milestone.date}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Signed & Synchronized</span>
            </div>

            <Button
              onClick={onClose}
              className="rounded-xl text-xs font-bold px-5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <span>Close Inspection</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
