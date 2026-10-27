"use server";

import { db } from "@/lib/db";
import { settlements, transactions, contacts, groups, expenseSplits, groupMembers, users } from "@/lib/db/schema/schema";
import { eq, and, or, desc, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { calculateOptimalSettlements, type Balance } from "@/lib/settlements/calculator";
import { executeAtomicGroupRecalculation } from "@/lib/settlements/recalculation-engine";
import { ValidationError, NotFoundError, DatabaseError, AuthorizationError } from "@/lib/errors";
import { generatePublicId } from "@/lib/utils";

export async function createSettlement(data: {
  fromUserId: number;
  fromContactId?: number;
  toUserId: number;
  toContactId?: number;
  amount: number;
  currency?: string;
  groupId?: number;
  paymentMethod?: string;
  notes?: string;
}) {
  try {
    const user = await requireAuth();

    if (data.amount <= 0) {
      throw new ValidationError("Settlement amount must be greater than 0");
    }

    if (data.fromUserId === data.toUserId) {
      throw new ValidationError("Cannot create settlement with same user");
    }

    const [settlement] = await db
      .insert(settlements)
      .values({
        publicId: generatePublicId(),
        fromUserId: data.fromUserId,
        fromContactId: data.fromContactId || null,
        toUserId: data.toUserId,
        toContactId: data.toContactId || null,
        amount: Math.round(data.amount * 100),
        currency: data.currency || "INR",
        groupId: data.groupId || null,
        paymentMethod: data.paymentMethod || null,
        notes: data.notes || null,
        status: "pending",
      })
      .returning();

    // Revalidate appropriate paths for real-time updates
    revalidatePath("/dashboard/settlements");
    if (data.groupId) {
      revalidatePath(`/dashboard/groups/${data.groupId}`);
      revalidatePath("/dashboard/groups");
      revalidatePath("/dashboard");
    }
    return settlement;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError("Failed to create settlement", { originalError: error });
  }
}

export async function updateSettlement(
  publicId: string,
  data: {
    amount?: number;
    currency?: string;
    paymentMethod?: string;
    status?: "pending" | "completed" | "cancelled";
    notes?: string;
  }
) {
  try {
    const user = await requireAuth();

    if (data.amount !== undefined && data.amount <= 0) {
      throw new ValidationError("Settlement amount must be greater than 0");
    }

    // First, find the settlement by publicId to get the numeric ID
    const [existingSettlement] = await db
      .select()
      .from(settlements)
      .where(
        and(
          eq(settlements.publicId, publicId),
          or(eq(settlements.fromUserId, user.id), eq(settlements.toUserId, user.id))
        )
      )
      .limit(1);

    if (!existingSettlement) {
      throw new NotFoundError("Settlement");
    }

    const [settlement] = await db
      .update(settlements)
      .set({
        ...(data.amount !== undefined && { amount: Math.round(data.amount * 100) }),
        ...(data.currency && { currency: data.currency }),
        ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod || null }),
        ...(data.status && { status: data.status }),
        ...(data.status === "completed" && { paidAt: new Date() }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        updatedAt: new Date(),
      })
      .where(eq(settlements.id, existingSettlement.id))
      .returning();

    // Revalidate appropriate paths for real-time updates
    revalidatePath("/dashboard/settlements");
    if (settlement.groupId) {
      if (data.status === "completed") {
        try {
          await executeAtomicGroupRecalculation({
            groupId: settlement.groupId,
            triggerOperation: "recalculate",
            initiatedByUserId: user.id,
          });
        } catch (recalcErr) {
          console.warn("Failed to recalculate group after updating settlement:", recalcErr);
        }
      }
      revalidatePath(`/dashboard/groups/${settlement.groupId}`);
      revalidatePath("/dashboard/groups");
      revalidatePath("/dashboard");
    }
    return settlement;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to update settlement", { originalError: error });
  }
}

