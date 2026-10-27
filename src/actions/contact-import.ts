"use server";

import { db } from "@/lib/db";
import {
  contacts,
  contactImports,
  transactions,
  groupMembers,
  auditLogs,
  users,
} from "@/lib/db/schema/schema";
import { eq, and, or, desc, inArray, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ValidationError, NotFoundError, DatabaseError } from "@/lib/errors";
import { generatePublicId } from "@/lib/utils";

/**
 * Formula Injection Protection (CWE-1236):
 * If cell starts with '=', '+', '-', '@', '\t', '\r', prefix with single quote
 */
function sanitizeFormulaInjection(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

export interface ParsedContactRecord {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  address?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  openingBalance?: number;
  customFields?: Record<string, any> | null;
}

export interface ImportOptions {
  fileName: string;
  fileSize: number;
  fileType: "xlsx" | "csv" | "vcf" | "google" | "outlook";
  records: ParsedContactRecord[];
  duplicateStrategy: "skip" | "update" | "merge" | "create_copy";
}

export interface ImportResult {
  success: boolean;
  publicId: string;
  importedRecords: number;
  updatedRecords: number;
  skippedRecords: number;
  failedRecords: number;
  totalRecords: number;
  durationMs: number;
  errorReport: Array<{ row: number; name?: string; error: string }>;
}

/**
 * FEATURE 2: Enterprise Contact Import Processing Engine
 */
export async function importContactsAction(options: ImportOptions): Promise<ImportResult> {
  const startTime = Date.now();
  const user = await requireAuth();

  const { fileName, fileSize, fileType, records, duplicateStrategy } = options;

  if (!records || records.length === 0) {
    throw new ValidationError("No contact records provided to import");
  }

  // File size & row limit safety
  if (fileSize > 15 * 1024 * 1024) {
    throw new ValidationError("File size exceeds 15MB limit");
  }

  if (records.length > 5000) {
    throw new ValidationError("Maximum limit of 5,000 records per import exceeded");
  }

  // Fetch all existing contacts of current user for fast duplicate checking
  const existingContacts = await db
    .select({
      id: contacts.id,
      publicId: contacts.publicId,
      name: contacts.name,
      email: contacts.email,
      phone: contacts.phone,
      company: contacts.company,
      address: contacts.address,
      tags: contacts.tags,
      notes: contacts.notes,
      customFields: contacts.customFields,
    })
    .from(contacts)
    .where(and(eq(contacts.userId, user.id), eq(contacts.isDeleted, false)));

  const byEmail = new Map<string, (typeof existingContacts)[0]>();
  const byPhone = new Map<string, (typeof existingContacts)[0]>();
  const byName = new Map<string, (typeof existingContacts)[0]>();

  const normalizePhone = (p?: string | null) =>
    p ? p.replace(/[^0-9]/g, "").slice(-10) : "";

  for (const c of existingContacts) {
    if (c.email) byEmail.set(c.email.trim().toLowerCase(), c);
    const p = normalizePhone(c.phone);
    if (p) byPhone.set(p, c);
    byName.set(c.name.trim().toLowerCase(), c);
  }

  let importedRecords = 0;
  let updatedRecords = 0;
  let skippedRecords = 0;
  let failedRecords = 0;
  const errorReport: Array<{ row: number; name?: string; error: string }> = [];
  const importedContactIds: number[] = [];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (let i = 0; i < records.length; i++) {
    const raw = records[i];
    const rowNum = i + 1;

    try {
      const sanitizedName = sanitizeFormulaInjection(raw.name)?.slice(0, 150);
      if (!sanitizedName || sanitizedName.length === 0) {
        errorReport.push({ row: rowNum, error: "Missing required contact name" });
        failedRecords++;
        continue;
      }

      let sanitizedEmail: string | null = null;
      if (raw.email && raw.email.trim()) {
        const cleanEmail = raw.email.trim().toLowerCase();
        if (emailRegex.test(cleanEmail)) {
          sanitizedEmail = sanitizeFormulaInjection(cleanEmail);
        } else {
          errorReport.push({
            row: rowNum,
            name: sanitizedName,
            error: `Invalid email format: '${raw.email}'`,
          });
          failedRecords++;
          continue;
        }
      }

      let sanitizedPhone: string | null = null;
      if (raw.phone && raw.phone.trim()) {
        const digits = raw.phone.replace(/[^0-9+]/g, "").trim();
        if (digits.length >= 6) {
          sanitizedPhone = sanitizeFormulaInjection(digits);
        } else {
          errorReport.push({
            row: rowNum,
            name: sanitizedName,
            error: `Invalid phone number: '${raw.phone}'`,
          });
          failedRecords++;
          continue;
        }
      }

      const sanitizedCompany = sanitizeFormulaInjection(raw.company)?.slice(0, 120);
      const sanitizedAddress = sanitizeFormulaInjection(raw.address)?.slice(0, 250);
      const sanitizedNotes = sanitizeFormulaInjection(raw.notes)?.slice(0, 1000);
      const tagsArray = Array.isArray(raw.tags)
        ? raw.tags.map((t) => sanitizeFormulaInjection(t)?.slice(0, 40) || "").filter(Boolean)
        : [];

      // Check conflict against existing contacts
      const normEmail = sanitizedEmail ? sanitizedEmail.toLowerCase() : "";
      const normPhone = normalizePhone(sanitizedPhone);
      const normName = sanitizedName.toLowerCase();

      const existingMatch =
        (normEmail ? byEmail.get(normEmail) : null) ||
        (normPhone ? byPhone.get(normPhone) : null) ||
        byName.get(normName);

      if (existingMatch) {
        if (duplicateStrategy === "skip") {
          skippedRecords++;
          continue;
        }

        if (duplicateStrategy === "update") {
          // Update existing contact fields
          await db
            .update(contacts)
            .set({
              name: sanitizedName,
              email: sanitizedEmail || existingMatch.email,
              phone: sanitizedPhone || existingMatch.phone,
              company: sanitizedCompany || existingMatch.company,
              address: sanitizedAddress || existingMatch.address,
              notes: sanitizedNotes || existingMatch.notes,
              tags: tagsArray.length > 0 ? tagsArray : existingMatch.tags || [],
              updatedAt: new Date(),
            })
            .where(eq(contacts.id, existingMatch.id));

          updatedRecords++;
          continue;
        }

        if (duplicateStrategy === "merge") {
          // Smart merge: retain existing and supplement missing values
          const mergedTags = Array.from(
            new Set([...(existingMatch.tags || []), ...tagsArray])
          );
          const mergedNotes = [existingMatch.notes, sanitizedNotes]
            .filter(Boolean)
            .join("\n\n---\nMerged Notes:\n");

          await db
            .update(contacts)
            .set({
              email: existingMatch.email || sanitizedEmail,
              phone: existingMatch.phone || sanitizedPhone,
              company: existingMatch.company || sanitizedCompany,
              address: existingMatch.address || sanitizedAddress,
              notes: mergedNotes || null,
              tags: mergedTags,
              updatedAt: new Date(),
            })
            .where(eq(contacts.id, existingMatch.id));

          updatedRecords++;
          continue;
        }

        if (duplicateStrategy === "create_copy") {
          // Create new record with copy suffix
          const copyName = `${sanitizedName} (Copy)`;
          const [created] = await db
            .insert(contacts)
            .values({
              publicId: generatePublicId(),
              userId: user.id,
              name: copyName,
              email: sanitizedEmail,
              phone: sanitizedPhone,
              company: sanitizedCompany,
              address: sanitizedAddress,
              tags: tagsArray,
              notes: sanitizedNotes,
              openingBalance: Math.round((raw.openingBalance || 0) * 100),
              currency: "INR",
              customFields: raw.customFields || {},
            })
            .returning();

          if (created) {
            importedContactIds.push(created.id);
            importedRecords++;
          }
          continue;
        }
      }

      // No conflict -> Insert fresh contact
      const [newContact] = await db
        .insert(contacts)
        .values({
          publicId: generatePublicId(),
          userId: user.id,
          name: sanitizedName,
          email: sanitizedEmail,
          phone: sanitizedPhone,
          company: sanitizedCompany,
          address: sanitizedAddress,
          tags: tagsArray,
          notes: sanitizedNotes,
          openingBalance: Math.round((raw.openingBalance || 0) * 100),
          currency: "INR",
          customFields: raw.customFields || {},
        })
        .returning();

      if (newContact) {
        importedContactIds.push(newContact.id);
        importedRecords++;

        // Update local lookup maps
        if (sanitizedEmail) byEmail.set(sanitizedEmail.toLowerCase(), newContact);
        if (normPhone) byPhone.set(normPhone, newContact);
        byName.set(sanitizedName.toLowerCase(), newContact);
      }
    } catch (rowErr) {
      console.warn(`Error processing row ${rowNum}:`, rowErr);
      errorReport.push({
        row: rowNum,
        name: raw.name || "Unknown",
        error: rowErr instanceof Error ? rowErr.message : "Database write error",
      });
      failedRecords++;
    }
  }

  const durationMs = Date.now() - startTime;
  const importPublicId = `IMP-${generatePublicId()}`;

  // Store import session in contact_imports table
  try {
    await db.insert(contactImports).values({
      publicId: importPublicId,
      userId: user.id,
      fileName,
      fileSize,
      fileType,
      importedRecords,
      updatedRecords,
      skippedRecords,
      failedRecords,
      totalRecords: records.length,
      durationMs,
      status: "completed",
      errorReport: errorReport.length > 0 ? errorReport : null,
      importedContactIds,
    });

    // Record system audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "import",
      entityType: "contact",
      entityId: 0,
      entityPublicId: importPublicId,
      changes: {
        fileName,
        importedRecords,
        updatedRecords,
        skippedRecords,
        failedRecords,
        durationMs,
      },
    });
  } catch (auditErr) {
    console.warn("Non-critical error logging import audit:", auditErr);
  }

  revalidatePath("/dashboard/contacts");

  return {
    success: true,
    publicId: importPublicId,
    importedRecords,
    updatedRecords,
    skippedRecords,
    failedRecords,
    totalRecords: records.length,
    durationMs,
    errorReport,
  };
}

