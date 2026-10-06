import { requireAuth } from "@/lib/auth";
import { getAccountOverview } from "@/actions/account";
import { AccountCenterClientView } from "@/components/account/account-center-client-view";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  await requireAuth();
  const accountOverview = await getAccountOverview();

  return (
    <div className="space-y-6 pb-12">
      <div className="pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Account Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Centralized hub for authentication, credentials, 2FA, active sessions, and personal data archive
        </p>
      </div>

      <AccountCenterClientView overview={accountOverview} />
    </div>
  );
}
