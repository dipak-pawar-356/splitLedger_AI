import { requireAuth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { contacts, transactions } from "@/lib/db/schema/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { ContactsClientView, type ContactItem } from "@/components/contacts/contacts-client-view";
import { ensureContactsSchema } from "@/lib/db/auto-migrate";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  try {
    const user = await requireAuth();

    // Ensure contacts columns and tables exist in Postgres
    try {
      await ensureContactsSchema();
    } catch (migErr) {
      console.warn("ensureContactsSchema non-fatal warning:", migErr);
    }

    let userContacts: any[] = [];

    try {
      userContacts = await withDbRetry(async () => {
        return await db
          .select({
            id: contacts.id,
            publicId: contacts.publicId,
            name: contacts.name,
            email: contacts.email,
            phone: contacts.phone,
            currency: contacts.currency,
            openingBalance: contacts.openingBalance,
            notes: contacts.notes,
            company: contacts.company,
            address: contacts.address,
            tags: contacts.tags,
            customFields: contacts.customFields,
            isFavorite: contacts.isFavorite,
            isBlocked: contacts.isBlocked,
            category: contacts.category,
            isArchived: contacts.isArchived,
            createdAt: contacts.createdAt,
            updatedAt: contacts.updatedAt,
            balance: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent') THEN ${transactions.amount} ELSE -${transactions.amount} END), 0)::numeric`,
            transactionCount: sql<number>`COUNT(${transactions.id})::int`,
          })
          .from(contacts)
          .leftJoin(transactions, eq(transactions.contactId, contacts.id))
          .where(and(eq(contacts.userId, user.id), eq(contacts.isDeleted, false)))
          .groupBy(contacts.id, contacts.publicId)
          .orderBy(desc(contacts.createdAt));
      });
    } catch (primaryErr) {
      console.warn("Primary contacts query failed, running fallback query:", primaryErr);
      // Fallback query with core baseline columns
      userContacts = await withDbRetry(async () => {
        return await db
          .select({
            id: contacts.id,
            publicId: contacts.publicId,
            name: contacts.name,
            email: contacts.email,
            phone: contacts.phone,
            currency: contacts.currency,
            openingBalance: contacts.openingBalance,
            notes: contacts.notes,
            isArchived: contacts.isArchived,
            createdAt: contacts.createdAt,
            balance: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent') THEN ${transactions.amount} ELSE -${transactions.amount} END), 0)::numeric`,
            transactionCount: sql<number>`COUNT(${transactions.id})::int`,
          })
          .from(contacts)
          .leftJoin(transactions, eq(transactions.contactId, contacts.id))
          .where(and(eq(contacts.userId, user.id), eq(contacts.isDeleted, false)))
          .groupBy(contacts.id, contacts.publicId)
          .orderBy(desc(contacts.createdAt));
      });
    }

    const formattedContacts: ContactItem[] = (userContacts || []).map((c) => ({
      ...c,
      company: c.company || null,
      address: c.address || null,
      category: c.category || null,
      isFavorite: Boolean(c.isFavorite),
      isBlocked: Boolean(c.isBlocked),
      isArchived: Boolean(c.isArchived),
      balance: Number(c.balance) || 0,
      transactionCount: Number(c.transactionCount) || 0,
      tags: Array.isArray(c.tags) ? c.tags : [],
      customFields: c.customFields && typeof c.customFields === "object" ? c.customFields : {},
      createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
      updatedAt: c.updatedAt ? new Date(c.updatedAt) : null,
    }));

    return <ContactsClientView initialContacts={formattedContacts} />;
  } catch (err: any) {
    console.error("ContactsPage render error:", err);
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 pt-12">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Unable to Load Contacts</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A temporary connection issue occurred while loading your contacts. Please retry or return to your dashboard.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/dashboard/contacts">
            <Button size="sm" className="rounded-xl text-xs font-semibold gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="sm" variant="outline" className="rounded-xl text-xs font-semibold">
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }
}
