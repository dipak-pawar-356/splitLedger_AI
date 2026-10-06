import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contacts, transactions, settlements, users } from "@/lib/db/schema/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, Calendar, DollarSign, TrendingUp, TrendingDown, Edit, Trash2, MessageSquare, Send, BarChart3, Receipt, History, Filter, Download } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { TransactionDialog } from "@/components/dialogs/transaction-dialog";
import { ReminderDialog } from "@/components/dialogs/reminder-dialog";

export const dynamic = 'force-dynamic';

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id: publicId } = await params;

  // First, fetch the contact by publicId to get the numeric ID
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.publicId, publicId), eq(contacts.userId, user.id)))
    .limit(1);

  if (!contact) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Contact not found</h2>
        <Link href="/dashboard/contacts">
          <Button>Back to Contacts</Button>
        </Link>
      </div>
    );
  }

  const contactId = contact.id; // Use the numeric ID for internal queries

  const [contactTransactions, contactSettlements] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(and(eq(transactions.contactId, contactId), eq(transactions.userId, user.id)))
      .orderBy(desc(transactions.date))
      .limit(20),
    db
      .select()
      .from(settlements)
      .where(
        and(
          sql`${settlements.fromContactId} = ${contactId} OR ${settlements.toContactId} = ${contactId}`,
          eq(settlements.status, "pending")
        )
      )
      .limit(5),
  ]);
  
  // Calculate balance
  const balance = contactTransactions.reduce((sum, tx) => {
    if (tx.type === "received" || tx.type === "lent") return sum + tx.amount;
    return sum - tx.amount;
  }, 0);

  // Calculate monthly summary
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyTransactions = contactTransactions.filter(
    (tx) => tx.date >= startOfMonth
  );
  const monthlyTotal = monthlyTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const monthlyReceived = monthlyTransactions
    .filter((tx) => tx.type === "received" || tx.type === "lent")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const monthlyPaid = monthlyTransactions
    .filter((tx) => tx.type === "paid" || tx.type === "borrowed")
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Calculate statistics
  const totalReceived = contactTransactions
    .filter((tx) => tx.type === "received" || tx.type === "lent")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalPaid = contactTransactions
    .filter((tx) => tx.type === "paid" || tx.type === "borrowed")
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/contacts">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {contact.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-1">{contact.name}</h1>
              <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                {contact.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {contact.email}
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {contact.phone}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Since {formatDate(contact.createdAt)}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" className="text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Current Balance
            </CardTitle>
            <DollarSign className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(balance / 100, contact.currency)}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {balance >= 0 ? "They owe you" : "You owe them"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Received
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(totalReceived / 100, contact.currency)}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Paid
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {formatCurrency(totalPaid / 100, contact.currency)}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Monthly Total
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(monthlyTotal / 100, contact.currency)}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Monthly Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Received This Month</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(monthlyReceived / 100, contact.currency)}
              </p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Paid This Month</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(monthlyPaid / 100, contact.currency)}
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Transactions This Month</p>
              <p className="text-2xl font-bold text-blue-600">
                {monthlyTransactions.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-4 mb-8">
        <TransactionDialog 
          contactId={contactId}
          trigger={
            <Button>
              <DollarSign className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          }
        />
        <ReminderDialog 
          contactId={contactId}
          contactName={contact.name}
          currency={contact.currency}
          trigger={
            <Button variant="outline">
              <Send className="h-4 w-4 mr-2" />
              Send Reminder
            </Button>
          }
        />
        <Button variant="outline">
          <MessageSquare className="h-4 w-4 mr-2" />
          Send Message
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Contact Info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Email</label>
              <p className="mt-1">{contact.email || "Not provided"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Phone</label>
              <p className="mt-1">{contact.phone || "Not provided"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Currency</label>
              <p className="mt-1">{contact.currency}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Opening Balance</label>
              <p className="mt-1">{formatCurrency(contact.openingBalance / 100)}</p>
            </div>
            {contact.notes && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Notes</label>
                <p className="mt-1">{contact.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="mb-8">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recent Transactions</CardTitle>
          <Button variant="ghost" size="sm">View All</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contactTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === "received" || tx.type === "lent" ? "bg-green-100 dark:bg-green-900/30 text-green-600" : "bg-red-100 dark:bg-red-900/30 text-red-600"}`}>
                    {tx.type === "received" || tx.type === "lent" ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-medium">{tx.description}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{formatDate(tx.date)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${tx.type === "received" || tx.type === "lent" ? "text-green-600" : "text-red-600"}`}>
                    {tx.type === "received" || tx.type === "lent" ? "+" : "-"}
                    {formatCurrency(tx.amount / 100, tx.currency)}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 capitalize">{tx.type}</p>
                </div>
              </div>
            ))}
            {contactTransactions.length === 0 && (
              <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                No transactions yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Settlements */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Pending Settlements</CardTitle>
          <Button variant="ghost" size="sm">View All</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contactSettlements.map((settlement) => (
              <div key={settlement.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div>
                  <p className="font-semibold">{formatCurrency(settlement.amount / 100)}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">{settlement.status}</p>
                </div>
                <Button size="sm">Mark as Paid</Button>
              </div>
            ))}
            {contactSettlements.length === 0 && (
              <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                No pending settlements
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
