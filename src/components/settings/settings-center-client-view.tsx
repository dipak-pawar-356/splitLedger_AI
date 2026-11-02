"use client";

import { useState } from "react";
import { AllSettingsState } from "@/actions/settings";
import { AccountOverviewData } from "@/actions/account";
import { GeneralSettingsCard } from "./general-settings-card";
import { AppearanceAdvancedCard } from "./appearance-advanced-card";
import { RegionalSettingsCard } from "./regional-settings-card";
import { GroupPreferencesCard } from "./group-preferences-card";
import { NotificationPreferencesCard } from "./notification-preferences-card";
import { PrivacySettingsCard } from "./privacy-settings-card";
import { AccountCenterClientView } from "@/components/account/account-center-client-view";
import { Input } from "@/components/ui/input";
import { 
  Sliders, 
  Palette, 
  Globe, 
  Users, 
  Bell, 
  Lock, 
  ShieldCheck, 
  Search 
} from "lucide-react";
import { useRouter } from "next/navigation";

interface SettingsCenterClientViewProps {
  settings: AllSettingsState;
  accountOverview: AccountOverviewData;
  initialTab?: string;
}

const SETTINGS_CATEGORIES = [
  { 
    id: "general", 
    label: "General Preferences", 
    icon: Sliders, 
    desc: "Landing route, compact sidebar, auto-save" 
  },
  { 
    id: "appearance", 
    label: "Appearance & Themes", 
    icon: Palette, 
    desc: "Theme mode, brand accents, density, live preview" 
  },
  { 
    id: "regional", 
    label: "Regional & Currency", 
    icon: Globe, 
    desc: "INR (₹) standard, Lakhs/Crores, time zone, date format" 
  },
  { 
    id: "defaults", 
    label: "Group & Payment Defaults", 
    icon: Users, 
    desc: "Split rules, UPI settlement, reminder cadence, OCR" 
  },
  { 
    id: "notifications", 
    label: "Notifications & Alerts", 
    icon: Bell, 
    desc: "In-app, email, WhatsApp, sound effects, quiet hours" 
  },
  { 
    id: "privacy", 
    label: "Privacy & Visibility", 
    icon: Lock, 
    desc: "Profile visibility, UPI mobile, bio, financial metrics" 
  },
  { 
    id: "account", 
    label: "Account, Security & Data", 
    icon: ShieldCheck, 
    desc: "Password, 2FA, active sessions, JSON/CSV export, reset" 
  },
];

const normalizeTab = (tab: string): string => {
  if (tab === "groups" || tab === "transactions") return "defaults";
  if (tab === "backup" || tab === "security" || tab === "danger") return "account";
  const valid = SETTINGS_CATEGORIES.some((c) => c.id === tab);
  return valid ? tab : "general";
};

export function SettingsCenterClientView({
  settings,
  accountOverview,
  initialTab = "general",
}: SettingsCenterClientViewProps) {
  const [activeTab, setActiveTab] = useState(() => normalizeTab(initialTab));
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
          placeholder="Search preferences (e.g. currency, theme, UPI, 2FA, split)..."
          className="pl-9 rounded-2xl text-xs bg-card"
          suppressHydrationWarning
        />
      </div>

      {/* Mobile Horizontal Category Scroller */}
      <div className="lg:hidden relative">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-background to-transparent z-10" />
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 touch-pan-x">
          {filteredCategories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 touch-press ${
                  isActive
                    ? "bg-white dark:bg-slate-800 shadow-xs border border-slate-200/90 dark:border-slate-700 text-primary"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-slate-400"}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar (7 Core Working Categories - Visible on Desktop) */}
        <div className="hidden lg:block lg:col-span-4 space-y-1.5 p-2 rounded-3xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
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

          {activeTab === "defaults" && (
            <GroupPreferencesCard
              initialGroupData={settings.groups}
              initialTransactionData={settings.transactions}
              onRefresh={() => router.refresh()}
            />
          )}

          {activeTab === "notifications" && (
            <NotificationPreferencesCard
              initialData={settings.notifications}
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
        </div>
      </div>
    </div>
  );
}