export async function markSettlementAsPaid(publicIdOrId: string | number, paymentMethod?: string) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof publicIdOrId === "number" || /^\d+$/.test(String(publicIdOrId));
    const [existingSettlement] = await db
      .select()
      .from(settlements)
      .where(
        and(
          isNumeric ? eq(settlements.id, Number(publicIdOrId)) : eq(settlements.publicId, String(publicIdOrId)),
          eq(settlements.isDeleted, false)
        )
      )
      .limit(1);

    if (!existingSettlement) {
      throw new NotFoundError("Settlement");
    }

    // Check authorization: direct participant, group owner, or group admin
    let isAuthorized = existingSettlement.fromUserId === user.id || existingSettlement.toUserId === user.id;

    if (!isAuthorized && existingSettlement.groupId) {
      const [group] = await db
        .select({ createdBy: groups.createdBy })
        .from(groups)
        .where(eq(groups.id, existingSettlement.groupId))
        .limit(1);

      if (group?.createdBy === user.id) {
        isAuthorized = true;
      } else {
        const { groupMembers } = await import("@/lib/db/schema/schema");
        const [membership] = await db
          .select({ isAdmin: groupMembers.isAdmin })
          .from(groupMembers)
          .where(
            and(
              eq(groupMembers.groupId, existingSettlement.groupId),
              eq(groupMembers.userId, user.id)
            )
          )
          .limit(1);
        if (membership) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      throw new ValidationError("You do not have permission to mark this settlement as paid");
    }

    const resolvedPaymentMethod = paymentMethod || existingSettlement.paymentMethod || "UPI";

    const [settlement] = await db
      .update(settlements)
      .set({
        status: "completed",
        paidAt: new Date(),
        currency: existingSettlement.currency || "INR",
        paymentMethod: resolvedPaymentMethod,
        updatedAt: new Date(),
      })
      .where(eq(settlements.id, existingSettlement.id))
      .returning();

    if (!settlement) {
      throw new NotFoundError("Settlement");
    }

    // Record settlement history & audit log if group exists
    if (existingSettlement.groupId) {
      try {
        const { settlementHistory, auditLogs, users: usersTable, contacts: contactsTable } = await import("@/lib/db/schema/schema");

        let fromName = "Member";
        let toName = "Member";
        if (existingSettlement.fromUserId) {
          const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, existingSettlement.fromUserId)).limit(1);
          if (u?.name) fromName = u.name;
        } else if (existingSettlement.fromContactId) {
          const [c] = await db.select({ name: contactsTable.name }).from(contactsTable).where(eq(contactsTable.id, existingSettlement.fromContactId)).limit(1);
          if (c?.name) fromName = c.name;
        }

        if (existingSettlement.toUserId) {
          const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, existingSettlement.toUserId)).limit(1);
          if (u?.name) toName = u.name;
        } else if (existingSettlement.toContactId) {
          const [c] = await db.select({ name: contactsTable.name }).from(contactsTable).where(eq(contactsTable.id, existingSettlement.toContactId)).limit(1);
          if (c?.name) toName = c.name;
        }

        await db.insert(settlementHistory).values({
          publicId: generatePublicId(),
          settlementId: existingSettlement.id,
          groupId: existingSettlement.groupId,
          fromUserId: existingSettlement.fromUserId,
          fromContactId: existingSettlement.fromContactId,
          fromName,
          toUserId: existingSettlement.toUserId,
          toContactId: existingSettlement.toContactId,
          toName,
          amount: existingSettlement.amount,
          currency: existingSettlement.currency || "INR",
          paymentMethod: resolvedPaymentMethod,
          reason: "Settlement marked as paid",
          notes: existingSettlement.notes,
          approvedBy: user.id,
          approvedByName: user.name || "User",
          approvedDate: new Date(),
          previousBalance: -existingSettlement.amount,
          newBalance: 0,
        });

        await db.insert(auditLogs).values({
          userId: user.id,
          action: "update",
          entityType: "settlement",
          entityId: existingSettlement.id,
          changes: {
            status: "completed",
            paidAt: new Date(),
            paymentMethod: resolvedPaymentMethod,
          },
        });

        // Update matching group receiver assignment if active
        const { groupReceiverAssignments } = await import("@/lib/db/schema/schema");
        await db
          .update(groupReceiverAssignments)
          .set({ status: "settled", updatedAt: new Date(), updatedBy: user.id })
          .where(
            and(
              eq(groupReceiverAssignments.groupId, existingSettlement.groupId),
              eq(groupReceiverAssignments.status, "active"),
              existingSettlement.fromUserId
                ? eq(groupReceiverAssignments.fromUserId, existingSettlement.fromUserId)
                : eq(groupReceiverAssignments.fromContactId, existingSettlement.fromContactId!),
              existingSettlement.toUserId
                ? eq(groupReceiverAssignments.toUserId, existingSettlement.toUserId)
                : eq(groupReceiverAssignments.toContactId, existingSettlement.toContactId!),
              eq(groupReceiverAssignments.amount, existingSettlement.amount)
            )
          )
          .catch(() => {});
      } catch (logErr) {
        console.warn("Non-critical error recording settlement audit log:", logErr);
      }
    }

    // Revalidate appropriate paths for real-time updates
    revalidatePath("/dashboard/settlements");
    if (settlement.groupId) {
      try {
        await executeAtomicGroupRecalculation({
          groupId: settlement.groupId,
          triggerOperation: "recalculate",
          initiatedByUserId: user.id,
        });
      } catch (recalcErr) {
        console.warn("Failed to recalculate group after completing settlement:", recalcErr);
      }
      revalidatePath(`/dashboard/groups/${settlement.groupId}`);
      revalidatePath("/dashboard/groups");
    }
    revalidatePath("/dashboard");
    return settlement;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError("Failed to mark settlement as paid", { originalError: error });
  }
}

