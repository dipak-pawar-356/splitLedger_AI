"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  History, 
  ArrowRight, 
  User, 
  Clock, 
  Tag, 
  FileText, 
  DollarSign, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Layers,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface VersionItem {
  id: number;
  publicId: string;
  versionNumber: number;
  editedBy: number;
  reason?: string | null;
  changes: Record<string, { old: any; new: any }> | { initial?: boolean };
  snapshot: any;
  createdAt: Date | string;
  editorName?: string | null;
  editorAvatar?: string | null;
  editorEmail?: string | null;
}

interface VersionHistoryProps {
  versions: VersionItem[];
  currency?: string;
}

export function VersionHistory({ versions, currency = "INR" }: VersionHistoryProps) {
  const [expandedVersionId, setExpandedVersionId] = useState<number | null>(null);

  if (!versions || versions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        <History className="h-10 w-10 mx-auto text-slate-400 mb-3 opacity-60" />
        <p className="font-medium text-sm">No version history records found</p>
        <p className="text-xs text-slate-400 mt-1">Every edit will create a new immutable version record here.</p>
      </div>
    );
  }

  const formatFieldValue = (field: string, value: any) => {
    if (value === null || value === undefined) return <span className="text-slate-400 italic">None</span>;

    if (field === "amount") {
      return (
        <span className="font-semibold font-mono">
          {formatCurrency(Number(value) / 100, currency)}
        </span>
      );
    }

    if (field === "date" || field === "deletedAt") {
      return <span>{formatDate(value)}</span>;
    }

    if (field === "isDeleted") {
      return value ? (
        <Badge variant="destructive" className="text-[10px]">Deleted</Badge>
      ) : (
        <Badge variant="outline" className="text-[10px] text-emerald-600">Active</Badge>
      );
    }

    if (typeof value === "object") {
      if (Array.isArray(value)) {
        return <span className="text-xs">{value.length} items</span>;
      }
      return <span className="text-xs font-mono">{JSON.stringify(value)}</span>;
    }

    return <span>{String(value)}</span>;
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      amount: "Amount",
      title: "Title",
      description: "Description",
      type: "Transaction Type",
      categoryId: "Category",
      contactId: "Contact",
      groupId: "Group",
      paidBy: "Paid By (User)",
      paidByContact: "Paid By (Contact)",
      paymentMethod: "Payment Method",
      status: "Status",
      date: "Date",
      notes: "Notes",
      tags: "Tags",
      location: "Location",
      receiptUrl: "Receipt",
      splits: "Participants / Splits",
      isDeleted: "Deleted State",
    };
    return labels[field] || field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Version Audit Trail</h3>
          <Badge variant="secondary" className="rounded-full text-xs font-mono">
            {versions.length} {versions.length === 1 ? "version" : "versions"}
          </Badge>
        </div>
        <p className="text-xs text-slate-500">Immutable ledger records</p>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {versions.map((ver, index) => {
          const isLatest = index === 0;
          const isInitial = ver.versionNumber === 1 || ("initial" in ver.changes && ver.changes.initial);
          const isExpanded = expandedVersionId === ver.id;
          const diffEntries = Object.entries(ver.changes || {}).filter(([k]) => k !== "initial");

          return (
            <div key={ver.id} className="relative group">
              {/* Dot on Timeline */}
              <div className={`absolute -left-6 top-3 w-5 h-5 rounded-full border-2 bg-background flex items-center justify-center ${
                isLatest 
                  ? "border-primary text-primary" 
                  : isInitial 
                    ? "border-emerald-500 text-emerald-500" 
                    : "border-slate-400 text-slate-400"
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isLatest ? "bg-primary" : isInitial ? "bg-emerald-500" : "bg-slate-400"
                }`} />
              </div>

              {/* Version Card */}
              <Card className={`rounded-2xl border transition-all ${
                isLatest 
                  ? "border-primary/40 shadow-sm bg-primary/[0.02] dark:bg-primary/[0.03]" 
                  : "border-slate-200/80 dark:border-slate-800 shadow-none hover:border-slate-300"
              }`}>
                <CardHeader className="p-4 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border">
                        <AvatarImage src={ver.editorAvatar || undefined} />
                        <AvatarFallback className="text-xs font-semibold bg-slate-100 text-slate-700">
                          {ver.editorName ? ver.editorName.charAt(0).toUpperCase() : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            Version {ver.versionNumber}
                          </span>
                          {isLatest && (
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 text-[10px] font-semibold">
                              Current
                            </Badge>
                          )}
                          {isInitial && (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                              Created
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{ver.editorName || "System / User"}</span>
                          <span>•</span>
                          <Clock className="h-3 w-3 inline" />
                          <span>{formatRelativeTime(ver.createdAt)} ({formatDate(ver.createdAt)})</span>
                        </p>
                      </div>
                    </div>

                    {ver.reason && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs text-slate-700 dark:text-slate-300 self-start sm:self-center">
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-medium italic">&ldquo;{ver.reason}&rdquo;</span>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-3">
                  {/* Change Diff Table */}
                  {!isInitial && diffEntries.length > 0 ? (
                    <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden text-xs">
                      <div className="bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2 font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <span>Changes in this version:</span>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {diffEntries.map(([field, change]) => (
                          <div key={field} className="grid grid-cols-1 sm:grid-cols-3 p-3 gap-2 items-center hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {getFieldLabel(field)}
                            </span>
                            <div className="col-span-2 flex items-center gap-2 flex-wrap">
                              <span className="line-through text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md text-xs border border-rose-200/60 dark:border-rose-900/50">
                                {formatFieldValue(field, change.old)}
                              </span>
                              <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md text-xs border border-emerald-200/60 dark:border-emerald-900/50">
                                {formatFieldValue(field, change.new)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : isInitial ? (
                    <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>
                        Initial version created with an amount of{" "}
                        <strong>{formatCurrency((ver.snapshot?.amount || 0) / 100, currency)}</strong>.
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No specific field diffs recorded.</p>
                  )}

                  {/* Toggle Snapshot Inspector */}
                  <div className="pt-1 flex items-center justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 h-7 px-2.5 gap-1.5"
                      onClick={() => setExpandedVersionId(isExpanded ? null : ver.id)}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>{isExpanded ? "Hide Full Snapshot" : "Inspect State Snapshot"}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>
                  </div>

                  {/* Full Snapshot View */}
                  {isExpanded && (
                    <div className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60">
                      <pre>{JSON.stringify(ver.snapshot, null, 2)}</pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