/**
 * Fetch import history for the current user
 */
export async function getContactImportHistoryAction() {
  const user = await requireAuth();

  const history = await db
    .select({
      id: contactImports.id,
      publicId: contactImports.publicId,
      fileName: contactImports.fileName,
      fileSize: contactImports.fileSize,
      fileType: contactImports.fileType,
      importedRecords: contactImports.importedRecords,
      updatedRecords: contactImports.updatedRecords,
      skippedRecords: contactImports.skippedRecords,
      failedRecords: contactImports.failedRecords,
      totalRecords: contactImports.totalRecords,
      durationMs: contactImports.durationMs,
      status: contactImports.status,
      errorReport: contactImports.errorReport,
      createdAt: contactImports.createdAt,
    })
    .from(contactImports)
    .where(eq(contactImports.userId, user.id))
    .orderBy(desc(contactImports.createdAt))
    .limit(50);

  return history;
}

/**
 * Rollback a previous contact import
 */
export async function rollbackContactImportAction(importPublicId: string) {
  const user = await requireAuth();

  const [importSession] = await db
    .select()
    .from(contactImports)
    .where(
      and(
        eq(contactImports.publicId, importPublicId),
        eq(contactImports.userId, user.id)
      )
    )
    .limit(1);

  if (!importSession) {
    throw new NotFoundError("Import session not found");
  }

  if (importSession.status === "rolled_back") {
    throw new ValidationError("This import session has already been rolled back");
  }

  const idsToRevert = (importSession.importedContactIds as number[]) || [];

  if (idsToRevert.length > 0) {
    // Soft delete all created contacts in this import
    await db
      .update(contacts)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          inArray(contacts.id, idsToRevert),
          eq(contacts.userId, user.id)
        )
      );
  }

  // Update import status
  await db
    .update(contactImports)
    .set({ status: "rolled_back" })
    .where(eq(contactImports.id, importSession.id));

  // Log audit
  await db.insert(auditLogs).values({
    userId: user.id,
    action: "rollback",
    entityType: "contact_import",
    entityId: importSession.id,
    entityPublicId: importSession.publicId,
    changes: { rolledBackCount: idsToRevert.length },
  });

  revalidatePath("/dashboard/contacts");

  return { success: true, rolledBackCount: idsToRevert.length };
}

