"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  Receipt, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  ShieldCheck,
  Globe,
  Monitor
} from "lucide-react";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface AuditLogItem {
  id: number;
  publicId?: string | null;
  action: string;
  entityType: string;
  entityId: number;
  entityPublicId?: string | null;
  changes?: any;
  beforeData?: any;
  afterData?: any;
  reason?: string | null;
  status: string;
  browser?: string | null;
  device?: string | null;
  createdAt: Date | string;
  userName?: string | null;
  userAvatar?: string | null;
  userEmail?: string | null;
}

interface TransactionTimelineProps {
  logs: AuditLogItem[];
}

export function TransactionTimeline({ logs }: TransactionTimelineProps) {
  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        <Activity className="h-10 w-10 mx-auto text-slate-400 mb-3 opacity-60" />
        <p className="font-medium text-sm">No activity recorded for this transaction</p>
      </div>
    );
  }

  const getActionConfig = (action: string) => {
    switch (action.toLowerCase()) {
      case "transaction_created":
      case "create":
        return {
          icon: <PlusCircle className="h-4 w-4 text-emerald-500" />,
          label: "Transaction Created",
          badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200",
        };
      case "transaction_updated":
      case "update":
      case "edit":
        return {
          icon: <Edit3 className="h-4 w-4 text-blue-500" />,
          label: "Transaction Edited",
          badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200",
        };
      case "transaction_deleted":
      case "delete":
        return {
          icon: <Trash2 className="h-4 w-4 text-rose-500" />,
          label: "Transaction Deleted (Soft Delete)",
          badgeColor: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200",
        };
      case "transaction_restored":
      case "restore":
        return {
          icon: <RotateCcw className="h-4 w-4 text-emerald-500" />,
          label: "Transaction Restored",
          badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200",
        };
      case "receipt_upload":
      case "receipt_uploaded":
        return {
          icon: <Receipt className="h-4 w-4 text-purple-500" />,
          label: "Receipt Uploaded",
          badgeColor: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200",
        };
      case "receipt_remove":
      case "receipt_removed":
        return {
          icon: <Receipt className="h-4 w-4 text-amber-500" />,
          label: "Receipt Removed",
          badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200",
        };
      case "comment":
      case "comment_created":
        return {
          icon: <MessageSquare className="h-4 w-4 text-indigo-500" />,
          label: "Comment Added",
          badgeColor: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200",
        };
      case "settle":
      case "settlement_completed":
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-teal-500" />,
          label: "Settlement Completed",
          badgeColor: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200",
        };
      default:
        return {
          icon: <Activity className="h-4 w-4 text-slate-500" />,
          label: action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200",
        };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Audit Activity Timeline</h3>
          <Badge variant="secondary" className="rounded-full text-xs font-mono">
            {logs.length} {logs.length === 1 ? "event" : "events"}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Full Audit Log Verified</span>
        </div>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {logs.map((log) => {
          const config = getActionConfig(log.action);

          return (
            <div key={log.id} className="relative group">
              {/* Dot on Timeline */}
              <div className="absolute -left-6 top-3 w-5 h-5 rounded-full border-2 border-background bg-slate-100 dark:bg-slate-800 shadow-sm flex items-center justify-center">
                {config.icon}
              </div>

              {/* Event Card */}
              <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Badge variant="outline" className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg border ${config.badgeColor}`}>
                      {config.label}
                    </Badge>
                    {log.reason && (
                      <span className="text-xs text-slate-600 dark:text-slate-400 italic">
                        &ldquo;{log.reason}&rdquo;
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    <span>{formatRelativeTime(log.createdAt)}</span>
                    <span>•</span>
                    <span>{formatDate(log.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={log.userAvatar || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {log.userName ? log.userName.charAt(0) : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span>By: <strong className="text-slate-700 dark:text-slate-300 font-medium">{log.userName || "System"}</strong></span>
                  </div>

                  {(log.browser || log.device) && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      {log.browser && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {log.browser}
                        </span>
                      )}
                      {log.device && (
                        <span className="flex items-center gap-1">
                          <Monitor className="h-3 w-3" />
                          {log.device}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