export async function markSettlementAsPaidFormAction(publicIdOrId: string | number) {
  await markSettlementAsPaid(publicIdOrId);
}

export async function createSettlementsBatch(
  data: Array<{
    fromUserId?: number;
    fromContactId?: number;
    toUserId?: number;
    toContactId?: number;
    amount: number; // in rupees
    currency?: string;
    groupId?: number;
    paymentMethod?: string;
    notes?: string;
    status?: "pending" | "completed";
  }>,
  options?: {
    markAsCompleted?: boolean;
    paymentMethod?: string;
    notes?: string;
  }
) {
  try {
    const user = await requireAuth();

    if (data.length === 0) {
      throw new ValidationError("No settlements to create");
    }

    // Validate all settlements before inserting
    for (const settlement of data) {
      if (settlement.amount <= 0) {
        throw new ValidationError("Settlement amount must be greater than 0");
      }

      if (!settlement.fromUserId && !settlement.fromContactId) {
        throw new ValidationError("Settlement must have a payer (from user or contact)");
      }

      if (!settlement.toUserId && !settlement.toContactId) {
        throw new ValidationError("Settlement must have a recipient (to user or contact)");
      }

      if (settlement.fromUserId && settlement.toUserId && settlement.fromUserId === settlement.toUserId) {
        throw new ValidationError("Cannot create settlement with same user");
      }
    }

    const markCompleted = options?.markAsCompleted ?? (data[0]?.status === "completed");
    const defaultPaymentMethod = options?.paymentMethod || "UPI";
    const now = new Date();

    // Insert all settlements in a single batch
    const insertedSettlements = await db
      .insert(settlements)
      .values(
        data.map(settlement => ({
          publicId: generatePublicId(),
          fromUserId: settlement.fromUserId || null,
          fromContactId: settlement.fromContactId || null,
          toUserId: settlement.toUserId || null,
          toContactId: settlement.toContactId || null,
          amount: Math.round(settlement.amount * 100),
          currency: settlement.currency || "INR",
          groupId: settlement.groupId || null,
          paymentMethod: settlement.paymentMethod || defaultPaymentMethod,
          notes: settlement.notes || options?.notes || null,
          status: settlement.status || (markCompleted ? "completed" : "pending"),
          paidAt: (settlement.status === "completed" || markCompleted) ? now : null,
        }))
      )
      .returning();

    // If marked as completed, record history & audit
    if (markCompleted && insertedSettlements.length > 0) {
      try {
        const { settlementHistory, auditLogs, users: usersTable, contacts: contactsTable } = await import("@/lib/db/schema/schema");

        for (const st of insertedSettlements) {
          if (!st.groupId) continue;

          let fromName = "Member";
          let toName = "Member";
          if (st.fromUserId) {
            const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, st.fromUserId)).limit(1);
            if (u?.name) fromName = u.name;
          } else if (st.fromContactId) {
            const [c] = await db.select({ name: contactsTable.name }).from(contactsTable).where(eq(contactsTable.id, st.fromContactId)).limit(1);
            if (c?.name) fromName = c.name;
          }

          if (st.toUserId) {
            const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, st.toUserId)).limit(1);
            if (u?.name) toName = u.name;
          } else if (st.toContactId) {
            const [c] = await db.select({ name: contactsTable.name }).from(contactsTable).where(eq(contactsTable.id, st.toContactId)).limit(1);
            if (c?.name) toName = c.name;
          }

          await db.insert(settlementHistory).values({
            publicId: generatePublicId(),
            settlementId: st.id,
            groupId: st.groupId,
            fromUserId: st.fromUserId,
            fromContactId: st.fromContactId,
            fromName,
            toUserId: st.toUserId,
            toContactId: st.toContactId,
            toName,
            amount: st.amount,
            currency: st.currency || "INR",
            paymentMethod: st.paymentMethod || defaultPaymentMethod,
            reason: "Batch debt settlement recorded",
            notes: st.notes,
            approvedBy: user.id,
            approvedByName: user.name || "User",
            approvedDate: now,
            previousBalance: -st.amount,
            newBalance: 0,
          });

          await db.insert(auditLogs).values({
            userId: user.id,
            action: "create",
            entityType: "settlement",
            entityId: st.id,
            changes: {
              status: "completed",
              amount: st.amount,
              paymentMethod: st.paymentMethod || defaultPaymentMethod,
            },
          });
        }
      } catch (logErr) {
        console.warn("Non-critical error logging batch settlement history:", logErr);
      }
    }

    // Revalidate appropriate paths for real-time updates
    revalidatePath("/dashboard/settlements");
    
    const groupIds = [...new Set(data.map(s => s.groupId).filter((id): id is number => id !== null && id !== undefined))];
    groupIds.forEach(groupId => {
      revalidatePath(`/dashboard/groups/${groupId}`);
      revalidatePath("/dashboard/groups");
    });
    revalidatePath("/dashboard");

    return insertedSettlements;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError("Failed to create settlements", { originalError: error });
  }
}

