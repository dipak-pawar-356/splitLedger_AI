import { requireAuth } from "@/lib/auth";
import { getDetailedNotificationPreferences } from "@/actions/notifications";
import { NotificationPreferencesClientView } from "@/components/notifications/preferences/notification-preferences-client-view";
import Link from "next/link";
import { ArrowLeft, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NotificationPreferencesPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await requireAuth();
  const sParams = await searchParams;
  const activeTab = sParams?.tab || "general";

  const preferences = await getDetailedNotificationPreferences();

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard/notifications" className="hover:text-primary transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              <span>Notifications</span>
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Preferences</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" />
            <span>Notification & Communication Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Customize alert triggers, multi-channel delivery (In-App, Email, WhatsApp, Browser), quiet hours, and schedules in INR (₹)
          </p>
        </div>

        <Link href="/dashboard/notifications">
          <Button variant="outline" size="sm" className="rounded-2xl text-xs gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            <span>View All Notifications</span>
          </Button>
        </Link>
      </div>

      <NotificationPreferencesClientView
        preferences={preferences}
        userEmail={user.email}
        initialTab={activeTab}
      />
    </div>
  );
}
