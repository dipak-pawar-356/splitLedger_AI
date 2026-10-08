"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  QrCode,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Smartphone,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { 
  getGroupUpiSettlementsAction, 
  type GroupUpiSettlementsResponse,
  type UpiSettlementCardData 
} from "@/actions/upi-settlements";
import { DynamicUpiSettlementCard } from "./dynamic-upi-settlement-card";
import Link from "next/link";
import { toast } from "sonner";

interface GroupUpiSettlementHubProps {
  groupId: number;
  groupName: string;
  initialData?: GroupUpiSettlementsResponse;
}

export function GroupUpiSettlementHub({
  groupId,
  groupName,
  initialData,
}: GroupUpiSettlementHubProps) {
  const [data, setData] = useState<GroupUpiSettlementsResponse | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchFreshSettlements = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await getGroupUpiSettlementsAction(groupId);
      if (res.success) {
        setData(res);
        if (!silent) toast.success("Settlements refreshed from latest database state");
      } else {
        toast.error(res.error || "Failed to load settlements");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to refresh group settlements");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!initialData) {
      fetchFreshSettlements(true);
    }
  }, [groupId]);

  if (isLoading) {
    return (
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 text-center bg-card">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500 mb-2" />
        <p className="text-xs font-semibold text-slate-500">Calculating latest debt balances...</p>
      </Card>
    );
  }

  const payables = data?.myPayables || [];
  const receivables = data?.myReceivables || [];
  const totalPayable = data?.totalPayableAmount || 0;
  const totalReceivable = data?.totalReceivableAmount || 0;
  const isUpiConfigured = Boolean(data?.isCurrentUserUpiConfigured);

  return (
    <div className="space-y-6">
      {/* Header and Live Refresh Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Dynamic UPI Settlements</span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                Real-Time Database Sync
              </Badge>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Isolated settlement balances for <span className="font-semibold text-slate-700 dark:text-slate-300">{groupName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchFreshSettlements(false)}
            disabled={isRefreshing}
            className="rounded-xl text-xs gap-1.5 font-semibold h-8 border-slate-300 dark:border-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-emerald-500" : ""}`} />
            <span>{isRefreshing ? "Syncing..." : "Sync Latest Amounts"}</span>
          </Button>
        </div>
      </div>

      {/* Warning if current user has receivables but no UPI configured */}
      {receivables.length > 0 && !isUpiConfigured && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-800 dark:text-amber-300">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="text-xs font-bold">You are owed money, but your UPI ID is missing!</p>
              <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90 mt-0.5">
                Group members who owe you ₹{totalReceivable.toFixed(2)} cannot generate your payment QR code until you save your Primary UPI ID in your profile.
              </p>
            </div>
          </div>
          <Link href="/dashboard/profile" className="shrink-0 self-start sm:self-auto">
            <Button size="sm" className="rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white gap-1.5 h-8">
              <Smartphone className="h-3.5 w-3.5" />
              <span>Add UPI ID</span>
            </Button>
          </Link>
        </div>
      )}

      {/* Gross vs Outstanding Financial Metrics Breakdown */}
      {data?.financialBreakdown && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-2xl border bg-card/60 space-y-1">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Gross Paid</p>
            <p className="text-sm font-extrabold text-foreground font-mono">
              ₹{data.financialBreakdown.grossExpensePaid.toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground/70">Expenses created</p>
          </div>

          <div className="p-3 rounded-2xl border bg-card/60 space-y-1">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Gross Share</p>
            <p className="text-sm font-extrabold text-foreground font-mono">
              ₹{data.financialBreakdown.grossShare.toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground/70">Your responsibility</p>
          </div>

          <div className="p-3 rounded-2xl border bg-card/60 space-y-1">
            <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Settled Sent</p>
            <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              ₹{data.financialBreakdown.completedSettlementPaid.toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground/70">Paid settlements</p>
          </div>

          <div className="p-3 rounded-2xl border bg-card/60 space-y-1">
            <p className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">Settled Recv</p>
            <p className="text-sm font-extrabold text-blue-600 dark:text-blue-400 font-mono">
              ₹{data.financialBreakdown.completedSettlementReceived.toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground/70">Collected money</p>
          </div>

          <div className="p-3 rounded-2xl border bg-card/60 space-y-1 border-rose-500/20 bg-rose-500/5">
            <p className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">Remain To Pay</p>
            <p className="text-sm font-extrabold text-rose-600 font-mono">
              ₹{data.financialBreakdown.outstandingPayable.toFixed(2)}
            </p>
            <p className="text-[10px] text-rose-600/70">Unpaid debts</p>
          </div>

          <div className="p-3 rounded-2xl border bg-card/60 space-y-1 border-emerald-500/20 bg-emerald-500/5">
            <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Remain To Recv</p>
            <p className="text-sm font-extrabold text-emerald-600 font-mono">
              ₹{data.financialBreakdown.outstandingReceivable.toFixed(2)}
            </p>
            <p className="text-[10px] text-emerald-600/70">Pending credit</p>
          </div>
        </div>
      )}

      {/* SECTION 1: PAYMENTS YOU OWE (Multi-Receiver Independent Cards) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600">
              <TrendingDown className="h-4 w-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              People You Need to Pay ({payables.length})
            </h4>
          </div>
          {totalPayable > 0 && (
            <span className="text-xs font-bold text-rose-600 font-mono">
              Total Payable: ₹{totalPayable.toFixed(2)}
            </span>
          )}
        </div>

        {payables.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {payables.map((payable) => (
              <DynamicUpiSettlementCard
                key={`payable-${payable.receiverId}`}
                receiverId={payable.receiverId}
                receiverName={payable.receiverName}
                receiverAvatar={payable.receiverAvatar}
                receiverUpiId={payable.receiverUpiId}
                hasValidUpi={payable.hasValidUpi}
                upiValidationMessage={payable.upiValidationMessage}
                amount={payable.amount}
                formattedAmount={payable.formattedAmount}
                currency={payable.currency}
                upiUri={payable.upiUri}
                qrCodeDataUrl={payable.qrCodeDataUrl}
                appLinks={payable.appLinks}
                groupId={groupId}
                groupName={groupName}
                onSettlementCompleted={() => fetchFreshSettlements(true)}
                onRefreshRequested={() => fetchFreshSettlements(false)}
              />
            ))}
          </div>
        ) : (
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 text-center bg-card">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100">No Pending Payments</h5>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              You are completely settled up with all members in {groupName}!
            </p>
          </Card>
        )}
      </div>

      {/* SECTION 2: MONEY OWED TO YOU (Receiving Payments) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Money Owed to You ({receivables.length})
            </h4>
          </div>
          {totalReceivable > 0 && (
            <span className="text-xs font-bold text-emerald-600 font-mono">
              Total Receivable: ₹{totalReceivable.toFixed(2)}
            </span>
          )}
        </div>

        {receivables.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {receivables.map((recv) => (
              <Card key={`recv-${recv.payerId}`} className="rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 bg-card shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 border-2 border-emerald-500/30 shrink-0">
                      <AvatarImage src={recv.payerAvatar || undefined} />
                      <AvatarFallback className="text-xs font-bold bg-slate-200 dark:bg-slate-800 text-emerald-600">
                        {recv.payerName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {recv.payerName}
                      </p>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block mt-0.5">
                        Owes You
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono block">
                      {recv.formattedAmount}
                    </span>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px] px-1.5 py-0 h-4 mt-0.5">
                      Pending
                    </Badge>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Payable via QR</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {isUpiConfigured ? "Your QR active on debtor dashboard" : "Setup UPI to enable QR"}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 text-center bg-card">
            <p className="text-xs text-slate-400">
              No members currently owe you money in this group.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
