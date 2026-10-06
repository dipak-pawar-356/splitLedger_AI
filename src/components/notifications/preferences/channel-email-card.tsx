"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Mail, Save, CheckCircle2 } from "lucide-react";
import { NotificationPreferences } from "@/lib/types/settings";
import { updateDetailedNotificationPreferences } from "@/actions/notifications";
import { toast } from "sonner";

interface ChannelEmailCardProps {
  initialData: NotificationPreferences;
  userEmail?: string;
  onRefresh?: () => void;
}

export function ChannelEmailCard({ initialData, userEmail, onRefresh }: ChannelEmailCardProps) {
  const [formData, setFormData] = useState<NotificationPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateDetailedNotificationPreferences({
        emailSettings: formData.emailSettings,
      });
      toast.success("Email notification settings saved!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update email settings");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <span>Email Gateway & Dispatch Configuration</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Configure automated email digest formats, statement attachments, and verified mailbox routing
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl" suppressHydrationWarning>
          {userEmail && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">
                Connected Recipient: <strong className="text-slate-900 dark:text-slate-100 font-mono">{userEmail}</strong>
              </span>
              <span className="flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Verified Mailbox</span>
              </span>
            </div>
          )}

          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Rich HTML Emails</p>
                <p className="text-[11px] text-slate-500">Deliver structured visual layouts with direct action buttons and expense cards</p>
              </div>
              <Switch
                checked={formData.emailSettings.htmlEmails}
                onCheckedChange={(val) =>
                  setFormData({
                    ...formData,
                    emailSettings: { ...formData.emailSettings, htmlEmails: val },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Attach PDF Statements</p>
                <p className="text-[11px] text-slate-500">Automatically attach generated monthly ledger PDFs directly to emails</p>
              </div>
              <Switch
                checked={formData.emailSettings.receiveAttachments}
                onCheckedChange={(val) =>
                  setFormData({
                    ...formData,
                    emailSettings: { ...formData.emailSettings, receiveAttachments: val },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Weekly Financial Digest</p>
                <p className="text-[11px] text-slate-500">Receive Sunday email summaries of your personal & group expenses</p>
              </div>
              <Switch
                checked={formData.emailSettings.weeklySummary}
                onCheckedChange={(val) =>
                  setFormData({
                    ...formData,
                    emailSettings: { ...formData.emailSettings, weeklySummary: val },
                  })
                }
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email Delivery Cadence</Label>
              <select
                value={formData.emailSettings.frequency}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    emailSettings: {
                      ...formData.emailSettings,
                      frequency: e.target.value as any,
                    },
                  })
                }
                className="w-48 h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden font-bold"
              >
                <option value="instant">Instant Dispatch (Live)</option>
                <option value="daily">Daily Consolidated</option>
                <option value="weekly">Weekly Summary Only</option>
              </select>
            </div>

            <Button
              type="submit"
              size="sm"
              className="rounded-xl text-xs gap-1.5 bg-primary"
              disabled={isPending}
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isPending ? "Saving..." : "Save Email Settings"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
