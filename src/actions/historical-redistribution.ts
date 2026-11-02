"use server";

import { db, withDbRetry } from "@/lib/db";
import { executeAtomicGroupRecalculation, recordTimelineEvent } from "@/lib/settlements/recalculation-engine";
import { requireAuth } from "@/lib/auth";
import { groups, groupMembers } from "@/lib/db/schema/schema";
import { eq, and } from "drizzle-orm";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { assertRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";

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
  executingUserId?: number,
  txDb: any = db
): Promise<{ redistributedCount: number; memberCount: number }> {
  const user = await requireAuth();
  await assertRateLimit(`redistribute:${user.id}`, RATE_LIMITS.actions.write);

  // 1. Verify group existence and admin/owner authorization
  const [group] = await withDbRetry(() =>
    db
      .select({ id: groups.id, createdBy: groups.createdBy })
      .from(groups)
      .where(and(eq(groups.id, groupId), eq(groups.isDeleted, false)))
      .limit(1)
  );

  if (!group) {
    throw new NotFoundError("Group not found");
  }

  const isOwner = group.createdBy === user.id;
  let isAdmin = isOwner;

  if (!isAdmin) {
    const [membership] = await withDbRetry(() =>
      db
        .select({ isAdmin: groupMembers.isAdmin })
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, user.id)
          )
        )
        .limit(1)
    );
    isAdmin = !!membership?.isAdmin;
  }

  if (!isAdmin) {
    throw new AuthorizationError("Only group admins or owners can redistribute historical expenses");
  }

  // 2. Verify target user is a member of this group
  const [targetMember] = await withDbRetry(() =>
    db
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, newMemberUserId)
        )
      )
      .limit(1)
  );

  if (!targetMember) {
    throw new NotFoundError("Target user is not a member of this group");
  }

  const activeUserId = user.id;

  // Record timeline entry if not already recorded
  try {
    await recordTimelineEvent(
      {
        groupId,
        userId: newMemberUserId,
        participationMode: "included",
        effectiveFrom: new Date(),
        reason: "initial_approval",
        approvedBy: activeUserId,
      },
      txDb
    );
  } catch (_) {}

  const result = await executeAtomicGroupRecalculation({
    groupId,
    triggerOperation: "approve_member_included",
    initiatedByUserId: activeUserId,
  });

  return {
    redistributedCount: result.affectedExpenseCount,
    memberCount: result.pendingSettlementsCount,
  };
}
