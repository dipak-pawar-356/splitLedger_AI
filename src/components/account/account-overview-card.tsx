"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Smartphone, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  Lock, 
  UserCheck, 
  Sparkles 
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { AccountOverviewData } from "@/actions/account";

interface AccountOverviewCardProps {
  overview: AccountOverviewData;
}

export function AccountOverviewCard({ overview }: AccountOverviewCardProps) {
  const getSecurityColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-rose-600 dark:text-rose-400";
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Account Overview & Security Health</span>
            </CardTitle>
            <CardDescription className="text-xs">
              System identity, Clerk authentication status, and security compliance score
            </CardDescription>
          </div>

          <Badge
            variant="outline"
            className={`text-xs font-semibold uppercase tracking-wider ${
              overview.status === "active"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                : "bg-amber-500/10 text-amber-600 border-amber-200"
            }`}
          >
            ● {overview.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Security Score Gauge (SECTION 15) */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Security Score</span>
              </span>
              <span className={`text-xl font-black font-mono ${getSecurityColor(overview.securityScore)}`}>
                {overview.securityScore}/100
              </span>
            </div>

            <Progress value={overview.securityScore} className="h-2.5 rounded-full" />

            {overview.securityRecommendations.length > 0 ? (
              <div className="space-y-1 text-[11px] text-slate-500">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Recommended Action:</p>
                <p>• {overview.securityRecommendations[0]}</p>
              </div>
            ) : (
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Your account meets enterprise security standards</span>
              </p>
            )}
          </div>

          {/* Account Identifiers (SECTION 1) */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
              Identity & Authentication
            </span>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Public User ID</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {overview.publicId}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Registered</span>
                <span className="font-medium text-slate-700 dark:text-slate-300" suppressHydrationWarning>
                  {formatDate(overview.registeredSince)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">2FA Status</span>
                <span className={`font-semibold ${overview.twoFactorEnabled ? "text-emerald-600" : "text-amber-600"}`}>
                  {overview.twoFactorEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          {/* Verification Status (SECTION 1) */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
              Verification Badges
            </span>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>Email Verification</span>
                </span>
                <Badge variant={overview.emailVerified ? "secondary" : "outline"} className="text-[10px] py-0 px-1.5">
                  {overview.emailVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                  <span>Mobile Phone</span>
                </span>
                <Badge variant={overview.mobileVerified ? "secondary" : "outline"} className="text-[10px] py-0 px-1.5">
                  {overview.mobileVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Backup Codes</span>
                </span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                  {overview.recoveryCodesCount > 0 ? `${overview.recoveryCodesCount} generated` : "None"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
