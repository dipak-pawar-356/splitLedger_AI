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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency, formatRelativeTime, formatDate } from "@/lib/utils";
import {
  Receipt,
  CheckCircle2,
  Users,
  Settings,
  Trash2,
  RotateCcw,
  Upload,
  MessageSquare,
  FileText,
  Target,
  Sparkles,
  Layers,
  Clock,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { type ActivityItem } from "@/actions/activity";

interface ActivityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: ActivityItem | null;
}

export function ActivityDetailModal({
  isOpen,
  onClose,
  activity,
}: ActivityDetailModalProps) {
  if (!activity) return null;

  const action = activity.action.toLowerCase();

  let theme = {
    title: "Activity Event Audit",
    icon: Sparkles,
    borderClass: "border-2 border-indigo-500/70 ring-1 ring-indigo-500/40",
    glowClass: "shadow-[0_0_40px_rgba(99,102,241,0.25)]",
    topGradient: "from-indigo-500 via-blue-500 to-cyan-400",
    badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    accentText: "text-indigo-400",
  };

  if (action.includes("transaction") || action.includes("expense_created")) {
    theme = {
      title: "Expense Transaction Event",
      icon: Receipt,
      borderClass: "border-2 border-emerald-500/70 ring-1 ring-emerald-500/40",
      glowClass: "shadow-[0_0_40px_rgba(16,185,129,0.25)]",
      topGradient: "from-emerald-500 via-teal-400 to-cyan-400",
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      accentText: "text-emerald-400",
    };
  } else if (action.includes("settlement")) {
    theme = {
      title: "Settlement Transfer Event",
      icon: CheckCircle2,
      borderClass: "border-2 border-teal-500/70 ring-1 ring-teal-500/40",
      glowClass: "shadow-[0_0_40px_rgba(20,184,166,0.25)]",
      topGradient: "from-teal-500 via-emerald-400 to-cyan-400",
      badgeClass: "bg-teal-500/10 text-teal-400 border-teal-500/30",
      accentText: "text-teal-400",
    };
  } else if (action.includes("group") || action.includes("member")) {
    theme = {
      title: "Group Membership Event",
      icon: Users,
      borderClass: "border-2 border-purple-500/70 ring-1 ring-purple-500/40",
      glowClass: "shadow-[0_0_40px_rgba(168,85,247,0.25)]",
      topGradient: "from-purple-500 via-indigo-500 to-pink-500",
      badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      accentText: "text-purple-400",
    };
  } else if (action.includes("receipt") || action.includes("budget")) {
    theme = {
      title: "Financial Ledger Document Event",
      icon: Target,
      borderClass: "border-2 border-amber-500/70 ring-1 ring-amber-500/40",
      glowClass: "shadow-[0_0_40px_rgba(245,158,11,0.25)]",
      topGradient: "from-amber-500 via-orange-400 to-yellow-400",
      badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      accentText: "text-amber-400",
    };
  } else if (action.includes("delete")) {
    theme = {
      title: "Deletion & Audit Event",
      icon: Trash2,
      borderClass: "border-2 border-rose-500/70 ring-1 ring-rose-500/40",
      glowClass: "shadow-[0_0_40px_rgba(244,63,94,0.25)]",
      topGradient: "from-rose-500 via-pink-500 to-amber-400",
      badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      accentText: "text-rose-400",
    };
  }

  const Icon = theme.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`sm:max-w-[540px] max-h-[90vh] overflow-y-auto p-0 rounded-3xl ${theme.borderClass} ${theme.glowClass} bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-2xl text-slate-100`}
      >
        {/* Animated Top Accent Bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${theme.topGradient} animate-pulse`} />

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-white">
                <Icon className={`h-6 w-6 ${theme.accentText}`} />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  {activity.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Logged on {formatDate(activity.createdAt)} ({formatRelativeTime(activity.createdAt)})
                </DialogDescription>
              </div>
            </div>

            <Badge variant="outline" className={`text-xs py-1 px-2.5 font-bold rounded-xl ${theme.badgeClass}`}>
              {activity.action}
            </Badge>
          </div>

          {/* Amount Bar if available */}
          {activity.amount && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Transaction Amount
                </span>
                <span className="text-2xl font-black text-emerald-400 font-mono block mt-0.5">
                  {formatCurrency(activity.amount, activity.currency || "INR")}
                </span>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Ledger Logged
              </Badge>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Actor Profile */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-slate-700">
                <AvatarImage src={activity.actorAvatar || undefined} />
                <AvatarFallback className="text-xs font-bold text-white bg-slate-800">
                  {(activity.actorName || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Action Initiated By
                </span>
                <p className="text-sm font-bold text-white">
                  {activity.actorName || "SplitLedger System"}
                </p>
              </div>
            </div>

            <Badge variant="outline" className="text-[11px] font-mono border-slate-700 text-slate-300">
              Audit ID: #{activity.id}
            </Badge>
          </div>

          {/* Description */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Event Details
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-normal">
              {activity.description}
            </p>
          </div>

          {/* Context Attributes */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/40">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Group Context</span>
              <p className="text-xs font-bold text-white mt-0.5 truncate">
                {activity.groupName || "Personal Ledger"}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/40">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Timeline Stamp</span>
              <p className="text-xs font-bold text-white mt-0.5 truncate">
                {formatDate(activity.createdAt)}
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

          {activity.deepLink ? (
            <Link href={activity.deepLink}>
              <Button
                size="sm"
                className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-md"
              >
                <span>{activity.actionLabel || "View Record"}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          ) : (
            <Button
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs font-semibold px-4 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
