import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, contacts, categories, groups, users } from "@/lib/db/schema/schema";
import { eq, desc, and, sql, gte, lte, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Filter, 
  Download, 
  Search, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Receipt, 
  Edit, 
  Trash2, 
  RotateCcw,
  History,
  Tag,
  MapPin,
  FileText
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { TransactionDialog } from "@/components/dialogs/transaction-dialog";
import { TransactionsClientView } from "@/components/transaction/transactions-client-view";
import { AnimatedCounter } from "@/components/ui/animated-counter";

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  try {
    const user = await requireAuth();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const deletedByUsers = alias(users, "deleted_by_users");
    const creatorUsers = alias(users, "creator_users");

    // Fetch active transactions, deleted transactions, and statistics
    const [activeTxList, deletedTxList, monthlyStats, totalStats] = await Promise.all([
      db
        .select({
          id: transactions.id,
          publicId: transactions.publicId,
          title: transactions.title,
          description: transactions.description,
          type: transactions.type,
          amount: transactions.amount,
          currency: transactions.currency,
          date: transactions.date,
          status: transactions.status,
          paymentMethod: transactions.paymentMethod,
          receiptUrl: transactions.receiptUrl,
          location: transactions.location,
          tags: transactions.tags,
          contactName: contacts.name,
          contactId: contacts.id,
          categoryName: categories.name,
          categoryId: categories.id,
          groupName: groups.name,
          groupId: groups.id,
          createdBy: transactions.createdBy,
          creatorName: creatorUsers.name,
        })
        .from(transactions)
        .leftJoin(contacts, eq(transactions.contactId, contacts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(groups, eq(transactions.groupId, groups.id))
        .leftJoin(creatorUsers, eq(transactions.createdBy, creatorUsers.id))
        .where(
          and(
            or(
              eq(transactions.userId, user.id),
              eq(transactions.createdBy, user.id),
              sql`${transactions.groupId} IN (SELECT group_id FROM group_members WHERE user_id = ${user.id})`
            ),
            eq(transactions.isDeleted, false)
          )
        )
        .orderBy(desc(transactions.date))
        .limit(100),

      db
        .select({
          id: transactions.id,
          publicId: transactions.publicId,
          title: transactions.title,
          description: transactions.description,
          type: transactions.type,
          amount: transactions.amount,
          currency: transactions.currency,
          date: transactions.date,
          deletedAt: transactions.deletedAt,
          deletedBy: transactions.deletedBy,
          deletedByName: deletedByUsers.name,
          contactName: contacts.name,
          categoryName: categories.name,
          groupName: groups.name,
        })
        .from(transactions)
        .leftJoin(contacts, eq(transactions.contactId, contacts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(groups, eq(transactions.groupId, groups.id))
        .leftJoin(deletedByUsers, eq(transactions.deletedBy, deletedByUsers.id))
        .where(
          and(
            or(
              eq(transactions.userId, user.id),
              eq(transactions.createdBy, user.id),
              sql`${transactions.groupId} IN (SELECT group_id FROM group_members WHERE user_id = ${user.id})`
            ),
            eq(transactions.isDeleted, true)
          )
        )
        .orderBy(desc(transactions.deletedAt))
        .limit(100),

      db
        .select({
          total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            gte(transactions.date, startOfMonth),
            lte(transactions.date, endOfMonth)
          )
        ),

      db
        .select({
          income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') THEN ${transactions.amount} ELSE 0 END), 0)`,
          expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') THEN ${transactions.amount} ELSE 0 END), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false)
          )
        ),
    ]);

    const monthlyTotal = monthlyStats[0]?.total || 0;
    const monthlyCount = monthlyStats[0]?.count || 0;
    const totalIncome = totalStats[0]?.income || 0;
    const totalExpense = totalStats[0]?.expense || 0;
    const totalCount = totalStats[0]?.count || 0;

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Transactions</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Auditable personal and shared financial ledger (INR ₹)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TransactionDialog />
          </div>
        </div>

        {/* Stats Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="card-lift group rounded-2xl border shadow-sm cursor-pointer transition-all hover:border-slate-300 dark:hover:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                Active Transactions
              </CardTitle>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <History className="h-4 w-4 text-slate-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                <AnimatedCounter value={totalCount} />
              </div>
              <p className="text-xs text-slate-500 mt-1">All recorded transactions</p>
            </CardContent>
          </Card>

          <Card className="card-lift group rounded-2xl border shadow-sm cursor-pointer transition-all hover:border-emerald-500/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                Total Income / Received
              </CardTitle>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                <AnimatedCounter value={formatCurrency(totalIncome / 100)} />
              </div>
              <p className="text-xs text-slate-500 mt-1">Received & Lent</p>
            </CardContent>
          </Card>

          <Card className="card-lift group rounded-2xl border shadow-sm cursor-pointer transition-all hover:border-rose-500/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                Total Expenses / Paid
              </CardTitle>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                <AnimatedCounter value={formatCurrency(totalExpense / 100)} />
              </div>
              <p className="text-xs text-slate-500 mt-1">Paid & Borrowed</p>
            </CardContent>
          </Card>

          <Card className="card-lift group rounded-2xl border shadow-sm cursor-pointer transition-all hover:border-blue-500/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                This Month&apos;s Spending
              </CardTitle>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                <AnimatedCounter value={formatCurrency(monthlyTotal / 100)} />
              </div>
              <p className="text-xs text-slate-500 mt-1">{monthlyCount} transactions in {now.toLocaleString('default', { month: 'short' })}</p>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Tabs: Active vs Deleted */}
        <TransactionsClientView
          activeTransactions={activeTxList}
          deletedTransactions={deletedTxList}
          currentUserId={user.id}
        />
      </div>
    );
  } catch (error) {
    console.error("Error loading transactions page:", error);
    return (
      <div className="p-12 max-w-md mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto text-amber-600 font-bold">
          !
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Unable to Load Transactions</h2>
          <p className="text-slate-500 text-xs mt-1">Please try refreshing the page or returning to dashboard.</p>
        </div>
        <Link href="/dashboard">
          <Button size="sm" className="rounded-xl text-xs font-semibold">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }
}
