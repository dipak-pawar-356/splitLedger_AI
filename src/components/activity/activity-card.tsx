"use client";

import { useState } from "react";
import { ActivityItem } from "@/actions/activity";
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
  UserPlus, 
  Upload, 
  MessageSquare, 
  FileText, 
  Target, 
  ShieldAlert, 
  ArrowRight,
  Sparkles,
  Layers,
  Clock,
  Maximize2
} from "lucide-react";
import Link from "next/link";
import { ActivityDetailModal } from "./activity-detail-modal";

interface ActivityCardProps {
  activity: ActivityItem;
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getActionTheme = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes("create_transaction") || act.includes("expense_created")) {
      return {
        icon: <Receipt className="h-4 w-4 text-emerald-500" />,
        borderHover: "hover:border-emerald-500/70 hover:shadow-[0_0_20px_rgba(16,185,129,0.18)]",
      };
    }
    if (act.includes("update_transaction") || act.includes("expense_updated")) {
      return {
        icon: <Settings className="h-4 w-4 text-blue-500" />,
        borderHover: "hover:border-blue-500/70 hover:shadow-[0_0_20px_rgba(59,130,246,0.18)]",
      };
    }
    if (act.includes("delete_transaction") || act.includes("expense_deleted") || act.includes("delete")) {
      return {
        icon: <Trash2 className="h-4 w-4 text-rose-500" />,
        borderHover: "hover:border-rose-500/70 hover:shadow-[0_0_20px_rgba(244,63,94,0.18)]",
      };
    }
    if (act.includes("restore")) {
      return {
        icon: <RotateCcw className="h-4 w-4 text-purple-500" />,
        borderHover: "hover:border-purple-500/70 hover:shadow-[0_0_20px_rgba(168,85,247,0.18)]",
      };
    }
    if (act.includes("settlement")) {
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-teal-500" />,
        borderHover: "hover:border-teal-500/70 hover:shadow-[0_0_20px_rgba(20,184,166,0.18)]",
      };
    }
    if (act.includes("group") || act.includes("member")) {
      return {
        icon: <Users className="h-4 w-4 text-indigo-500" />,
        borderHover: "hover:border-indigo-500/70 hover:shadow-[0_0_20px_rgba(99,102,241,0.18)]",
      };
    }
    if (act.includes("receipt")) {
      return {
        icon: <Upload className="h-4 w-4 text-amber-500" />,
        borderHover: "hover:border-amber-500/70 hover:shadow-[0_0_20px_rgba(245,158,11,0.18)]",
      };
    }
    return {
      icon: <Sparkles className="h-4 w-4 text-primary" />,
      borderHover: "hover:border-primary/70 hover:shadow-[0_0_20px_rgba(99,102,241,0.18)]",
    };
  };

  const theme = getActionTheme(activity.action);

  return (
    <>
      <div 
        onClick={() => setIsModalOpen(true)}
        className={`p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card ${theme.borderHover} hover:-translate-y-1 hover:scale-[1.006] hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group/activity`}
      >
        <div className="flex items-start gap-3.5 min-w-0">
          {/* Action Icon or Actor Avatar */}
          <div className="relative shrink-0 mt-0.5">
            {activity.actorAvatar ? (
              <Avatar className="h-9 w-9 border shadow-xs group-hover/activity:ring-2 group-hover/activity:ring-primary/40 transition-all">
                <AvatarImage src={activity.actorAvatar} />
                <AvatarFallback className="text-xs font-bold">
                  {(activity.actorName || "U").charAt(0)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center group-hover/activity:scale-105 transition-transform">
                {theme.icon}
              </div>
            )}
          </div>

          {/* Text Details */}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover/activity:text-primary transition-colors">
                {activity.title}
              </h4>
              {activity.groupName && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-semibold text-slate-600 dark:text-slate-300">
                  <Layers className="h-2.5 w-2.5 mr-1 inline text-primary" />
                  {activity.groupName}
                </Badge>
              )}
              {activity.amount && (
                <Badge variant="outline" className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 border-emerald-200 py-0 px-1.5">
                  {formatCurrency(activity.amount, activity.currency || "INR")}
                </Badge>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {activity.description}
            </p>

            <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
              <span className="flex items-center gap-1 font-medium">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(activity.createdAt)}
              </span>
              <span>•</span>
              <span>{formatDate(activity.createdAt)}</span>
              <span className="text-primary font-medium opacity-0 group-hover/activity:opacity-100 transition-opacity ml-1">
                Click to inspect →
              </span>
            </div>
          </div>
        </div>

        {/* Action Button & Modal Trigger */}
        <div 
          className="shrink-0 self-end sm:self-center flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {activity.deepLink && (
            <Link href={activity.deepLink}>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs font-semibold rounded-xl text-primary hover:bg-primary/10 border-primary/30 gap-1 px-2.5"
              >
                <span>{activity.actionLabel || "View"}</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsModalOpen(true)}
            className="h-7 w-7 p-0 text-slate-400 hover:text-primary rounded-xl"
            title="Inspect activity details"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Pop-up Activity Detail Inspection Modal */}
      <ActivityDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        activity={activity}
      />
    </>
  );
}
