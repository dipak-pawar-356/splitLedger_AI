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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Calendar,
  Send,
  Loader2,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { type SettlementEmailLogItem } from "./settlement-reminder-logs-tab";

interface ReminderLogInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: SettlementEmailLogItem | null;
  onRetry: (logId: number) => void;
  isRetrying: boolean;
}

export function ReminderLogInspectionModal({
  isOpen,
  onClose,
  log,
  onRetry,
  isRetrying,
}: ReminderLogInspectionModalProps) {
  if (!log) return null;

  const getStatusTheme = () => {
    switch (log.status) {
      case "delivered":
        return {
          borderClass: "border-2 border-emerald-500/70 ring-1 ring-emerald-500/40",
          glowClass: "shadow-[0_0_40px_rgba(16,185,129,0.25)]",
          topGradient: "from-emerald-500 via-teal-400 to-cyan-400",
          badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
          accentText: "text-emerald-400",
        };
      case "opened":
        return {
          borderClass: "border-2 border-blue-500/70 ring-1 ring-blue-500/40",
          glowClass: "shadow-[0_0_40px_rgba(59,130,246,0.25)]",
          topGradient: "from-blue-500 via-indigo-500 to-cyan-400",
          badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
          accentText: "text-blue-400",
        };
      case "failed":
        return {
          borderClass: "border-2 border-rose-500/70 ring-1 ring-rose-500/40",
          glowClass: "shadow-[0_0_40px_rgba(244,63,94,0.25)]",
          topGradient: "from-rose-500 via-pink-500 to-amber-400",
          badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30",
          accentText: "text-rose-400",
        };
      default:
        return {
          borderClass: "border-2 border-amber-500/70 ring-1 ring-amber-500/40",
          glowClass: "shadow-[0_0_40px_rgba(245,158,11,0.25)]",
          topGradient: "from-amber-500 via-orange-400 to-yellow-400",
          badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          accentText: "text-amber-400",
        };
    }
  };

  const theme = getStatusTheme();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`sm:max-w-[540px] max-h-[92vh] overflow-y-auto p-0 rounded-3xl ${theme.borderClass} ${theme.glowClass} bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-2xl text-slate-100`}
      >
        {/* Animated Top Accent Bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${theme.topGradient} animate-pulse`} />

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-white">
                <Mail className={`h-6 w-6 ${theme.accentText}`} />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-white">
                  Reminder Dispatch Audit
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Automated notification log # {log.id}
                </DialogDescription>
              </div>
            </div>

            <Badge variant="outline" className={`text-xs py-1 px-2.5 font-bold rounded-xl capitalize ${theme.badgeClass}`}>
              {log.status}
            </Badge>
          </div>

          {/* Amount and Reminder Count Bar */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Outstanding Balance Notified
              </span>
              <span className="text-2xl font-black text-white font-mono block mt-0.5">
                {formatCurrency(log.amountDueRupees)}
              </span>
            </div>
            <div className="text-right">
              <Badge className="bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono">
                Cycle #{log.reminderCount}
              </Badge>
              <span className="text-[10px] text-slate-400 block mt-1 capitalize">
                Recipient Type: <strong className="text-slate-200">{log.recipientType}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Member Card */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-10 w-10 border-2 border-slate-700 shrink-0">
                <AvatarFallback className="text-xs font-bold text-white bg-slate-800">
                  {log.recipientName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Delivered To
                </span>
                <p className="text-sm font-bold text-white truncate">
                  {log.recipientName}
                </p>
                <p className="text-xs text-slate-400 font-mono truncate">
                  {log.recipientEmail}
                </p>
              </div>
            </div>
          </div>

          {/* Subject Line */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Email Subject
            </span>
            <p className="text-xs font-bold text-slate-200 leading-relaxed">
              {log.subject}
            </p>
          </div>

          {/* Failure Alert if Failed */}
          {log.failureReason && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <AlertCircle className="h-4 w-4" />
                <span>Delivery Failure Cause</span>
              </div>
              <p className="text-xs text-rose-300 leading-relaxed">
                {log.failureReason}
              </p>
            </div>
          )}

          {/* Delivery Timeline Stamps */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/40">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Dispatched At</span>
              <p className="text-xs font-bold text-white mt-0.5 truncate">
                {formatDate(new Date(log.sentAt))}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/40">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Next Scheduled</span>
              <p className="text-xs font-bold text-white mt-0.5 truncate">
                {log.nextScheduledAt ? formatDate(new Date(log.nextScheduledAt)) : "Completed / Paused"}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 pt-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-xl text-xs text-slate-400 hover:text-white"
          >
            Close
          </Button>

          {log.status === "failed" ? (
            <Button
              size="sm"
              disabled={isRetrying}
              onClick={() => onRetry(log.id)}
              className="rounded-xl text-xs font-bold gap-1.5 bg-rose-600 hover:bg-rose-500 text-white shadow-md"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Retrying Dispatch...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Retry Dispatch Now</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs font-semibold px-4 bg-primary text-primary-foreground shadow-md"
            >
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

