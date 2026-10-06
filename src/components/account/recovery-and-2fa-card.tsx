"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ShieldCheck, 
  KeyRound, 
  Download, 
  RotateCw, 
  Lock, 
  Mail, 
  Phone, 
  Check 
} from "lucide-react";
import { toggleTwoFactorAuth, manageRecoverySettings } from "@/actions/account";
import { toast } from "sonner";

interface RecoveryAnd2FACardProps {
  twoFactorEnabled: boolean;
  recoveryEmail: string | null;
  recoveryPhone: string | null;
  recoveryCodesCount: number;
  onRefresh?: () => void;
}

export function RecoveryAnd2FACard({
  twoFactorEnabled: initial2FA,
  recoveryEmail: initialEmail,
  recoveryPhone: initialPhone,
  recoveryCodesCount,
  onRefresh,
}: RecoveryAnd2FACardProps) {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(initial2FA);
  const [recoveryEmail, setRecoveryEmail] = useState(initialEmail || "");
  const [recoveryPhone, setRecoveryPhone] = useState(initialPhone || "");
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);

  const handleToggle2FA = async (val: boolean) => {
    try {
      await toggleTwoFactorAuth(val);
      setTwoFactorEnabled(val);
      toast.success(val ? "Two-Factor Authentication enabled!" : "2FA disabled.");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update 2FA.");
    }
  };

  const handleSaveRecovery = async () => {
    setIsPending(true);
    try {
      await manageRecoverySettings({
        recoveryEmail: recoveryEmail || undefined,
        recoveryPhone: recoveryPhone || undefined,
      });
      toast.success("Recovery contact details saved.");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to save recovery settings.");
    } finally {
      setIsPending(false);
    }
  };

  const handleGenerateCodes = async () => {
    setIsPending(true);
    try {
      const res = await manageRecoverySettings({ generateCodes: true });
      if (res.recoveryCodes) {
        setGeneratedCodes(res.recoveryCodes);
        toast.success("8 new backup recovery codes generated!");
        if (onRefresh) onRefresh();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to generate recovery codes.");
    } finally {
      setIsPending(false);
    }
  };

  const handleDownloadCodes = () => {
    if (generatedCodes.length === 0) return;
    const text = `SPLITLEGER AI - BACKUP RECOVERY CODES\nGenerated: ${new Date().toISOString()}\n\n${generatedCodes.join("\n")}\n\nKeep these codes in a safe place. Each code can be used once.`;
    const element = document.createElement("a");
    const file = new Blob([text], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `splitledger_recovery_codes_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* 2FA Card (SECTION 9) */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Two-Factor Authentication (2FA)</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Require a secondary verification code when signing in from unfamiliar devices
            </CardDescription>
          </div>

          <Switch
            checked={twoFactorEnabled}
            onCheckedChange={handleToggle2FA}
          />
        </CardHeader>

        <CardContent className="p-6">
          <p className="text-xs text-slate-500 leading-relaxed">
            When enabled, SplitLedger AI protects your financial ledgers and settlement records by requiring an SMS or authenticator code during login.
          </p>
        </CardContent>
      </Card>

      {/* Account Recovery & Backup Codes (SECTION 8) */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <span>Account Recovery & Backup Codes</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Configure fallback recovery options to regain access if you lose your primary device
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>Recovery Email</span>
              </Label>
              <Input
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="backup@example.com"
                className="rounded-xl text-xs bg-background font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>Recovery Mobile Number</span>
              </Label>
              <Input
                value={recoveryPhone}
                onChange={(e) => setRecoveryPhone(e.target.value)}
                placeholder="+91 98765 00000"
                className="rounded-xl text-xs bg-background font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button
              type="button"
              size="sm"
              className="rounded-xl text-xs gap-1.5 bg-primary"
              onClick={handleSaveRecovery}
              disabled={isPending}
            >
              <Check className="h-3.5 w-3.5" />
              <span>Save Recovery Contacts</span>
            </Button>
          </div>

          {/* Backup Codes Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Backup Recovery Codes
                </h4>
                <p className="text-[11px] text-slate-500">
                  Use one-time codes if you lose access to your primary authentication method
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs gap-1.5"
                onClick={handleGenerateCodes}
                disabled={isPending}
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Generate 8 Codes</span>
              </Button>
            </div>

            {generatedCodes.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs font-bold text-center">
                  {generatedCodes.map((code, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-background border text-slate-800 dark:text-slate-200">
                      {code}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-xs">
                  <span className="text-[11px] text-amber-600 font-medium">
                    ⚠️ Save these codes now. They will not be displayed again.
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs rounded-xl gap-1"
                    onClick={handleDownloadCodes}
                  >
                    <Download className="h-3 w-3" />
                    <span>Download TXT</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
