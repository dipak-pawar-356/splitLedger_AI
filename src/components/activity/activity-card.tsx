"use client";

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
  Clock
} from "lucide-react";
import Link from "next/link";

interface ActivityCardProps {
  activity: ActivityItem;
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const getActionIcon = (action: string) => {
    if (action.includes("create_transaction") || action.includes("expense_created")) {
      return <Receipt className="h-4 w-4 text-emerald-600" />;
    }
    if (action.includes("update_transaction") || action.includes("expense_updated")) {
      return <Settings className="h-4 w-4 text-blue-600" />;
    }
    if (action.includes("delete_transaction") || action.includes("expense_deleted")) {
      return <Trash2 className="h-4 w-4 text-rose-600" />;
    }
    if (action.includes("restore")) {
      return <RotateCcw className="h-4 w-4 text-purple-600" />;
    }
    if (action.includes("settlement")) {
      return <CheckCircle2 className="h-4 w-4 text-teal-600" />;
    }
    if (action.includes("group") || action.includes("member")) {
      return <Users className="h-4 w-4 text-indigo-600" />;
    }
    if (action.includes("receipt")) {
      return <Upload className="h-4 w-4 text-amber-600" />;
    }
    if (action.includes("comment")) {
      return <MessageSquare className="h-4 w-4 text-cyan-600" />;
    }
    if (action.includes("report")) {
      return <FileText className="h-4 w-4 text-violet-600" />;
    }
    if (action.includes("budget")) {
      return <Target className="h-4 w-4 text-amber-600" />;
    }
    return <Sparkles className="h-4 w-4 text-slate-500" />;
  };

  return (
    <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3.5 min-w-0">
        {/* Action Icon or Actor Avatar */}
        <div className="relative shrink-0 mt-0.5">
          {activity.actorAvatar ? (
            <Avatar className="h-9 w-9 border shadow-xs">
              <AvatarImage src={activity.actorAvatar} />
              <AvatarFallback className="text-xs font-bold">
                {(activity.actorName || "U").charAt(0)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center">
              {getActionIcon(activity.action)}
            </div>
          )}
        </div>

        {/* Text Details */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
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
          </div>
        </div>
      </div>

      {/* Deep Link Action Button */}
      {activity.deepLink && (
        <div className="shrink-0 self-end sm:self-center">
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
        </div>
      )}
    </div>
  );
}
