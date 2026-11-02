"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Users, Save, Sparkles, Receipt, IndianRupee } from "lucide-react";
import { 
  GroupPreferences, 
  TransactionPreferences, 
  updateGroupPreferences, 
  updateTransactionPreferences 
} from "@/actions/settings";
import { DEFAULT_SETTINGS } from "@/lib/types/settings";
import { toast } from "sonner";

interface GroupPreferencesCardProps {
  initialData?: GroupPreferences;
  initialGroupData?: GroupPreferences;
  initialTransactionData?: TransactionPreferences;
  onRefresh?: () => void;
}

export function GroupPreferencesCard({
  initialData,
  initialGroupData,
  initialTransactionData,
  onRefresh,
}: GroupPreferencesCardProps) {
  const [groupForm, setGroupForm] = useState<GroupPreferences>(
    initialGroupData || initialData || DEFAULT_SETTINGS.groups
  );
  const [txForm, setTxForm] = useState<TransactionPreferences>(
    initialTransactionData || DEFAULT_SETTINGS.transactions
  );
  const [isPending, setIsPending] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await Promise.all([
        updateGroupPreferences(groupForm),
        updateTransactionPreferences(txForm),
      ]);
      toast.success("Group & expense default preferences saved successfully!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update default preferences");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700/80 transition-all duration-300 bg-card/90 backdrop-blur-md group/card">
      {/* Top Luminous Shimmer Line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />

      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary transition-transform duration-200 group-hover/card:scale-110 group-hover/card:rotate-6" />
          <span>Group & Payment Defaults</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Configure baseline splitting algorithms, UPI settlement modes, and receipt automation for expenses
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl" suppressHydrationWarning>
          {/* SECTION 1: Group Splitting Policies */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Group Defaults & Governance
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group" suppressHydrationWarning>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">Default Split Method</Label>
                <select
                  value={groupForm.defaultSplitType}
                  onChange={(e) => setGroupForm({ ...groupForm, defaultSplitType: e.target.value as any })}
                  className="mt-1.5 w-full h-10 sm:h-9 px-3 rounded-xl border border-input text-base sm:text-xs bg-background focus:outline-hidden font-bold transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                >
                  <option value="equal">Equal Split (1/N)</option>
                  <option value="percentage">Percentage Split (%)</option>
                  <option value="exact">Exact Amount Split (₹)</option>
                  <option value="shares">Shares Ratio Split</option>
                </select>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group" suppressHydrationWarning>
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                  <IndianRupee className="h-3.5 w-3.5 text-primary transition-transform duration-200 group-hover:scale-110" />
                  <span>Default Settlement Mode</span>
                </Label>
                <select
                  value={groupForm.defaultSettlementMethod}
                  onChange={(e) => setGroupForm({ ...groupForm, defaultSettlementMethod: e.target.value as any })}
                  className="mt-1.5 w-full h-10 sm:h-9 px-3 rounded-xl border border-input text-base sm:text-xs bg-background focus:outline-hidden font-bold transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm - Standard)</option>
                  <option value="bank_transfer">IMPS / NEFT Bank Transfer</option>
                  <option value="cash">Direct Cash Handover</option>
                </select>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group" suppressHydrationWarning>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">Default Reminder Interval</Label>
                <select
                  value={groupForm.defaultReminderDays}
                  onChange={(e) => setGroupForm({ ...groupForm, defaultReminderDays: Number(e.target.value) })}
                  className="mt-1.5 w-full h-10 sm:h-9 px-3 rounded-xl border border-input text-base sm:text-xs bg-background focus:outline-hidden transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 font-medium"
                >
                  <option value={3}>Every 3 Days</option>
                  <option value={7}>Every 7 Days (Weekly)</option>
                  <option value={15}>Every 15 Days (Bi-weekly)</option>
                  <option value={30}>Every 30 Days (Monthly)</option>
                </select>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group" suppressHydrationWarning>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">Guest Member Policy</Label>
                <select
                  value={groupForm.guestMemberPolicy}
                  onChange={(e) => setGroupForm({ ...groupForm, guestMemberPolicy: e.target.value as any })}
                  className="mt-1.5 w-full h-10 sm:h-9 px-3 rounded-xl border border-input text-base sm:text-xs bg-background focus:outline-hidden transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 font-medium"
                >
                  <option value="allow">Allow Temporary Guest Members</option>
                  <option value="require_approval">Require Admin Approval</option>
                  <option value="disallow">Strict (Registered Users Only)</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">Auto-Generate Shareable Invite Link</p>
                  <p className="text-[11px] text-slate-500">Automatically produce encrypted invite token upon group creation</p>
                </div>
                <Switch
                  checked={groupForm.autoInvite}
                  onCheckedChange={(val) => setGroupForm({ ...groupForm, autoInvite: val })}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Expense Defaults & OCR Automation */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-primary" />
              <span>Expense & Receipt Automation</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group" suppressHydrationWarning>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">Default Expense Mode</Label>
                <select
                  value={txForm.defaultType}
                  onChange={(e) => setTxForm({ ...txForm, defaultType: e.target.value as any })}
                  className="mt-1.5 w-full h-10 sm:h-9 px-3 rounded-xl border border-input text-base sm:text-xs bg-background focus:outline-hidden transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 font-medium"
                >
                  <option value="personal">Personal Ledger Entry</option>
                  <option value="group">Group Shared Expense</option>
                </select>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group" suppressHydrationWarning>
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                  <IndianRupee className="h-3.5 w-3.5 text-primary transition-transform duration-200 group-hover:scale-110" />
                  <span>Default Payment Method</span>
                </Label>
                <select
                  value={txForm.defaultPaymentMethod}
                  onChange={(e) => setTxForm({ ...txForm, defaultPaymentMethod: e.target.value as any })}
                  className="mt-1.5 w-full h-10 sm:h-9 px-3 rounded-xl border border-input text-base sm:text-xs bg-background focus:outline-hidden font-bold transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm - Standard)</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="netbanking">Net Banking</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 group-hover:text-primary transition-colors">
                    <Sparkles className="h-3.5 w-3.5 text-primary transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" />
                    <span>AI Smart Category Detection</span>
                  </p>
                  <p className="text-[11px] text-slate-500">Automatically classify titles into Food, Travel, Utilities, or Entertainment</p>
                </div>
                <Switch
                  checked={txForm.autoDetectCategory}
                  onCheckedChange={(val) => setTxForm({ ...txForm, autoDetectCategory: val })}
                />
              </div>

              <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">Auto-Compress Receipts</p>
                  <p className="text-[11px] text-slate-500">Compress image uploads under 500KB while preserving legible text</p>
                </div>
                <Switch
                  checked={txForm.autoReceiptCompression}
                  onCheckedChange={(val) => setTxForm({ ...txForm, autoReceiptCompression: val })}
                />
              </div>

              <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">OCR Receipt Text Extraction</p>
                  <p className="text-[11px] text-slate-500">Automatically extract merchant, date, and bill amount (in ₹) from receipts</p>
                </div>
                <Switch
                  checked={txForm.ocrAutoScan}
                  onCheckedChange={(val) => setTxForm({ ...txForm, ocrAutoScan: val })}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button
              type="submit"
              size="sm"
              className="w-full sm:w-auto rounded-xl text-xs gap-1.5 bg-primary px-5 h-10 sm:h-9 min-h-[38px] shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer group"
              disabled={isPending}
            >
              <Save className={`h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110 ${isPending ? "animate-spin" : ""}`} />
              <span>{isPending ? "Saving..." : "Save Default Preferences"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
