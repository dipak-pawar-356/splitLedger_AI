"use client";

import { useState } from "react";
import { NotificationPreferences } from "@/lib/types/settings";
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
  Search 
} from "lucide-react";
import { useRouter } from "next/navigation";

interface NotificationPreferencesClientViewProps {
  preferences: NotificationPreferences;
  userEmail?: string;
  initialTab?: string;
}

const NOTIFICATION_TABS = [
  { id: "general", label: "General Alerts", icon: Bell, desc: "Master switch, real-time alerts, daily summaries" },
  { id: "expenses", label: "Expense Triggers", icon: Receipt, desc: "New expenses, edits, receipts, and mentions" },
  { id: "groups", label: "Group Alerts", icon: Users, desc: "Member additions, role changes, and group settings" },
  { id: "settlements", label: "Settlement Triggers", icon: CreditCard, desc: "Payment confirmations, debt clearing in INR (₹)" },
  { id: "reminders", label: "Reminders & Budgets", icon: Clock, desc: "Scheduled payment nudges and budget caps" },
  { id: "invitations", label: "Invitations", icon: UserPlus, desc: "Token invites, acceptances, and link expiration" },
  { id: "reports", label: "Report Exports", icon: FileText, desc: "PDF statements and monthly financial ledgers" },
  { id: "security", label: "Security & Auth", icon: ShieldAlert, desc: "Critical logins, password changes (Enforced)" },
  { id: "channels", label: "Delivery Channels", icon: Share2, desc: "In-App, Email, WhatsApp, Browser, and routing" },
  { id: "email", label: "Email Gateway", icon: Mail, desc: "HTML statements, PDF attachments, and digests" },
  { id: "whatsapp", label: "WhatsApp Cloud", icon: MessageSquare, desc: "UPI payment links and WhatsApp message preview" },
  { id: "browser", label: "Browser & Desktop", icon: Globe, desc: "Web Notification API permissions and popups" },
  { id: "quiet_hours", label: "Quiet Hours", icon: Moon, desc: "Mute alerts overnight; security emergency bypass" },
  { id: "schedule", label: "Delivery Schedule", icon: Calendar, desc: "Morning 8 AM & Evening 7 PM automated digests" },
  { id: "templates", label: "Message Templates", icon: LayoutTemplate, desc: "Variable interpolation engines in INR (₹)" },
  { id: "history", label: "Delivery History", icon: History, desc: "Immutable dispatch audit logs across channels" },
];

export function NotificationPreferencesClientView({
  preferences,
  userEmail,
  initialTab = "general",
}: NotificationPreferencesClientViewProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const filteredTabs = NOTIFICATION_TABS.filter(
    (t) =>
      t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search Filter */}
      <div className="relative max-w-md" suppressHydrationWarning>
        <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notification settings (e.g. email, WhatsApp, quiet hours)..."
          className="pl-9 rounded-2xl text-xs bg-card"
          suppressHydrationWarning
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-4 space-y-1.5 p-2 rounded-3xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
          {filteredTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
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

        {/* Active Panel View */}
        <div className="lg:col-span-8 min-w-0">
          {activeTab === "general" && (
            <GeneralNotificationsCard
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

          {activeTab === "groups" && (
            <GroupNotificationsCard
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

          {activeTab === "reminders" && (
            <ReminderNotificationsCard
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

          {activeTab === "email" && (
            <ChannelEmailCard
              initialData={preferences}
              userEmail={userEmail}
              onRefresh={() => router.refresh()}
            />
          )}

          {activeTab === "whatsapp" && (
            <ChannelWhatsAppCard
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
  );
}
