"use server";

import { db } from "@/lib/db";
import { 
  transactions, 
  categories, 
  expenseSplits, 
  transactionVersions, 
  auditLogs, 
  users, 
  contacts, 
  groups, 
  groupMembers,
  expenseParticipationHistory 
} from "@/lib/db/schema/schema";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ValidationError, NotFoundError, DatabaseError, AuthorizationError } from "@/lib/errors";
import { generateTransactionId, generateVersionId, generateAuditId } from "@/lib/utils";
import { appCache } from "@/lib/cache";
import { logger } from "@/lib/logger";
import { executeAtomicGroupRecalculation } from "@/lib/settlements/recalculation-engine";

function safeRevalidatePath(path: string, type?: "layout" | "page") {
  try {
    revalidatePath(path, type);
  } catch (_) {}
}

export interface SplitInput {
  userId?: number | null;
  contactId?: number | null;
  splitMethod: "equal" | "exact" | "percentage" | "shares";
  amount: number;
  percentage?: number | null;
  shares?: number | null;
  isExcluded?: boolean;
}

export interface CreateTransactionInput {
  title?: string;
  description: string;
  type: "paid" | "received" | "lent" | "borrowed" | "repaid" | "adjustment";
  amount: number; // in normal currency units (INR)
  currency?: string;
  date?: Date | string;
  contactId?: number | null;
  categoryId?: number | null;
  groupId?: number | null;
  paymentMethod?: string | null;
  status?: "pending" | "completed" | "cancelled";
  receiptUrl?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  location?: string | null;
  paidBy?: number | null;
  paidByContact?: number | null;
  splitMethod?: "equal" | "exact" | "percentage" | "shares";
  splits?: SplitInput[];
}

export interface UpdateTransactionInput {
  title?: string;
  description?: string;
  type?: "paid" | "received" | "lent" | "borrowed" | "repaid" | "adjustment";
  amount?: number;
  currency?: string;
  date?: Date | string;
  contactId?: number | null;
  categoryId?: number | null;
  groupId?: number | null;
  paymentMethod?: string | null;
  status?: "pending" | "completed" | "cancelled";
  receiptUrl?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  location?: string | null;
  paidBy?: number | null;
  paidByContact?: number | null;
  splitMethod?: "equal" | "exact" | "percentage" | "shares";
  reason?: string;
  splits?: SplitInput[];
}

// -------------------------------------------------------------
// Helper: Check if user has permission to edit/delete transaction
// -------------------------------------------------------------
async function checkTransactionPermissions(
  userId: number,
  transaction: typeof transactions.$inferSelect,
  actionName: "edit" | "delete" | "restore"
): Promise<boolean> {
  // Creator or Owner of personal transaction
  if (transaction.createdBy === userId || transaction.userId === userId || transaction.paidBy === userId) {
    return true;
  }

  // If part of a group, check group membership & admin role
  if (transaction.groupId) {
    const [group] = await db
      .select({ createdBy: groups.createdBy })
      .from(groups)
      .where(eq(groups.id, transaction.groupId))
      .limit(1);

    if (group && group.createdBy === userId) {
      return true; // Group Owner can edit/delete everything
    }

    const [member] = await db
      .select({ 
        isAdmin: groupMembers.isAdmin, 
        isGuest: groupMembers.isGuest,
        membershipStatus: groupMembers.membershipStatus,
      })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, transaction.groupId),
          eq(groupMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      return false;
    }

    if (member.membershipStatus !== "active") {
      return false; // Only active members can edit/delete transactions
    }

    if (member.isGuest) {
      return false; // Guests cannot edit/delete
    }

    if (member.isAdmin) {
      return true; // Group Admins can edit/delete any group transaction
    }

    // Regular members can only edit/delete if they created or paid for it
    if (transaction.createdBy === userId || transaction.paidBy === userId) {
      return true;
    }
  }

  return false;
}

