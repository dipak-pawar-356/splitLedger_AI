"use server";

import { db, withDbRetry } from "@/lib/db";
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
import { ensureContactsSchema } from "@/lib/db/auto-migrate";
import { isTestingOrAssertionNote } from "@/lib/contacts/contact-parser";

/**
 * Formula Injection Protection (CWE-1236 / CSV Injection):
 * If a text cell starts with '=', '+', '-', '@', '\t', '\r', prefix with single quote
 * and store as safe plain text.
 */
function sanitizeFormulaInjection(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

/**
 * Clean contact name:
 * - Trims whitespace
 * - Collapses consecutive spaces
 * - Preserves Unicode, Marathi, Hindi, and special characters (O'Neil, Mary-Jane, etc.)
 */
function cleanContactName(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;
  return sanitizeFormulaInjection(cleaned)?.slice(0, 150) || null;
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function normalizePhone(p?: string | null): string {
  if (!p) return "";
  const digits = String(p).replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("91") && digits.length === 12) return digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) return digits.slice(1);
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export interface ParsedContactRecord {
  rowNumber?: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  address?: string | null;
  tags?: string[] | null;
  notes?: string | null; // ONLY saved if explicitly mapped by user
  openingBalance?: number;
  currency?: string;
  action?: "new" | "update" | "merge" | "skip";
  existingContactId?: number | string | null;
  customFields?: Record<string, any> | null;
}

export interface ImportOptions {
  fileName: string;
  fileSize: number;
  fileType: "xlsx" | "csv" | "vcf" | "google" | "outlook";
  records: ParsedContactRecord[];
  duplicateStrategy?: "skip" | "update" | "merge" | "create_copy";
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
 * Fetch existing contacts for client-side Preview & Duplicate Resolution
 */
export async function getExistingContactsForImportPreviewAction() {
  const user = await requireAuth();
  try {
    await ensureContactsSchema();
  } catch (_) {}

  return await withDbRetry(async () => {
    return await db
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
        openingBalance: contacts.openingBalance,
        currency: contacts.currency,
      })
      .from(contacts)
      .where(and(eq(contacts.userId, user.id), eq(contacts.isDeleted, false)));
  });
}

/**
 * FEATURE 2: Enterprise Contact Import Processing Engine
 * Validates every row independently before database insertion.
 * Protects against CSV injection, handles duplicates, and preserves Unicode / Marathi / Hindi names.
 */
