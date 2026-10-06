"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Save } from "lucide-react";
import { NotificationPreferences } from "@/lib/types/settings";
import { updateDetailedNotificationPreferences } from "@/actions/notifications";
import { toast } from "sonner";

interface InvitationNotificationsCardProps {
  initialData: NotificationPreferences;
  onRefresh?: () => void;
}

export function InvitationNotificationsCard({ initialData, onRefresh }: InvitationNotificationsCardProps) {
  const [formData, setFormData] = useState<NotificationPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);

  const toggleTrigger = (key: keyof NotificationPreferences["invitationsTriggers"]) => {
    setFormData((prev) => ({
      ...prev,
      invitationsTriggers: {
        ...prev.invitationsTriggers,
        [key]: !prev.invitationsTriggers[key],
      },
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateDetailedNotificationPreferences({
        invitationsTriggers: formData.invitationsTriggers,
      });
      toast.success("Invitation notification triggers saved!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update invitation triggers");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <span>Invitation & Member Onboarding Alerts</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Notifications for token invites, guest acceptances, and link expiration events
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSave} className="space-y-4 max-w-2xl" suppressHydrationWarning>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Invitation Received</p>
                <p className="text-[11px] text-slate-500">When someone invites you to join a new group</p>
              </div>
              <Switch
                checked={formData.invitationsTriggers.received}
                onCheckedChange={() => toggleTrigger("received")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Invitation Accepted</p>
                <p className="text-[11px] text-slate-500">When your invited peer joins the group</p>
              </div>
              <Switch
                checked={formData.invitationsTriggers.accepted}
                onCheckedChange={() => toggleTrigger("accepted")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Invitation Expired</p>
                <p className="text-[11px] text-slate-500">When an unredeemed invite link surpasses 7 days</p>
              </div>
              <Switch
                checked={formData.invitationsTriggers.expired}
                onCheckedChange={() => toggleTrigger("expired")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Guest Registration</p>
                <p className="text-[11px] text-slate-500">When a placeholder guest claims their balance</p>
              </div>
              <Switch
                checked={formData.invitationsTriggers.guestRegistration}
                onCheckedChange={() => toggleTrigger("guestRegistration")}
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
              <span>{isPending ? "Saving..." : "Save Invitation Triggers"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
