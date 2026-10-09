"use server";

import { db } from "@/lib/db";
import { settlements, transactions, contacts, groups, expenseSplits } from "@/lib/db/schema/schema";
import { eq, and, or, desc, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { calculateOptimalSettlements, type Balance } from "@/lib/settlements/calculator";
import { executeAtomicGroupRecalculation } from "@/lib/settlements/recalculation-engine";
import { ValidationError, NotFoundError, DatabaseError } from "@/lib/errors";
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
      } catch (logErr) {
        console.warn("Non-critical error recording settlement audit log:", logErr);
      }
    }

    // Revalidate appropriate paths for real-time updates
    revalidatePath("/dashboard/settlements");
    if (settlement.groupId) {
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

export async function deleteSettlement(publicIdOrId: string | number) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof publicIdOrId === "number" || /^\d+$/.test(String(publicIdOrId));
    const [existingSettlement] = await db
      .select()
      .from(settlements)
      .where(
        and(
          isNumeric ? eq(settlements.id, Number(publicIdOrId)) : eq(settlements.publicId, String(publicIdOrId)),
          or(eq(settlements.fromUserId, user.id), eq(settlements.toUserId, user.id))
        )
      )
      .limit(1);

    if (!existingSettlement) {
      throw new NotFoundError("Settlement");
    }

    // Check if settlement is already deleted
    if (existingSettlement.isDeleted) {
      throw new ValidationError("Settlement is already deleted");
    }

    // Soft delete the settlement
    await db
      .update(settlements)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(settlements.id, existingSettlement.id));

    // Create audit log entry for the deletion
    const { auditLogs } = await import("@/lib/db/schema/schema");
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "delete",
      entityType: "settlement",
      entityId: existingSettlement.id,
      changes: {
        deleted: true,
        deletedAt: new Date(),
        originalAmount: existingSettlement.amount,
      },
    });

    // Revalidate appropriate paths for real-time updates
    revalidatePath("/dashboard/settlements");
    if (existingSettlement.groupId) {
      revalidatePath(`/dashboard/groups/${existingSettlement.groupId}`);
      revalidatePath("/dashboard/groups");
    }
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
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
