"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight, CheckCircle2, Sparkles, Check, Smartphone } from "lucide-react";
import { SettleAllDialog } from "@/components/dialogs/settle-all-dialog";
import { SettleUpButton } from "@/components/settlement/settle-up-button";
import { UpiQuickPayDialog } from "@/components/settlement/upi-quick-pay-dialog";

interface WhoPaysWhomCardProps {
  suggestions: Array<{
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
  }>;
  groupId: number;
  groupName: string;
  isAdmin?: boolean;
  isOwner?: boolean;
  adminName?: string;
  currentUserId?: number;
}

export function WhoPaysWhomCard({
  suggestions,
  groupId,
  groupName,
  isAdmin,
  isOwner,
  adminName,
  currentUserId,
}: WhoPaysWhomCardProps) {
  // Only the group owner has access to full settlement suggestions across all members.
  // Respective users only see settlement suggestions that involve themselves.
  const hasFullAccess = Boolean(isOwner);
  const visibleSuggestions = hasFullAccess
    ? suggestions
    : suggestions.filter(
        (s) =>
          currentUserId &&
          (s.fromUserId === currentUserId || s.toUserId === currentUserId)
      );

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="pb-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold tracking-tight">Who Pays Whom</CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                {hasFullAccess 
                  ? "Minimal transfer settlement suggestions calculated by the engine"
                  : "Your settlement transfers calculated by the engine"}
              </CardDescription>
            </div>
          </div>
          {visibleSuggestions.length > 0 && (
            <SettleAllDialog
              groupId={groupId}
              groupName={groupName}
              suggestions={visibleSuggestions}
              trigger={
                <SettleUpButton label="Settle Debts" size="sm" />
              }
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        {visibleSuggestions.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visibleSuggestions.map((s, idx) => (
              <div
                key={idx}
                className="group p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/90 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-slate-900/80 cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Payer (Debtor) */}
                  <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
                    <Avatar className="h-11 w-11 border-2 border-rose-500/30 shadow-xs shrink-0 ring-2 ring-rose-500/10 group-hover:scale-105 transition-transform duration-200">
                      <AvatarImage src={s.fromAvatar || undefined} />
                      <AvatarFallback className="text-sm font-bold bg-slate-200 dark:bg-slate-800 text-rose-500">
                        {s.fromName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-[16px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 truncate tracking-tight group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                        {s.fromName}
                      </p>
                      <span className="text-[11px] text-rose-500 font-medium block uppercase tracking-wider mt-0.5">
                        Payer
                      </span>
                    </div>
                  </div>

                  {/* Amount & Visual Transfer Indicator */}
                  <div className="flex flex-col items-center justify-center shrink-0 px-2 py-1 my-1 sm:my-0">
                    <span className="text-[20px] sm:text-[21px] font-bold text-slate-900 dark:text-slate-100 tracking-tight text-center block group-hover:scale-105 transition-transform duration-200">
                      {formatCurrency(s.amount)}
                    </span>
                    <div className="flex items-center gap-1.5 text-emerald-500 mt-1">
                      <div className="w-6 sm:w-8 h-[2px] bg-gradient-to-r from-rose-400 to-emerald-400 rounded-full" />
                      <ArrowRight className="h-4 w-4 text-emerald-500 shrink-0" />
                    </div>
                  </div>

                  {/* Recipient (Creditor) */}
                  <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto sm:justify-end">
                    <div className="min-w-0 sm:text-right order-2 sm:order-1 flex-1 sm:flex-initial">
                      <p className="text-[16px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 truncate tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {s.toName}
                      </p>
                      <span className="text-[11px] text-emerald-500 font-medium block uppercase tracking-wider mt-0.5">
                        Recipient
                      </span>
                    </div>
                    <Avatar className="h-11 w-11 border-2 border-emerald-500/30 shadow-xs shrink-0 ring-2 ring-emerald-500/10 order-1 sm:order-2 group-hover:scale-105 transition-transform duration-200">
                      <AvatarImage src={s.toAvatar || undefined} />
                      <AvatarFallback className="text-sm font-bold bg-slate-200 dark:bg-slate-800 text-emerald-500">
                        {s.toName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>

                {/* Individual Action Bar for this specific debt */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] text-slate-400">
                    {s.fromName} owes {s.toName}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {s.toUserId && (
                      <UpiQuickPayDialog
                        groupId={groupId}
                        groupName={groupName}
                        receiverUserId={s.toUserId}
                        receiverName={s.toName}
                        amount={s.amount}
                        trigger={
                          <Button
                            size="sm"
                            className="h-7 text-xs px-2.5 font-bold rounded-xl gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          >
                            <Smartphone className="h-3.5 w-3.5" />
                            <span>Pay Now</span>
                          </Button>
                        }
                      />
                    )}
                    <SettleAllDialog
                      groupId={groupId}
                      groupName={groupName}
                      suggestions={[s]}
                      trigger={
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2 font-medium rounded-xl gap-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        >
                          <Check className="h-3 w-3" />
                          <span>Manual Settle</span>
                        </Button>
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-slate-400 space-y-1.5">
            <CheckCircle2 className="h-9 w-9 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {suggestions.length > 0 && !hasFullAccess
                ? "You Have No Pending Settlement Transfers"
                : "All Debts Are Settled Up!"}
            </p>
            <p className="text-xs text-slate-400">
              {suggestions.length > 0 && !hasFullAccess
                ? "Full group settlement details are only accessible to the group owner."
                : "No pending transfers required between group members."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
