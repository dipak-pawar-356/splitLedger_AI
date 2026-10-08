import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { settlements, contacts, groups, transactions, groupMembers, users } from "@/lib/db/schema/schema";
import { eq, desc, or, and, sql, gte, lte } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Clock, DollarSign, Calendar, TrendingUp, TrendingDown, Filter, Search, Calculator, Send, Bell, Plus, QrCode, AlertCircle, ArrowUpRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { calculateGroupSettlements, createSettlementsFromCalculation, markSettlementAsPaid, markSettlementAsPaidFormAction } from "@/actions/settlements";
import { revalidatePath } from "next/cache";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function SettlementsPage() {
  const user = await requireAuth();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [userSettlements, pendingStats, completedStats, monthlyStats, userGroups, userDbRecord] = await Promise.all([
    db
      .select({
        id: settlements.id,
        publicId: settlements.publicId,
        amount: settlements.amount,
        currency: settlements.currency,
        status: settlements.status,
        paymentMethod: settlements.paymentMethod,
        paidAt: settlements.paidAt,
        createdAt: settlements.createdAt,
        fromContactName: contacts.name,
        toContactName: sql<string>`(
          SELECT name FROM contacts WHERE id = ${settlements.toContactId}
        )`,
        groupName: groups.name,
      })
      .from(settlements)
      .leftJoin(contacts, eq(settlements.fromContactId, contacts.id))
      .leftJoin(groups, eq(settlements.groupId, groups.id))
      .where(
        or(
          eq(settlements.fromUserId, user.id),
          eq(settlements.toUserId, user.id)
        )
      )
      .orderBy(desc(settlements.createdAt))
      .limit(50),
    db
      .select({
        count: sql<number>`COUNT(*)`,
        total: sql<number>`COALESCE(SUM(${settlements.amount}), 0)`,
      })
      .from(settlements)
      .where(
        and(
          or(
            eq(settlements.fromUserId, user.id),
            eq(settlements.toUserId, user.id)
          ),
          eq(settlements.status, "pending")
        )
      ),
    db
      .select({
        count: sql<number>`COUNT(*)`,
        total: sql<number>`COALESCE(SUM(${settlements.amount}), 0)`,
      })
      .from(settlements)
      .where(
        and(
          or(
            eq(settlements.fromUserId, user.id),
            eq(settlements.toUserId, user.id)
          ),
          eq(settlements.status, "completed")
        )
      ),
    db
      .select({
        count: sql<number>`COUNT(*)`,
        total: sql<number>`COALESCE(SUM(${settlements.amount}), 0)`,
      })
      .from(settlements)
      .where(
        and(
          or(
            eq(settlements.fromUserId, user.id),
            eq(settlements.toUserId, user.id)
          ),
          gte(settlements.createdAt, startOfMonth)
        )
      ),
    db
      .select({
        id: groups.id,
        name: groups.name,
        currency: groups.currency,
      })
      .from(groups)
      .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, user.id))
      .limit(10),
    db
      .select({ upiId: users.upiId })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1),
  ]);

  const pendingCount = pendingStats[0]?.count || 0;
  const pendingTotal = pendingStats[0]?.total || 0;
  const completedCount = completedStats[0]?.count || 0;
  const completedTotal = completedStats[0]?.total || 0;
  const monthlyCount = monthlyStats[0]?.count || 0;
  const monthlyTotal = monthlyStats[0]?.total || 0;
  const hasUpi = Boolean(userDbRecord[0]?.upiId?.trim());

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Settlements</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Track and manage your settlements with optimal payment suggestions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calculator className="h-4 w-4 mr-2" />
            Calculate Optimal Settlements
          </Button>
        </div>
      </div>

      {/* Mandatory UPI ID Warning Alert */}
      {!hasUpi && (
        <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">UPI ID Missing in Payment Profile</p>
              <p className="text-xs text-amber-700/90 dark:text-amber-400/90 mt-0.5">
                Before group members can generate dynamic QR codes to settle debts with you, your primary UPI ID must be configured.
              </p>
            </div>
          </div>
          <Link href="/dashboard/profile" className="shrink-0 self-start sm:self-auto">
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm">
              Setup Primary UPI ID
            </Button>
          </Link>
        </div>
      )}

      {/* Dynamic UPI Settlements by Group Card */}
      {userGroups.length > 0 && (
        <Card className="mb-8 rounded-2xl border bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Group UPI Settlement Hubs</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Settlements are calculated independently per group with strict data isolation.
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {userGroups.map((g) => (
                <Link
                  key={g.id}
                  href={`/dashboard/groups/${g.id}/settlements`}
                  className="group block p-4 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-muted/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                        {g.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Dynamic QR & Debt Simplification
                      </p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="card-lift group rounded-2xl border shadow-sm cursor-pointer hover:border-orange-500/50 transition-all bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
              Pending Settlements
            </CardTitle>
            <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-orange-600">
              <AnimatedCounter value={pendingCount} />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              <AnimatedCounter value={formatCurrency(pendingTotal / 100)} /> pending
            </p>
          </CardContent>
        </Card>

        <Card className="card-lift group rounded-2xl border shadow-sm cursor-pointer hover:border-green-500/50 transition-all bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
              Completed This Month
            </CardTitle>
            <div className="p-2 rounded-xl bg-green-50 dark:bg-green-950/40 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-green-600">
              <AnimatedCounter value={completedCount} />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              <AnimatedCounter value={formatCurrency(completedTotal / 100)} /> settled
            </p>
          </CardContent>
        </Card>

        <Card className="card-lift group rounded-2xl border shadow-sm cursor-pointer hover:border-blue-500/50 transition-all bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
              Monthly Total
            </CardTitle>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              <AnimatedCounter value={formatCurrency(monthlyTotal / 100)} />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              <AnimatedCounter value={monthlyCount} /> transactions
            </p>
          </CardContent>
        </Card>

        <Card className="card-lift group rounded-2xl border shadow-sm cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
              Total Settled
            </CardTitle>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <TrendingUp className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              <AnimatedCounter value={completedCount} />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 dark:text-slate-400" />
              <input
                type="text"
                placeholder="Search settlements..."
                className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <select className="px-3 py-2 rounded-md border border-input bg-background">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Date Range
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settlements List */}
      <div className="space-y-4">
        {userSettlements.map((settlement) => (
          <Card key={settlement.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                    settlement.status === "completed"
                      ? "bg-green-100 dark:bg-green-900/20"
                      : "bg-yellow-100 dark:bg-yellow-900/20"
                  }`}>
                    {settlement.status === "completed" ? (
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {settlement.fromContactName || "Someone"} owes you
                    </p>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <span>{settlement.paymentMethod || "No payment method"}</span>
                      {settlement.groupName && (
                        <>
                          <span>•</span>
                          <span>{settlement.groupName}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{formatDate(settlement.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(settlement.amount / 100, settlement.currency)}
                  </p>
                  <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                    settlement.status === "completed"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  }`}>
                    {settlement.status}
                  </span>
                </div>
              </div>
              {settlement.status === "pending" && (
                <div className="flex gap-2 mt-4">
                  <form action={markSettlementAsPaidFormAction.bind(null, settlement.publicId)}>
                    <Button type="submit" size="sm" className="flex-1">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Paid
                    </Button>
                  </form>
                  <Button variant="outline" size="sm">
                    <Send className="h-4 w-4 mr-2" />
                    Send Reminder
                  </Button>
                  <Button variant="outline" size="sm">
                    <Bell className="h-4 w-4 mr-2" />
                    Notify
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {userSettlements.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="mb-4">
                <Calculator className="h-12 w-12 mx-auto text-slate-400" />
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                No settlements yet. Calculate optimal settlements from your transactions.
              </p>
              <Button>
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Settlements
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