// -------------------------------------------------------------
// CREATE TRANSACTION
// -------------------------------------------------------------
export async function createTransaction(data: CreateTransactionInput) {
  try {
    const user = await requireAuth();

    if (!data.description || data.description.trim().length === 0) {
      throw new ValidationError("Description is required");
    }

    if (data.amount <= 0) {
      throw new ValidationError("Amount must be greater than 0");
    }

    const isGroupTransaction = !!data.groupId;

    // For group transactions, ensure the user is an active member (Requirement 5 & 6)
    if (isGroupTransaction) {
      const [member] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, data.groupId!),
            eq(groupMembers.userId, user.id)
          )
        )
        .limit(1);

      if (!member) {
        throw new AuthorizationError("You must be a member of this group to create transactions");
      }

      if (member.membershipStatus === "pending") {
        throw new AuthorizationError("Your join request is still pending Group Owner approval.");
      }

      if (member.membershipStatus === "expense_inactive") {
        throw new AuthorizationError("Your expense participation is awaiting Group Owner configuration.");
      }
    }

    const publicId = generateTransactionId();
    const amountInPaise = Math.round(data.amount * 100);
    const title = data.title?.trim() || data.description.trim();
    const txDate = data.date ? new Date(data.date) : new Date();

    // 1. Insert Transaction
    const [transaction] = await db
      .insert(transactions)
      .values({
        publicId,
        userId: user.id,
        contactId: data.contactId || null,
        groupId: data.groupId || null,
        categoryId: data.categoryId || null,
        type: data.type,
        amount: amountInPaise,
        currency: data.currency || "INR",
        title,
        description: data.description.trim(),
        paymentMethod: data.paymentMethod || null,
        date: txDate,
        status: data.status || "completed",
        receiptUrl: data.receiptUrl || null,
        notes: data.notes || null,
        tags: data.tags || null,
        location: data.location || null,
        isPersonal: !isGroupTransaction,
        createdBy: user.id,
        paidBy: data.paidBy || user.id,
        paidByContact: data.paidByContact || null,
        version: 1,
        isDeleted: false,
      })
      .returning();

    // 2. Insert Splits if provided
    let createdSplits: any[] = [];
    if (data.splits && data.splits.length > 0) {
      const splitRecords = data.splits.map((split) => ({
        transactionId: transaction.id,
        userId: split.userId || null,
        contactId: split.contactId || null,
        splitMethod: split.splitMethod,
        amount: Math.round(split.amount * 100),
        percentage: split.percentage || null,
        shares: split.shares || null,
        isExcluded: split.isExcluded || false,
      }));

      createdSplits = await db.insert(expenseSplits).values(splitRecords).returning();
    }

    // 2b. Permanently record Expense Participation History
    if (transaction.groupId) {
      try {
        const participantUserIds = createdSplits.map((s) => s.userId).filter(Boolean) as number[];
        const participantContactIds = createdSplits.map((s) => s.contactId).filter(Boolean) as number[];
        await db.insert(expenseParticipationHistory).values({
          transactionId: transaction.id,
          groupId: transaction.groupId,
          version: 1,
          participantUserIds,
          participantContactIds,
          splitMethod: data.splitMethod || "equal",
          reason: "initial_creation",
          createdAt: new Date(),
        });
      } catch (_) {}
    }

    // 3. Create baseline Version 1 Snapshot
    const v1Snapshot = {
      id: transaction.id,
      publicId: transaction.publicId,
      title: transaction.title,
      description: transaction.description,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      date: transaction.date,
      status: transaction.status,
      paymentMethod: transaction.paymentMethod,
      receiptUrl: transaction.receiptUrl,
      notes: transaction.notes,
      tags: transaction.tags,
      location: transaction.location,
      contactId: transaction.contactId,
      groupId: transaction.groupId,
      categoryId: transaction.categoryId,
      paidBy: transaction.paidBy,
      paidByContact: transaction.paidByContact,
      splits: createdSplits,
    };

    await db.insert(transactionVersions).values({
      publicId: generateVersionId(),
      transactionId: transaction.id,
      versionNumber: 1,
      editedBy: user.id,
      reason: "Initial Transaction Created",
      changes: { initial: true },
      snapshot: v1Snapshot,
    });

    // 4. Create Audit Log Entry
    await db.insert(auditLogs).values({
      publicId: generateAuditId(),
      userId: user.id,
      action: "transaction_created",
      entityType: "transaction",
      entityId: transaction.id,
      entityPublicId: transaction.publicId,
      afterData: v1Snapshot,
      reason: "Transaction created",
      status: "success",
    });

    // 5. Invalidate in-memory cache & revalidate paths for real-time synchronization
    appCache.invalidateTags([`user:${user.id}`, "dashboard", ...(transaction.groupId ? [`group:${transaction.groupId}`] : [])]);
    safeRevalidatePath("/dashboard");
    safeRevalidatePath("/dashboard/transactions");
    safeRevalidatePath("/dashboard/ledger");
    if (transaction.contactId) {
      safeRevalidatePath(`/dashboard/contacts/${transaction.contactId}`);
      safeRevalidatePath("/dashboard/contacts");
    }
    if (transaction.groupId) {
      safeRevalidatePath(`/dashboard/groups/${transaction.groupId}`);
      safeRevalidatePath("/dashboard/groups");
      try {
        await executeAtomicGroupRecalculation({
          groupId: transaction.groupId,
          triggerOperation: "add_expense",
          initiatedByUserId: user.id,
        });
      } catch (recalcErr) {
        logger.error("Failed to recalculate group after adding expense", { error: recalcErr, metadata: { groupId: transaction.groupId } });
      }
    }
    safeRevalidatePath("/dashboard/reports");
    safeRevalidatePath("/dashboard/analytics");

    return transaction;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError("Failed to create transaction", { originalError: error });
  }
}

