"use client";

import { useState, useEffect, useRef } from "react";
import { NotificationPreferences } from "@/lib/types/settings";
import { QuickNotificationControlsCard } from "./quick-notification-controls-card";
import { GeneralNotificationsCard } from "./general-notifications-card";
import { ExpenseNotificationsCard } from "./expense-notifications-card";
import { GroupNotificationsCard } from "./group-notifications-card";
import { SettlementNotificationsCard } from "./settlement-notifications-card";
import { ReminderNotificationsCard } from "./reminder-notifications-card";
import { InvitationNotificationsCard } from "./invitation-notifications-card";
import { ReportNotificationsCard } from "./report-notifications-card";
import { SecurityNotificationsCard } from "./security-notifications-card";
import { CommunicationChannelsCard } from "./communication-channels-card";
import { ChannelEmailCard } from "./channel-email-card";
import { ChannelWhatsAppCard } from "./channel-whatsapp-card";
import { ChannelBrowserCard } from "./channel-browser-card";
import { QuietHoursCard } from "./quiet-hours-card";
import { NotificationScheduleCard } from "./notification-schedule-card";
import { NotificationTemplatesCard } from "./notification-templates-card";
import { DeliveryHistoryCard } from "./delivery-history-card";
import { Input } from "@/components/ui/input";
import { 
  Bell, 
  Receipt, 
  Users, 
  CreditCard, 
  Clock, 
  UserPlus, 
  FileText, 
  ShieldAlert, 
  Share2, 
  Mail, 
  MessageSquare, 
  Globe, 
  Moon, 
  Calendar, 
  LayoutTemplate, 
  History, 
  Search,
  ChevronDown,
  Sliders
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface NotificationPreferencesClientViewProps {
  preferences: NotificationPreferences;
  userEmail?: string;
  initialTab?: string;
}

const NOTIFICATION_TABS = [
  { id: "general", label: "General Alerts", icon: Bell, desc: "Master switch, real-time alerts, daily summaries", group: "Core" },
  { id: "email", label: "Email Gateway", icon: Mail, desc: "HTML statements, PDF attachments, and digests", group: "Channels" },
  { id: "reminders", label: "Reminders & Budgets", icon: Clock, desc: "Scheduled payment nudges and budget caps", group: "Triggers" },
  { id: "settlements", label: "Settlement Triggers", icon: CreditCard, desc: "Payment confirmations, debt clearing in INR (₹)", group: "Triggers" },
  { id: "expenses", label: "Expense Triggers", icon: Receipt, desc: "New expenses, edits, receipts, and mentions", group: "Triggers" },
  { id: "whatsapp", label: "WhatsApp Cloud", icon: MessageSquare, desc: "UPI payment links and WhatsApp message preview", group: "Channels" },
  { id: "quiet_hours", label: "Quiet Hours", icon: Moon, desc: "Mute alerts overnight; security emergency bypass", group: "Schedule" },
  { id: "groups", label: "Group Alerts", icon: Users, desc: "Member additions, role changes, and group settings", group: "Triggers" },
  { id: "invitations", label: "Invitations", icon: UserPlus, desc: "Token invites, acceptances, and link expiration", group: "Triggers" },
  { id: "reports", label: "Report Exports", icon: FileText, desc: "PDF statements and monthly financial ledgers", group: "Tools" },
  { id: "channels", label: "Delivery Channels", icon: Share2, desc: "In-App, Email, WhatsApp, Browser, and routing", group: "Channels" },
  { id: "security", label: "Security & Auth", icon: ShieldAlert, desc: "Critical logins, password changes (Enforced)", group: "Core" },
  { id: "browser", label: "Browser & Desktop", icon: Globe, desc: "Web Notification API permissions and popups", group: "Channels" },
  { id: "schedule", label: "Delivery Schedule", icon: Calendar, desc: "Morning 8 AM & Evening 7 PM automated digests", group: "Schedule" },
  { id: "templates", label: "Message Templates", icon: LayoutTemplate, desc: "Variable interpolation engines in INR (₹)", group: "Tools" },
  { id: "history", label: "Delivery History", icon: History, desc: "Immutable dispatch audit logs across channels", group: "Tools" },
];

function normalizeTab(rawTab?: string | null): string {
  if (!rawTab) return "general";
  const lower = rawTab.toLowerCase().trim();
  if (lower === "settlement" || lower === "settlements" || lower === "payment" || lower === "payments") return "settlements";
  if (lower === "reminder" || lower === "reminders" || lower === "budget" || lower === "budgets") return "reminders";
  if (lower === "email" || lower === "emails" || lower === "mail") return "email";
  if (lower === "whatsapp" || lower === "wa") return "whatsapp";
  if (lower === "expense" || lower === "expenses") return "expenses";
  if (lower === "group" || lower === "groups") return "groups";
  if (lower === "invite" || lower === "invites" || lower === "invitations") return "invitations";
  if (lower === "quiet" || lower === "quiethours" || lower === "quiet_hours") return "quiet_hours";
  if (lower === "channel" || lower === "channels") return "channels";
  if (lower === "history" || lower === "logs") return "history";
  if (lower === "template" || lower === "templates") return "templates";
  if (lower === "report" || lower === "reports") return "reports";
  if (lower === "security" || lower === "auth") return "security";
  if (lower === "schedule") return "schedule";
  if (lower === "browser" || lower === "push") return "browser";
  return NOTIFICATION_TABS.some((t) => t.id === lower) ? lower : "general";
}

export function NotificationPreferencesClientView({
  preferences,
  userEmail,
  initialTab = "general",
}: NotificationPreferencesClientViewProps) {
  const searchParams = useSearchParams();
  const urlTab = searchParams?.get("tab");
  const [activeTab, setActiveTab] = useState(() => normalizeTab(urlTab || initialTab));
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync if URL query param changes
  useEffect(() => {
    if (urlTab) {
      setActiveTab(normalizeTab(urlTab));
    }
  }, [urlTab]);

  const handleSelectTab = (tabId: string, shouldScroll = false) => {
    const validTab = normalizeTab(tabId);
    setActiveTab(validTab);

    // Update URL query parameter without full-page navigation
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", validTab);
      window.history.replaceState({}, "", url.toString());
    }

    if (shouldScroll && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const filteredTabs = NOTIFICATION_TABS.filter(
    (t) =>
      t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.group.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTabMeta = NOTIFICATION_TABS.find((t) => t.id === activeTab) || NOTIFICATION_TABS[0];
  const ActiveIcon = activeTabMeta.icon;

  return (
    <div className="space-y-8">
      {/* 1. TOP HERO: Immediate Quick Notification Controls Card */}
      <QuickNotificationControlsCard
        initialData={preferences}
        onRefresh={() => router.refresh()}
        onSelectTab={(tabId) => handleSelectTab(tabId, true)}
      />

      {/* 2. GRANULAR SETTINGS SECTION */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              <span>Detailed Category Preferences & Channels</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any category below to customize fine-grained trigger rules, dispatch frequency, and delivery channels.
            </p>
          </div>

          {/* Search Filter */}
          <div className="relative w-full sm:w-72" suppressHydrationWarning>
            <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search triggers (e.g. email, quiet hours)..."
              className="pl-9 h-9 rounded-2xl text-xs bg-card"
              suppressHydrationWarning
            />
          </div>
        </div>

        {/* MOBILE & TABLET: Horizontal Scrollable Pills & Quick Select (< lg) */}
        <div className="lg:hidden space-y-3">
          <div className="relative">
            <select
              value={activeTab}
              onChange={(e) => handleSelectTab(e.target.value, true)}
              className="w-full h-11 px-3.5 pr-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card text-xs font-semibold text-slate-800 dark:text-slate-200 appearance-none focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            >
              {NOTIFICATION_TABS.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label} — {tab.desc}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Horizontal Pill Bar */}
          <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none -mx-1 px-1">
            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectTab(tab.id, true)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all ${
                    isActive
                      ? "bg-primary text-white shadow-xs"
                      : "bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 border border-slate-200/50 dark:border-slate-700/50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* DESKTOP & LAPTOP GRID VIEW (Side-by-Side: Sidebar 4 cols, Active Panel 8 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" ref={panelRef}>
          {/* DESKTOP SIDEBAR NAVIGATION */}
          <div className="hidden lg:block lg:col-span-4 space-y-1.5 p-2 rounded-3xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 sticky top-4 max-h-[720px] overflow-y-auto">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Categories</span>
              <span>{filteredTabs.length}</span>
            </div>

            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectTab(tab.id, false)}
                  className={`w-full text-left p-2.5 rounded-2xl flex items-start gap-3 transition-all ${
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
                      {tab.label}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {tab.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ACTIVE SETTINGS PANEL */}
          <div className="lg:col-span-8 min-w-0">
            {activeTab === "general" && (
              <GeneralNotificationsCard
                initialData={preferences}
                onRefresh={() => router.refresh()}
              />
            )}

            {activeTab === "email" && (
              <ChannelEmailCard
                initialData={preferences}
                userEmail={userEmail}
                onRefresh={() => router.refresh()}
              />
            )}

            {activeTab === "reminders" && (
              <ReminderNotificationsCard
                initialData={preferences}
                onRefresh={() => router.refresh()}
              />
            )}

            {activeTab === "settlements" && (
              <SettlementNotificationsCard
                initialData={preferences}
                onRefresh={() => router.refresh()}
              />
            )}

            {activeTab === "expenses" && (
              <ExpenseNotificationsCard
                initialData={preferences}
                onRefresh={() => router.refresh()}
              />
            )}

            {activeTab === "whatsapp" && (
              <ChannelWhatsAppCard
                initialData={preferences}
                onRefresh={() => router.refresh()}
              />
            )}

            {activeTab === "groups" && (
              <GroupNotificationsCard
                initialData={preferences}
                onRefresh={() => router.refresh()}
              />
            )}

            {activeTab === "invitations" && (
              <InvitationNotificationsCard
                initialData={preferences}
                onRefresh={() => router.refresh()}
              />
            )}

            {activeTab === "reports" && (
              <ReportNotificationsCard
                initialData={preferences}
                onRefresh={() => router.refresh()}
              />
            )}

            {activeTab === "security" && (
              <SecurityNotificationsCard initialData={preferences} />
            )}

            {activeTab === "channels" && (
              <CommunicationChannelsCard
                initialData={preferences}
                onRefresh={() => router.refresh()}
              />
            )}

            {activeTab === "browser" && (
              <ChannelBrowserCard
                initialData={preferences}
                onRefresh={() => router.refresh()}
              />
            )}

            {activeTab === "quiet_hours" && (
              <QuietHoursCard
                initialData={preferences}
                onRefresh={() => router.refresh()}
              />
            )}

            {activeTab === "schedule" && (
              <NotificationScheduleCard
                initialData={preferences}
                onRefresh={() => router.refresh()}
              />
            )}

            {activeTab === "templates" && <NotificationTemplatesCard />}

            {activeTab === "history" && <DeliveryHistoryCard />}
          </div>
        </div>
      </div>
    </div>
  );
}
