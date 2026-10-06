"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Receipt, Save, IndianRupee } from "lucide-react";
import { NotificationPreferences } from "@/lib/types/settings";
import { updateDetailedNotificationPreferences } from "@/actions/notifications";
import { toast } from "sonner";

interface ExpenseNotificationsCardProps {
  initialData: NotificationPreferences;
  onRefresh?: () => void;
}

export function ExpenseNotificationsCard({ initialData, onRefresh }: ExpenseNotificationsCardProps) {
  const [formData, setFormData] = useState<NotificationPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);

  const toggleTrigger = (key: keyof NotificationPreferences["expensesTriggers"]) => {
    setFormData((prev) => ({
      ...prev,
      expensesTriggers: {
        ...prev.expensesTriggers,
        [key]: !prev.expensesTriggers[key],
      },
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateDetailedNotificationPreferences({
        expensesTriggers: formData.expensesTriggers,
      });
      toast.success("Expense notification triggers saved!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update expense triggers");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          <span>Expense & Receipt Triggers</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Select specific triggers for shared group expenses, receipt uploads, and transaction comments in INR (₹)
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSave} className="space-y-4 max-w-2xl" suppressHydrationWarning>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">New Expense Added</p>
                <p className="text-[11px] text-slate-500">When someone logs a shared expense with your split</p>
              </div>
              <Switch
                checked={formData.expensesTriggers.created}
                onCheckedChange={() => toggleTrigger("created")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Expense Edited</p>
                <p className="text-[11px] text-slate-500">Amount, split shares, or participant updates</p>
              </div>
              <Switch
                checked={formData.expensesTriggers.updated}
                onCheckedChange={() => toggleTrigger("updated")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Expense Deleted</p>
                <p className="text-[11px] text-slate-500">Soft deletion or voiding of group transactions</p>
              </div>
              <Switch
                checked={formData.expensesTriggers.deleted}
                onCheckedChange={() => toggleTrigger("deleted")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Receipt Uploaded / Changed</p>
                <p className="text-[11px] text-slate-500">When proof of payment image is attached or OCR processed</p>
              </div>
              <Switch
                checked={formData.expensesTriggers.receiptUploaded}
                onCheckedChange={() => toggleTrigger("receiptUploaded")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Comments & Mentions</p>
                <p className="text-[11px] text-slate-500">Direct mentions like @you on expense discussions</p>
              </div>
              <Switch
                checked={formData.expensesTriggers.mentioned}
                onCheckedChange={() => toggleTrigger("mentioned")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Recurring Expenses</p>
                <p className="text-[11px] text-slate-500">Auto-generated monthly subscriptions or rent splits</p>
              </div>
              <Switch
                checked={formData.expensesTriggers.recurring}
                onCheckedChange={() => toggleTrigger("recurring")}
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-3 border-t">
            <Button
              type="submit"
              size="sm"
              className="rounded-xl text-xs gap-1.5 bg-primary"
              disabled={isPending}
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isPending ? "Saving..." : "Save Expense Triggers"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
