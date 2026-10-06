import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contacts, transactions } from "@/lib/db/schema/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Filter, Download, Printer } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function ContactLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id: publicId } = await params;
  const isNumeric = /^\d+$/.test(publicId);

  const [contactRecord] = await db
    .select()
    .from(contacts)
    .where(
      and(
        isNumeric ? eq(contacts.id, Number(publicId)) : eq(contacts.publicId, publicId),
        eq(contacts.userId, user.id),
        eq(contacts.isDeleted, false)
      )
    )
    .limit(1);

  if (!contactRecord) {
    return (
      <div className="p-8">
        <p>Contact not found</p>
      </div>
    );
  }

  const contact = [contactRecord];
  const contactId = contactRecord.id;

  const [allTransactions] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.contactId, contactId),
          eq(transactions.userId, user.id),
          eq(transactions.isDeleted, false)
        )
      )
      .orderBy(desc(transactions.date)),
  ]);

  if (!contact[0]) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Contact not found</h2>
        <Link href="/dashboard/contacts">
          <Button>Back to Contacts</Button>
        </Link>
      </div>
    );
  }

  const contactData = contact[0];
  
  // Calculate running balance
  const transactionsWithBalance = allTransactions.map((tx, index) => {
    const amount = tx.type === "received" || tx.type === "lent" ? tx.amount : -tx.amount;
    const previousBalance = index === 0 ? contactData.openingBalance : 
      allTransactions.slice(0, index).reduce((sum, t) => {
        return sum + (t.type === "received" || t.type === "lent" ? t.amount : -t.amount);
      }, contactData.openingBalance);
    return {
      ...tx,
      amount,
      runningBalance: previousBalance + amount,
    };
  }).reverse();

  const currentBalance = transactionsWithBalance[transactionsWithBalance.length - 1]?.runningBalance || contactData.openingBalance;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link href={`/dashboard/contacts/${contactId}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contact
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Ledger - {contactData.name}</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Complete transaction history and balance tracking
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Opening Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(contactData.openingBalance / 100)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${currentBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(currentBalance / 100)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Credit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(
                allTransactions
                  .filter((t) => t.type === "received" || t.type === "lent")
                  .reduce((sum, t) => sum + t.amount, 0) / 100
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Debit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(
                allTransactions
                  .filter((t) => t.type === "paid" || t.type === "borrowed")
                  .reduce((sum, t) => sum + t.amount, 0) / 100
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Description</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Type</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Credit</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Debit</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Balance</th>
                </tr>
              </thead>
              <tbody>
                {transactionsWithBalance.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900">
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        {formatDate(tx.date)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium">{tx.description}</td>
                    <td className="py-3 px-4 text-sm capitalize">{tx.type}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      {tx.amount > 0 ? formatCurrency(tx.amount / 100) : "-"}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      {tx.amount < 0 ? formatCurrency(Math.abs(tx.amount) / 100) : "-"}
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-semibold ${tx.runningBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(tx.runningBalance / 100)}
                    </td>
                  </tr>
                ))}
                {transactionsWithBalance.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-600 dark:text-slate-400">
                      No transactions yet
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
