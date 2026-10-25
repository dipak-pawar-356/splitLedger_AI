"use server";

import { db, withDbRetry } from "@/lib/db";
import {
  groups,
  groupMembers,
  transactions,
  settlements,
  users,
  contacts,
  groupReceiverAssignments,
  adminActions,
  auditLogs,
} from "@/lib/db/schema/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { AuthorizationError, ValidationError } from "@/lib/errors";
import { generatePublicId, isDbIntegerId } from "@/lib/utils";
import { safeRevalidatePath, executeAtomicGroupRecalculation } from "@/lib/settlements/recalculation-engine";
import {
  calculateExactAmountGroupPayables,
  calculatePercentageGroupPayables,
  calculateSharesGroupPayables,
  validateReceiverAssignment,
  type SplitMemberInput,
} from "@/lib/settlements/split-calculator";

export interface SaveSplitConfigParams {
  groupIdOrPublicId: string | number;
  splitMethod: "equal" | "exact" | "percentage" | "shares";
  membersConfig: Array<{
    userId?: number;
    contactId?: number;
    name?: string;
    fixedAmountPaise?: number; // integer paise
    percentage?: number;       // e.g. 40, 35, 25
    shares?: number;           // e.g. 1, 2, 3
    isLocked?: boolean;
  }>;
  recalculateExisting?: boolean;
}

/**
 * Save Group Split Configuration (Exact, Percentage, Shares)
 * Persists directly into `groups.split_config` and updates `groups.split_method`.
 * Recorded in enterprise audit log and synchronizes settlements.
 */
export async function saveGroupSplitConfigAction(params: SaveSplitConfigParams) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    // 1. Resolve Group
    const groupQuery = isDbIntegerId(params.groupIdOrPublicId)
      ? eq(groups.id, Number(params.groupIdOrPublicId))
      : eq(groups.publicId, String(params.groupIdOrPublicId));

    const [groupRecord] = await db
      .select({
        id: groups.id,
        publicId: groups.publicId,
        name: groups.name,
        createdBy: groups.createdBy,
        splitMethod: groups.splitMethod,
        currency: groups.currency,
      })
      .from(groups)
      .where(and(groupQuery, eq(groups.isDeleted, false)))
      .limit(1);

    if (!groupRecord) {
      throw new ValidationError("Group not found");
    }

    const groupId = groupRecord.id;

    // 2. Permission check: Only Owner or Admin can configure split engine
    const isOwner = groupRecord.createdBy === user.id;
    let isAdmin = isOwner;

    if (!isOwner) {
      const [memberRecord] = await db
        .select({ isAdmin: groupMembers.isAdmin })
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)))
        .limit(1);

      isAdmin = Boolean(memberRecord?.isAdmin);
    }

    if (!isAdmin) {
      throw new AuthorizationError("Only Group Owner or Admins can configure split methods.");
    }

    // 3. Build structured config
    const previousMethod = groupRecord.splitMethod;
    const newMethod = params.splitMethod;

    const splitConfigData = {
      method: newMethod,
      members: params.membersConfig.map((m) => ({
        userId: m.userId,
        contactId: m.contactId,
        name: m.name,
        fixedAmountPaise: m.fixedAmountPaise ? Math.max(0, Math.round(m.fixedAmountPaise)) : 0,
        percentage: m.percentage !== undefined ? Math.max(0, Number(m.percentage)) : undefined,
        shares: m.shares !== undefined ? Math.max(0, Number(m.shares)) : undefined,
        isLocked: Boolean(m.isLocked),
      })),
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
      version: 1,
    };

    // 4. Update group database record
    await db
      .update(groups)
      .set({
        splitMethod: newMethod,
        splitConfig: splitConfigData,
        updatedAt: new Date(),
      })
      .where(eq(groups.id, groupId));

    // 5. Audit Logging
    await db.insert(auditLogs).values({
      publicId: generatePublicId("aud"),
      userId: user.id,
      action: "split_config_updated",
      entityType: "group",
      entityId: groupId,
      entityPublicId: groupRecord.publicId,
      changes: {
        splitMethod: { old: previousMethod, new: newMethod },
        splitConfig: splitConfigData,
        recalculateExisting: params.recalculateExisting,
      },
      reason: `Admin updated calculation engine to ${newMethod}`,
      status: "success",
    });

    await db.insert(adminActions).values({
      publicId: generatePublicId("act"),
      groupId,
      adminId: user.id,
      adminName: user.name || "Admin",
      actionType: "split_config_updated",
      targetEntity: "group",
      targetEntityId: groupId,
      details: {
        previousMethod,
        newMethod,
        memberCount: params.membersConfig.length,
      },
    });

    // 6. Recalculate if requested
    if (params.recalculateExisting) {
      try {
        await executeAtomicGroupRecalculation({
          groupId,
          initiatedByUserId: user.id,
          triggerOperation: "split_method_change",
          targetSplitMethod: newMethod,
        });
      } catch (err) {
        console.error("Recalculation on split config change failed:", err);
      }
    }

    safeRevalidatePath(`/dashboard/groups/${groupRecord.publicId}`);
    safeRevalidatePath(`/dashboard/groups/${groupId}`);
    safeRevalidatePath(`/groups/${groupRecord.publicId}`);
    safeRevalidatePath("/dashboard/groups");
    safeRevalidatePath("/dashboard");

    return {
      success: true,
      splitMethod: newMethod,
      splitConfig: splitConfigData,
      message: `Group calculation engine updated to ${newMethod}.`,
    };
  });
}

