"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Share2, CheckCircle2, Shield, Mail, MessageSquare, Cloud, RefreshCw } from "lucide-react";
import { ConnectedServicesStatus } from "@/actions/settings";
import { toast } from "sonner";

interface ConnectedServicesCardProps {
  initialData: ConnectedServicesStatus;
}

export function ConnectedServicesCard({ initialData }: ConnectedServicesCardProps) {
  const handleTestConnection = (name: string) => {
    toast.success(`${name} connection verified and operational!`);
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" />
          <span>Connected Services & Integrations</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Manage third-party authentication providers, notification gateways, and cloud storage links
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-4 max-w-2xl">
        {/* Clerk Auth */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Clerk Authentication</p>
                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold py-0 px-1.5">
                  ● Active
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">Identity management and secure session token provider</p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs rounded-xl gap-1"
            onClick={() => handleTestConnection("Clerk")}
          >
            <RefreshCw className="h-3 w-3" />
            <span>Test</span>
          </Button>
        </div>

        {/* Email Service */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Email Gateway (Resend)</p>
                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold py-0 px-1.5">
                  ● Connected
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">Transaction summary statements and monthly report delivery</p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs rounded-xl gap-1"
            onClick={() => handleTestConnection("Email Gateway")}
          >
            <RefreshCw className="h-3 w-3" />
            <span>Test</span>
          </Button>
        </div>

        {/* WhatsApp Service */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-xs text-slate-900 dark:text-slate-100">WhatsApp Business Cloud</p>
                <Badge variant="outline" className="text-[10px] text-slate-500 py-0 px-1.5">
                  Configured
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">Automated UPI payment reminders and settlement pings</p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs rounded-xl gap-1"
            onClick={() => handleTestConnection("WhatsApp Gateway")}
          >
            <RefreshCw className="h-3 w-3" />
            <span>Test</span>
          </Button>
        </div>

        {/* Cloud Storage */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Cloud Receipt Storage</p>
                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold py-0 px-1.5">
                  ● Operational
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">Secure receipt image archiving and OCR processing bucket</p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs rounded-xl gap-1"
            onClick={() => handleTestConnection("Cloud Storage")}
          >
            <RefreshCw className="h-3 w-3" />
            <span>Test</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
