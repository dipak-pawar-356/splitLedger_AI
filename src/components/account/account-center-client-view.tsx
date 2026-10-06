"use client";

import { useState } from "react";
import { AccountOverviewData } from "@/actions/account";
import { AccountOverviewCard } from "@/components/account/account-overview-card";
import { PasswordManagementForm } from "@/components/account/password-management-form";
import { ActiveSessionsCard } from "@/components/account/active-sessions-card";
import { RecoveryAnd2FACard } from "@/components/account/recovery-and-2fa-card";
import { DataExportAndDeletionCard } from "@/components/account/data-export-and-deletion-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Key, Monitor, Download } from "lucide-react";
import { useRouter } from "next/navigation";

interface AccountCenterClientViewProps {
  overview: AccountOverviewData;
}

export function AccountCenterClientView({ overview }: AccountCenterClientViewProps) {
  const [activeTab, setActiveTab] = useState("security");
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Account Overview & Security Score (SECTION 1 & 15) */}
      <AccountOverviewCard overview={overview} />

      {/* Account Sub-Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl flex-wrap h-auto gap-1">
          <TabsTrigger value="security" className="rounded-xl text-xs font-semibold gap-1.5">
            <Key className="h-3.5 w-3.5" />
            <span>Password & 2FA</span>
          </TabsTrigger>

          <TabsTrigger value="sessions" className="rounded-xl text-xs font-semibold gap-1.5">
            <Monitor className="h-3.5 w-3.5" />
            <span>Sessions & Devices</span>
          </TabsTrigger>

          <TabsTrigger value="data" className="rounded-xl text-xs font-semibold gap-1.5">
            <Download className="h-3.5 w-3.5" />
            <span>Data Export & Privacy</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="space-y-6">
          <PasswordManagementForm />
          <RecoveryAnd2FACard
            twoFactorEnabled={overview.twoFactorEnabled}
            recoveryEmail={overview.recoveryEmail}
            recoveryPhone={overview.recoveryPhone}
            recoveryCodesCount={overview.recoveryCodesCount}
            onRefresh={() => router.refresh()}
          />
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <ActiveSessionsCard
            sessions={overview.activeSessions}
            trustedDevices={overview.trustedDevices}
            loginHistory={overview.loginHistory}
            onRefresh={() => router.refresh()}
          />
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <DataExportAndDeletionCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
