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
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span>Group & Payment Defaults</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Configure baseline splitting algorithms, UPI settlement modes, and receipt automation for expenses
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl" suppressHydrationWarning>
          {/* SECTION 1: Group Splitting Policies */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Group Defaults & Governance
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5" suppressHydrationWarning>
                <Label className="text-xs font-semibold">Default Split Method</Label>
                <select
                  value={groupForm.defaultSplitType}
                  onChange={(e) => setGroupForm({ ...groupForm, defaultSplitType: e.target.value as any })}
                  className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden font-bold"
                >
                  <option value="equal">Equal Split (1/N)</option>
                  <option value="percentage">Percentage Split (%)</option>
                  <option value="exact">Exact Amount Split (₹)</option>
                  <option value="shares">Shares Ratio Split</option>
                </select>
              </div>

              <div className="space-y-1.5" suppressHydrationWarning>
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <IndianRupee className="h-3 w-3 text-primary" />
                  <span>Default Settlement Mode</span>
                </Label>
                <select
                  value={groupForm.defaultSettlementMethod}
                  onChange={(e) => setGroupForm({ ...groupForm, defaultSettlementMethod: e.target.value as any })}
                  className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden font-bold"
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm - Standard)</option>
                  <option value="bank_transfer">IMPS / NEFT Bank Transfer</option>
                  <option value="cash">Direct Cash Handover</option>
                </select>
              </div>

              <div className="space-y-1.5" suppressHydrationWarning>
                <Label className="text-xs font-semibold">Default Reminder Interval</Label>
                <select
                  value={groupForm.defaultReminderDays}
                  onChange={(e) => setGroupForm({ ...groupForm, defaultReminderDays: Number(e.target.value) })}
                  className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
                >
                  <option value={3}>Every 3 Days</option>
                  <option value={7}>Every 7 Days (Weekly)</option>
                  <option value={15}>Every 15 Days (Bi-weekly)</option>
                  <option value={30}>Every 30 Days (Monthly)</option>
                </select>
              </div>

              <div className="space-y-1.5" suppressHydrationWarning>
                <Label className="text-xs font-semibold">Guest Member Policy</Label>
                <select
                  value={groupForm.guestMemberPolicy}
                  onChange={(e) => setGroupForm({ ...groupForm, guestMemberPolicy: e.target.value as any })}
                  className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
                >
                  <option value="allow">Allow Temporary Guest Members</option>
                  <option value="require_approval">Require Admin Approval</option>
                  <option value="disallow">Strict (Registered Users Only)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Auto-Generate Shareable Invite Link</p>
                <p className="text-[11px] text-slate-500">Automatically produce encrypted invite token upon group creation</p>
              </div>
              <Switch
                checked={groupForm.autoInvite}
                onCheckedChange={(val) => setGroupForm({ ...groupForm, autoInvite: val })}
              />
            </div>
          </div>

          {/* SECTION 2: Expense Defaults & OCR Automation */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-primary" />
              <span>Expense & Receipt Automation</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5" suppressHydrationWarning>
                <Label className="text-xs font-semibold">Default Expense Mode</Label>
                <select
                  value={txForm.defaultType}
                  onChange={(e) => setTxForm({ ...txForm, defaultType: e.target.value as any })}
                  className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
                >
                  <option value="personal">Personal Ledger Entry</option>
                  <option value="group">Group Shared Expense</option>
                </select>
              </div>

              <div className="space-y-1.5" suppressHydrationWarning>
                <Label className="text-xs font-semibold">Default Payment Method</Label>
                <select
                  value={txForm.defaultPaymentMethod}
                  onChange={(e) => setTxForm({ ...txForm, defaultPaymentMethod: e.target.value as any })}
                  className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden font-bold"
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm - Standard)</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="netbanking">Net Banking</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>AI Smart Category Detection</span>
                  </p>
                  <p className="text-[11px] text-slate-500">Automatically classify titles into Food, Travel, Utilities, or Entertainment</p>
                </div>
                <Switch
                  checked={txForm.autoDetectCategory}
                  onCheckedChange={(val) => setTxForm({ ...txForm, autoDetectCategory: val })}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Auto-Compress Receipts</p>
                  <p className="text-[11px] text-slate-500">Compress image uploads under 500KB while preserving legible text</p>
                </div>
                <Switch
                  checked={txForm.autoReceiptCompression}
                  onCheckedChange={(val) => setTxForm({ ...txForm, autoReceiptCompression: val })}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">OCR Receipt Text Extraction</p>
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
              className="rounded-xl text-xs gap-1.5 bg-primary px-5"
              disabled={isPending}
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isPending ? "Saving..." : "Save Default Preferences"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