// -------------------------------------------------------------
// UPDATE TRANSACTION (Versioned & Audited)
// -------------------------------------------------------------
export async function updateTransaction(
  publicIdOrId: string | number,
  data: UpdateTransactionInput
) {
  try {
    const user = await requireAuth();

    if (data.amount !== undefined && data.amount <= 0) {
      throw new ValidationError("Amount must be greater than 0");
    }

    if (data.description !== undefined && data.description.trim().length === 0) {
      throw new ValidationError("Description cannot be empty");
    }

    // Find existing transaction
    const isNumeric = typeof publicIdOrId === "number" || /^\d+$/.test(String(publicIdOrId));
    const [existingTransaction] = await db
      .select()
      .from(transactions)
      .where(isNumeric ? eq(transactions.id, Number(publicIdOrId)) : eq(transactions.publicId, String(publicIdOrId)))
      .limit(1);

    if (!existingTransaction) {
      throw new NotFoundError("Transaction");
    }

    // Prevent editing soft-deleted transactions
    if (existingTransaction.isDeleted) {
      throw new ValidationError("Cannot edit a deleted transaction. Please restore it first.");
    }

    // Permission Verification
    const hasPermission = await checkTransactionPermissions(user.id, existingTransaction, "edit");
    if (!hasPermission) {
      throw new AuthorizationError("Permission denied: You do not have permission to edit this transaction.");
    }

    // Fetch existing splits for comparison
    const existingSplits = await db
      .select()
      .from(expenseSplits)
      .where(eq(expenseSplits.transactionId, existingTransaction.id));

    // Calculate Diffs
    const changes: Record<string, { old: any; new: any }> = {};

    if (data.amount !== undefined) {
      const newAmountPaise = Math.round(data.amount * 100);
      if (newAmountPaise !== existingTransaction.amount) {
        changes.amount = { old: existingTransaction.amount, new: newAmountPaise };
      }
    }

    if (data.title !== undefined && data.title !== existingTransaction.title) {
      changes.title = { old: existingTransaction.title, new: data.title };
    }

    if (data.description !== undefined && data.description !== existingTransaction.description) {
      changes.description = { old: existingTransaction.description, new: data.description };
    }

    if (data.type !== undefined && data.type !== existingTransaction.type) {
      changes.type = { old: existingTransaction.type, new: data.type };
    }

    if (data.categoryId !== undefined && data.categoryId !== existingTransaction.categoryId) {
      changes.categoryId = { old: existingTransaction.categoryId, new: data.categoryId };
    }

    if (data.contactId !== undefined && data.contactId !== existingTransaction.contactId) {
      changes.contactId = { old: existingTransaction.contactId, new: data.contactId };
    }

    if (data.paidBy !== undefined && data.paidBy !== existingTransaction.paidBy) {
      changes.paidBy = { old: existingTransaction.paidBy, new: data.paidBy };
    }

    if (data.paidByContact !== undefined && data.paidByContact !== existingTransaction.paidByContact) {
      changes.paidByContact = { old: existingTransaction.paidByContact, new: data.paidByContact };
    }

    if (data.paymentMethod !== undefined && data.paymentMethod !== existingTransaction.paymentMethod) {
      changes.paymentMethod = { old: existingTransaction.paymentMethod, new: data.paymentMethod };
    }

    if (data.status !== undefined && data.status !== existingTransaction.status) {
      changes.status = { old: existingTransaction.status, new: data.status };
    }

    if (data.receiptUrl !== undefined && data.receiptUrl !== existingTransaction.receiptUrl) {
      changes.receiptUrl = { old: existingTransaction.receiptUrl, new: data.receiptUrl };
    }

    if (data.notes !== undefined && data.notes !== existingTransaction.notes) {
      changes.notes = { old: existingTransaction.notes, new: data.notes };
    }

    if (data.location !== undefined && data.location !== existingTransaction.location) {
      changes.location = { old: existingTransaction.location, new: data.location };
    }

    if (data.date !== undefined) {
      const newDate = new Date(data.date);
      if (newDate.getTime() !== new Date(existingTransaction.date).getTime()) {
        changes.date = { old: existingTransaction.date, new: newDate };
      }
    }

    if (data.splits) {
      changes.splits = { old: existingSplits, new: data.splits };
    }

    // Only update if there are changes
    const newVersion = existingTransaction.version + 1;
    const updatePayload: any = {
      version: newVersion,
      updatedBy: user.id,
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.type !== undefined) updatePayload.type = data.type;
    if (data.currency !== undefined) updatePayload.currency = data.currency;
    if (data.amount !== undefined) updatePayload.amount = Math.round(data.amount * 100);
    if (data.date !== undefined) updatePayload.date = new Date(data.date);
    if (data.contactId !== undefined) updatePayload.contactId = data.contactId || null;
    if (data.categoryId !== undefined) updatePayload.categoryId = data.categoryId || null;
    if (data.groupId !== undefined) updatePayload.groupId = data.groupId || null;
    if (data.paidBy !== undefined) updatePayload.paidBy = data.paidBy || null;
    if (data.paidByContact !== undefined) updatePayload.paidByContact = data.paidByContact || null;
    if (data.paymentMethod !== undefined) updatePayload.paymentMethod = data.paymentMethod || null;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.receiptUrl !== undefined) updatePayload.receiptUrl = data.receiptUrl || null;
    if (data.notes !== undefined) updatePayload.notes = data.notes || null;
    if (data.tags !== undefined) updatePayload.tags = data.tags || null;
    if (data.location !== undefined) updatePayload.location = data.location || null;

    // 1. Update Transactions Row
    const [updatedTransaction] = await db
      .update(transactions)
      .set(updatePayload)
      .where(eq(transactions.id, existingTransaction.id))
      .returning();

    // 2. Update Splits if provided
    let newSplits = existingSplits;
    if (data.splits) {
      await db.delete(expenseSplits).where(eq(expenseSplits.transactionId, existingTransaction.id));
      if (data.splits.length > 0) {
        const splitRecords = data.splits.map((split) => ({
          transactionId: existingTransaction.id,
          userId: split.userId || null,
          contactId: split.contactId || null,
          splitMethod: split.splitMethod,
          amount: Math.round(split.amount * 100),
          percentage: split.percentage || null,
          shares: split.shares || null,
          isExcluded: split.isExcluded || false,
        }));
        newSplits = await db.insert(expenseSplits).values(splitRecords).returning();
      } else {
        newSplits = [];
      }

      if (updatedTransaction.groupId) {
        try {
          const participantUserIds = newSplits.map((s) => s.userId).filter(Boolean) as number[];
          const participantContactIds = newSplits.map((s) => s.contactId).filter(Boolean) as number[];
          await db.insert(expenseParticipationHistory).values({
            transactionId: updatedTransaction.id,
            groupId: updatedTransaction.groupId,
            version: newVersion,
            participantUserIds,
            participantContactIds,
            splitMethod: newSplits[0]?.splitMethod || "equal",
            reason: "splits_updated",
            createdAt: new Date(),
          });
        } catch (_) {}
      }
    }

    // 3. Capture Full State Snapshot
    const newSnapshot = {
      id: updatedTransaction.id,
      publicId: updatedTransaction.publicId,
      title: updatedTransaction.title,
      description: updatedTransaction.description,
      type: updatedTransaction.type,
      amount: updatedTransaction.amount,
      currency: updatedTransaction.currency,
      date: updatedTransaction.date,
      status: updatedTransaction.status,
      paymentMethod: updatedTransaction.paymentMethod,
      receiptUrl: updatedTransaction.receiptUrl,
      notes: updatedTransaction.notes,
      tags: updatedTransaction.tags,
      location: updatedTransaction.location,
      contactId: updatedTransaction.contactId,
      groupId: updatedTransaction.groupId,
      categoryId: updatedTransaction.categoryId,
      paidBy: updatedTransaction.paidBy,
      paidByContact: updatedTransaction.paidByContact,
      splits: newSplits,
    };

    const oldSnapshot = {
      id: existingTransaction.id,
      publicId: existingTransaction.publicId,
      title: existingTransaction.title,
      description: existingTransaction.description,
      type: existingTransaction.type,
      amount: existingTransaction.amount,
      currency: existingTransaction.currency,
      date: existingTransaction.date,
      status: existingTransaction.status,
      paymentMethod: existingTransaction.paymentMethod,
      receiptUrl: existingTransaction.receiptUrl,
      notes: existingTransaction.notes,
      tags: existingTransaction.tags,
      location: existingTransaction.location,
      contactId: existingTransaction.contactId,
      groupId: existingTransaction.groupId,
      categoryId: existingTransaction.categoryId,
      paidBy: existingTransaction.paidBy,
      paidByContact: existingTransaction.paidByContact,
      splits: existingSplits,
    };

    // 4. Create Version History Record
    await db.insert(transactionVersions).values({
      publicId: generateVersionId(),
      transactionId: existingTransaction.id,
      versionNumber: newVersion,
      editedBy: user.id,
      reason: data.reason?.trim() || "Transaction details updated",
      changes: changes,
      snapshot: newSnapshot,
    });

    // 5. Create Audit Log Record
    await db.insert(auditLogs).values({
      publicId: generateAuditId(),
      userId: user.id,
      action: "transaction_updated",
      entityType: "transaction",
      entityId: existingTransaction.id,
      entityPublicId: existingTransaction.publicId,
      beforeData: oldSnapshot,
      afterData: newSnapshot,
      changes: changes,
      reason: data.reason?.trim() || "Transaction updated",
      status: "success",
    });

    // 6. Invalidate in-memory cache & revalidate all affected routes
    appCache.invalidateTags([`user:${user.id}`, "dashboard", ...(updatedTransaction.groupId ? [`group:${updatedTransaction.groupId}`] : [])]);
    safeRevalidatePath("/dashboard");
    safeRevalidatePath("/dashboard/transactions");
    safeRevalidatePath(`/dashboard/transactions/${existingTransaction.publicId}`);
    safeRevalidatePath("/dashboard/ledger");
    if (updatedTransaction.contactId) {
      safeRevalidatePath(`/dashboard/contacts/${updatedTransaction.contactId}`);
      safeRevalidatePath("/dashboard/contacts");
    }
    if (updatedTransaction.groupId) {
      safeRevalidatePath(`/dashboard/groups/${updatedTransaction.groupId}`);
      safeRevalidatePath("/dashboard/groups");
      try {
        await executeAtomicGroupRecalculation({
          groupId: updatedTransaction.groupId,
          triggerOperation: "edit_expense",
          initiatedByUserId: user.id,
        });
      } catch (recalcErr) {
        logger.error("Failed to recalculate group after editing expense", { error: recalcErr, metadata: { groupId: updatedTransaction.groupId } });
      }
    }
    safeRevalidatePath("/dashboard/reports");
    safeRevalidatePath("/dashboard/analytics");

    return updatedTransaction;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to update transaction", { originalError: error });
  }
}

