"use server";

import { db } from "@/lib/db";
import { executeAtomicGroupRecalculation, recordTimelineEvent } from "@/lib/settlements/recalculation-engine";

/**
 * Redistributes historical expenses in a group across eligible members per timeline rules.
 * Strictly preserves:
 * 1. Original transaction records, amounts, payers.
 * 2. All completed settlements (never modified, deleted, or recreated).
 * Only updates expenseSplits and recalculates pending settlement versions atomically.
 */
export async function redistributeGroupHistoricalExpenses(
  groupId: number,
  newMemberUserId: number,
  executingUserId: number,
  txDb: any = db
): Promise<{ redistributedCount: number; memberCount: number }> {
  // Record timeline entry if not already recorded
  try {
    await recordTimelineEvent(
      {
        groupId,
        userId: newMemberUserId,
        participationMode: "included",
        effectiveFrom: new Date(),
        reason: "initial_approval",
        approvedBy: executingUserId,
      },
      txDb
    );
  } catch (_) {}

  const result = await executeAtomicGroupRecalculation({
    groupId,
    triggerOperation: "approve_member_included",
    initiatedByUserId: executingUserId,
  });

  return {
    redistributedCount: result.affectedExpenseCount,
    memberCount: result.pendingSettlementsCount,
  };
}