/**
 * Get Group Split Config & Current Member Breakdown
 */
export async function getGroupSplitConfigAction(groupIdOrPublicId: string | number) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const groupQuery = isDbIntegerId(groupIdOrPublicId)
      ? eq(groups.id, Number(groupIdOrPublicId))
      : eq(groups.publicId, String(groupIdOrPublicId));

    const [groupRecord] = await db
      .select({
        id: groups.id,
        publicId: groups.publicId,
        name: groups.name,
        createdBy: groups.createdBy,
        splitMethod: groups.splitMethod,
        splitConfig: groups.splitConfig,
        currency: groups.currency,
      })
      .from(groups)
      .where(and(groupQuery, eq(groups.isDeleted, false)))
      .limit(1);

    if (!groupRecord) {
      throw new ValidationError("Group not found");
    }

    const groupId = groupRecord.id;

    // Fetch members
    const membersList = await db
      .select({
        id: groupMembers.id,
        userId: groupMembers.userId,
        contactId: groupMembers.contactId,
        isAdmin: groupMembers.isAdmin,
        isGuest: groupMembers.isGuest,
        nickname: groupMembers.nickname,
        membershipStatus: groupMembers.membershipStatus,
        userName: users.name,
        userAvatar: users.avatar,
        contactName: contacts.name,
        contactAvatar: contacts.avatar,
      })
      .from(groupMembers)
      .leftJoin(users, eq(groupMembers.userId, users.id))
      .leftJoin(contacts, eq(groupMembers.contactId, contacts.id))
      .where(eq(groupMembers.groupId, groupId));

    // Fetch active expenses with payer info
    const expenses = await db
      .select({
        amount: transactions.amount,
        paidBy: transactions.paidBy,
        paidByContact: transactions.paidByContact,
      })
      .from(transactions)
      .where(and(eq(transactions.groupId, groupId), eq(transactions.isDeleted, false)));

    const totalExpensePaise = expenses.reduce((sum, e) => sum + e.amount, 0);

    const isOwner = groupRecord.createdBy === user.id;
    const currentUserMember = membersList.find((m) => m.userId === user.id);
    const isAdmin = isOwner || Boolean(currentUserMember?.isAdmin);

    const activeMembers = membersList.filter(
      (m) => m.membershipStatus === "active" || m.isGuest
    );

    return {
      groupId,
      groupPublicId: groupRecord.publicId,
      groupName: groupRecord.name,
      currency: groupRecord.currency || "INR",
      splitMethod: groupRecord.splitMethod,
      splitConfig: groupRecord.splitConfig,
      totalExpensePaise,
      totalExpenseRupees: totalExpensePaise / 100,
      isOwner,
      isAdmin,
      members: activeMembers.map((m) => {
        const key = m.userId ? `user-${m.userId}` : `contact-${m.contactId}`;
        const name = m.nickname || m.userName || m.contactName || "Member";
        const avatar = m.userAvatar || m.contactAvatar || null;

        const savedConfig = groupRecord.splitConfig?.members?.find(
          (sm) => (m.userId && sm.userId === m.userId) || (m.contactId && sm.contactId === m.contactId)
        );

        const memberPaidPaise = expenses
          .filter(
            (e) =>
              (m.userId && e.paidBy === m.userId) ||
              (m.contactId && e.paidByContact === m.contactId)
          )
          .reduce((sum, e) => sum + e.amount, 0);

        return {
          key,
          id: m.id,
          userId: m.userId ?? undefined,
          contactId: m.contactId ?? undefined,
          name,
          avatar,
          paidPaise: memberPaidPaise,
          paidRupees: memberPaidPaise / 100,
          fixedAmountPaise: savedConfig?.fixedAmountPaise ?? 0,
          percentage:
            savedConfig?.percentage ??
            (activeMembers.length > 0 ? Math.round(100 / activeMembers.length) : 0),
          role: m.userId === groupRecord.createdBy ? "owner" : m.isAdmin ? "admin" : m.isGuest ? "guest" : "member",
          shares: savedConfig?.shares ?? 1,
          isLocked: savedConfig?.isLocked ?? false,
        };
      }),
    };
  });
}

