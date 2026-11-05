"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  IndianRupee,
  Receipt,
  Scale,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Calculator,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export type SettlementMetricType =
  | "gross_paid"
  | "gross_share"
  | "settled_sent"
  | "settled_recv"
  | "remain_pay"
  | "remain_recv";

interface SettlementMetricsInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: SettlementMetricType | null;
  financialBreakdown: {
    grossExpensePaid: number;
    grossShare: number;
    completedSettlementPaid: number;
    completedSettlementReceived: number;
    outstandingPayable: number;
    outstandingReceivable: number;
  };
  groupName: string;
}

export function SettlementMetricsInspectionModal({
  isOpen,
  onClose,
  type,
  financialBreakdown,
  groupName,
}: SettlementMetricsInspectionModalProps) {
  if (!type) return null;

  const getMetricDetails = () => {
    switch (type) {
      case "gross_paid":
        return {
          title: "Gross Expenses Fronted",
          subtitle: "Total upfront ledger debits paid by you",
          value: financialBreakdown.grossExpensePaid,
          icon: Receipt,
          borderClass: "border-2 border-indigo-500/70 ring-1 ring-indigo-500/40",
          glowClass: "shadow-[0_0_40px_rgba(99,102,241,0.25)]",
          topGradient: "from-indigo-500 via-blue-500 to-cyan-400",
          accentText: "text-indigo-400",
          explanation:
            "This is the cumulative total of all expense transactions in this group where you fronted the payment on behalf of the group members.",
          formula: "Gross Paid = Sum of all group expenses paid by your account",
        };
      case "gross_share":
        return {
          title: "Gross Personal Responsibility",
          subtitle: "Your calculated split share across all group expenses",
          value: financialBreakdown.grossShare,
          icon: Scale,
          borderClass: "border-2 border-purple-500/70 ring-1 ring-purple-500/40",
          glowClass: "shadow-[0_0_40px_rgba(168,85,247,0.25)]",
          topGradient: "from-purple-500 via-pink-500 to-rose-400",
          accentText: "text-purple-400",
          explanation:
            "This reflects your proportional financial obligation calculated across all group expenses using the configured split models (equal, exact, percentages, or shares).",
          formula: "Gross Share = Sum of your individual consumption shares across all expenses",
        };
      case "settled_sent":
        return {
          title: "Settlement Sent (Paid Out)",
          subtitle: "Total debt transfers paid by you and verified",
          value: financialBreakdown.completedSettlementPaid,
          icon: CheckCircle2,
          borderClass: "border-2 border-emerald-500/70 ring-1 ring-emerald-500/40",
          glowClass: "shadow-[0_0_40px_rgba(16,185,129,0.25)]",
          topGradient: "from-emerald-500 via-teal-400 to-cyan-400",
          accentText: "text-emerald-400",
          explanation:
            "The sum of verified offline UPI or cash settlements where you transferred money to other group members to clear your previous debts.",
          formula: "Settled Sent = Sum of all verified settlement debits transferred by you",
        };
      case "settled_recv":
        return {
          title: "Settlement Received (Collected)",
          subtitle: "Total credit transfers collected and confirmed",
          value: financialBreakdown.completedSettlementReceived,
          icon: CheckCircle2,
          borderClass: "border-2 border-blue-500/70 ring-1 ring-blue-500/40",
          glowClass: "shadow-[0_0_40px_rgba(59,130,246,0.25)]",
          topGradient: "from-blue-500 via-indigo-500 to-cyan-400",
          accentText: "text-blue-400",
          explanation:
            "The sum of verified offline UPI or cash settlements that other members transferred to you to clear what they owed you.",
          formula: "Settled Recv = Sum of all verified settlement credits collected by you",
        };
      case "remain_pay":
        return {
          title: "Remaining Debt to Pay",
          subtitle: "Active net outstanding amount you owe to group members",
          value: financialBreakdown.outstandingPayable,
          icon: TrendingDown,
          borderClass: "border-2 border-rose-500/70 ring-1 ring-rose-500/40",
          glowClass: "shadow-[0_0_40px_rgba(244,63,94,0.25)]",
          topGradient: "from-rose-500 via-pink-500 to-amber-400",
          accentText: "text-rose-400",
          explanation:
            "Your net unpaid liability in this group. You can clear this immediately using the dynamic UPI QR codes in the Settlement Hub.",
          formula: "Remain To Pay = Max(0, (Gross Share + Settled Recv) - (Gross Paid + Settled Sent))",
        };
      case "remain_recv":
        return {
          title: "Remaining Credit to Receive",
          subtitle: "Active net outstanding amount group members owe you",
          value: financialBreakdown.outstandingReceivable,
          icon: TrendingUp,
          borderClass: "border-2 border-emerald-500/70 ring-1 ring-emerald-500/40",
          glowClass: "shadow-[0_0_40px_rgba(16,185,129,0.25)]",
          topGradient: "from-emerald-500 via-teal-400 to-cyan-400",
          accentText: "text-emerald-400",
          explanation:
            "Your net credit claim in this group. Debtors can scan your dynamic UPI QR code or send payment directly to your registered UPI ID.",
          formula: "Remain To Recv = Max(0, (Gross Paid + Settled Sent) - (Gross Share + Settled Recv))",
        };
    }
  };

  const details = getMetricDetails();
  const Icon = details.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`sm:max-w-[540px] max-h-[90vh] overflow-y-auto p-0 rounded-3xl ${details.borderClass} ${details.glowClass} bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-2xl text-slate-100`}
      >
        {/* Animated Top Accent Bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${details.topGradient} animate-pulse`} />

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-white">
                <Icon className={`h-6 w-6 ${details.accentText}`} />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-white">
                  {details.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Financial metric audit for group: <strong className="text-slate-200">{groupName}</strong>
                </DialogDescription>
              </div>
            </div>

            <Badge variant="outline" className="text-xs py-1 px-2.5 font-bold rounded-xl bg-slate-800/60 border-slate-700 text-slate-300">
              Database Sync
            </Badge>
          </div>

          {/* Amount Display */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Current Verified Balance
              </span>
              <span className={`text-3xl font-black font-mono block mt-0.5 ${details.accentText}`}>
                {formatCurrency(details.value)}
              </span>
            </div>
            <Badge className="bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Verified Math
            </Badge>
          </div>
        </div>

        {/* Breakdown Body */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Calculator className="h-4 w-4 text-primary" />
              <span>Financial Ledger Definition</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {details.explanation}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Accounting Formula
            </span>
            <code className="text-[11px] font-mono text-emerald-400 bg-slate-900/80 px-2 py-1.5 rounded-xl block border border-slate-800 break-words">
              {details.formula}
            </code>
          </div>

          {/* All 6 Metrics Summary Matrix */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-300 block">
              Complete Personal Ledger Summary
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40">
                <span className="text-slate-400 block text-[9.5px] uppercase font-semibold">Gross Paid</span>
                <strong className="text-white font-mono mt-0.5 block">{formatCurrency(financialBreakdown.grossExpensePaid)}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40">
                <span className="text-slate-400 block text-[9.5px] uppercase font-semibold">Gross Share</span>
                <strong className="text-white font-mono mt-0.5 block">{formatCurrency(financialBreakdown.grossShare)}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40">
                <span className="text-slate-400 block text-[9.5px] uppercase font-semibold">Settled Sent</span>
                <strong className="text-emerald-400 font-mono mt-0.5 block">{formatCurrency(financialBreakdown.completedSettlementPaid)}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40">
                <span className="text-slate-400 block text-[9.5px] uppercase font-semibold">Settled Recv</span>
                <strong className="text-blue-400 font-mono mt-0.5 block">{formatCurrency(financialBreakdown.completedSettlementReceived)}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-rose-500/20 bg-rose-500/5">
                <span className="text-rose-400 block text-[9.5px] uppercase font-semibold">Remain To Pay</span>
                <strong className="text-rose-400 font-mono mt-0.5 block">{formatCurrency(financialBreakdown.outstandingPayable)}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-emerald-500/20 bg-emerald-500/5">
                <span className="text-emerald-400 block text-[9.5px] uppercase font-semibold">Remain To Recv</span>
                <strong className="text-emerald-400 font-mono mt-0.5 block">{formatCurrency(financialBreakdown.outstandingReceivable)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 pt-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="rounded-xl text-xs font-semibold px-5 bg-primary text-primary-foreground shadow-sm"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
