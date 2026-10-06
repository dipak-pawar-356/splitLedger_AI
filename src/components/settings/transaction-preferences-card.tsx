"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Receipt, Save, Sparkles } from "lucide-react";
import { TransactionPreferences, updateTransactionPreferences } from "@/actions/settings";
import { toast } from "sonner";

interface TransactionPreferencesCardProps {
  initialData: TransactionPreferences;
  onRefresh?: () => void;
}

export function TransactionPreferencesCard({ initialData, onRefresh }: TransactionPreferencesCardProps) {
  const [formData, setFormData] = useState<TransactionPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateTransactionPreferences(formData);
      toast.success("Transaction preferences updated!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update transaction preferences");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          <span>Transaction & Receipt Automation</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Configure default payment methods, AI categorization, draft auto-saving, and OCR scan behaviors
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl" suppressHydrationWarning>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">Default Expense Mode</Label>
              <select
                value={formData.defaultType}
                onChange={(e) => setFormData({ ...formData, defaultType: e.target.value as any })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
              >
                <option value="personal">Personal Ledger Entry</option>
                <option value="group">Group Shared Expense</option>
              </select>
            </div>

            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">Default Payment Method</Label>
              <select
                value={formData.defaultPaymentMethod}
                onChange={(e) => setFormData({ ...formData, defaultPaymentMethod: e.target.value as any })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden font-bold"
              >
                <option value="upi">UPI (GPay / PhonePe / Paytm - Standard)</option>
                <option value="card">Credit / Debit Card</option>
                <option value="netbanking">Net Banking</option>
                <option value="cash">Cash</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>AI Smart Category Detection</span>
                </p>
                <p className="text-[11px] text-slate-500">Automatically classify titles into Food, Travel, Utilities, or Entertainment</p>
              </div>
              <Switch
                checked={formData.autoDetectCategory}
                onCheckedChange={(val) => setFormData({ ...formData, autoDetectCategory: val })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Auto-Compress Receipts</p>
                <p className="text-[11px] text-slate-500">Compress image uploads under 500KB while preserving legible text</p>
              </div>
              <Switch
                checked={formData.autoReceiptCompression}
                onCheckedChange={(val) => setFormData({ ...formData, autoReceiptCompression: val })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">OCR Receipt Text Extraction</p>
                <p className="text-[11px] text-slate-500">Automatically extract merchant, date, and bill amount (in ₹) from receipts</p>
              </div>
              <Switch
                checked={formData.ocrAutoScan}
                onCheckedChange={(val) => setFormData({ ...formData, ocrAutoScan: val })}
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button
              type="submit"
              size="sm"
              className="rounded-xl text-xs gap-1.5 bg-primary"
              disabled={isPending}
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isPending ? "Saving..." : "Save Transaction Defaults"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
