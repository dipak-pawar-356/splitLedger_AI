"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, Eye, Check } from "lucide-react";
import { updateProfilePrivacy } from "@/actions/profile";
import { toast } from "sonner";

interface ProfilePrivacySettingsProps {
  initialSettings: {
    showEmail?: boolean;
    showPhone?: boolean;
    showBio?: boolean;
    showActivity?: boolean;
    showGroups?: boolean;
    showFinancials?: boolean;
  };
}

export function ProfilePrivacySettings({ initialSettings }: ProfilePrivacySettingsProps) {
  const [settings, setSettings] = useState({
    showEmail: initialSettings.showEmail ?? true,
    showPhone: initialSettings.showPhone ?? false,
    showBio: initialSettings.showBio ?? true,
    showActivity: initialSettings.showActivity ?? true,
    showGroups: initialSettings.showGroups ?? true,
    showFinancials: initialSettings.showFinancials ?? false,
  });
  const [isPending, setIsPending] = useState(false);

  const handleSave = async () => {
    setIsPending(true);
    try {
      await updateProfilePrivacy(settings);
      toast.success("Privacy preferences updated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to update privacy settings");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <span>Profile Privacy & Visibility</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Control what information is visible to other group members and peers
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <div className="py-3 flex items-center justify-between gap-3">
            <div>
              <Label className="text-xs font-semibold">Display Email to Group Members</Label>
              <p className="text-[11px] text-slate-400">Allow members in shared groups to view your email address</p>
            </div>
            <Switch
              checked={settings.showEmail}
              onCheckedChange={(val) => setSettings({ ...settings, showEmail: val })}
            />
          </div>

          <div className="py-3 flex items-center justify-between gap-3">
            <div>
              <Label className="text-xs font-semibold">Display Phone Number</Label>
              <p className="text-[11px] text-slate-400">Allow group members to see your primary phone number</p>
            </div>
            <Switch
              checked={settings.showPhone}
              onCheckedChange={(val) => setSettings({ ...settings, showPhone: val })}
            />
          </div>

          <div className="py-3 flex items-center justify-between gap-3">
            <div>
              <Label className="text-xs font-semibold">Display Bio & Occupation</Label>
              <p className="text-[11px] text-slate-400">Show professional biography and company on your member card</p>
            </div>
            <Switch
              checked={settings.showBio}
              onCheckedChange={(val) => setSettings({ ...settings, showBio: val })}
            />
          </div>

          <div className="py-3 flex items-center justify-between gap-3">
            <div>
              <Label className="text-xs font-semibold">Display Activity Feeds</Label>
              <p className="text-[11px] text-slate-400">Include your actions in public group activity timelines</p>
            </div>
            <Switch
              checked={settings.showActivity}
              onCheckedChange={(val) => setSettings({ ...settings, showActivity: val })}
            />
          </div>

          <div className="py-3 flex items-center justify-between gap-3">
            <div>
              <Label className="text-xs font-semibold">Display Financial Summary</Label>
              <p className="text-[11px] text-slate-400">Allow group owners to see your aggregated settlement history</p>
            </div>
            <Switch
              checked={settings.showFinancials}
              onCheckedChange={(val) => setSettings({ ...settings, showFinancials: val })}
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            size="sm"
            className="rounded-xl text-xs gap-1.5 bg-primary px-5"
            onClick={handleSave}
            disabled={isPending}
          >
            <Check className="h-3.5 w-3.5" />
            <span>{isPending ? "Saving..." : "Save Privacy Settings"}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
