"use client";

import { useState } from "react";
import { AllSettingsState } from "@/actions/settings";
import { AccountOverviewData } from "@/actions/account";
import { GeneralSettingsCard } from "./general-settings-card";
import { AppearanceAdvancedCard } from "./appearance-advanced-card";
import { RegionalSettingsCard } from "./regional-settings-card";
import { DashboardPreferencesCard } from "./dashboard-preferences-card";
import { GroupPreferencesCard } from "./group-preferences-card";
import { TransactionPreferencesCard } from "./transaction-preferences-card";
import { ReportPreferencesCard } from "./report-preferences-card";
import { NotificationPreferencesCard } from "./notification-preferences-card";
import { AccessibilitySettingsCard } from "./accessibility-settings-card";
import { PrivacySettingsCard } from "./privacy-settings-card";
import { DataAndBackupCard } from "./data-and-backup-card";
import { ConnectedServicesCard } from "./connected-services-card";
import { AboutSystemCard } from "./about-system-card";
import { AccountCenterClientView } from "@/components/account/account-center-client-view";
import { Input } from "@/components/ui/input";
import { 
  Sliders, 
  Palette, 
  Globe, 
  LayoutDashboard, 
  Users, 
  Receipt, 
  FileText, 
  Bell, 
  Eye, 
  Lock, 
  ShieldCheck, 
  HardDrive, 
  Share2, 
  Info, 
  Search 
} from "lucide-react";
import { useRouter } from "next/navigation";

interface SettingsCenterClientViewProps {
  settings: AllSettingsState;
  accountOverview: AccountOverviewData;
  initialTab?: string;
}

const SETTINGS_CATEGORIES = [
  { id: "general", label: "General", icon: Sliders, desc: "Landing route, refresh cadence, sidebar" },
  { id: "appearance", label: "Appearance", icon: Palette, desc: "Theme mode, brand accents, radius, density" },
  { id: "regional", label: "Regional & Currency", icon: Globe, desc: "INR (₹) currency, Indian number system, time zone" },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Widget visibility and layout toggles" },
  { id: "groups", label: "Groups Default", icon: Users, desc: "Split algorithms, reminder schedules, guest policy" },
  { id: "transactions", label: "Transactions", icon: Receipt, desc: "Payment methods, AI auto-category, OCR" },
  { id: "reports", label: "Reports & Export", icon: FileText, desc: "Default formats, periods, chart inclusions" },
  { id: "notifications", label: "Notifications", icon: Bell, desc: "In-app, email, WhatsApp, quiet hours" },
  { id: "accessibility", label: "Accessibility", icon: Eye, desc: "High contrast, reduced motion, WCAG" },
  { id: "privacy", label: "Privacy", icon: Lock, desc: "Profile & financial metric visibility" },
  { id: "account", label: "Account & Security", icon: ShieldCheck, desc: "Password, 2FA, active sessions, security score" },
  { id: "backup", label: "Data & Backup", icon: HardDrive, desc: "Data archives, retention, factory reset" },
  { id: "services", label: "Connected Services", icon: Share2, desc: "Clerk, Email, WhatsApp, Cloud storage" },
  { id: "about", label: "About System", icon: Info, desc: "Version 2.4.0, tech stack, legal & support" },
];

export function SettingsCenterClientView({
  settings,
  accountOverview,
  initialTab = "general",
}: SettingsCenterClientViewProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const filteredCategories = SETTINGS_CATEGORIES.filter(
    (c) =>
      c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Category Search Filter */}
      <div className="relative max-w-md" suppressHydrationWarning>
        <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search preferences (e.g. currency, theme, 2FA, split)..."
          className="pl-9 rounded-2xl text-xs bg-card"
          suppressHydrationWarning
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar (14 Categories) */}
        <div className="lg:col-span-4 space-y-1.5 p-2 rounded-3xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
          {filteredCategories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`w-full text-left p-3 rounded-2xl flex items-start gap-3 transition-all ${
                  isActive
                    ? "bg-background border border-slate-200/80 dark:border-slate-700 shadow-xs text-primary"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-slate-200/60 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate text-slate-900 dark:text-slate-100">
                    {cat.label}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {cat.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content Panel for Active Setting */}
        <div className="lg:col-span-8 min-w-0">
          {activeTab === "general" && (
            <GeneralSettingsCard
              initialData={settings.general}
              onRefresh={() => router.refresh()}
            />
          )}

          {activeTab === "appearance" && (
            <AppearanceAdvancedCard
              initialData={settings.appearance}
              onRefresh={() => router.refresh()}
            />
          )}

          {activeTab === "regional" && (
            <RegionalSettingsCard
              initialData={settings.regional}
              onRefresh={() => router.refresh()}
            />
          )}

          {activeTab === "dashboard" && (
            <DashboardPreferencesCard
              initialData={settings.dashboard}
              onRefresh={() => router.refresh()}
            />
          )}

          {activeTab === "groups" && (
            <GroupPreferencesCard
              initialData={settings.groups}
              onRefresh={() => router.refresh()}
            />
          )}

          {activeTab === "transactions" && (
            <TransactionPreferencesCard
              initialData={settings.transactions}
              onRefresh={() => router.refresh()}
            />
          )}

          {activeTab === "reports" && (
            <ReportPreferencesCard
              initialData={settings.reports}
              onRefresh={() => router.refresh()}
            />
          )}

          {activeTab === "notifications" && (
            <NotificationPreferencesCard
              initialData={settings.notifications}
              onRefresh={() => router.refresh()}
            />
          )}

          {activeTab === "accessibility" && (
            <AccessibilitySettingsCard
              initialData={settings.accessibility}
              onRefresh={() => router.refresh()}
            />
          )}

          {activeTab === "privacy" && (
            <PrivacySettingsCard
              initialData={settings.privacy}
              onRefresh={() => router.refresh()}
            />
          )}

          {activeTab === "account" && (
            <AccountCenterClientView overview={accountOverview} />
          )}

          {activeTab === "backup" && (
            <DataAndBackupCard
              initialData={settings.dataBackup}
              onRefresh={() => router.refresh()}
            />
          )}

          {activeTab === "services" && (
            <ConnectedServicesCard initialData={settings.connectedServices} />
          )}

          {activeTab === "about" && <AboutSystemCard />}
        </div>
      </div>
    </div>
  );
}