/**
 * RECEIVER ASSIGNMENT ACTIONS
 * Allows admin to manually assign a specific receiver for a debtor's payable responsibility.
 */
export interface CreateReceiverAssignmentParams {
  groupIdOrPublicId: string | number;
  fromUserId?: number;
  fromContactId?: number;
  fromName: string;
  toUserId?: number;
  toContactId?: number;
  toName: string;
  amountPaise: number; // integer paise
  notes?: string;
}

export async function createReceiverAssignmentAction(params: CreateReceiverAssignmentParams) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    // 1. Resolve Group
    const groupQuery = isDbIntegerId(params.groupIdOrPublicId)
      ? eq(groups.id, Number(params.groupIdOrPublicId))
      : eq(groups.publicId, String(params.groupIdOrPublicId));

    const [groupRecord] = await db
      .select({
        id: groups.id,
        publicId: groups.publicId,
        createdBy: groups.createdBy,
        splitMethod: groups.splitMethod,
        currency: groups.currency,
      })
      .from(groups)
      .where(and(groupQuery, eq(groups.isDeleted, false)))
      .limit(1);

    if (!groupRecord) {
      throw new ValidationError("Group not found");
    }

    const groupId = groupRecord.id;

    // 2. Permission check
    const isOwner = groupRecord.createdBy === user.id;
    let isAdmin = isOwner;

    if (!isOwner) {
      const [memberRecord] = await db
        .select({ isAdmin: groupMembers.isAdmin })
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)))
        .limit(1);

      isAdmin = Boolean(memberRecord?.isAdmin);
    }

    if (!isAdmin) {
      throw new AuthorizationError("Only Group Owner or Admins can assign receivers.");
    }

    if (params.amountPaise <= 0) {
      throw new ValidationError("Assignment amount must be greater than ₹0.00.");
    }

    // 3. Create Receiver Assignment
    const publicId = generatePublicId("asg");
    const [inserted] = await db
      .insert(groupReceiverAssignments)
      .values({
        publicId,
        groupId,
        fromUserId: params.fromUserId || null,
        fromContactId: params.fromContactId || null,
        fromName: params.fromName,
        toUserId: params.toUserId || null,
        toContactId: params.toContactId || null,
        toName: params.toName,
        amount: Math.round(params.amountPaise),
        currency: groupRecord.currency || "INR",
        splitMethod: groupRecord.splitMethod,
        status: "active",
        notes: params.notes || null,
        createdBy: user.id,
      })
      .returning();

    // 4. Mirror directly into active pending settlements for live QR and settlement workflows
    const settlementPublicId = generatePublicId("set");
    await db.insert(settlements).values({
      publicId: settlementPublicId,
      groupId,
      fromUserId: params.fromUserId || null,
      fromContactId: params.fromContactId || null,
      toUserId: params.toUserId || null,
      toContactId: params.toContactId || null,
      amount: Math.round(params.amountPaise),
      currency: groupRecord.currency || "INR",
      status: "pending",
      notes: `Receiver assignment created by admin: ${params.fromName} owes ${params.toName}`,
      createdAt: new Date(),
    });

    // 5. Audit Logging
    await db.insert(adminActions).values({
      publicId: generatePublicId("act"),
      groupId,
      adminId: user.id,
      adminName: user.name || "Admin",
      actionType: "receiver_assigned",
      targetEntity: "receiver_assignment",
      targetEntityId: inserted.id,
      details: {
        from: params.fromName,
        to: params.toName,
        amountRupees: params.amountPaise / 100,
      },
    });

    safeRevalidatePath(`/dashboard/groups/${groupRecord.publicId}`);
    safeRevalidatePath(`/dashboard/groups/${groupId}`);
    safeRevalidatePath(`/dashboard/groups/${groupId}/settlements`);
    safeRevalidatePath(`/groups/${groupRecord.publicId}`);

    return {
      success: true,
      assignment: inserted,
      message: `Assigned ₹${(params.amountPaise / 100).toFixed(2)} to ${params.toName}.`,
    };
  });
}

