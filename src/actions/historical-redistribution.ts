"use server";

import { db } from "@/lib/db";
import { transactions, expenseSplits, groupMembers, auditLogs } from "@/lib/db/schema/schema";
import { eq, and } from "drizzle-orm";
import { generateAuditId } from "@/lib/utils";

/**
 * Redistributes historical expenses in a group across all current members (including newly joined member).
 * Strictly preserves:
 * 1. Original transaction records, amounts, payers.
 * 2. All completed settlements (never modified, deleted, or recreated).
 * Only updates expenseSplits for active group transactions across all members so each share is exact.
 */
export async function redistributeGroupHistoricalExpenses(
  groupId: number,
  newMemberUserId: number,
  executingUserId: number,
  txDb: any = db
): Promise<{ redistributedCount: number; memberCount: number }> {
  // 1. Fetch all active members in the group
  const members = await txDb
    .select({
      id: groupMembers.id,
      userId: groupMembers.userId,
      contactId: groupMembers.contactId,
    })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.membershipStatus, "active")
      )
    );

  if (members.length === 0) {
    return { redistributedCount: 0, memberCount: 0 };
  }

  // 2. Fetch all active (non-deleted) group transactions
  const groupTransactions = await txDb
    .select({
      id: transactions.id,
      amount: transactions.amount,
      title: transactions.title,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.groupId, groupId),
        eq(transactions.isDeleted, false)
      )
    );

  let redistributedCount = 0;
  const memberCount = members.length;

  for (const tx of groupTransactions) {
    const basePaise = Math.floor(tx.amount / memberCount);
    const remainderPaise = tx.amount - (basePaise * memberCount);

    // Delete existing splits for this transaction
    await txDb
      .delete(expenseSplits)
      .where(eq(expenseSplits.transactionId, tx.id));

    // Re-insert exactly distributed splits across all members
    const newSplits = members.map((m: any, idx: number) => ({
      transactionId: tx.id,
      userId: m.userId || null,
      contactId: m.contactId || null,
      splitMethod: "equal" as const,
      amount: basePaise + (idx < remainderPaise ? 1 : 0),
      isExcluded: false,
    }));

    await txDb.insert(expenseSplits).values(newSplits);
    redistributedCount++;
  }

  // Record audit trail
  try {
    await txDb.insert(auditLogs).values({
      publicId: generateAuditId(),
      userId: executingUserId,
      action: "update",
      entityType: "group",
      entityId: groupId,
      changes: {
        action: "historical_redistribution",
        newMemberUserId,
        expensesRedistributed: redistributedCount,
        memberCount,
      },
      reason: "Owner approved new member with historical expense inclusion",
      status: "success",
    });
  } catch (auditErr) {
    console.warn("Non-fatal: failed to write redistribution audit log:", auditErr);
  }

  return { redistributedCount, memberCount };
}