// -------------------------------------------------------------
// DELETE TRANSACTION (Soft Delete)
// -------------------------------------------------------------
export async function deleteTransaction(publicIdOrId: string | number, reason?: string) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof publicIdOrId === "number" || /^\d+$/.test(String(publicIdOrId));
    const [existingTransaction] = await db
      .select()
      .from(transactions)
      .where(isNumeric ? eq(transactions.id, Number(publicIdOrId)) : eq(transactions.publicId, String(publicIdOrId)))
      .limit(1);

    if (!existingTransaction) {
      throw new NotFoundError("Transaction");
    }

    if (existingTransaction.isDeleted) {
      return { success: true, alreadyDeleted: true };
    }

    // Permission Verification
    const hasPermission = await checkTransactionPermissions(user.id, existingTransaction, "delete");
    if (!hasPermission) {
      throw new AuthorizationError("Permission denied: You do not have permission to delete this transaction.");
    }

    // Perform Soft Delete
    const now = new Date();
    await db
      .update(transactions)
      .set({
        isDeleted: true,
        deletedAt: now,
        deletedBy: user.id,
        updatedAt: now,
      })
      .where(eq(transactions.id, existingTransaction.id));

    // Audit Log Record
    await db.insert(auditLogs).values({
      publicId: generateAuditId(),
      userId: user.id,
      action: "transaction_deleted",
      entityType: "transaction",
      entityId: existingTransaction.id,
      entityPublicId: existingTransaction.publicId,
      beforeData: {
        amount: existingTransaction.amount,
        description: existingTransaction.description,
        isDeleted: false,
      },
      afterData: {
        isDeleted: true,
        deletedAt: now,
        deletedBy: user.id,
      },
      changes: {
        isDeleted: { old: false, new: true },
        deletedAt: { old: null, new: now },
      },
      reason: reason || "Transaction soft deleted",
      status: "success",
    });

    // Delete splits for deleted transaction
    await db.delete(expenseSplits).where(eq(expenseSplits.transactionId, existingTransaction.id));

    // Invalidate in-memory cache & revalidate paths
    appCache.invalidateTags([`user:${user.id}`, "dashboard", ...(existingTransaction.groupId ? [`group:${existingTransaction.groupId}`] : [])]);
    safeRevalidatePath("/dashboard");
    safeRevalidatePath("/dashboard/transactions");
    safeRevalidatePath(`/dashboard/transactions/${existingTransaction.publicId}`);
    safeRevalidatePath("/dashboard/ledger");
    if (existingTransaction.groupId) {
      safeRevalidatePath(`/dashboard/groups/${existingTransaction.groupId}`);
      safeRevalidatePath("/dashboard/groups");
      try {
        await executeAtomicGroupRecalculation({
          groupId: existingTransaction.groupId,
          triggerOperation: "delete_expense",
          initiatedByUserId: user.id,
        });
      } catch (recalcErr) {
        logger.error("Failed to recalculate group after deleting expense", { error: recalcErr, metadata: { groupId: existingTransaction.groupId } });
      }
    }
    if (existingTransaction.contactId) {
      safeRevalidatePath(`/dashboard/contacts/${existingTransaction.contactId}`);
      safeRevalidatePath("/dashboard/contacts");
    }
    safeRevalidatePath("/dashboard/reports");
    safeRevalidatePath("/dashboard/analytics");

    return { success: true };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError("Failed to delete transaction", { originalError: error });
  }
}

