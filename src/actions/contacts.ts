"use server";

import { db } from "@/lib/db";
import { contacts, transactions, settlements, groupMembers } from "@/lib/db/schema/schema";
import { eq, and, or } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ValidationError, NotFoundError, DatabaseError } from "@/lib/errors";
import { generatePublicId } from "@/lib/utils";
import { appCache } from "@/lib/cache";
import { revalidateContactHierarchy } from "@/lib/settlements/recalculation-engine";

export async function createContact(data: {
  name: string;
  email?: string;
  phone?: string;
  currency?: string;
  openingBalance?: number;
  notes?: string;
}) {
  try {
    const user = await requireAuth();

    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError("Contact name is required");
    }

    const [contact] = await db
      .insert(contacts)
      .values({
        publicId: generatePublicId(),
        userId: user.id,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        currency: data.currency || "INR",
        openingBalance: Math.round((data.openingBalance || 0) * 100),
        notes: data.notes || null,
      })
      .returning();

    await revalidateContactHierarchy(contact.publicId);
    return contact;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError("Failed to create contact", { originalError: error });
  }
}

export async function updateContact(
  publicIdOrId: string | number,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    currency?: string;
    openingBalance?: number;
    notes?: string;
    isArchived?: boolean;
    company?: string;
    address?: string;
    tags?: string[];
    isFavorite?: boolean;
    isBlocked?: boolean;
    category?: string;
  }
) {
  try {
    const user = await requireAuth();

    if (data.name !== undefined && data.name.trim().length === 0) {
      throw new ValidationError("Contact name cannot be empty");
    }

    const isNumeric = typeof publicIdOrId === "number" || /^\d+$/.test(String(publicIdOrId));
    const [existingContact] = await db
      .select()
      .from(contacts)
      .where(
        and(
          isNumeric ? eq(contacts.id, Number(publicIdOrId)) : eq(contacts.publicId, String(publicIdOrId)),
          eq(contacts.userId, user.id),
          eq(contacts.isDeleted, false)
        )
      )
      .limit(1);

    if (!existingContact) {
      throw new NotFoundError("Contact");
    }

    const [contact] = await db
      .update(contacts)
      .set({
        ...(data.name && { name: data.name }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.openingBalance !== undefined && { openingBalance: Math.round(data.openingBalance * 100) }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.company !== undefined && { company: data.company || null }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.isFavorite !== undefined && { isFavorite: data.isFavorite }),
        ...(data.isBlocked !== undefined && { isBlocked: data.isBlocked }),
        ...(data.category !== undefined && { category: data.category || null }),
        ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, existingContact.id))
      .returning();

    if (!contact) {
      throw new NotFoundError("Contact");
    }

    await revalidateContactHierarchy(existingContact.publicId);
    return contact;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to update contact", { originalError: error });
  }
}

export async function archiveContact(publicIdOrId: string | number, isArchived: boolean = true) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof publicIdOrId === "number" || /^\d+$/.test(String(publicIdOrId));
    const [existingContact] = await db
      .select()
      .from(contacts)
      .where(
        and(
          isNumeric ? eq(contacts.id, Number(publicIdOrId)) : eq(contacts.publicId, String(publicIdOrId)),
          eq(contacts.userId, user.id),
          eq(contacts.isDeleted, false)
        )
      )
      .limit(1);

    if (!existingContact) {
      throw new NotFoundError("Contact");
    }

    const [contact] = await db
      .update(contacts)
      .set({
        isArchived,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, existingContact.id))
      .returning();

    await revalidateContactHierarchy(existingContact.publicId);
    return contact;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to update contact archive status", { originalError: error });
  }
}

export async function deleteContact(publicIdOrId: string | number) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof publicIdOrId === "number" || /^\d+$/.test(String(publicIdOrId));
    const [existingContact] = await db
      .select()
      .from(contacts)
      .where(
        and(
          isNumeric ? eq(contacts.id, Number(publicIdOrId)) : eq(contacts.publicId, String(publicIdOrId)),
          eq(contacts.userId, user.id)
        )
      )
      .limit(1);

    if (!existingContact) {
      throw new NotFoundError("Contact");
    }

    if (existingContact.isDeleted) {
      throw new ValidationError("Contact is already deleted");
    }

    // 1. Soft delete the contact
    await db
      .update(contacts)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, existingContact.id));

    // 2. Soft delete all transactions associated with this contact
    await db
      .update(transactions)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(transactions.contactId, existingContact.id),
          eq(transactions.isDeleted, false)
        )
      );

    // 3. Soft delete all settlements associated with this contact
    await db
      .update(settlements)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(settlements.isDeleted, false),
          or(
            eq(settlements.fromContactId, existingContact.id),
            eq(settlements.toContactId, existingContact.id)
          )
        )
      );

    // 4. Clean up group memberships associated with this contact
    await db
      .delete(groupMembers)
      .where(eq(groupMembers.contactId, existingContact.id));

    // 5. Create audit log entry for the deletion
    const { auditLogs } = await import("@/lib/db/schema/schema");
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "delete",
      entityType: "contact",
      entityId: existingContact.id,
      changes: {
        deleted: true,
        deletedAt: new Date(),
        originalName: existingContact.name,
      },
    });

    // 6. Purge cache and revalidate all relevant paths to recalculate dashboard
    await revalidateContactHierarchy(existingContact.publicId);
    return { success: true };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to delete contact", { originalError: error });
  }
}

export async function getContact(idOrPublicId: number | string) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof idOrPublicId === "number" || /^\d+$/.test(String(idOrPublicId));
    const [contact] = await db
      .select()
      .from(contacts)
      .where(
        and(
          isNumeric ? eq(contacts.id, Number(idOrPublicId)) : eq(contacts.publicId, String(idOrPublicId)),
          eq(contacts.userId, user.id),
          eq(contacts.isDeleted, false)
        )
      )
      .limit(1);

    if (!contact) {
      throw new NotFoundError("Contact");
    }

    return contact;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to fetch contact", { originalError: error });
  }
}

export async function getContacts() {
  try {
    const user = await requireAuth();

    const contactsList = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.userId, user.id),
          eq(contacts.isDeleted, false)
        )
      )
      .orderBy(contacts.createdAt);

    return contactsList;
  } catch (error) {
    throw new DatabaseError("Failed to fetch contacts", { originalError: error });
  }
}
