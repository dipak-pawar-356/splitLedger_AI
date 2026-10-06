"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Users, Save } from "lucide-react";
import { NotificationPreferences } from "@/lib/types/settings";
import { updateDetailedNotificationPreferences } from "@/actions/notifications";
import { toast } from "sonner";

interface GroupNotificationsCardProps {
  initialData: NotificationPreferences;
  onRefresh?: () => void;
}

export function GroupNotificationsCard({ initialData, onRefresh }: GroupNotificationsCardProps) {
  const [formData, setFormData] = useState<NotificationPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);

  const toggleTrigger = (key: keyof NotificationPreferences["groupsTriggers"]) => {
    setFormData((prev) => ({
      ...prev,
      groupsTriggers: {
        ...prev.groupsTriggers,
        [key]: !prev.groupsTriggers[key],
      },
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateDetailedNotificationPreferences({
        groupsTriggers: formData.groupsTriggers,
      });
      toast.success("Group notification triggers saved!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update group triggers");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span>Group Lifecycle Alerts</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Manage notifications for group creation, member additions, role escalations, and group settings
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSave} className="space-y-4 max-w-2xl" suppressHydrationWarning>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Added to Group</p>
                <p className="text-[11px] text-slate-500">When someone adds you to a new split group</p>
              </div>
              <Switch
                checked={formData.groupsTriggers.added}
                onCheckedChange={() => toggleTrigger("added")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Member Role Changed</p>
                <p className="text-[11px] text-slate-500">Promotions or role changes (e.g. Admin, Editor)</p>
              </div>
              <Switch
                checked={formData.groupsTriggers.roleChanged}
                onCheckedChange={() => toggleTrigger("roleChanged")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">New Member Joined</p>
                <p className="text-[11px] text-slate-500">When peers join via invite link or email token</p>
              </div>
              <Switch
                checked={formData.groupsTriggers.memberJoined}
                onCheckedChange={() => toggleTrigger("memberJoined")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Guest Converted</p>
                <p className="text-[11px] text-slate-500">When a temporary placeholder registers as a full user</p>
              </div>
              <Switch
                checked={formData.groupsTriggers.guestConverted}
                onCheckedChange={() => toggleTrigger("guestConverted")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Group Settings Updated</p>
                <p className="text-[11px] text-slate-500">Changes to default split, group name, or permissions</p>
              </div>
              <Switch
                checked={formData.groupsTriggers.settingsUpdated}
                onCheckedChange={() => toggleTrigger("settingsUpdated")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Member Left Group</p>
                <p className="text-[11px] text-slate-500">When a settled member exits the group ledger</p>
              </div>
              <Switch
                checked={formData.groupsTriggers.memberLeft}
                onCheckedChange={() => toggleTrigger("memberLeft")}
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
              <span>{isPending ? "Saving..." : "Save Group Triggers"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
