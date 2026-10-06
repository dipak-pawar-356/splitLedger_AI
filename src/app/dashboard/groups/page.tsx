import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { groups, groupMembers, transactions, settlements, users, expenseSplits } from "@/lib/db/schema/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Users, TrendingUp, TrendingDown, DollarSign, Calendar, Clock, 
  CheckCircle2, Archive, ArrowUpRight, ArrowDownLeft, Sparkles, Share2, 
  Plane, Home, Briefcase, Heart, PartyPopper, Tag, Shield, ArrowRight
} from "lucide-react";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import { GroupDialog } from "@/components/dialogs/group-dialog";
import { GroupSettingsMenu } from "@/components/group/group-settings-menu";
import { UniqueGroupInvitationDialog } from "@/components/group/unique-group-invitation-dialog";
import { AnimatedCounter } from "@/components/ui/animated-counter";

export const dynamic = 'force-dynamic';

const CATEGORY_CONFIG: Record<string, { icon: any; gradient: string; badgeClass: string }> = {
  trip: { icon: Plane, gradient: "from-sky-500/20 via-blue-500/10 to-transparent", badgeClass: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200" },
  home: { icon: Home, gradient: "from-emerald-500/20 via-teal-500/10 to-transparent", badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200" },
  friends: { icon: Users, gradient: "from-violet-500/20 via-purple-500/10 to-transparent", badgeClass: "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200" },
  office: { icon: Briefcase, gradient: "from-indigo-500/20 via-slate-500/10 to-transparent", badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200" },
  family: { icon: Heart, gradient: "from-amber-500/20 via-orange-500/10 to-transparent", badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200" },
  couples: { icon: Heart, gradient: "from-rose-500/20 via-pink-500/10 to-transparent", badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200" },
  event: { icon: PartyPopper, gradient: "from-fuchsia-500/20 via-pink-500/10 to-transparent", badgeClass: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 border-fuchsia-200" },
  custom: { icon: Tag, gradient: "from-primary/20 via-primary/10 to-transparent", badgeClass: "bg-primary/10 text-primary border-primary/20" },
};

export default async function GroupsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  try {
    const user = await requireAuth();
    const params = await searchParams;
    const currentTab = params?.tab || "active";

    // 1. Fetch all groups user is a member of
    const rawGroups = await db
      .select({
        id: groups.id,
        publicId: groups.publicId,
        name: groups.name,
        description: groups.description,
        type: groups.type,
        currency: groups.currency,
        coverImage: groups.coverImage,
        splitMethod: groups.splitMethod,
        createdBy: groups.createdBy,
        creatorName: users.name,
        createdAt: groups.createdAt,
        updatedAt: groups.updatedAt,
        isActive: groups.isActive,
      })
      .from(groups)
      .leftJoin(users, eq(groups.createdBy, users.id))
      .where(
        and(
          sql`${groups.id} IN (SELECT group_id FROM group_members WHERE user_id = ${user.id})`,
          eq(groups.isDeleted, false)
        )
      )
      .orderBy(desc(groups.createdAt));

    const groupIds = rawGroups.map((g) => g.id);

    let allMembers: { groupId: number; isGuest: boolean; isAdmin: boolean; userId: number | null }[] = [];
    let allGroupExpenses: { id: number; groupId: number | null; amount: number; paidBy: number | null; date: Date }[] = [];
    let allUserSplits: { transactionId: number; amount: number }[] = [];

    if (groupIds.length > 0) {
      allMembers = await db
        .select({
          groupId: groupMembers.groupId,
          isGuest: groupMembers.isGuest,
          isAdmin: groupMembers.isAdmin,
          userId: groupMembers.userId,
        })
        .from(groupMembers)
        .where(inArray(groupMembers.groupId, groupIds));

      allGroupExpenses = await db
        .select({
          id: transactions.id,
          groupId: transactions.groupId,
          amount: transactions.amount,
          paidBy: transactions.paidBy,
          date: transactions.date,
        })
        .from(transactions)
        .where(
          and(
            inArray(transactions.groupId, groupIds),
            eq(transactions.isDeleted, false)
          )
        );

      const txIds = allGroupExpenses.map((t) => t.id);
      if (txIds.length > 0) {
        allUserSplits = await db
          .select({
            transactionId: expenseSplits.transactionId,
            amount: expenseSplits.amount,
          })
          .from(expenseSplits)
          .where(
            and(
              inArray(expenseSplits.transactionId, txIds),
              eq(expenseSplits.userId, user.id)
            )
          );
      }
    }

    // 2. Process individual group calculations
    const enrichedGroups = rawGroups.map((group) => {
      const groupMemberList = allMembers.filter((m) => m.groupId === group.id);
      const memberCount = groupMemberList.length;
      const guestMemberCount = groupMemberList.filter((m) => m.isGuest).length;
      const currentUserMembership = groupMemberList.find((m) => m.userId === user.id);
      const isOwner = group.createdBy === user.id;
      const isAdmin = isOwner || !!currentUserMembership?.isAdmin;

      const groupExpenses = allGroupExpenses.filter((e) => e.groupId === group.id);
      const totalExpenses = groupExpenses.reduce((sum, e) => sum + e.amount, 0);

      const userPaid = groupExpenses
        .filter((e) => e.paidBy === user.id)
        .reduce((sum, e) => sum + e.amount, 0);

      const groupTxIds = new Set(groupExpenses.map((e) => e.id));
      const userShare = allUserSplits
        .filter((s) => groupTxIds.has(s.transactionId))
        .reduce((sum, s) => sum + s.amount, 0);

      const netBalance = userPaid - userShare;

      const latestExpenseDate = groupExpenses.length > 0 
        ? new Date(Math.max(...groupExpenses.map((e) => new Date(e.date).getTime())))
        : null;
      const lastActivity = latestExpenseDate || group.updatedAt || group.createdAt;

      return {
        ...group,
        memberCount,
        guestMemberCount,
        isOwner,
        isAdmin,
        totalExpenses,
        userPaid,
        yourShare: userShare,
        netBalance,
        lastActivity,
      };
    });

    const activeGroups = enrichedGroups.filter((g) => g.isActive);
    const archivedGroups = enrichedGroups.filter((g) => !g.isActive);

    const totalWillReceive = enrichedGroups
      .filter((g) => g.netBalance > 0)
      .reduce((sum, g) => sum + g.netBalance, 0);

    const totalNeedToPay = Math.abs(
      enrichedGroups
        .filter((g) => g.netBalance < 0)
        .reduce((sum, g) => sum + g.netBalance, 0)
    );

    const totalOverallExpenses = enrichedGroups.reduce((sum, g) => sum + g.totalExpenses, 0);

    return (
      <div className="space-y-6 pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Groups
              </h1>
              <Badge variant="secondary" className="bg-primary/10 text-primary font-bold text-xs">
                ₹ INR
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Split bills effortlessly with friends, flatmates, trips, and family.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <GroupDialog />
          </div>
        </div>

        {/* Aggregate Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-lift group rounded-2xl border-slate-200/80 dark:border-slate-800 hover:shadow-md transition-all bg-card/60 backdrop-blur-sm cursor-pointer hover:border-slate-300 dark:hover:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                Total Groups
              </CardTitle>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                <AnimatedCounter value={enrichedGroups.length} />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {activeGroups.length} active • {archivedGroups.length} archived
              </p>
            </CardContent>
          </Card>

          <Card className="card-lift group rounded-2xl border-emerald-200/60 dark:border-emerald-950 hover:shadow-md transition-all bg-gradient-to-br from-emerald-50/40 via-card to-card dark:from-emerald-950/20 cursor-pointer hover:border-emerald-500/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                You Will Receive
              </CardTitle>
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                <AnimatedCounter value={formatCurrency(totalWillReceive / 100)} />
              </div>
              <p className="text-xs text-slate-500 mt-1">Across all your groups</p>
            </CardContent>
          </Card>

          <Card className="card-lift group rounded-2xl border-rose-200/60 dark:border-rose-950 hover:shadow-md transition-all bg-gradient-to-br from-rose-50/40 via-card to-card dark:from-rose-950/20 cursor-pointer hover:border-rose-500/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[11px] font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors">
                You Need To Pay
              </CardTitle>
              <div className="p-2 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <ArrowDownLeft className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                <AnimatedCounter value={formatCurrency(totalNeedToPay / 100)} />
              </div>
              <p className="text-xs text-slate-500 mt-1">Total pending debts</p>
            </CardContent>
          </Card>

          <Card className="card-lift group rounded-2xl border-blue-200/60 dark:border-blue-950 hover:shadow-md transition-all bg-gradient-to-br from-blue-50/40 via-card to-card dark:from-blue-950/20 cursor-pointer hover:border-blue-500/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[11px] font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                Total Expenses
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                <AnimatedCounter value={formatCurrency(totalOverallExpenses / 100)} />
              </div>
              <p className="text-xs text-slate-500 mt-1">Shared group spending</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <TabsList className="bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl">
              <TabsTrigger value="active" className="text-xs font-bold px-3 py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-sm">
                Active Groups ({activeGroups.length})
              </TabsTrigger>
              <TabsTrigger value="archived" className="text-xs font-bold px-3 py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-sm">
                Archived ({archivedGroups.length})
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs font-bold px-3 py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-sm">
                All Groups ({enrichedGroups.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Active Tab */}
          <TabsContent value="active" className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeGroups.map((group) => (
                <GroupCardItem key={group.id} group={group} userId={user.id} />
              ))}
              {activeGroups.length === 0 && (
                <div className="col-span-full py-16 text-center border-2 border-dashed rounded-3xl p-8 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                    <Users className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">No Active Groups Yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
                    Create a group to start splitting trip expenses, apartment rent, dinners, or events with your friends.
                  </p>
                  <GroupDialog />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Archived Tab */}
          <TabsContent value="archived" className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {archivedGroups.map((group) => (
                <GroupCardItem key={group.id} group={group} userId={user.id} />
              ))}
              {archivedGroups.length === 0 && (
                <div className="col-span-full py-16 text-center border-2 border-dashed rounded-3xl p-8 bg-slate-50/50 dark:bg-slate-900/30">
                  <Archive className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">No Archived Groups</h3>
                  <p className="text-xs text-slate-500">Past groups that you archive will safely remain stored here.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* All Tab */}
          <TabsContent value="all" className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrichedGroups.map((group) => (
                <GroupCardItem key={group.id} group={group} userId={user.id} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  } catch (error) {
    console.error("Error loading groups page:", error);
    return (
      <div className="p-12 max-w-md mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto text-amber-600 font-bold">
          !
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Unable to Load Groups</h2>
          <p className="text-slate-500 text-xs mt-1">Please try refreshing the page or navigating back to dashboard.</p>
        </div>
        <Link href="/dashboard">
          <Button size="sm" className="rounded-xl text-xs font-semibold">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }
}

function GroupCardItem({ group, userId }: { group: any; userId: number }) {
  const isPositive = group.netBalance > 0;
  const isNegative = group.netBalance < 0;
  const categoryMeta = CATEGORY_CONFIG[group.type] || CATEGORY_CONFIG.custom;
  const CategoryIcon = categoryMeta.icon;

  const balanceText = isPositive
    ? `+${formatCurrency(group.netBalance / 100)}`
    : isNegative
    ? `-${formatCurrency(Math.abs(group.netBalance) / 100)}`
    : "₹0.00";

  const balanceSubtext = isPositive
    ? "You will receive"
    : isNegative
    ? "You need to pay"
    : "Settled up";

  return (
    <Card className="card-lift h-full overflow-hidden hover:shadow-xl transition-all duration-300 border-slate-200/90 dark:border-slate-800 flex flex-col justify-between group bg-card rounded-2xl cursor-pointer">
      <div>
        {/* Header Visual Banner */}
        {group.coverImage ? (
          <div
            className="h-32 bg-cover bg-center relative group-hover:scale-[1.02] transition-transform duration-300"
            style={{ backgroundImage: `url(${group.coverImage})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-white">
              <Badge variant="secondary" className="bg-black/60 backdrop-blur-md text-white border-white/20 text-[11px] font-semibold flex items-center gap-1.5 capitalize">
                <CategoryIcon className="h-3.5 w-3.5" />
                {group.type}
              </Badge>
              {!group.isActive && (
                <Badge variant="secondary" className="bg-amber-500 text-white text-[10px] font-bold">
                  Archived
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <div className={`h-16 bg-gradient-to-r ${categoryMeta.gradient} px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80`}>
            <Badge variant="secondary" className={`${categoryMeta.badgeClass} text-xs font-bold flex items-center gap-1.5 capitalize py-1`}>
              <CategoryIcon className="h-3.5 w-3.5" />
              {group.type}
            </Badge>
            {!group.isActive && (
              <Badge variant="secondary" className="bg-amber-500 text-white text-[10px] font-bold">
                Archived
              </Badge>
            )}
          </div>
        )}

        <CardHeader className="pb-3 pt-3.5 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Link href={`/dashboard/groups/${group.publicId}`}>
                <CardTitle className="text-lg font-black text-slate-900 dark:text-slate-100 hover:text-primary transition-colors truncate tracking-tight">
                  {group.name}
                </CardTitle>
              </Link>
              {group.description ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 font-normal">
                  {group.description}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic mt-1">No description</p>
              )}
            </div>

            <GroupSettingsMenu
              groupId={group.id}
              publicId={group.publicId}
              groupName={group.name}
              isOwner={group.isOwner}
              isAdmin={group.isAdmin}
              memberCount={group.memberCount}
              totalExpenses={group.totalExpenses}
              outstandingBalance={Math.abs(group.netBalance)}
              initialData={{
                name: group.name,
                description: group.description || "",
                currency: "INR",
                type: group.type,
                splitMethod: group.splitMethod || "equal",
                coverImage: group.coverImage || "",
              }}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-3.5 pt-0 px-4">
          {/* Enhanced Position Banner */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
            isPositive 
              ? "bg-emerald-50/80 dark:bg-emerald-950/25 border-emerald-200/80 dark:border-emerald-900/60 hover:border-emerald-500/50" 
              : isNegative 
              ? "bg-rose-50/80 dark:bg-rose-950/25 border-rose-200/80 dark:border-rose-900/60 hover:border-rose-500/50" 
              : "bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800"
          }`}>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {balanceSubtext}
              </p>
              <p className={`text-xl font-black tracking-tight mt-0.5 ${
                isPositive ? "text-emerald-600 dark:text-emerald-400" : isNegative ? "text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-300"
              }`}>
                <AnimatedCounter value={balanceText} />
              </p>
            </div>
            <div className={`p-2 rounded-full group-hover:scale-110 transition-transform duration-200 ${
              isPositive 
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300" 
                : isNegative 
                ? "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300" 
                : "bg-slate-200 text-slate-600 dark:bg-slate-800"
            }`}>
              {isPositive ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : isNegative ? (
                <ArrowDownLeft className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-slate-500" />
              )}
            </div>
          </div>

          {/* Group 3-Metric Stats Grid */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800/80">
              <p className="text-[10px] font-medium text-slate-500">Members</p>
              <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                <AnimatedCounter value={group.memberCount} />
                {group.guestMemberCount > 0 && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal"> ({group.guestMemberCount}g)</span>
                )}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800/80">
              <p className="text-[10px] font-medium text-slate-500">Expenses</p>
              <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                <AnimatedCounter value={formatCurrency(group.totalExpenses / 100)} />
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800/80">
              <p className="text-[10px] font-medium text-slate-500">Your Share</p>
              <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                <AnimatedCounter value={formatCurrency(group.yourShare / 100)} />
              </p>
            </div>
          </div>

          {/* Metadata Footer */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
            <span>By {group.creatorName || (group.isOwner ? "You" : "Owner")}</span>
            <span>{formatRelativeTime(group.lastActivity)}</span>
          </div>
        </CardContent>
      </div>

      {/* Card Action Links Toolbar */}
      <div className="p-3 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <Link href={`/dashboard/groups/${group.publicId}`} className="flex-1">
          <Button size="sm" className="w-full text-xs font-bold shadow-sm">
            View Group Ledger
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </Link>
        <UniqueGroupInvitationDialog
          groupId={group.publicId}
          groupName={group.name}
          trigger={
            <Button variant="outline" size="sm" className="px-2.5 shrink-0 hover:border-primary/50" title="Share Group Link">
              <Share2 className="h-3.5 w-3.5 text-primary" />
            </Button>
          }
        />
      </div>
    </Card>
  );
}