export async function deleteTransactionFormAction(publicIdOrId: string | number) {
  await deleteTransaction(publicIdOrId);
}

// -------------------------------------------------------------
// RESTORE TRANSACTION (Reversal of Soft Delete)
// -------------------------------------------------------------
export async function restoreTransaction(publicIdOrId: string | number) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof publicIdOrId === "number" || /^\d+$/.test(String(publicIdOrId));
    const [existingTransaction] = await db
      .select()
      .from(transactions)
      .where(isNumeric ? eq(transactions.id, Number(publicIdOrId)) : eq(transactions.publicId, String(publicIdOrId)))
      .limit(1);

    if (!existingTransaction) {
      throw new NotFoundError("Transaction");
    }

    if (!existingTransaction.isDeleted) {
      return { success: true, alreadyActive: true };
    }

    // Permission Verification (Owner or Admin)
    const hasPermission = await checkTransactionPermissions(user.id, existingTransaction, "restore");
    if (!hasPermission) {
      throw new AuthorizationError("Permission denied: You do not have permission to restore this transaction.");
    }

    const now = new Date();
    await db
      .update(transactions)
      .set({
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        updatedAt: now,
      })
      .where(eq(transactions.id, existingTransaction.id));

    // Audit Log Record
    await db.insert(auditLogs).values({
      publicId: generateAuditId(),
      userId: user.id,
      action: "transaction_restored",
      entityType: "transaction",
      entityId: existingTransaction.id,
      entityPublicId: existingTransaction.publicId,
      beforeData: {
        isDeleted: true,
        deletedAt: existingTransaction.deletedAt,
      },
      afterData: {
        isDeleted: false,
        restoredAt: now,
      },
      changes: {
        isDeleted: { old: true, new: false },
      },
      reason: "Transaction restored from history",
      status: "success",
    });

    // Invalidate in-memory cache & revalidate paths
    appCache.invalidateTags([`user:${user.id}`, "dashboard", ...(existingTransaction.groupId ? [`group:${existingTransaction.groupId}`] : [])]);
    safeRevalidatePath("/dashboard");
    safeRevalidatePath("/dashboard/transactions");
    safeRevalidatePath(`/dashboard/transactions/${existingTransaction.publicId}`);
    safeRevalidatePath("/dashboard/ledger");
    if (existingTransaction.groupId) {
      safeRevalidatePath(`/dashboard/groups/${existingTransaction.groupId}`);
      safeRevalidatePath("/dashboard/groups");
      try {
        await executeAtomicGroupRecalculation({
          groupId: existingTransaction.groupId,
          triggerOperation: "restore_expense",
          initiatedByUserId: user.id,
        });
      } catch (recalcErr) {
        logger.error("Failed to recalculate group after restoring expense", { error: recalcErr, metadata: { groupId: existingTransaction.groupId } });
      }
    }
    if (existingTransaction.contactId) {
      safeRevalidatePath(`/dashboard/contacts/${existingTransaction.contactId}`);
      safeRevalidatePath("/dashboard/contacts");
    }
    safeRevalidatePath("/dashboard/reports");
    safeRevalidatePath("/dashboard/analytics");

    return { success: true };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError("Failed to restore transaction", { originalError: error });
  }
}

