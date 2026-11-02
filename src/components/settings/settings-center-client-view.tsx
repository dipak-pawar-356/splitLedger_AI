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
      <div className="relative max-w-md group" suppressHydrationWarning>
        <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-primary group-focus-within:scale-110 transition-all duration-200" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search preferences (e.g. currency, theme, UPI, 2FA, split)..."
          className="pl-9 rounded-2xl text-xs bg-card/90 border border-slate-200/80 dark:border-slate-800 focus:border-primary/60 focus:ring-4 focus:ring-primary/10 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
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
                className={`group flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 shrink-0 hover:-translate-y-0.5 active:scale-95 ${
                  isActive
                    ? "bg-white dark:bg-slate-800 shadow-sm border border-primary/40 dark:border-primary/50 text-primary ring-1 ring-primary/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6 ${isActive ? "text-primary" : "text-slate-400 group-hover:text-primary"}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar (7 Core Working Categories - Visible on Desktop) */}
        <div className="hidden lg:block lg:col-span-4 space-y-1.5 p-2.5 rounded-3xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md shadow-xs">
          {filteredCategories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`group w-full text-left p-3 rounded-2xl flex items-start gap-3 transition-all duration-200 ease-out hover:-translate-y-0.5 cursor-pointer select-none active:scale-[0.98] ${
                  isActive
                    ? "bg-white dark:bg-slate-800/90 border border-primary/40 dark:border-primary/50 shadow-sm shadow-primary/10 text-primary ring-1 ring-primary/20"
                    : "border border-transparent hover:border-slate-200 dark:hover:border-slate-700/80 hover:bg-white/80 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:shadow-xs"
                }`}
              >
                <div
                  className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:rotate-6 ${
                    isActive
                      ? "bg-primary text-white shadow-md shadow-primary/25"
                      : "bg-slate-200/70 dark:bg-slate-800 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold truncate transition-colors duration-200 ${isActive ? "text-primary" : "text-slate-900 dark:text-slate-100 group-hover:text-primary"}`}>
                    {cat.label}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                    {cat.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content Panel for Active Setting */}
        <div key={activeTab} className="lg:col-span-8 min-w-0 animate-in fade-in-50 slide-in-from-bottom-2 duration-300 fill-mode-both">
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
