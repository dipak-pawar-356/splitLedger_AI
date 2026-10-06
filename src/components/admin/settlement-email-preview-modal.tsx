"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, Eye, ShieldCheck, UserCheck, AlertCircle } from "lucide-react";

interface EmailPreviewItem {
  recipientName: string;
  recipientEmail: string;
  type: "debtor" | "creditor";
  subject: string;
  html: string;
  amount: number;
  reminderCount: number;
}

interface SettlementEmailPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtorPreviews: EmailPreviewItem[];
  creditorPreviews: EmailPreviewItem[];
  onSendNow?: () => void;
  isSending?: boolean;
}

export function SettlementEmailPreviewModal({
  open,
  onOpenChange,
  debtorPreviews,
  creditorPreviews,
  onSendNow,
  isSending = false,
}: SettlementEmailPreviewModalProps) {
  const [selectedDebtorIdx, setSelectedDebtorIdx] = useState(0);
  const [selectedCreditorIdx, setSelectedCreditorIdx] = useState(0);

  const activeDebtor = debtorPreviews[selectedDebtorIdx] || debtorPreviews[0];
  const activeCreditor = creditorPreviews[selectedCreditorIdx] || creditorPreviews[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] rounded-3xl p-0 overflow-hidden border-slate-200/80 dark:border-slate-800 bg-card flex flex-col">
        {/* Header */}
        <div className="bg-slate-50/80 dark:bg-slate-900/60 p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight">
                  Dynamic Email Previews
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Live rendered settlement emails generated from real-time database calculations
                </DialogDescription>
              </div>
            </div>

            <Badge variant="outline" className="text-xs font-mono font-semibold py-1">
              {debtorPreviews.length} Debtors • {creditorPreviews.length} Creditors
            </Badge>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="debtor" className="flex-1 flex flex-col overflow-hidden p-5">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0 w-full grid grid-cols-2">
            <TabsTrigger value="debtor" className="rounded-xl text-xs font-semibold">
              EMAIL 1: Debtor Reminders ({debtorPreviews.length})
            </TabsTrigger>
            <TabsTrigger value="creditor" className="rounded-xl text-xs font-semibold">
              EMAIL 2: Creditor Updates ({creditorPreviews.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Debtor Email Preview */}
          <TabsContent value="debtor" className="flex-1 flex flex-col overflow-hidden space-y-3 mt-3">
            {debtorPreviews.length > 0 ? (
              <>
                {/* Debtor Selector if multiple */}
                {debtorPreviews.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 text-xs">
                    {debtorPreviews.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedDebtorIdx(idx)}
                        className={`px-3 py-1 rounded-xl whitespace-nowrap transition-all border ${
                          selectedDebtorIdx === idx
                            ? "bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 font-semibold"
                            : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:border-slate-400"
                        }`}
                      >
                        {p.recipientName} (₹{p.amount.toFixed(2)})
                      </button>
                    ))}
                  </div>
                )}

                {/* Email Subject Bar */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs shrink-0 space-y-1">
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>To: <strong className="text-slate-900 dark:text-slate-100">{activeDebtor?.recipientName}</strong> &lt;{activeDebtor?.recipientEmail}&gt;</span>
                    <Badge className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20">
                      Reminder #{activeDebtor?.reminderCount}
                    </Badge>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    Subject: {activeDebtor?.subject}
                  </p>
                </div>

                {/* Rendered HTML Sandbox */}
                <div className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white shadow-inner">
                  <iframe
                    title="Debtor Email Preview"
                    srcDoc={activeDebtor?.html}
                    className="w-full h-full min-h-[360px] border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
              </>
            ) : (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <UserCheck className="h-8 w-8 mx-auto text-emerald-500" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No members currently owe money
                </p>
                <p className="text-xs text-slate-400">
                  All debtors in this group are settled up.
                </p>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: Creditor Email Preview */}
          <TabsContent value="creditor" className="flex-1 flex flex-col overflow-hidden space-y-3 mt-3">
            {creditorPreviews.length > 0 ? (
              <>
                {/* Creditor Selector if multiple */}
                {creditorPreviews.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 text-xs">
                    {creditorPreviews.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedCreditorIdx(idx)}
                        className={`px-3 py-1 rounded-xl whitespace-nowrap transition-all border ${
                          selectedCreditorIdx === idx
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold"
                            : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:border-slate-400"
                        }`}
                      >
                        {p.recipientName} (₹{p.amount.toFixed(2)})
                      </button>
                    ))}
                  </div>
                )}

                {/* Email Subject Bar */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs shrink-0 space-y-1">
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>To: <strong className="text-slate-900 dark:text-slate-100">{activeCreditor?.recipientName}</strong> &lt;{activeCreditor?.recipientEmail}&gt;</span>
                    <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                      Receivable
                    </Badge>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    Subject: {activeCreditor?.subject}
                  </p>
                </div>

                {/* Rendered HTML Sandbox */}
                <div className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white shadow-inner">
                  <iframe
                    title="Creditor Email Preview"
                    srcDoc={activeCreditor?.html}
                    className="w-full h-full min-h-[360px] border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
              </>
            ) : (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <AlertCircle className="h-8 w-8 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No members are currently owed money
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <DialogFooter className="bg-slate-50/80 dark:bg-slate-900/60 p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs h-9"
          >
            Close Preview
          </Button>

          {onSendNow && (debtorPreviews.length > 0 || creditorPreviews.length > 0) && (
            <Button
              onClick={onSendNow}
              disabled={isSending}
              className="rounded-xl text-xs h-9 font-semibold gap-1.5 bg-[#0F9D58] hover:bg-[#0d874b] text-white"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSending ? "Dispatching..." : "Send Reminders Now"}</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
