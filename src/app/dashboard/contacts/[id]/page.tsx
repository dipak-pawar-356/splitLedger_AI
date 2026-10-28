import { requireAuth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { contacts, transactions, categories, users } from "@/lib/db/schema/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ContactProfileView } from "@/components/contacts/contact-profile-view";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id: publicId } = await params;

  // 1. Fetch contact by publicId or numeric ID
  const isNumeric = /^\d+$/.test(publicId);
  const [contact] = await withDbRetry(async () => {
    return await db
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
  });

  if (!contact) {
    notFound();
  }

  const contactId = contact.id;

  // 2. Fetch all transactions for this contact (with category & user joins)
  let contactTransactions: any[] = [];
  try {
    contactTransactions = await withDbRetry(async () => {
      return await db
        .select({
          id: transactions.id,
          publicId: transactions.publicId,
          title: transactions.title,
          description: transactions.description,
          type: transactions.type,
          amount: transactions.amount,
          currency: transactions.currency,
          date: transactions.date,
          contactId: transactions.contactId,
          categoryId: transactions.categoryId,
          categoryName: categories.name,
          status: transactions.status,
          notes: transactions.notes,
          receiptUrl: transactions.receiptUrl,
          paymentMethod: transactions.paymentMethod,
          createdByName: users.name,
          tags: transactions.tags,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(users, eq(transactions.createdBy, users.id))
        .where(
          and(
            eq(transactions.contactId, contactId),
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false)
          )
        )
        .orderBy(desc(transactions.date));
    });
  } catch (txErr) {
    console.warn("Category/User join error, fallback to direct select:", txErr);
    contactTransactions = await withDbRetry(async () => {
      return await db
        .select({
          id: transactions.id,
          publicId: transactions.publicId,
          title: transactions.title,
          description: transactions.description,
          type: transactions.type,
          amount: transactions.amount,
          currency: transactions.currency,
          date: transactions.date,
          contactId: transactions.contactId,
          categoryId: transactions.categoryId,
          categoryName: sql<string | null>`NULL`,
          status: transactions.status,
          notes: transactions.notes,
          receiptUrl: transactions.receiptUrl,
          paymentMethod: transactions.paymentMethod,
          createdByName: sql<string | null>`NULL`,
          tags: transactions.tags,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.contactId, contactId),
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false)
          )
        )
        .orderBy(desc(transactions.date));
    });
  }

  const formattedContact = {
    id: contact.id,
    publicId: contact.publicId,
    name: contact.name,
    email: contact.email || null,
    phone: contact.phone || null,
    currency: contact.currency || "INR",
    openingBalance: Number(contact.openingBalance) || 0,
    notes: contact.notes || null,
    company: contact.company || null,
    address: contact.address || null,
    tags: Array.isArray(contact.tags) ? contact.tags : [],
    isFavorite: Boolean(contact.isFavorite),
    isArchived: Boolean(contact.isArchived),
    createdAt: contact.createdAt ? new Date(contact.createdAt) : new Date(),
    updatedAt: contact.updatedAt ? new Date(contact.updatedAt) : null,
  };

  return (
    <ContactProfileView
      contact={formattedContact}
      transactions={contactTransactions}
    />
  );
}
