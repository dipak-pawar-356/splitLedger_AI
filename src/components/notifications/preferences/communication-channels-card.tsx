"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Share2, Bell, Mail, MessageSquare, Globe, Smartphone, Save, Send } from "lucide-react";
import { NotificationPreferences } from "@/lib/types/settings";
import { updateDetailedNotificationPreferences, testSendNotification } from "@/actions/notifications";
import { toast } from "sonner";

interface CommunicationChannelsCardProps {
  initialData: NotificationPreferences;
  onRefresh?: () => void;
}

export function CommunicationChannelsCard({ initialData, onRefresh }: CommunicationChannelsCardProps) {
  const [formData, setFormData] = useState<NotificationPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);
  const [testSending, setTestSending] = useState<string | null>(null);

  const toggleChannel = (channel: keyof NotificationPreferences["channels"]) => {
    setFormData((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: !prev.channels[channel],
      },
    }));
  };

  const handleTestChannel = async (channel: string) => {
    setTestSending(channel);
    try {
      await testSendNotification(channel);
      toast.success(`Sample test alert triggered for ${channel.toUpperCase()}!`);
    } catch (e: any) {
      toast.error(e.message || "Failed to trigger test notification");
    } finally {
      setTestSending(null);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateDetailedNotificationPreferences({
        channels: formData.channels,
        channelRouting: formData.channelRouting,
      });
      toast.success("Communication channels and routing saved!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update channel preferences");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" />
          <span>Communication Channels & Delivery Routing</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Select active communication channels and configure fallback priority orders for critical alerts
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl" suppressHydrationWarning>
          {/* Main Channels Switchboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-900 dark:text-slate-100">In-App Alerts</p>
                  <p className="text-[11px] text-slate-500">Live SSE drawer and top notification bell</p>
                </div>
              </div>
              <Switch
                checked={formData.channels.inApp}
                onCheckedChange={() => toggleChannel("inApp")}
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Email Delivery</p>
                  <p className="text-[11px] text-slate-500">Statements and PDF report delivery</p>
                </div>
              </div>
              <Switch
                checked={formData.channels.email}
                onCheckedChange={() => toggleChannel("email")}
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-900 dark:text-slate-100">WhatsApp Cloud</p>
                  <p className="text-[11px] text-slate-500">Direct UPI payment links in INR (₹)</p>
                </div>
              </div>
              <Switch
                checked={formData.channels.whatsapp}
                onCheckedChange={() => toggleChannel("whatsapp")}
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Browser Push</p>
                  <p className="text-[11px] text-slate-500">System popups when tab is backgrounded</p>
                </div>
              </div>
              <Switch
                checked={formData.channels.browser}
                onCheckedChange={() => toggleChannel("browser")}
              />
            </div>
          </div>

          {/* Fallback Routing Policy */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Delivery Channel Fallback Priority
            </h4>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Expense & Split Alerts</span>
                <span className="font-mono text-[11px] text-slate-500">In-App → Email → WhatsApp</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Settlement Reconciliations</span>
                <span className="font-mono text-[11px] text-slate-500">In-App → WhatsApp → Email</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Security & Authentication</span>
                <span className="font-mono text-[11px] text-slate-500">Email → In-App → WhatsApp</span>
              </div>
            </div>
          </div>

          {/* Channel Testing Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-xs gap-1"
                onClick={() => handleTestChannel("inApp")}
                disabled={testSending !== null}
              >
                <Send className="h-3 w-3 text-primary" />
                <span>Test In-App</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-xs gap-1"
                onClick={() => handleTestChannel("email")}
                disabled={testSending !== null}
              >
                <Send className="h-3 w-3 text-indigo-500" />
                <span>Test Email</span>
              </Button>
            </div>

            <Button
              type="submit"
              size="sm"
              className="rounded-xl text-xs gap-1.5 bg-primary"
              disabled={isPending}
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isPending ? "Saving..." : "Save Channels"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
