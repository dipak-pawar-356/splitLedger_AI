"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Save, IndianRupee } from "lucide-react";
import { NotificationPreferences } from "@/lib/types/settings";
import { updateDetailedNotificationPreferences } from "@/actions/notifications";
import { toast } from "sonner";

interface SettlementNotificationsCardProps {
  initialData: NotificationPreferences;
  onRefresh?: () => void;
}

export function SettlementNotificationsCard({ initialData, onRefresh }: SettlementNotificationsCardProps) {
  const [formData, setFormData] = useState<NotificationPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);

  const toggleTrigger = (key: keyof NotificationPreferences["settlementsTriggers"]) => {
    setFormData((prev) => ({
      ...prev,
      settlementsTriggers: {
        ...prev.settlementsTriggers,
        [key]: !prev.settlementsTriggers[key],
      },
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateDetailedNotificationPreferences({
        settlementsTriggers: formData.settlementsTriggers,
      });
      toast.success("Settlement notification triggers saved!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update settlement triggers");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <span>Debt Settlement & UPI Payment Alerts</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Configure notifications for repayment proposals, payment confirmations, and debt clearance in INR (₹)
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSave} className="space-y-4 max-w-2xl" suppressHydrationWarning>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Settlement Suggested</p>
                <p className="text-[11px] text-slate-500">AI optimized debt simplification transactions</p>
              </div>
              <Switch
                checked={formData.settlementsTriggers.suggested}
                onCheckedChange={() => toggleTrigger("suggested")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Payment Received</p>
                <p className="text-[11px] text-slate-500">When someone marks an outstanding balance paid to you</p>
              </div>
              <Switch
                checked={formData.settlementsTriggers.received}
                onCheckedChange={() => toggleTrigger("received")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Payment Confirmed</p>
                <p className="text-[11px] text-slate-500">When your recorded repayment is acknowledged</p>
              </div>
              <Switch
                checked={formData.settlementsTriggers.paid}
                onCheckedChange={() => toggleTrigger("paid")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Repayment Reminders</p>
                <p className="text-[11px] text-slate-500">Automatic pings for overdue receivables</p>
              </div>
              <Switch
                checked={formData.settlementsTriggers.reminders}
                onCheckedChange={() => toggleTrigger("reminders")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Partial Settlements</p>
                <p className="text-[11px] text-slate-500">When only a fraction of net balance is paid</p>
              </div>
              <Switch
                checked={formData.settlementsTriggers.partialSettlement}
                onCheckedChange={() => toggleTrigger("partialSettlement")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Full Settlement Cleared</p>
                <p className="text-[11px] text-slate-500">When zero-debt status is achieved for a group</p>
              </div>
              <Switch
                checked={formData.settlementsTriggers.fullSettlement}
                onCheckedChange={() => toggleTrigger("fullSettlement")}
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
              <span>{isPending ? "Saving..." : "Save Settlement Triggers"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
