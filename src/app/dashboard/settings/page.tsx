import { requireAuth } from "@/lib/auth";
import { getAllSettings } from "@/actions/settings";
import { getAccountOverview } from "@/actions/account";
import { SettingsCenterClientView } from "@/components/settings/settings-center-client-view";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  await requireAuth();
  const sParams = await searchParams;
  const activeTab = sParams?.tab || "general";

  const [settings, accountOverview] = await Promise.all([
    getAllSettings(),
    getAccountOverview(),
  ]);

  return (
    <div className="space-y-6 pb-12">
      <div className="pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Settings Center
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure visual themes, INR (₹) currency standards, dashboard layouts, group policies, and notification channels
        </p>
      </div>

      <SettingsCenterClientView
        settings={settings}
        accountOverview={accountOverview}
        initialTab={activeTab}
      />
    </div>
  );
}
