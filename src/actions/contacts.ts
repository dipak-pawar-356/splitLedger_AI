"use server";

import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ValidationError, NotFoundError, DatabaseError } from "@/lib/errors";
import { generatePublicId } from "@/lib/utils";

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
        openingBalance: (data.openingBalance || 0) * 100,
        notes: data.notes || null,
      })
      .returning();

    revalidatePath("/dashboard/contacts");
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
        ...(data.openingBalance !== undefined && { openingBalance: data.openingBalance * 100 }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, existingContact.id))
      .returning();

    if (!contact) {
      throw new NotFoundError("Contact");
    }

    revalidatePath("/dashboard/contacts");
    revalidatePath(`/dashboard/contacts/${existingContact.publicId}`);
    return contact;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to update contact", { originalError: error });
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

    // Soft delete the contact
    await db
      .update(contacts)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, existingContact.id));

    // Create audit log entry for the deletion
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

    revalidatePath("/dashboard/contacts");
    revalidatePath(`/dashboard/contacts/${existingContact.publicId}`);
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