// -------------------------------------------------------------
// GET TRANSACTION BY PUBLIC ID (Full Details)
// -------------------------------------------------------------
export async function getTransaction(idOrPublicId: number | string) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof idOrPublicId === "number" || /^\d+$/.test(String(idOrPublicId));
    
    const paidByUsers = alias(users, "paid_by_users");
    const creatorUsers = alias(users, "creator_users");
    const updaterUsers = alias(users, "updater_users");
    const deletedByUsers = alias(users, "deleted_by_users");
    const paidByContacts = alias(contacts, "paid_by_contacts");

    const [transaction] = await db
      .select({
        id: transactions.id,
        publicId: transactions.publicId,
        userId: transactions.userId,
        type: transactions.type,
        amount: transactions.amount,
        currency: transactions.currency,
        title: transactions.title,
        description: transactions.description,
        date: transactions.date,
        status: transactions.status,
        paymentMethod: transactions.paymentMethod,
        receiptUrl: transactions.receiptUrl,
        notes: transactions.notes,
        tags: transactions.tags,
        location: transactions.location,
        isPersonal: transactions.isPersonal,
        version: transactions.version,
        isDeleted: transactions.isDeleted,
        deletedAt: transactions.deletedAt,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        // Joined details
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
        contactId: transactions.contactId,
        contactName: contacts.name,
        contactAvatar: contacts.avatar,
        groupId: transactions.groupId,
        groupName: groups.name,
        groupType: groups.type,
        createdBy: transactions.createdBy,
        creatorName: creatorUsers.name,
        creatorAvatar: creatorUsers.avatar,
        updatedBy: transactions.updatedBy,
        updaterName: updaterUsers.name,
        paidBy: transactions.paidBy,
        paidByName: paidByUsers.name,
        paidByAvatar: paidByUsers.avatar,
        paidByContact: transactions.paidByContact,
        paidByContactName: paidByContacts.name,
        deletedBy: transactions.deletedBy,
        deletedByName: deletedByUsers.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(contacts, eq(transactions.contactId, contacts.id))
      .leftJoin(groups, eq(transactions.groupId, groups.id))
      .leftJoin(creatorUsers, eq(transactions.createdBy, creatorUsers.id))
      .leftJoin(updaterUsers, eq(transactions.updatedBy, updaterUsers.id))
      .leftJoin(paidByUsers, eq(transactions.paidBy, paidByUsers.id))
      .leftJoin(paidByContacts, eq(transactions.paidByContact, paidByContacts.id))
      .leftJoin(deletedByUsers, eq(transactions.deletedBy, deletedByUsers.id))
      .where(isNumeric ? eq(transactions.id, Number(idOrPublicId)) : eq(transactions.publicId, String(idOrPublicId)))
      .limit(1);

    if (!transaction) {
      throw new NotFoundError("Transaction");
    }

    // Fetch Splits
    const splitUsers = alias(users, "split_users");
    const splitContacts = alias(contacts, "split_contacts");

    const splits = await db
      .select({
        id: expenseSplits.id,
        transactionId: expenseSplits.transactionId,
        userId: expenseSplits.userId,
        contactId: expenseSplits.contactId,
        splitMethod: expenseSplits.splitMethod,
        amount: expenseSplits.amount,
        percentage: expenseSplits.percentage,
        shares: expenseSplits.shares,
        isExcluded: expenseSplits.isExcluded,
        userName: splitUsers.name,
        userAvatar: splitUsers.avatar,
        contactName: splitContacts.name,
        contactAvatar: splitContacts.avatar,
      })
      .from(expenseSplits)
      .leftJoin(splitUsers, eq(expenseSplits.userId, splitUsers.id))
      .leftJoin(splitContacts, eq(expenseSplits.contactId, splitContacts.id))
      .where(eq(expenseSplits.transactionId, transaction.id));

    // Calculate Permissions for current user
    const [groupMember] = transaction.groupId
      ? await db
          .select({ isAdmin: groupMembers.isAdmin })
          .from(groupMembers)
          .where(and(eq(groupMembers.groupId, transaction.groupId), eq(groupMembers.userId, user.id)))
          .limit(1)
      : [null];

    const canEdit =
      transaction.createdBy === user.id ||
      transaction.userId === user.id ||
      transaction.paidBy === user.id ||
      !!groupMember?.isAdmin;

    const canDelete = canEdit;
    const canRestore = canEdit;

    return {
      ...transaction,
      splits,
      permissions: {
        canEdit,
        canDelete,
        canRestore,
      },
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to fetch transaction", { originalError: error });
  }
}

// -------------------------------------------------------------
// GET VERSION HISTORY (Chronological Snapshots & Diffs)
// -------------------------------------------------------------
export async function getTransactionVersionHistory(publicIdOrId: string | number) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof publicIdOrId === "number" || /^\d+$/.test(String(publicIdOrId));
    const [transaction] = await db
      .select({ id: transactions.id, publicId: transactions.publicId })
      .from(transactions)
      .where(isNumeric ? eq(transactions.id, Number(publicIdOrId)) : eq(transactions.publicId, String(publicIdOrId)))
      .limit(1);

    if (!transaction) {
      throw new NotFoundError("Transaction");
    }

    const versions = await db
      .select({
        id: transactionVersions.id,
        publicId: transactionVersions.publicId,
        versionNumber: transactionVersions.versionNumber,
        editedBy: transactionVersions.editedBy,
        reason: transactionVersions.reason,
        changes: transactionVersions.changes,
        snapshot: transactionVersions.snapshot,
        createdAt: transactionVersions.createdAt,
        editorName: users.name,
        editorAvatar: users.avatar,
        editorEmail: users.email,
      })
      .from(transactionVersions)
      .leftJoin(users, eq(transactionVersions.editedBy, users.id))
      .where(eq(transactionVersions.transactionId, transaction.id))
      .orderBy(desc(transactionVersions.versionNumber));

    return versions;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to fetch transaction version history", { originalError: error });
  }
}