/**
 * Bulk operations on selected contacts (Delete, Archive, Tag, Company, Merge)
 */
export async function bulkUpdateContactsAction(
  contactIds: number[],
  operation: {
    type: "delete" | "archive" | "unarchive" | "add_tag" | "remove_tag" | "update_company" | "update_category" | "update_notes" | "merge";
    value?: any;
    masterId?: number;
  }
) {
  const user = await requireAuth();

  if (!contactIds || contactIds.length === 0) {
    throw new ValidationError("No contacts selected for bulk operation");
  }

  const existing = await db
    .select()
    .from(contacts)
    .where(
      and(
        inArray(contacts.id, contactIds),
        eq(contacts.userId, user.id),
        eq(contacts.isDeleted, false)
      )
    );

  if (existing.length === 0) {
    throw new NotFoundError("Selected contacts not found");
  }

  const targetIds = existing.map((c) => c.id);

  if (operation.type === "delete") {
    await db
      .update(contacts)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.id,
        updatedAt: new Date(),
      })
      .where(inArray(contacts.id, targetIds));

    await db.insert(auditLogs).values({
      userId: user.id,
      action: "bulk_delete",
      entityType: "contact",
      entityId: 0,
      changes: { deletedCount: targetIds.length, targetIds },
    });
  } else if (operation.type === "archive") {
    await db
      .update(contacts)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(inArray(contacts.id, targetIds));
  } else if (operation.type === "unarchive") {
    await db
      .update(contacts)
      .set({ isArchived: false, updatedAt: new Date() })
      .where(inArray(contacts.id, targetIds));
  } else if (operation.type === "add_tag" && typeof operation.value === "string") {
    const newTag = sanitizeFormulaInjection(operation.value.trim());
    if (newTag) {
      for (const c of existing) {
        const curTags = c.tags || [];
        if (!curTags.includes(newTag)) {
          await db
            .update(contacts)
            .set({ tags: [...curTags, newTag], updatedAt: new Date() })
            .where(eq(contacts.id, c.id));
        }
      }
    }
  } else if (operation.type === "remove_tag" && typeof operation.value === "string") {
    const removeTag = operation.value.trim();
    for (const c of existing) {
      const curTags = c.tags || [];
      const updated = curTags.filter((t) => t !== removeTag);
      await db
        .update(contacts)
        .set({ tags: updated, updatedAt: new Date() })
        .where(eq(contacts.id, c.id));
    }
  } else if (operation.type === "update_company") {
    const company = sanitizeFormulaInjection(String(operation.value || ""));
    await db
      .update(contacts)
      .set({ company, updatedAt: new Date() })
      .where(inArray(contacts.id, targetIds));
  } else if (operation.type === "update_category") {
    const category = sanitizeFormulaInjection(String(operation.value || ""));
    await db
      .update(contacts)
      .set({ category, updatedAt: new Date() })
      .where(inArray(contacts.id, targetIds));
  } else if (operation.type === "update_notes") {
    const notes = sanitizeFormulaInjection(String(operation.value || ""));
    await db
      .update(contacts)
      .set({ notes, updatedAt: new Date() })
      .where(inArray(contacts.id, targetIds));
  } else if (operation.type === "merge") {
    const masterId = operation.masterId || targetIds[0];
    const secondaryIds = targetIds.filter((id) => id !== masterId);

    const master = existing.find((c) => c.id === masterId);
    if (!master) throw new NotFoundError("Master contact not found for merge");

    const secondaries = existing.filter((c) => secondaryIds.includes(c.id));

    // Combine tags and notes
    const mergedTags = Array.from(
      new Set([
        ...(master.tags || []),
        ...secondaries.flatMap((s) => s.tags || []),
      ])
    );

    const mergedNotes = [
      master.notes,
      ...secondaries.map(
        (s) => `[Merged from ${s.name}]: ${s.notes || "No notes"}`
      ),
    ]
      .filter(Boolean)
      .join("\n\n");

    const mergedEmail = master.email || secondaries.find((s) => s.email)?.email || null;
    const mergedPhone = master.phone || secondaries.find((s) => s.phone)?.phone || null;
    const mergedCompany = master.company || secondaries.find((s) => s.company)?.company || null;
    const mergedAddress = master.address || secondaries.find((s) => s.address)?.address || null;

    // 1. Update master contact
    await db
      .update(contacts)
      .set({
        email: mergedEmail,
        phone: mergedPhone,
        company: mergedCompany,
        address: mergedAddress,
        tags: mergedTags,
        notes: mergedNotes || null,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, master.id));

    // 2. Re-point transactions referencing secondary contacts to master
    if (secondaryIds.length > 0) {
      await db
        .update(transactions)
        .set({ contactId: master.id, updatedAt: new Date() })
        .where(
          and(
            inArray(transactions.contactId, secondaryIds),
            eq(transactions.userId, user.id)
          )
        );

      // 3. Re-point group members referencing secondary contacts
      await db
        .update(groupMembers)
        .set({ contactId: master.id })
        .where(inArray(groupMembers.contactId, secondaryIds))
        .catch(() => {});

      // 4. Soft-delete secondary contacts
      await db
        .update(contacts)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: user.id,
          updatedAt: new Date(),
        })
        .where(inArray(contacts.id, secondaryIds));
    }

    await db.insert(auditLogs).values({
      userId: user.id,
      action: "merge",
      entityType: "contact",
      entityId: master.id,
      changes: {
        mergedSecondaryIds: secondaryIds,
        masterName: master.name,
      },
    });
  }

  revalidatePath("/dashboard/contacts");
  return { success: true, updatedCount: targetIds.length };
}

