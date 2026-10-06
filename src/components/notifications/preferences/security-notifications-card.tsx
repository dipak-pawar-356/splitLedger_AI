"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Lock, CheckCircle2 } from "lucide-react";
import { NotificationPreferences } from "@/lib/types/settings";

interface SecurityNotificationsCardProps {
  initialData: NotificationPreferences;
}

export function SecurityNotificationsCard({ initialData }: SecurityNotificationsCardProps) {
  const securityItems = [
    { title: "Password Modified", desc: "Immediate alert upon password reset or update" },
    { title: "Primary Email / Mobile Changed", desc: "Instant token confirmation on credential alterations" },
    { title: "New / Untrusted Device Login", desc: "Alert with IP, location, and browser details" },
    { title: "Two-Factor Authentication (2FA)", desc: "Alerts when 2FA is activated, toggled, or recovery codes generated" },
    { title: "Active Session Revocation", desc: "When other sessions are terminated from Account Center" },
    { title: "Suspicious Activity & Rate Limits", desc: "Triggered on multiple failed password attempts or IP switches" },
  ];

  return (
    <Card className="rounded-3xl border border-emerald-200/80 dark:border-emerald-950 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/40 dark:bg-emerald-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <ShieldAlert className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Critical Security & Identity Alerts</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Mandatory system security protections for account authentication and credential changes
            </CardDescription>
          </div>

          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold py-0.5 px-2.5 shrink-0">
            <Lock className="h-3 w-3 mr-1" />
            <span>Always Active (Enforced)</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4 max-w-2xl">
        <p className="text-xs text-slate-500">
          In accordance with enterprise banking and zero-trust standards, security notifications cannot be disabled. They will be immediately dispatched to your verified email address and primary device.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {securityItems.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-3"
            >
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">{item.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
              </div>

              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
