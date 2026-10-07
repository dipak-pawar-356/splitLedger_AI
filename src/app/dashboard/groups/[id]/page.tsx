import { requireAuth } from "@/lib/auth";
import { getGroupFinancialDetails } from "@/actions/group-financials";
import { getGroupActivityTimeline } from "@/actions/activity";
import { db } from "@/lib/db";
import { transactions, users, contacts, categories } from "@/lib/db/schema/schema";
import { eq, and, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Users, 
  Receipt, 
  Sparkles, 
  Plus, 
  UserPlus, 
  CheckCircle2, 
  Clock, 
  Settings, 
  FileText,
  DollarSign,
  ArrowRight,
  Share2,
  Trash2,
  History,
  ShieldCheck,
  BellRing,
  Mail
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { GroupOverviewBanner } from "@/components/group/group-overview-banner";
import { WhoPaysWhomCard } from "@/components/group/who-pays-whom-card";
import { GroupExpenseInsights } from "@/components/group/group-expense-insights";
import { MemberFinancialSummary } from "@/components/group/member-financial-summary";
import { SmartAddMemberDialog } from "@/components/dialogs/smart-add-member-dialog";
import { GroupExpenseDialog } from "@/components/dialogs/group-expense-dialog";
import { SettleAllDialog } from "@/components/dialogs/settle-all-dialog";
import { GroupSettingsMenu } from "@/components/group/group-settings-menu";
import { MarkPaidButton } from "@/components/settlement/mark-paid-button";
import { SettleUpButton } from "@/components/settlement/settle-up-button";
import { AdminSettlementApprovalCenter } from "@/components/admin/admin-settlement-approval-center";
import { AdminSettlementReminderCenter } from "@/components/admin/admin-settlement-reminder-center";
import { SettlementReminderLogsTab } from "@/components/admin/settlement-reminder-logs-tab";
import { ActivityCard } from "@/components/activity/activity-card";
import { UniqueGroupInvitationDialog } from "@/components/group/unique-group-invitation-dialog";

export const dynamic = "force-dynamic";

export default async function GroupDetailPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await requireAuth();
  const { id: publicId } = await params;
  const sParams = await searchParams;
  const activeTab = sParams?.tab || "overview";

  let financialData;
  let groupActivities = [];
  try {
    [financialData, groupActivities] = await Promise.all([
      getGroupFinancialDetails(publicId),
      getGroupActivityTimeline(publicId, 20),
    ]);
  } catch (error) {
    redirect("/dashboard/groups");
  }

  const { group, overview, members, settlements, expenseSummary, insights, adminData, expenses } = financialData;
  const groupExpenses = expenses || [];

  const mappedMembersForDialog = members.map((m) => ({
    id: m.id,
    userId: m.userId || undefined,
    contactId: m.contactId || undefined,
    userName: m.name,
    isAdmin: m.role === "admin" || m.role === "owner",
    isGuest: m.isGuest,
  }));

  const isGroupOwner = Boolean(group.isOwner);

  // Settlement Privacy: Only group owner has access to all settlement details across members.
  // Other members only have access to their own settlements (where they are payer or receiver).
  const visiblePendingSettlements = isGroupOwner
    ? settlements.pendingList
    : settlements.pendingList.filter(
        (st) => (st.fromUserId && st.fromUserId === user.id) || (st.toUserId && st.toUserId === user.id)
      );

  const visibleSettlementSuggestions = isGroupOwner
    ? settlements.suggestions
    : settlements.suggestions.filter(
        (sg) => (sg.fromUserId && sg.fromUserId === user.id) || (sg.toUserId && sg.toUserId === user.id)
      );

  return (
    <div className="space-y-6">
      {/* Top Header Navigation & Quick Actions (SECTION 10) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/groups" prefetch={true}>
            <Button variant="ghost" size="sm" className="rounded-xl text-xs gap-1">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Groups</span>
            </Button>
          </Link>
          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{group.name}</span>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Expense */}
          <GroupExpenseDialog
            groupId={group.id}
            groupCurrency={group.currency}
            members={mappedMembersForDialog}
            currentUserId={user.id}
            isAdmin={group.isAdmin}
            trigger={
              <Button size="sm" className="rounded-xl text-xs font-semibold gap-1.5 bg-primary">
                <Plus className="h-3.5 w-3.5" />
                <span>Add Expense</span>
              </Button>
            }
          />

          {/* Smart Add Member */}
          <SmartAddMemberDialog
            groupId={group.id}
            trigger={
              <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1.5">
                <UserPlus className="h-3.5 w-3.5 text-blue-500" />
                <span>Add Member</span>
              </Button>
            }
          />

          {/* Unique Group Invitation Dialog */}
          <UniqueGroupInvitationDialog
            groupId={group.publicId}
            groupName={group.name}
            trigger={
              <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
                <Share2 className="h-3.5 w-3.5" />
                <span>Invite Link & QR</span>
              </Button>
            }
          />

          {/* Settle All */}
          <SettleAllDialog
            groupId={group.id}
            groupName={group.name}
            suggestions={settlements.suggestions}
            trigger={
              <SettleUpButton label="Settle Up" />
            }
          />

          {/* Group Settings / Edit / Delete Menu */}
          <GroupSettingsMenu
            groupId={group.id}
            publicId={group.publicId}
            groupName={group.name}
            isOwner={group.isOwner}
            isAdmin={group.isAdmin}
            memberCount={overview.totalMembers}
            totalExpenses={overview.totalExpenses * 100}
            outstandingBalance={Math.abs(overview.userNetBalance) * 100}
            initialData={{
              name: group.name,
              description: group.description || "",
              currency: group.currency,
              type: group.type,
              splitMethod: "equal",
              coverImage: group.coverImage || "",
            }}
          />
        </div>
      </div>

      {/* SECTION 1 & 2: Group Overview Banner with Exact Net Balance in INR (₹) */}
      <GroupOverviewBanner
        group={group}
        overview={overview}
      />

      {/* SECTION 6: Who Pays Whom Minimal Settlement Suggestions */}
      <WhoPaysWhomCard
        suggestions={settlements.suggestions}
        groupId={group.id}
        groupName={group.name}
        isAdmin={group.isAdmin}
        isOwner={group.isOwner}
        adminName={user.name || "Admin"}
        currentUserId={user.id}
      />

      {/* TABS VIEW: Financials, Expenses, Members, Settlements */}
      <Tabs defaultValue={activeTab} className="space-y-6">
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex-wrap h-auto gap-1">
              <TabsTrigger value="overview" className="rounded-xl text-xs font-semibold">
                Member Financials ({members.length})
              </TabsTrigger>
              <TabsTrigger value="insights" className="rounded-xl text-xs font-semibold">
                Expense Insights & Stats
              </TabsTrigger>
              <TabsTrigger value="expenses" className="rounded-xl text-xs font-semibold">
                Expenses History ({groupExpenses.length})
              </TabsTrigger>
              <TabsTrigger value="settlements" className="rounded-xl text-xs font-semibold">
                Settlement Audit ({visiblePendingSettlements.length > 0 ? `${visiblePendingSettlements.length} Pending` : `${visibleSettlementSuggestions.length} Dues`})
              </TabsTrigger>
              <TabsTrigger value="activity" className="rounded-xl text-xs font-semibold">
                Group Activity ({groupActivities.length})
              </TabsTrigger>

          {(group.isAdmin || group.isOwner) && (
            <>
              <TabsTrigger value="admin-approvals" className="rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Approval Center</span>
              </TabsTrigger>
              <TabsTrigger value="admin-reminders" className="rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400 gap-1.5">
                <BellRing className="h-3.5 w-3.5" />
                <span>Reminder Center</span>
              </TabsTrigger>
              <TabsTrigger value="admin-logs" className="rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                <span>Reminder Logs</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* TAB 1: Member Financials Grid (SECTIONS 3, 4, 5, 9) */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((member) => (
              <MemberFinancialSummary
                key={member.id}
                member={member}
                groupId={group.id}
                groupPublicId={group.publicId}
                groupName={group.name}
                isCurrentUserAdmin={group.isAdmin}
                isGroupOwner={group.isOwner}
                currentUserId={user.id}
                currentUserEmail={user.email}
                totalGroupExpense={overview.totalExpenses}
                totalMembers={overview.totalMembers}
              />
            ))}
          </div>
        </TabsContent>

        {/* TAB 2: Expense Insights & Summary (SECTIONS 8 & 12) */}
        <TabsContent value="insights" className="space-y-6">
          <GroupExpenseInsights
            expenseSummary={expenseSummary}
            insights={insights}
          />
        </TabsContent>

        {/* TAB 3: Expenses History List */}
        <TabsContent value="expenses" className="space-y-4">
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Group Expenses Ledger</CardTitle>
                  <CardDescription className="text-xs">
                    All recorded group expenses with itemized amounts in INR (₹)
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono font-semibold">
                  {groupExpenses.length} Records
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {groupExpenses.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {groupExpenses.map((exp) => (
                    <div key={exp.id} className="group p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all duration-200">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/transactions/${exp.publicId}`}
                          className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate block"
                        >
                          {exp.title || exp.description}
                        </Link>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {exp.categoryName || "General"} • Paid by <strong className="text-slate-700 dark:text-slate-300 font-semibold">{exp.paidByName || exp.paidByContactName || "Member"}</strong> • {formatDate(exp.date)}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-slate-900 dark:text-slate-100 block">
                          {formatCurrency(exp.amount / 100, exp.currency)}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">{exp.paymentMethod || "UPI"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Receipt className="h-8 w-8 mx-auto text-slate-300 mb-1" />
                  <p className="font-semibold text-sm">No expenses added to this group yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: Settlement Audit & Pending Transfers */}
        <TabsContent value="settlements" className="space-y-4">
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base font-bold">Settlement Audit & Transfers</CardTitle>
                  <CardDescription className="text-xs">
                    Track pending settlement requests and execute calculated debt transfers
                  </CardDescription>
                </div>
                {visibleSettlementSuggestions.length > 0 && (
                  <SettleAllDialog
                    groupId={group.id}
                    groupName={group.name}
                    suggestions={visibleSettlementSuggestions}
                    trigger={
                      <Button size="sm" className="h-8 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Settle All ({visibleSettlementSuggestions.length})</span>
                      </Button>
                    }
                  />
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-5">
              {/* 1. Pending Recorded Settlements (Awaiting confirmation) */}
              {visiblePendingSettlements.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Pending Recorded Requests ({visiblePendingSettlements.length})
                    </span>
                    <Badge variant="outline" className="text-[11px] font-semibold text-amber-600 border-amber-300">
                      Awaiting Confirmation
                    </Badge>
                  </div>
                  <div className="space-y-2.5">
                    {visiblePendingSettlements.map((st) => (
                      <div
                        key={st.id}
                        className="group p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 hover:shadow-md hover:border-amber-400/60 hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <div>
                          <p className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {st.fromName} owes {st.toName}
                          </p>
                          <span className="text-[11px] text-slate-400">Created {formatDate(st.createdAt)}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-amber-600">
                            {formatCurrency(st.amount)}
                          </span>
                          <MarkPaidButton
                            settlementId={st.id}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Calculated Outstanding Dues (Calculated by the engine) */}
              {visibleSettlementSuggestions.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Calculated Debts to Settle ({visibleSettlementSuggestions.length})
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {isGroupOwner ? (
                          <>Total pending dues: {formatCurrency(overview.pendingSettlementsAmount || settlements.suggestions.reduce((sum, s) => sum + s.amount, 0))}</>
                        ) : (
                          <>Your pending dues: {formatCurrency(visibleSettlementSuggestions.reduce((sum, s) => sum + s.amount, 0))}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {visibleSettlementSuggestions.map((sg, idx) => (
                      <div
                        key={idx}
                        className="group p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-emerald-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <div>
                          <p className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {sg.fromName} owes {sg.toName}
                          </p>
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                            {formatCurrency(sg.amount)}
                          </span>
                        </div>
                        <SettleAllDialog
                          groupId={group.id}
                          groupName={group.name}
                          suggestions={[sg]}
                          trigger={
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs font-semibold rounded-xl text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10"
                            >
                              Settle
                            </Button>
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Empty State (Only if both are zero) */}
              {visiblePendingSettlements.length === 0 && visibleSettlementSuggestions.length === 0 && (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="h-9 w-9 mx-auto text-emerald-500 mb-1" />
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    {!isGroupOwner && (settlements.pendingList.length > 0 || settlements.suggestions.length > 0)
                      ? "You Have No Pending Settlement Transfers"
                      : "All Debts Are Settled Up!"}
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {!isGroupOwner && (settlements.pendingList.length > 0 || settlements.suggestions.length > 0)
                      ? "Only the group owner has access to full settlement details between other members."
                      : "No pending settlements or outstanding transfer requests in this group."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: Dedicated Group Activity Feed (SECTION 3) */}
        <TabsContent value="activity" className="space-y-4">
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Group Activity Feed</CardTitle>
                  <CardDescription className="text-xs">
                    Live chronological history of expenses, member changes, and settlements in this group
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono font-semibold">
                  {groupActivities.length} Events
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {groupActivities.length > 0 ? (
                groupActivities.map((act) => (
                  <ActivityCard key={act.id} activity={act} />
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-1">
                  <History className="h-8 w-8 mx-auto text-slate-300 mb-1" />
                  <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                    No activity recorded in this group yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {(group.isAdmin || group.isOwner) && (
          <>
            {/* ADMIN TAB 1: Admin Settlement Approval Center */}
            <TabsContent value="admin-approvals" className="space-y-6">
              <AdminSettlementApprovalCenter
                groupId={group.id}
                groupName={group.name}
                adminName={user.name || "Admin"}
                pendingSettlements={settlements.suggestions}
                history={adminData?.history || []}
              />
            </TabsContent>

            {/* ADMIN TAB 2: Automatic Settlement Reminder Center */}
            <TabsContent value="admin-reminders" className="space-y-6">
              <AdminSettlementReminderCenter
                groupId={group.id}
                groupPublicId={group.publicId}
                groupName={group.name}
                initialSettings={
                  adminData?.reminderSettings || {
                    groupId: group.id,
                    isEnabled: false,
                    frequency: "daily",
                    customIntervalDays: 1,
                    reminderTime: "09:00",
                    timezone: "Asia/Kolkata",
                    startDate: null,
                    endDate: null,
                    maxReminderCount: 3,
                    isPaused: false,
                    lastRunAt: null,
                    nextScheduledAt: null,
                  }
                }
                debtorsCount={members.filter((m) => m.needToPay > 0.01).length}
                totalPendingAmount={members.reduce((sum, m) => sum + (m.needToPay > 0 ? m.needToPay : 0), 0)}
              />
            </TabsContent>

            {/* ADMIN TAB 3: Settlement Reminder Logs Tab */}
            <TabsContent value="admin-logs" className="space-y-6">
              <SettlementReminderLogsTab
                groupId={group.id}
                groupPublicId={group.publicId}
                initialLogs={adminData?.emailLogs || []}
                nextScheduledAt={adminData?.reminderSettings?.nextScheduledAt}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
