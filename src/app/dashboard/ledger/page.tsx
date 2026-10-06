import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, contacts, categories } from "@/lib/db/schema/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Filter, Download, Printer, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownLeft, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { TransactionDialog } from "@/components/dialogs/transaction-dialog";

export const dynamic = 'force-dynamic';

export default async function LedgerPage() {
  const user = await requireAuth();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [allTransactions, totalBalance, monthlyIncome, monthlyExpense] = await Promise.all([
    db
      .select({
        id: transactions.id,
        publicId: transactions.publicId,
        type: transactions.type,
        amount: transactions.amount,
        currency: transactions.currency,
        title: transactions.title,
        description: transactions.description,
        date: transactions.date,
        categoryId: transactions.categoryId,
        contactName: contacts.name,
        categoryName: categories.name,
      })
      .from(transactions)
      .leftJoin(contacts, eq(transactions.contactId, contacts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, user.id),
          eq(transactions.isDeleted, false)
        )
      )
      .orderBy(desc(transactions.date))
      .limit(100),
    db
      .select({ 
        amount: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent') THEN ${transactions.amount} ELSE -${transactions.amount} END), 0)` 
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          eq(transactions.isDeleted, false)
        )
      ),
    db
      .select({ amount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          eq(transactions.isDeleted, false),
          sql`${transactions.type} IN ('received', 'lent')`,
          gte(transactions.date, startOfMonth),
          lte(transactions.date, endOfMonth)
        )
      ),
    db
      .select({ amount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          eq(transactions.isDeleted, false),
          sql`${transactions.type} IN ('paid', 'borrowed')`,
          gte(transactions.date, startOfMonth),
          lte(transactions.date, endOfMonth)
        )
      ),
  ]);

  const balance = totalBalance[0]?.amount || 0;
  const income = monthlyIncome[0]?.amount || 0;
  const expense = monthlyExpense[0]?.amount || 0;

  // Calculate running balance for display
  const transactionsWithBalance = allTransactions.map((tx, index) => {
    const amount = tx.type === "received" || tx.type === "lent" ? tx.amount : -tx.amount;
    const previousBalance = index === 0 ? 0 : 
      allTransactions.slice(0, index).reduce((sum, t) => {
        return sum + (t.type === "received" || t.type === "lent" ? t.amount : -t.amount);
      }, 0);
    return {
      ...tx,
      amount,
      runningBalance: previousBalance + amount,
    };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Personal Ledger</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Immutable transaction history and continuous balance tracking (INR ₹)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TransactionDialog />
          <Link href="/dashboard/transactions">
            <Button variant="outline">View All Transactions</Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Current Balance
            </CardTitle>
            <DollarSign className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {formatCurrency(balance / 100)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {balance >= 0 ? "Net receivable / positive" : "Net payable / negative"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Monthly Income
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(income / 100)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Received & Lent this month</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Monthly Expenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(expense / 100)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Paid & Borrowed this month</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Net Cash Flow
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${income - expense >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {formatCurrency((income - expense) / 100)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Net flow for this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Continuous Ledger Entries</CardTitle>
          <p className="text-xs text-slate-500">Auto-calculated from active transactions</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Description</th>
                  <th className="text-left py-3 px-4">Contact</th>
                  <th className="text-left py-3 px-4">Category</th>
                  <th className="text-left py-3 px-4">Type</th>
                  <th className="text-right py-3 px-4">Credit (+)</th>
                  <th className="text-right py-3 px-4">Debit (-)</th>
                  <th className="text-right py-3 px-4">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {transactionsWithBalance.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4 text-sm whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(tx.date)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium">
                      <Link 
                        href={`/dashboard/transactions/${tx.publicId}`}
                        className="hover:text-primary hover:underline"
                      >
                        {tx.title || tx.description}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                      {tx.contactName || "Personal"}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                      {tx.categoryName || "-"}
                    </td>
                    <td className="py-3 px-4 text-sm capitalize">
                      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {tx.amount > 0 ? `+${formatCurrency(tx.amount / 100)}` : "-"}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-rose-600 dark:text-rose-400">
                      {tx.amount < 0 ? `-${formatCurrency(Math.abs(tx.amount) / 100)}` : "-"}
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-semibold ${tx.runningBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {formatCurrency(tx.runningBalance / 100)}
                    </td>
                  </tr>
                ))}
                {transactionsWithBalance.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
