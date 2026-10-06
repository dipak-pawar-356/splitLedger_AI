"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { 
  Activity, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  Mail, 
  MessageSquare, 
  Paperclip,
  Clock,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

interface ActivityItem {
  id: number;
  publicId?: string | null;
  action: string;
  entityType: string;
  entityPublicId?: string | null;
  userName: string;
  userAvatar?: string | null;
  reason?: string | null;
  date: Date | string;
}

interface DashboardRecentActivityProps {
  activities: ActivityItem[];
}

export function DashboardRecentActivity({ activities }: DashboardRecentActivityProps) {
  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
      case "transaction_created":
      case "expense_added":
        return <PlusCircle className="h-3.5 w-3.5 text-emerald-500" />;
      case "update":
      case "edit":
      case "transaction_updated":
      case "expense_edited":
        return <Edit3 className="h-3.5 w-3.5 text-blue-500" />;
      case "delete":
      case "soft_delete":
      case "transaction_deleted":
        return <Trash2 className="h-3.5 w-3.5 text-rose-500" />;
      case "restore":
      case "transaction_restored":
        return <RotateCcw className="h-3.5 w-3.5 text-teal-500" />;
      case "settle":
      case "settlement_completed":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
      case "invite":
      case "invitation_sent":
        return <Mail className="h-3.5 w-3.5 text-purple-500" />;
      case "comment":
      case "comment_added":
        return <MessageSquare className="h-3.5 w-3.5 text-amber-500" />;
      case "receipt":
      case "receipt_uploaded":
        return <Paperclip className="h-3.5 w-3.5 text-indigo-500" />;
      default:
        return <Activity className="h-3.5 w-3.5 text-slate-500" />;
    }
  };

  const formatActionTitle = (item: ActivityItem) => {
    const act = item.action.toLowerCase();
    const type = item.entityType ? item.entityType.replace(/_/g, " ") : "record";

    if (act.includes("create") || act.includes("add")) {
      return `${type.charAt(0).toUpperCase() + type.slice(1)} Created`;
    }
    if (act.includes("update") || act.includes("edit")) {
      return `${type.charAt(0).toUpperCase() + type.slice(1)} Updated`;
    }
    if (act.includes("delete")) {
      return `${type.charAt(0).toUpperCase() + type.slice(1)} Deleted`;
    }
    if (act.includes("settle")) {
      return "Settlement Completed";
    }
    if (act.includes("invite")) {
      return "Invitation Sent";
    }
    return `${item.action.replace(/_/g, " ")} • ${type}`;
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden bg-card">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Recent Activity
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time financial activity and ledger events
              </CardDescription>
            </div>
          </div>
          <Link
            href="/dashboard/activity"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-3">
        {activities.length > 0 ? (
          <div className="space-y-2">
            {activities.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 flex items-start gap-3 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
              >
                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-2xs shrink-0 mt-0.5">
                  {getActionIcon(item.action)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {formatActionTitle(item)}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {formatDate(item.date)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-500 truncate">
                      By <strong className="font-semibold text-slate-700 dark:text-slate-300">{item.userName}</strong>
                    </span>
                  </div>

                  {item.reason && (
                    <p className="text-[11px] text-slate-400 italic mt-1 bg-white/60 dark:bg-slate-800/40 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      &ldquo;{item.reason}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-slate-400 space-y-1">
            <Activity className="h-6 w-6 mx-auto text-slate-300 mb-1" />
            <p className="text-xs font-semibold">No recent activity logged</p>
            <p className="text-[11px]">Financial events and ledger changes will appear here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