// -------------------------------------------------------------
// GET TRANSACTION AUDIT LOGS & TIMELINE
// -------------------------------------------------------------
export async function getTransactionAuditLogs(publicIdOrId: string | number) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof publicIdOrId === "number" || /^\d+$/.test(String(publicIdOrId));
    const [transaction] = await db
      .select({ id: transactions.id, publicId: transactions.publicId })
      .from(transactions)
      .where(isNumeric ? eq(transactions.id, Number(publicIdOrId)) : eq(transactions.publicId, String(publicIdOrId)))
      .limit(1);

    if (!transaction) {
      throw new NotFoundError("Transaction");
    }

    const logs = await db
      .select({
        id: auditLogs.id,
        publicId: auditLogs.publicId,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        entityPublicId: auditLogs.entityPublicId,
        changes: auditLogs.changes,
        beforeData: auditLogs.beforeData,
        afterData: auditLogs.afterData,
        reason: auditLogs.reason,
        status: auditLogs.status,
        browser: auditLogs.browser,
        device: auditLogs.device,
        createdAt: auditLogs.createdAt,
        userName: users.name,
        userAvatar: users.avatar,
        userEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(
        or(
          and(eq(auditLogs.entityType, "transaction"), eq(auditLogs.entityId, transaction.id)),
          and(eq(auditLogs.entityType, "transaction"), eq(auditLogs.entityPublicId, transaction.publicId))
        )
      )
      .orderBy(desc(auditLogs.createdAt));

    return logs;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to fetch transaction audit logs", { originalError: error });
  }
}