export async function importContactsAction(options: ImportOptions): Promise<ImportResult> {
  const startTime = Date.now();
  const user = await requireAuth();

  try {
    await ensureContactsSchema();
  } catch (_) {}

  const { fileName, fileSize, fileType, records, duplicateStrategy = "merge" } = options;

  if (!records || records.length === 0) {
    throw new ValidationError("No contact records provided to import");
  }

  if (fileSize > 15 * 1024 * 1024) {
    throw new ValidationError("File size exceeds 15MB limit");
  }

  if (records.length > 5000) {
    throw new ValidationError("Maximum limit of 5,000 records per import exceeded");
  }

  // Fetch all existing contacts of current user for duplicate detection
  const existingContacts = await withDbRetry(async () => {
    return await db
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
        openingBalance: contacts.openingBalance,
        customFields: contacts.customFields,
      })
      .from(contacts)
      .where(and(eq(contacts.userId, user.id), eq(contacts.isDeleted, false)));
  });

  const byId = new Map<number, (typeof existingContacts)[0]>();
  const byEmail = new Map<string, (typeof existingContacts)[0]>();
  const byPhone = new Map<string, (typeof existingContacts)[0]>();
  const byName = new Map<string, (typeof existingContacts)[0]>();

  for (const c of existingContacts) {
    byId.set(c.id, c);
    if (c.email) byEmail.set(c.email.trim().toLowerCase(), c);
    const p = normalizePhone(c.phone);
    if (p) byPhone.set(p, c);
    if (c.name) byName.set(c.name.trim().toLowerCase(), c);
  }

  let importedRecords = 0;
  let updatedRecords = 0;
  let skippedRecords = 0;
  let failedRecords = 0;
  const errorReport: Array<{ row: number; name?: string; error: string }> = [];
  const importedContactIds: number[] = [];

  for (let i = 0; i < records.length; i++) {
    const raw = records[i];
    const rowNum = raw.rowNumber || i + 1;

    try {
      // 1. Mandatory Name Validation (Preserves Unicode / Marathi / Hindi / O'Neil)
      const sanitizedName = cleanContactName(raw.name);
      if (!sanitizedName || sanitizedName.length === 0) {
        errorReport.push({ row: rowNum, error: "Missing required contact name" });
        failedRecords++;
        continue;
      }

      // 2. Email Validation (if provided)
      let sanitizedEmail: string | null = null;
      if (raw.email && String(raw.email).trim()) {
        const cleanEmail = String(raw.email).trim().toLowerCase();
        if (EMAIL_REGEX.test(cleanEmail)) {
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

      // 3. Phone Validation (if provided)
      let sanitizedPhone: string | null = null;
      if (raw.phone && String(raw.phone).trim()) {
        const digits = String(raw.phone).replace(/[^0-9+]/g, "").trim();
        const rawDigits = String(raw.phone).replace(/[^0-9]/g, "");
        if (rawDigits.length >= 6 && rawDigits.length <= 15) {
          sanitizedPhone = sanitizeFormulaInjection(digits);
        } else {
          errorReport.push({
            row: rowNum,
            name: sanitizedName,
            error: `Invalid phone number (must be 6-15 digits): '${raw.phone}'`,
          });
          failedRecords++;
          continue;
        }
      }

      // 4. Other String Fields Sanitization
      const sanitizedCompany = raw.company
        ? sanitizeFormulaInjection(String(raw.company).trim())?.slice(0, 120) || null
        : null;
      const sanitizedAddress = raw.address
        ? sanitizeFormulaInjection(String(raw.address).trim())?.slice(0, 250) || null
        : null;

      // 5. Notes handling:
      // Notes is ONLY saved if explicitly provided (i.e. user mapped it).
      // Test notes from unmapped files must never be written as descriptions.
      const sanitizedNotes = raw.notes && String(raw.notes).trim()
        ? sanitizeFormulaInjection(String(raw.notes).trim())?.slice(0, 1000) || null
        : null;

      const tagsArray = Array.isArray(raw.tags)
        ? raw.tags
            .map((t) => sanitizeFormulaInjection(String(t).trim())?.slice(0, 40) || "")
            .filter(Boolean)
        : [];

      // Opening balance: numeric float converted to integer paise
      const openingBalancePaise = Math.round((Number(raw.openingBalance) || 0) * 100);
      const currency = raw.currency ? sanitizeFormulaInjection(raw.currency) || "INR" : "INR";

      // 6. Action & Conflict Resolution
      const normEmail = sanitizedEmail ? sanitizedEmail.toLowerCase() : "";
      const normPhone = normalizePhone(sanitizedPhone);
      const normName = sanitizedName.toLowerCase();

      // Check if user specifically linked an existing contact ID or matched
      const numContactId =
        typeof raw.existingContactId === "number"
          ? raw.existingContactId
          : Number(raw.existingContactId);
      const existingMatch =
        !isNaN(numContactId) && numContactId > 0 && byId.has(numContactId)
          ? byId.get(numContactId)
          : (normEmail ? byEmail.get(normEmail) : null) ||
            (normPhone ? byPhone.get(normPhone) : null) ||
            byName.get(normName);

      // Determine explicit user action or fallback to strategy
      const chosenAction = raw.action || (existingMatch ? duplicateStrategy : "new");

      if (chosenAction === "skip") {
        skippedRecords++;
        continue;
      }

      if (chosenAction === "update" && existingMatch) {
        await withDbRetry(async () => {
          await db
            .update(contacts)
            .set({
              name: sanitizedName,
              email: sanitizedEmail || existingMatch.email,
              phone: sanitizedPhone || existingMatch.phone,
              company: sanitizedCompany || existingMatch.company,
              address: sanitizedAddress || existingMatch.address,
              ...(sanitizedNotes !== null && { notes: sanitizedNotes }),
              ...(raw.openingBalance !== undefined && !isNaN(Number(raw.openingBalance)) && {
                openingBalance: openingBalancePaise,
              }),
              tags: tagsArray.length > 0 ? tagsArray : existingMatch.tags || [],
              updatedAt: new Date(),
            })
            .where(eq(contacts.id, existingMatch.id));
        });

        updatedRecords++;
        continue;
      }

      if (chosenAction === "merge" && existingMatch) {
        // Smart merge: supplement missing details without overwriting existing non-empty values
        const mergedTags = Array.from(
          new Set([...(existingMatch.tags || []), ...tagsArray])
        );

        await withDbRetry(async () => {
          await db
            .update(contacts)
            .set({
              email: existingMatch.email || sanitizedEmail,
              phone: existingMatch.phone || sanitizedPhone,
              company: existingMatch.company || sanitizedCompany,
              address: existingMatch.address || sanitizedAddress,
              // Only supplement notes if existing contact had none and new row provided explicit notes
              notes: existingMatch.notes || sanitizedNotes || null,
              ...(existingMatch.openingBalance === 0 && openingBalancePaise !== 0 && {
                openingBalance: openingBalancePaise,
              }),
              tags: mergedTags,
              updatedAt: new Date(),
            })
            .where(eq(contacts.id, existingMatch.id));
        });

        updatedRecords++;
        continue;
      }

      // Default: Insert fresh contact
      const [newContact] = await withDbRetry(async () => {
        return await db
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
            openingBalance: openingBalancePaise,
            currency: currency,
            customFields: raw.customFields || {},
          })
          .returning();
      });

      if (newContact) {
        importedContactIds.push(newContact.id);
        importedRecords++;

        // Update local maps for subsequent duplicate detection
        byId.set(newContact.id, newContact);
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

  // Record import session
  try {
    await withDbRetry(async () => {
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

/**
 * FEATURE: Purge spreadsheet test assertion strings from existing contact descriptions
 * Cleans out leftover test notes (e.g. "Valid contact - baseline", "=SUM(1,1)", etc.) from existing records
 */
export async function purgeTestNotesFromContactsAction(): Promise<{ cleanedCount: number }> {
  const user = await requireAuth();

  const userContacts = await withDbRetry(async () => {
    return await db
      .select({ id: contacts.id, notes: contacts.notes })
      .from(contacts)
      .where(and(eq(contacts.userId, user.id), eq(contacts.isDeleted, false)));
  });

  let cleanedCount = 0;
  for (const c of userContacts) {
    if (c.notes && isTestingOrAssertionNote(c.notes)) {
      await withDbRetry(async () => {
        await db
          .update(contacts)
          .set({ notes: null, updatedAt: new Date() })
          .where(eq(contacts.id, c.id));
      });
      cleanedCount++;
    }
  }

  revalidatePath("/dashboard/contacts");
  return { cleanedCount };
}
