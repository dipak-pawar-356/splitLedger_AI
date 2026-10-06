"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  Send,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";
import { retryFailedEmailLog, getSettlementEmailLogs } from "@/actions/admin-settlements";

export interface SettlementEmailLogItem {
  id: number;
  publicId?: string;
  groupId?: number;
  recipientUserId?: number | null;
  recipientContactId?: number | null;
  recipientName: string;
  recipientEmail: string;
  recipientType: string;
  subject: string;
  amountDue?: number;
  amountDueRupees: number;
  currency?: string;
  reminderCount: number;
  status: string;
  failureReason?: string | null;
  sentAt: string | Date;
  deliveredAt?: string | Date | null;
  openedAt?: string | Date | null;
  nextScheduledAt?: string | Date | null;
}

interface SettlementReminderLogsTabProps {
  groupId: number;
  groupPublicId: string;
  initialLogs: SettlementEmailLogItem[];
  nextScheduledAt?: string | Date | null;
}

export function SettlementReminderLogsTab({
  groupId,
  groupPublicId,
  initialLogs,
  nextScheduledAt,
}: SettlementReminderLogsTabProps) {
  const [logs, setLogs] = useState<SettlementEmailLogItem[]>(initialLogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryingLogId, setRetryingLogId] = useState<number | null>(null);

  const fetchLatestLogs = async () => {
    try {
      setIsRefreshing(true);
      const updated = await getSettlementEmailLogs(groupId);
      setLogs(updated as any);
      toast.success("Delivery logs refreshed");
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch logs");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRetry = async (logId: number) => {
    try {
      setRetryingLogId(logId);
      await retryFailedEmailLog(logId);
      toast.success("Email retry dispatched successfully");
      await fetchLatestLogs();
    } catch (err: any) {
      toast.error(err?.message || "Failed to retry email");
    } finally {
      setRetryingLogId(null);
    }
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ? true : log.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string, reason?: string | null) => {
    switch (status) {
      case "delivered":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Delivered
          </Badge>
        );
      case "opened":
        return (
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs font-semibold gap-1">
            <Mail className="h-3 w-3" />
            Opened
          </Badge>
        );
      case "failed":
        return (
          <Badge
            className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs font-semibold gap-1"
            title={reason || "Delivery failed"}
          >
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs font-semibold gap-1 text-slate-500">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Settlement Reminder Delivery Logs
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Audit trail of all automated and manual settlement reminder dispatches
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLatestLogs}
                disabled={isRefreshing}
                className="h-8 rounded-xl text-xs gap-1.5 border-slate-200 dark:border-slate-700"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="pt-3 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by member name, email or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs rounded-xl">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="opened">Opened</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        {/* Logs Table */}
        <CardContent className="p-0">
          {filteredLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Reminder</th>
                    <th className="py-3 px-3">Amount Due</th>
                    <th className="py-3 px-3">Last Sent</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                    >
                      {/* Member column */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                            <AvatarFallback>{getInitials(log.recipientName)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {log.recipientName}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {log.recipientEmail}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Recipient Type */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize font-semibold ${
                            log.recipientType === "debtor"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {log.recipientType}
                        </Badge>
                      </td>

                      {/* Reminder Count */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800"
                        >
                          #{log.reminderCount}
                        </Badge>
                      </td>

                      {/* Amount Due */}
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatCurrency(log.amountDueRupees)}
                      </td>

                      {/* Last Sent */}
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {formatDate(new Date(log.sentAt))}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(log.status, log.failureReason)}
                          {log.failureReason && (
                            <p className="text-[10px] text-rose-500 max-w-[180px] truncate" title={log.failureReason}>
                              {log.failureReason}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {log.status === "failed" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetry(log.id)}
                            disabled={retryingLogId === log.id}
                            className="h-7 px-2.5 rounded-lg text-xs gap-1 text-rose-600 hover:text-rose-700 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            <RotateCcw className={`h-3 w-3 ${retryingLogId === log.id ? "animate-spin" : ""}`} />
                            <span>{retryingLogId === log.id ? "Retrying..." : "Retry"}</span>
                          </Button>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Mail className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No reminder delivery logs found
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery || statusFilter !== "all"
                  ? "No logs match your filter criteria."
                  : "Settlement reminder emails sent manually or automatically will appear here with delivery tracking."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
