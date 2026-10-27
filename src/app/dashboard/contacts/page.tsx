import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contacts, transactions } from "@/lib/db/schema/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { ContactsClientView, type ContactItem } from "@/components/contacts/contacts-client-view";

export const dynamic = "force-dynamic";

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

  const formattedContacts: ContactItem[] = userContacts.map((c) => ({
    ...c,
    balance: Number(c.balance) || 0,
    transactionCount: Number(c.transactionCount) || 0,
    tags: Array.isArray(c.tags) ? c.tags : [],
    customFields: c.customFields && typeof c.customFields === "object" ? c.customFields : {},
  }));

  return <ContactsClientView initialContacts={formattedContacts} />;
}