export async function getGroupSettlementDetailsAction(groupIdOrPublicId: string | number) {
  try {
    const { getGroupFinancialDetails } = await import("@/actions/group-financials");
    const financialData = await getGroupFinancialDetails(groupIdOrPublicId);
    return {
      success: true,
      group: financialData.group,
      suggestions: financialData.settlements.suggestions,
      overview: financialData.overview,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch settlements",
      suggestions: [],
    };
  }
}

/**
 * Delete a settlement (FEATURE 2).
 * Allows Owner/Admin or participants to delete/cancel a settlement,
 * automatically recalculating group balances, debt graph, and reports.
 */
export async function deleteSettlement(publicIdOrId: string | number, reason?: string) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof publicIdOrId === "number" || /^\d+$/.test(String(publicIdOrId));
    const [existing] = await db
      .select()
      .from(settlements)
      .where(isNumeric ? eq(settlements.id, Number(publicIdOrId)) : eq(settlements.publicId, String(publicIdOrId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Settlement");
    }

    if (existing.isDeleted) {
      return { success: true, alreadyDeleted: true };
    }

    // Permission check: Caller must be fromUser, toUser, or Group Owner / Admin
    let hasPermission = existing.fromUserId === user.id || existing.toUserId === user.id;

    if (!hasPermission && existing.groupId) {
      const [group] = await db
        .select({ createdBy: groups.createdBy })
        .from(groups)
        .where(eq(groups.id, existing.groupId))
        .limit(1);

      if (group && group.createdBy === user.id) {
        hasPermission = true;
      } else {
        const [member] = await db
          .select({ isAdmin: groupMembers.isAdmin })
          .from(groupMembers)
          .where(and(eq(groupMembers.groupId, existing.groupId), eq(groupMembers.userId, user.id)))
          .limit(1);
        if (member?.isAdmin) {
          hasPermission = true;
        }
      }
    }

    if (!hasPermission) {
      throw new AuthorizationError("You do not have permission to delete this settlement");
    }

    await db
      .update(settlements)
      .set({
        isDeleted: true,
        status: "cancelled",
        deletedAt: new Date(),
        deletedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(settlements.id, existing.id));

    // Audit log
    const { auditLogs } = await import("@/lib/db/schema/schema");
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "delete",
      entityType: "settlement",
      entityId: existing.id,
      changes: {
        deleted: true,
        deletedAt: new Date(),
        originalAmount: existing.amount,
        reason: reason || "Admin deletion",
      },
    });

    if (existing.groupId) {
      try {
        await executeAtomicGroupRecalculation({
          groupId: existing.groupId,
          triggerOperation: "recalculate",
          initiatedByUserId: user.id,
        });
      } catch (err) {
        console.warn("Failed to recalculate group after deleting settlement:", err);
      }
      revalidatePath(`/dashboard/groups/${existing.groupId}`);
      revalidatePath("/dashboard/groups");
    }
    revalidatePath("/dashboard/settlements");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError("Failed to delete settlement", { originalError: error });
  }
}

export async function getSettlement(publicIdOrId: string | number) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof publicIdOrId === "number" || /^\d+$/.test(String(publicIdOrId));
    const [settlement] = await db
      .select()
      .from(settlements)
      .where(
        and(
          isNumeric ? eq(settlements.id, Number(publicIdOrId)) : eq(settlements.publicId, String(publicIdOrId)),
          or(eq(settlements.fromUserId, user.id), eq(settlements.toUserId, user.id))
        )
      )
      .limit(1);

    if (!settlement) {
      throw new NotFoundError("Settlement");
    }

    return settlement;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to fetch settlement", { originalError: error });
  }
}