/**
 * Scan user's contacts to find duplicates (for Duplicate Manager)
 */
export async function getDuplicateContactsAction() {
  const user = await requireAuth();

  const allContacts = await db
    .select({
      id: contacts.id,
      publicId: contacts.publicId,
      name: contacts.name,
      email: contacts.email,
      phone: contacts.phone,
      company: contacts.company,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .where(and(eq(contacts.userId, user.id), eq(contacts.isDeleted, false)));

  const clusters: Array<{
    reason: "email" | "phone" | "name";
    matchValue: string;
    contacts: typeof allContacts;
  }> = [];

  const emailGroups = new Map<string, typeof allContacts>();
  const phoneGroups = new Map<string, typeof allContacts>();
  const nameGroups = new Map<string, typeof allContacts>();

  for (const c of allContacts) {
    if (c.email) {
      const e = c.email.trim().toLowerCase();
      const list = emailGroups.get(e) || [];
      list.push(c);
      emailGroups.set(e, list);
    }

    if (c.phone) {
      const p = c.phone.replace(/[^0-9]/g, "").slice(-10);
      if (p.length >= 7) {
        const list = phoneGroups.get(p) || [];
        list.push(c);
        phoneGroups.set(p, list);
      }
    }

    const n = c.name.trim().toLowerCase();
    const list = nameGroups.get(n) || [];
    list.push(c);
    nameGroups.set(n, list);
  }

  const seenIds = new Set<string>();

  for (const [email, list] of emailGroups.entries()) {
    if (list.length > 1) {
      const key = list.map((c) => c.id).sort().join("-");
      if (!seenIds.has(key)) {
        seenIds.add(key);
        clusters.push({ reason: "email", matchValue: email, contacts: list });
      }
    }
  }

  for (const [phone, list] of phoneGroups.entries()) {
    if (list.length > 1) {
      const key = list.map((c) => c.id).sort().join("-");
      if (!seenIds.has(key)) {
        seenIds.add(key);
        clusters.push({ reason: "phone", matchValue: phone, contacts: list });
      }
    }
  }

  for (const [name, list] of nameGroups.entries()) {
    if (list.length > 1) {
      const key = list.map((c) => c.id).sort().join("-");
      if (!seenIds.has(key)) {
        seenIds.add(key);
        clusters.push({ reason: "name", matchValue: name, contacts: list });
      }
    }
  }

  return clusters;
}