// -------------------------------------------------------------
// GET DELETED TRANSACTIONS
// -------------------------------------------------------------
export async function getDeletedTransactions() {
  try {
    const user = await requireAuth();

    const deletedByUsers = alias(users, "deleted_by_users");
    const creatorUsers = alias(users, "creator_users");

    const deletedList = await db
      .select({
        id: transactions.id,
        publicId: transactions.publicId,
        title: transactions.title,
        description: transactions.description,
        type: transactions.type,
        amount: transactions.amount,
        currency: transactions.currency,
        date: transactions.date,
        status: transactions.status,
        paymentMethod: transactions.paymentMethod,
        receiptUrl: transactions.receiptUrl,
        deletedAt: transactions.deletedAt,
        deletedBy: transactions.deletedBy,
        deletedByName: deletedByUsers.name,
        creatorName: creatorUsers.name,
        contactName: contacts.name,
        categoryName: categories.name,
        groupName: groups.name,
        groupId: groups.id,
      })
      .from(transactions)
      .leftJoin(contacts, eq(transactions.contactId, contacts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(groups, eq(transactions.groupId, groups.id))
      .leftJoin(deletedByUsers, eq(transactions.deletedBy, deletedByUsers.id))
      .leftJoin(creatorUsers, eq(transactions.createdBy, creatorUsers.id))
      .where(
        and(
          or(
            eq(transactions.userId, user.id),
            eq(transactions.createdBy, user.id),
            sql`${transactions.groupId} IN (SELECT group_id FROM group_members WHERE user_id = ${user.id})`
          ),
          eq(transactions.isDeleted, true)
        )
      )
      .orderBy(desc(transactions.deletedAt));

    return deletedList;
  } catch (error) {
    throw new DatabaseError("Failed to fetch deleted transactions", { originalError: error });
  }
}

// -------------------------------------------------------------
// GET ACTIVE TRANSACTIONS
// -------------------------------------------------------------
export async function getTransactions(options?: { limit?: number; groupId?: number; contactId?: number }) {
  try {
    const user = await requireAuth();

    const conditions = [
      eq(transactions.isDeleted, false),
    ];

    if (options?.groupId) {
      conditions.push(eq(transactions.groupId, options.groupId));
    } else if (options?.contactId) {
      conditions.push(eq(transactions.contactId, options.contactId));
    } else {
      conditions.push(
        or(
          eq(transactions.userId, user.id),
          eq(transactions.createdBy, user.id),
          sql`${transactions.groupId} IN (SELECT group_id FROM group_members WHERE user_id = ${user.id})`
        )!
      );
    }

    const query = db
      .select({
        id: transactions.id,
        publicId: transactions.publicId,
        title: transactions.title,
        description: transactions.description,
        type: transactions.type,
        amount: transactions.amount,
        currency: transactions.currency,
        date: transactions.date,
        status: transactions.status,
        paymentMethod: transactions.paymentMethod,
        receiptUrl: transactions.receiptUrl,
        contactName: contacts.name,
        categoryName: categories.name,
        groupName: groups.name,
        groupId: groups.id,
      })
      .from(transactions)
      .leftJoin(contacts, eq(transactions.contactId, contacts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(groups, eq(transactions.groupId, groups.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.date));

    if (options?.limit) {
      return await query.limit(options.limit);
    }

    return await query;
  } catch (error) {
    throw new DatabaseError("Failed to fetch transactions", { originalError: error });
  }
}