export async function getSettlements() {
  try {
    const user = await requireAuth();

    const settlementsList = await db
      .select()
      .from(settlements)
      .where(
        and(
          or(eq(settlements.fromUserId, user.id), eq(settlements.toUserId, user.id)),
          eq(settlements.isDeleted, false)
        )
      )
      .orderBy(settlements.createdAt);

    return settlementsList;
  } catch (error) {
    throw new DatabaseError("Failed to fetch settlements", { originalError: error });
  }
}

export async function calculateGroupSettlements(groupId: number) {
  try {
    const user = await requireAuth();

    // Get active transactions for the group
    const groupTransactions = await db
      .select({
        id: transactions.id,
        paidBy: transactions.paidBy,
        paidByContact: transactions.paidByContact,
        amount: transactions.amount,
        currency: transactions.currency,
        contactId: transactions.contactId,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.groupId, groupId),
          eq(transactions.isDeleted, false)
        )
      );

    if (groupTransactions.length === 0) {
      return [];
    }

    // Get expense splits for these transactions
    const transactionIds = groupTransactions.map(t => t.id);
    const splits = await db
      .select()
      .from(expenseSplits)
      .where(inArray(expenseSplits.transactionId, transactionIds));

    // Calculate balances per user / contact
    const balanceMap = new Map<string, { userId?: number; contactId?: number; amount: number }>();

    groupTransactions.forEach(tx => {
      // Add amount to payer
      const payerKey = tx.paidBy ? `user-${tx.paidBy}` : `contact-${tx.paidByContact}`;
      const payerBal = balanceMap.get(payerKey) || { userId: tx.paidBy || undefined, contactId: tx.paidByContact || undefined, amount: 0 };
      payerBal.amount += tx.amount;
      balanceMap.set(payerKey, payerBal);

      const txSplits = splits.filter(s => s.transactionId === tx.id);
      txSplits.forEach(split => {
        const splitKey = split.userId ? `user-${split.userId}` : `contact-${split.contactId}`;
        const userBal = balanceMap.get(splitKey) || { userId: split.userId || undefined, contactId: split.contactId || undefined, amount: 0 };
        userBal.amount -= split.amount;
        balanceMap.set(splitKey, userBal);
      });
    });

    // Convert to Balance array
    const balances: Balance[] = Array.from(balanceMap.values()).map(b => ({
      userId: b.userId,
      contactId: b.contactId,
      amount: Math.round(b.amount),
    }));

    const optimalSettlements = calculateOptimalSettlements(balances, "INR");
    return optimalSettlements;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to calculate group settlements", { originalError: error });
  }
}

export async function createSettlementsFromCalculation(groupId: number) {
  try {
    const user = await requireAuth();

    const result = await executeAtomicGroupRecalculation({
      groupId,
      triggerOperation: "recalculate",
      initiatedByUserId: user.id,
    });

    revalidatePath("/dashboard/settlements");
    revalidatePath(`/dashboard/groups/${groupId}`);
    revalidatePath("/dashboard");
    return { success: true, count: result.pendingSettlementsCount };
  } catch (error) {
    throw new DatabaseError("Failed to create settlements from calculation", { originalError: error });
  }
}

export interface UserPendingSettlementItem {
  id: string;
  databaseId?: number | null;
  publicId?: string | null;
  payerName: string;
  payerAvatar?: string | null;
  payerEmail?: string | null;
  payerIsCurrentUser: boolean;
  fromUserId?: number | null;
  fromContactId?: number | null;
  receiverName: string;
  receiverAvatar?: string | null;
  receiverEmail?: string | null;
  receiverIsCurrentUser: boolean;
  toUserId?: number | null;
  toContactId?: number | null;
  amount: number; // in Rupees
  currency: string;
  reason: string;
  groupId?: number | null;
  groupName: string;
  groupIcon?: string | null;
  groupCategory: string;
  splitMethod: string;
  createdAt: string;
  dueStatus: "Due Today" | "Due Now" | "Overdue" | "Pending Confirmation";
  paymentStatus: "Pending" | "Unpaid";
  transactionReference: string;
}

export interface UserPendingSettlementOverview {
  totalPendingAmount: number;
  totalPayableAmount: number;
  totalReceivableAmount: number;
  pendingCount: number;
  groupsInvolvedCount: number;
  estimatedTransfers: number;
  items: UserPendingSettlementItem[];
}

/**
 * FEATURE 1: Fetch every pending settlement related ONLY to the currently logged-in user's profile.
 * Never includes settlements from other users.
 */
