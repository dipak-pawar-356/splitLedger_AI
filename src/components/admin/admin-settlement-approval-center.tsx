"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  Download,
  FileSpreadsheet,
  History,
} from "lucide-react";
import { SettlementVerificationModal } from "@/components/admin/settlement-verification-modal";

interface PendingSettlementItem {
  id?: number;
  fromUserId?: number;
  fromContactId?: number;
  fromName: string;
  fromAvatar?: string | null;
  toUserId?: number;
  toContactId?: number;
  toName: string;
  toAvatar?: string | null;
  amount: number;
  currency: string;
}

interface SettlementHistoryRecord {
  id: number;
  publicId: string;
  fromName: string;
  toName: string;
  amountRupees: number;
  paymentMethod: string;
  transactionReference?: string | null;
  reason: string;
  notes?: string | null;
  approvedByName: string;
  approvedDate: Date | string;
  previousBalanceRupees: number;
  newBalanceRupees: number;
}

interface AdminSettlementApprovalCenterProps {
  groupId: number | string;
  groupName: string;
  adminName: string;
  pendingSettlements: PendingSettlementItem[];
  history: SettlementHistoryRecord[];
  onRefresh?: () => void;
}

export function AdminSettlementApprovalCenter({
  groupId,
  groupName,
  adminName,
  pendingSettlements,
  history,
  onRefresh,
}: AdminSettlementApprovalCenterProps) {
  const [selectedPending, setSelectedPending] = useState<PendingSettlementItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  const filteredHistory = history.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.fromName.toLowerCase().includes(q) ||
      item.toName.toLowerCase().includes(q) ||
      item.paymentMethod.toLowerCase().includes(q) ||
      item.reason.toLowerCase().includes(q) ||
      (item.transactionReference && item.transactionReference.toLowerCase().includes(q))
    );
  });

  const exportHistoryCSV = () => {
    if (history.length === 0) return;
    const headers = [
      "ID",
      "Date",
      "Sender (From)",
      "Receiver (To)",
      "Amount (INR)",
      "Payment Method",
      "Reason",
      "Reference",
      "Approved By",
      "Previous Balance",
      "New Balance",
    ];

    const rows = history.map((h) => [
      h.publicId,
      formatDate(h.approvedDate),
      `"${h.fromName}"`,
      `"${h.toName}"`,
      h.amountRupees.toFixed(2),
      h.paymentMethod,
      `"${h.reason}"`,
      `"${h.transactionReference || ""}"`,
      `"${h.approvedByName}"`,
      h.previousBalanceRupees.toFixed(2),
      h.newBalanceRupees.toFixed(2),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${groupName.replace(/\s+/g, "_")}_Settlement_History.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportHistoryJSON = () => {
    if (history.length === 0) return;
    const jsonStr = JSON.stringify(history, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${groupName.replace(/\s+/g, "_")}_Settlement_History.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#0F9D58]/15 text-[#0F9D58] border border-[#0F9D58]/30">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold tracking-tight">
                  Admin Settlement Approval Center
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Verify offline member settlements (Cash, UPI, PhonePe, Google Pay, Bank) and update live group balances
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 self-start md:self-auto text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("pending")}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  activeTab === "pending"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Pending Verifications ({pendingSettlements.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  activeTab === "history"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Verified History ({history.length})
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {activeTab === "pending" && (
            <div className="space-y-4">
              {pendingSettlements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingSettlements.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-4 hover:-translate-y-[2px] hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10 border-2 border-rose-500/30 ring-2 ring-rose-500/10 shrink-0">
                            <AvatarImage src={item.fromAvatar || undefined} />
                            <AvatarFallback className="text-xs font-bold text-rose-500 bg-slate-200 dark:bg-slate-800">
                              {item.fromName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {item.fromName}
                            </p>
                            <span className="text-[10px] text-rose-500 font-semibold uppercase tracking-wider block">
                              Needs to Pay
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-center px-2">
                          <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                            {formatCurrency(item.amount)}
                          </span>
                          <div className="flex items-center gap-1 text-emerald-500 mt-0.5">
                            <div className="w-4 h-[2px] bg-emerald-500 rounded-full" />
                            <ArrowRight className="h-3.5 w-3.5" />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 min-w-0 text-right justify-end">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {item.toName}
                            </p>
                            <span className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider block">
                              Will Receive
                            </span>
                          </div>
                          <Avatar className="h-10 w-10 border-2 border-emerald-500/30 ring-2 ring-emerald-500/10 shrink-0">
                            <AvatarImage src={item.toAvatar || undefined} />
                            <AvatarFallback className="text-xs font-bold text-emerald-500 bg-slate-200 dark:bg-slate-800">
                              {item.toName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] py-0 px-2 font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending Offline Settlement
                          </Badge>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => setSelectedPending(item)}
                          className="rounded-xl text-xs font-semibold gap-1.5 bg-[#0F9D58] hover:bg-[#0d874b] text-white shadow-[0_0_12px_rgba(15,157,88,0.35)] transition-all hover:scale-[1.03]"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Mark as Settled</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-1" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No Pending Settlements
                  </p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    All members have completed payments and balances are settled. New settlement approvals will appear when expenses are added.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search by member, method, reason..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 rounded-xl text-xs h-9"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportHistoryCSV}
                    disabled={history.length === 0}
                    className="rounded-xl text-xs gap-1.5 h-9"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export CSV</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportHistoryJSON}
                    disabled={history.length === 0}
                    className="rounded-xl text-xs gap-1.5 h-9"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Export JSON</span>
                  </Button>
                </div>
              </div>

              {filteredHistory.length > 0 ? (
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="p-3.5">Approved Date</th>
                        <th className="p-3.5">Payer (From)</th>
                        <th className="p-3.5">Receiver (To)</th>
                        <th className="p-3.5 text-right">Amount</th>
                        <th className="p-3.5">Method</th>
                        <th className="p-3.5">Reason & Reference</th>
                        <th className="p-3.5">Approved By</th>
                        <th className="p-3.5 text-right">Ledger Transition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredHistory.map((h) => (
                        <tr
                          key={h.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors"
                        >
                          <td className="p-3.5 text-slate-500 whitespace-nowrap">
                            {formatDate(h.approvedDate)}
                          </td>
                          <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {h.fromName}
                          </td>
                          <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {h.toName}
                          </td>
                          <td className="p-3.5 font-black text-right text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {formatCurrency(h.amountRupees)}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <Badge variant="outline" className="text-[10px] py-0 px-2 capitalize bg-primary/10 text-primary border-primary/20">
                              {h.paymentMethod}
                            </Badge>
                          </td>
                          <td className="p-3.5 max-w-[200px]">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{h.reason}</p>
                            {h.transactionReference && (
                              <span className="text-[10px] text-slate-400 font-mono truncate block">
                                Ref: {h.transactionReference}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3 text-emerald-500" />
                              {h.approvedByName}
                            </span>
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 text-[11px] font-mono">
                              <span className="text-rose-500">
                                {formatCurrency(h.previousBalanceRupees)}
                              </span>
                              <ArrowRight className="h-3 w-3 text-slate-400" />
                              <span className="text-emerald-500 font-bold">
                                {formatCurrency(h.newBalanceRupees)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <History className="h-9 w-9 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No verified settlement history recorded yet
                  </p>
                  <p className="text-xs text-slate-400">
                    When admins approve offline payments, the verification logs will appear here.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPending && (
        <SettlementVerificationModal
          open={!!selectedPending}
          onOpenChange={(open) => !open && setSelectedPending(null)}
          groupId={groupId}
          settlementId={selectedPending.id}
          fromUserId={selectedPending.fromUserId}
          fromContactId={selectedPending.fromContactId}
          fromName={selectedPending.fromName}
          fromAvatar={selectedPending.fromAvatar}
          toUserId={selectedPending.toUserId}
          toContactId={selectedPending.toContactId}
          toName={selectedPending.toName}
          toAvatar={selectedPending.toAvatar}
          amount={selectedPending.amount}
          adminName={adminName}
          onSuccess={() => {
            setSelectedPending(null);
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}