/**
 * Delete a Receiver Assignment
 */
export async function deleteReceiverAssignmentAction(assignmentId: number, groupIdOrPublicId: string | number) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [assignment] = await db
      .select()
      .from(groupReceiverAssignments)
      .where(eq(groupReceiverAssignments.id, assignmentId))
      .limit(1);

    if (!assignment) {
      throw new ValidationError("Assignment not found");
    }

    await db
      .update(groupReceiverAssignments)
      .set({ status: "cancelled", updatedAt: new Date(), updatedBy: user.id })
      .where(eq(groupReceiverAssignments.id, assignmentId));

    // Remove matching pending settlement if pending
    await db
      .delete(settlements)
      .where(
        and(
          eq(settlements.groupId, assignment.groupId),
          eq(settlements.status, "pending"),
          assignment.fromUserId ? eq(settlements.fromUserId, assignment.fromUserId) : eq(settlements.fromContactId, assignment.fromContactId!),
          assignment.toUserId ? eq(settlements.toUserId, assignment.toUserId) : eq(settlements.toContactId, assignment.toContactId!),
          eq(settlements.amount, assignment.amount)
        )
      );

    safeRevalidatePath(`/dashboard/groups/${assignment.groupId}`);
    return { success: true, message: "Assignment cancelled." };
  });
}

/**
 * Reset all receiver assignments for a group back to automatic smart netting
 */
export async function resetReceiverAssignmentsAction(groupIdOrPublicId: string | number) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const groupQuery = isDbIntegerId(groupIdOrPublicId)
      ? eq(groups.id, Number(groupIdOrPublicId))
      : eq(groups.publicId, String(groupIdOrPublicId));

    const [groupRecord] = await db
      .select({ id: groups.id, publicId: groups.publicId })
      .from(groups)
      .where(and(groupQuery, eq(groups.isDeleted, false)))
      .limit(1);

    if (!groupRecord) {
      throw new ValidationError("Group not found");
    }

    const groupId = groupRecord.id;

    await db
      .update(groupReceiverAssignments)
      .set({ status: "cancelled", updatedAt: new Date(), updatedBy: user.id })
      .where(and(eq(groupReceiverAssignments.groupId, groupId), eq(groupReceiverAssignments.status, "active")));

    // Re-run automatic recalculation to restore smart netting
    await executeAtomicGroupRecalculation({
      groupId,
      initiatedByUserId: user.id,
      triggerOperation: "recalculate",
    });

    safeRevalidatePath(`/dashboard/groups/${groupRecord.publicId}`);
    return { success: true, message: "Reset to automatic smart netting." };
  });
}

/**
 * Fetch all active assignments and history for a group
 */
export async function getReceiverAssignmentsAction(groupIdOrPublicId: string | number) {
  await requireAuth();

  return await withDbRetry(async () => {
    const groupQuery = isDbIntegerId(groupIdOrPublicId)
      ? eq(groups.id, Number(groupIdOrPublicId))
      : eq(groups.publicId, String(groupIdOrPublicId));

    const [groupRecord] = await db
      .select({ id: groups.id })
      .from(groups)
      .where(and(groupQuery, eq(groups.isDeleted, false)))
      .limit(1);

    if (!groupRecord) return { active: [], history: [] };

    const allAssignments = await db
      .select()
      .from(groupReceiverAssignments)
      .where(eq(groupReceiverAssignments.groupId, groupRecord.id))
      .orderBy(desc(groupReceiverAssignments.createdAt));

    const active = allAssignments.filter((a) => a.status === "active");
    const history = allAssignments;

    return { active, history };
  });
}