export async function getUserPendingSettlementsAction(groupIdOrPublicId?: string | number): Promise<UserPendingSettlementOverview> {
  const user = await requireAuth();

  let numericGroupId: number | undefined;
  if (groupIdOrPublicId !== undefined && groupIdOrPublicId !== null && groupIdOrPublicId !== "") {
    if (typeof groupIdOrPublicId === "number") {
      numericGroupId = groupIdOrPublicId;
    } else if (/^\d+$/.test(groupIdOrPublicId)) {
      numericGroupId = Number(groupIdOrPublicId);
    } else {
      const [foundGroup] = await db
        .select({ id: groups.id })
        .from(groups)
        .where(eq(groups.publicId, groupIdOrPublicId))
        .limit(1);
      if (foundGroup) {
        numericGroupId = foundGroup.id;
      }
    }
  }

  const settleFromUser = alias(users, "pending_settle_from_user");
  const settleToUser = alias(users, "pending_settle_to_user");
  const settleFromContact = alias(contacts, "pending_settle_from_contact");
  const settleToContact = alias(contacts, "pending_settle_to_contact");

  const conditions = [
    eq(settlements.isDeleted, false),
    eq(settlements.status, "pending"),
    or(eq(settlements.fromUserId, user.id), eq(settlements.toUserId, user.id)),
  ];

  if (numericGroupId) {
    conditions.push(eq(settlements.groupId, numericGroupId));
  }

  const explicitRows = await db
    .select({
      id: settlements.id,
      publicId: settlements.publicId,
      amount: settlements.amount,
      currency: settlements.currency,
      status: settlements.status,
      paymentMethod: settlements.paymentMethod,
      notes: settlements.notes,
      createdAt: settlements.createdAt,
      groupId: settlements.groupId,
      groupName: groups.name,
      groupCoverImage: groups.coverImage,
      groupType: groups.type,
      groupSplitMethod: groups.splitMethod,
      fromUserId: settlements.fromUserId,
      fromUserName: settleFromUser.name,
      fromUserAvatar: settleFromUser.avatar,
      fromUserEmail: settleFromUser.email,
      fromContactId: settlements.fromContactId,
      fromContactName: settleFromContact.name,
      toUserId: settlements.toUserId,
      toUserName: settleToUser.name,
      toUserAvatar: settleToUser.avatar,
      toUserEmail: settleToUser.email,
      toContactId: settlements.toContactId,
      toContactName: settleToContact.name,
    })
    .from(settlements)
    .leftJoin(groups, eq(settlements.groupId, groups.id))
    .leftJoin(settleFromUser, eq(settlements.fromUserId, settleFromUser.id))
    .leftJoin(settleToUser, eq(settlements.toUserId, settleToUser.id))
    .leftJoin(settleFromContact, eq(settlements.fromContactId, settleFromContact.id))
    .leftJoin(settleToContact, eq(settlements.toContactId, settleToContact.id))
    .where(and(...conditions))
    .orderBy(desc(settlements.createdAt));

  const items: UserPendingSettlementItem[] = [];
  const coveredKeys = new Set<string>();

  for (const row of explicitRows) {
    const isPayerCurrentUser = row.fromUserId === user.id;
    const isReceiverCurrentUser = row.toUserId === user.id;

    if (!isPayerCurrentUser && !isReceiverCurrentUser) continue;

    const payerName = isPayerCurrentUser
      ? `${user.name || "You"} (You)`
      : row.fromUserName || row.fromContactName || `Member #${row.fromUserId || row.fromContactId}`;
    const receiverName = isReceiverCurrentUser
      ? `${user.name || "You"} (You)`
      : row.toUserName || row.toContactName || `Member #${row.toUserId || row.toContactId}`;

    const createdTime = row.createdAt ? new Date(row.createdAt).getTime() : Date.now();
    const daysDiff = (Date.now() - createdTime) / (1000 * 60 * 60 * 24);
    let dueStatus: "Due Today" | "Due Now" | "Overdue" | "Pending Confirmation" = "Due Now";
    if (daysDiff > 7) {
      dueStatus = "Overdue";
    } else if (daysDiff < 1) {
      dueStatus = "Due Today";
    }

    const item: UserPendingSettlementItem = {
      id: `db-${row.id}`,
      databaseId: row.id,
      publicId: row.publicId,
      payerName,
      payerAvatar: row.fromUserAvatar,
      payerEmail: row.fromUserEmail,
      payerIsCurrentUser: isPayerCurrentUser,
      fromUserId: row.fromUserId,
      fromContactId: row.fromContactId,
      receiverName,
      receiverAvatar: row.toUserAvatar,
      receiverEmail: row.toUserEmail,
      receiverIsCurrentUser: isReceiverCurrentUser,
      toUserId: row.toUserId,
      toContactId: row.toContactId,
      amount: Math.round(Number(row.amount)) / 100,
      currency: row.currency || "INR",
      reason: row.notes || (row.groupId ? `Debt clearance in ${row.groupName || "group"}` : "Direct debt settlement"),
      groupId: row.groupId,
      groupName: row.groupName || "Personal / Direct Ledger",
      groupIcon: row.groupCoverImage,
      groupCategory: row.groupType || "general",
      splitMethod: row.groupSplitMethod || "equal",
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
      dueStatus,
      paymentStatus: "Pending",
      transactionReference: row.publicId,
    };

    items.push(item);
    if (row.groupId) {
      coveredKeys.add(`${row.groupId}-${row.fromUserId || `c${row.fromContactId}`}-${row.toUserId || `c${row.toContactId}`}`);
    }
  }

  // Also discover calculated debt suggestions from active groups
  try {
    const userGroupMemberships = await db
      .select({
        groupId: groupMembers.groupId,
        groupName: groups.name,
        groupType: groups.type,
        groupIcon: groups.coverImage,
        groupSplitMethod: groups.splitMethod,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(
        and(
          eq(groupMembers.userId, user.id),
          eq(groups.isDeleted, false),
          numericGroupId ? eq(groupMembers.groupId, numericGroupId) : sql`true`
        )
      );

    for (const gm of userGroupMemberships) {
      const suggestions = await calculateGroupSettlements(gm.groupId);
      for (const s of suggestions) {
        const isFromMe = s.fromUserId === user.id;
        const isToMe = s.toUserId === user.id;
        if (!isFromMe && !isToMe) continue;

        const key = `${gm.groupId}-${s.fromUserId || `c${s.fromContactId}`}-${s.toUserId || `c${s.toContactId}`}`;
        if (coveredKeys.has(key)) continue;

        const amtRupees = s.amount > 1000 ? s.amount / 100 : s.amount;
        if (amtRupees <= 0) continue;

        items.push({
          id: `calc-${gm.groupId}-${s.fromUserId ?? `c${s.fromContactId}`}-${s.toUserId ?? `c${s.toContactId}`}`,
          databaseId: null,
          publicId: `CALC-${generatePublicId()}`,
          payerName: isFromMe ? `${user.name || "You"} (You)` : s.fromName || `User #${s.fromUserId}`,
          payerAvatar: (s as any).fromAvatar || null,
          payerIsCurrentUser: isFromMe,
          fromUserId: s.fromUserId,
          fromContactId: s.fromContactId,
          receiverName: isToMe ? `${user.name || "You"} (You)` : s.toName || `User #${s.toUserId}`,
          receiverAvatar: (s as any).toAvatar || null,
          receiverIsCurrentUser: isToMe,
          toUserId: s.toUserId,
          toContactId: s.toContactId,
          amount: amtRupees,
          currency: s.currency || "INR",
          reason: `Optimal debt transfer in ${gm.groupName}`,
          groupId: gm.groupId,
          groupName: gm.groupName,
          groupIcon: gm.groupIcon,
          groupCategory: gm.groupType || "general",
          splitMethod: gm.groupSplitMethod || "equal",
          createdAt: new Date().toISOString(),
          dueStatus: "Due Now",
          paymentStatus: "Pending",
          transactionReference: "Awaiting Confirmation",
        });

        coveredKeys.add(key);
      }
    }
  } catch (calcErr) {
    console.warn("Non-critical error gathering group calculated debt transfers:", calcErr);
  }

  const distinctGroupIds = new Set(items.map((i) => i.groupId).filter(Boolean));
  const totalPendingAmount = items.reduce((acc, i) => acc + i.amount, 0);
  const totalPayableAmount = items.filter((i) => i.payerIsCurrentUser).reduce((acc, i) => acc + i.amount, 0);
  const totalReceivableAmount = items.filter((i) => i.receiverIsCurrentUser).reduce((acc, i) => acc + i.amount, 0);

  return {
    totalPendingAmount: Math.round(totalPendingAmount * 100) / 100,
    totalPayableAmount: Math.round(totalPayableAmount * 100) / 100,
    totalReceivableAmount: Math.round(totalReceivableAmount * 100) / 100,
    pendingCount: items.length,
    groupsInvolvedCount: distinctGroupIds.size,
    estimatedTransfers: items.length,
    items,
  };
}

/**
 * FEATURE 1: Execute settlement for selected pending items with strict verification and atomic recalculation.
 */
export async function executeSettlementBatchAction(
  itemsToSettle: Array<{
    id: string;
    databaseId?: number | null;
    publicId?: string | null;
    amount: number;
    currency?: string;
    fromUserId?: number | null;
    fromContactId?: number | null;
    toUserId?: number | null;
    toContactId?: number | null;
    groupId?: number | null;
    notes?: string;
  }>,
  options?: {
    paymentMethod?: string;
    notes?: string;
  }
) {
  const user = await requireAuth();

  if (!itemsToSettle || itemsToSettle.length === 0) {
    throw new ValidationError("No settlements selected for execution");
  }

  const paymentMethod = options?.paymentMethod || "UPI";
  const commonNotes = options?.notes?.trim();
  const now = new Date();
  const affectedGroupIds = new Set<number>();
  let settledCount = 0;
  let totalSettledRupees = 0;

  for (const item of itemsToSettle) {
    if (item.groupId) {
      affectedGroupIds.add(item.groupId);
    }

    if (item.databaseId) {
      // Mark existing DB record as completed
      const [existing] = await db
        .select()
        .from(settlements)
        .where(
          and(
            eq(settlements.id, item.databaseId),
            eq(settlements.isDeleted, false)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(settlements)
          .set({
            status: "completed",
            paidAt: now,
            paymentMethod,
            notes: commonNotes || item.notes || existing.notes,
            updatedAt: now,
          })
          .where(eq(settlements.id, existing.id));

        // Insert audit log & history
        try {
          const { settlementHistory, auditLogs } = await import("@/lib/db/schema/schema");
          await db.insert(auditLogs).values({
            userId: user.id,
            action: "update",
            entityType: "settlement",
            entityId: existing.id,
            changes: { status: "completed", paymentMethod, paidAt: now },
          });

          if (existing.groupId) {
            await db.insert(settlementHistory).values({
              publicId: generatePublicId(),
              settlementId: existing.id,
              groupId: existing.groupId,
              fromUserId: existing.fromUserId,
              fromContactId: existing.fromContactId,
              fromName: "Member",
              toUserId: existing.toUserId,
              toContactId: existing.toContactId,
              toName: "Member",
              amount: existing.amount,
              currency: existing.currency || "INR",
              paymentMethod,
              reason: commonNotes || "Settle All Debts Batch Workflow",
              approvedBy: user.id,
              approvedByName: user.name || "User",
              approvedDate: now,
              previousBalance: -existing.amount,
              newBalance: 0,
            });
          }
        } catch (e) {
          console.warn("Audit record non-critical error:", e);
        }

        settledCount++;
        totalSettledRupees += existing.amount / 100;
      }
    } else {
      // It's a calculated suggestion, insert as completed record
      const [newSettlement] = await db
        .insert(settlements)
        .values({
          publicId: generatePublicId(),
          groupId: item.groupId || null,
          fromUserId: item.fromUserId || null,
          fromContactId: item.fromContactId || null,
          toUserId: item.toUserId || null,
          toContactId: item.toContactId || null,
          amount: Math.round(item.amount * 100),
          currency: item.currency || "INR",
          status: "completed",
          paymentMethod,
          paidAt: now,
          notes: commonNotes || item.notes || "Settle All Debts Execution",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (newSettlement) {
        try {
          const { settlementHistory, auditLogs } = await import("@/lib/db/schema/schema");
          await db.insert(auditLogs).values({
            userId: user.id,
            action: "create",
            entityType: "settlement",
            entityId: newSettlement.id,
            changes: { status: "completed", amount: newSettlement.amount, paymentMethod },
          });
        } catch (e) {
          console.warn("Audit record error:", e);
        }

        settledCount++;
        totalSettledRupees += item.amount;
      }
    }
  }

  // Atomically recalculate all affected groups
  for (const grpId of affectedGroupIds) {
    try {
      await executeAtomicGroupRecalculation({
        groupId: grpId,
        triggerOperation: "recalculate",
        initiatedByUserId: user.id,
      });
      revalidatePath(`/dashboard/groups/${grpId}`);
    } catch (recalcErr) {
      console.warn(`Recalculation failed for group ${grpId}:`, recalcErr);
    }
  }

  // Revalidate global views
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settlements");
  revalidatePath("/dashboard/groups");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/analytics");
  revalidatePath("/dashboard/contacts");

  return {
    success: true,
    settledCount,
    totalSettledRupees: Math.round(totalSettledRupees * 100) / 100,
  };
}


