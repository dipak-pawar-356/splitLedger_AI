import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contacts, transactions } from "@/lib/db/schema/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Archive, Mail, Phone, MoreVertical, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ContactDialog } from "@/components/dialogs/contact-dialog";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  const user = await requireAuth();

  const userContacts = await db
    .select({
      id: contacts.id,
      publicId: contacts.publicId,
      name: contacts.name,
      email: contacts.email,
      phone: contacts.phone,
      currency: contacts.currency,
      openingBalance: contacts.openingBalance,
      notes: contacts.notes,
      createdAt: contacts.createdAt,
      balance: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent') THEN ${transactions.amount} ELSE -${transactions.amount} END), 0)`,
      transactionCount: sql<number>`COUNT(${transactions.id})`,
    })
    .from(contacts)
    .leftJoin(transactions, eq(transactions.contactId, contacts.id))
    .where(eq(contacts.userId, user.id))
    .groupBy(contacts.id, contacts.publicId)
    .orderBy(desc(contacts.createdAt));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Contacts</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your contacts and their ledgers
          </p>
        </div>
        <ContactDialog />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Contacts
            </CardTitle>
            <Users className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userContacts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Owed to You
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(
                userContacts
                  .filter((c) => c.balance > 0)
                  .reduce((sum, c) => sum + (c.balance || 0), 0) / 100
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total You Owe
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(
                Math.abs(
                  userContacts
                    .filter((c) => c.balance < 0)
                    .reduce((sum, c) => sum + (c.balance || 0), 0)
                ) / 100
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Transactions
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userContacts.reduce((sum, c) => sum + (c.transactionCount || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 dark:text-slate-400" />
              <input
                type="text"
                placeholder="Search contacts by name, email, or phone..."
                className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background"
              />
            </div>
            <Button variant="outline">
              <Archive className="h-4 w-4 mr-2" />
              Archived
            </Button>
            <Button variant="outline">
              Sort by Balance
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userContacts.map((contact) => (
          <Card key={contact.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">{contact.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {contact.email && (
                        <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Balance</span>
                  <span className={`font-semibold ${contact.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency((contact.balance || 0) / 100)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Transactions</span>
                  <span className="font-medium">{contact.transactionCount || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Currency</span>
                  <span className="font-medium">{contact.currency}</span>
                </div>
                {contact.notes && (
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                    {contact.notes}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Link href={`/dashboard/contacts/${contact.publicId}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    Ledger
                  </Button>
                </Link>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {userContacts.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <div className="text-slate-600 dark:text-slate-400 mb-4">
                No contacts yet. Add your first contact to start tracking shared expenses.
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Contact
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
