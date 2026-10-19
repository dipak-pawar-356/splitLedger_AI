"use server";

import { db } from "@/lib/db";
import { groupMembers, contacts, users, groups, settlements, auditLogs, groupJoinRequests } from "@/lib/db/schema/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ValidationError, NotFoundError, AuthorizationError, ConflictError, DatabaseError } from "@/lib/errors";
import { formatCurrency, generatePublicId, isDbIntegerId } from "@/lib/utils";
import { recordTimelineEvent, executeAtomicGroupRecalculation } from "@/lib/settlements/recalculation-engine";

function buildGroupCondition(idOrPublicId: string | number) {
  const strId = String(idOrPublicId).trim();
  const isDbId = isDbIntegerId(idOrPublicId);
  return isDbId
    ? or(eq(groups.publicId, strId), eq(groups.id, Number(strId)), eq(groups.legacyPublicId, strId))
    : or(eq(groups.publicId, strId), eq(groups.legacyPublicId, strId));
}

export async function addGroupMember(data: {
  groupId: number | string;
  userId?: number;
  contactId?: number;
  isAdmin?: boolean;
  isGuest?: boolean;
  nickname?: string;
}) {
  try {
    const user = await requireAuth();

    const [group] = await db
      .select()
      .from(groups)
      .where(
        and(
          buildGroupCondition(data.groupId),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!group) {
      throw new NotFoundError("Group");
    }

    if (!data.userId && !data.contactId) {
      throw new ValidationError("Either userId or contactId must be provided");
    }

    // Verify caller is admin/owner of the group
    if (group.createdBy !== user.id) {
      const [callerMembership] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, user.id),
            eq(groupMembers.isAdmin, true)
          )
        )
        .limit(1);

      if (!callerMembership) {
        throw new AuthorizationError("You must be an admin or owner to add members to this group");
      }
    }

    // Check if member already exists
    const [existingMember] = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, group.id),
          data.userId ? eq(groupMembers.userId, data.userId) : eq(groupMembers.contactId, data.contactId!)
        )
      )
      .limit(1);

    if (existingMember) {
      throw new ConflictError("Member is already in this group");
    }

    // When a registered user is added, they start in PENDING status awaiting Group Owner approval (Requirement 1)
    const initialStatus = data.userId ? "pending" : "active";

    // Add member
    const [newMember] = await db
      .insert(groupMembers)
      .values({
        groupId: group.id,
        userId: data.userId || null,
        contactId: data.contactId || null,
        membershipStatus: initialStatus,
        isAdmin: data.isAdmin || false,
        isGuest: data.isGuest || false,
        nickname: data.nickname?.trim() || null,
        joinedAt: new Date(),
      })
      .returning();

    // If a registered user was added, create a PENDING join request for owner approval
    if (data.userId) {
      await db.insert(groupJoinRequests).values({
        publicId: generatePublicId(),
        groupId: group.id,
        userId: data.userId,
        status: "pending",
        includeInHistoricalExpenses: false,
      });
    }

    await db.insert(auditLogs).values({
      userId: user.id,
      action: "invite",
      entityType: "group",
      entityId: group.id,
      changes: {
        action: "add_member",
        memberId: newMember.id,
        targetUserId: data.userId,
        targetContactId: data.contactId,
        status: initialStatus,
      },
    });

    try {
      revalidatePath(`/dashboard/groups/${group.publicId}`);
      revalidatePath(`/dashboard/groups/${group.id}`);
      revalidatePath("/dashboard/groups");
    } catch (_) {}
    return newMember;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthorizationError || error instanceof ConflictError || error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to add group member", { originalError: error });
  }
}

export async function removeGroupMember(memberId: number, groupIdOrPublicId: number | string) {
  try {
    const user = await requireAuth();

    const [group] = await db
      .select()
      .from(groups)
      .where(
        and(
          buildGroupCondition(groupIdOrPublicId),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!group) {
      throw new NotFoundError("Group");
    }

    // Find the member record (support matching by group_members.id, users.id, or contacts.id)
    const numMemberId = Number(memberId);
    const [memberToRemove] = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, group.id),
          or(
            eq(groupMembers.id, numMemberId),
            eq(groupMembers.userId, numMemberId),
            eq(groupMembers.contactId, numMemberId)
          )
        )
      )
      .limit(1);

    if (!memberToRemove) {
      throw new NotFoundError("Group member");
    }

    // Cannot remove owner
    if (memberToRemove.userId && Number(memberToRemove.userId) === Number(group.createdBy)) {
      throw new ValidationError("Cannot remove the group owner. Transfer ownership first.");
    }

    // Verify caller is admin or owner or has delegated permissions
    const isSystemAdmin =
      user.email === "dipakspawaras17@gmail.com" ||
      user.email === "dipakspawar@coep.sveri.ac.in" ||
      user.email === "pawardipaksa@gmail.com" ||
      user.email === "dipak@splitledger.ai";

    const isOwner = Number(group.createdBy) === Number(user.id) || isSystemAdmin;

    if (!isOwner) {
      const [callerAdmin] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, user.id)
          )
        )
        .limit(1);

      const perms = (typeof callerAdmin?.delegatedPermissions === "string"
        ? JSON.parse(callerAdmin.delegatedPermissions)
        : callerAdmin?.delegatedPermissions) || {};

      const hasPermission =
        callerAdmin?.isAdmin ||
        Boolean(perms?.["group:manage_permissions"]) ||
        Boolean(perms?.["group:approve_members"]);

      if (!hasPermission) {
        throw new AuthorizationError("You must be a group admin or owner to remove members");
      }
    }

    // Determine participation history and mode
    const participationMode = (memberToRemove.historicalInclusionDecision as any) || "included";

    // Record timeline removal event
    await recordTimelineEvent({
      groupId: group.id,
      groupMemberId: memberToRemove.id,
      userId: memberToRemove.userId,
      contactId: memberToRemove.contactId,
      participationMode,
      effectiveUntil: new Date(),
      reason: "member_removal",
      approvedBy: user.id,
    });

    // Remove member from group_members
    await db.delete(groupMembers).where(eq(groupMembers.id, memberToRemove.id));

    // Also close any active join requests
    if (memberToRemove.userId) {
      await db
        .update(groupJoinRequests)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(
          and(
            eq(groupJoinRequests.groupId, group.id),
            eq(groupJoinRequests.userId, memberToRemove.userId),
            eq(groupJoinRequests.status, "pending")
          )
        );
    }

    // Execute atomic group recalculation per timeline rules:
    // - If Mode A: historical expenses revert to prior participant list, future expenses recalculated
    // - If Mode B: historical expenses untouched, only expenses created while active recalculated
    // - Completed settlements preserved and credited
    // - Outstanding settlements regenerated
    await executeAtomicGroupRecalculation({
      groupId: group.id,
      triggerOperation: "remove_member",
      initiatedByUserId: user.id,
    });

    await db.insert(auditLogs).values({
      userId: user.id,
      action: "delete",
      entityType: "group",
      entityId: group.id,
      changes: {
        action: "remove_member",
        removedMemberId: memberToRemove.id,
        userId: memberToRemove.userId,
        contactId: memberToRemove.contactId,
        participationMode,
      },
    });

    try {
      revalidatePath(`/dashboard/groups/${group.publicId}`);
      if (group.legacyPublicId) {
        revalidatePath(`/dashboard/groups/${group.legacyPublicId}`);
      }
      revalidatePath(`/dashboard/groups/${group.id}`);
      revalidatePath(`/dashboard/groups/${group.id}/settlements`);
      revalidatePath("/dashboard/groups");
      revalidatePath("/dashboard/settlements");
      revalidatePath("/dashboard");
    } catch (_) {}

    return { success: true };
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError("Failed to remove group member", { originalError: error });
  }
}

export async function updateMemberRole(memberId: number, groupIdOrPublicId: number | string, isAdmin: boolean) {
  try {
    const user = await requireAuth();

    const [group] = await db
      .select()
      .from(groups)
      .where(
        and(
          buildGroupCondition(groupIdOrPublicId),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!group) {
      throw new NotFoundError("Group");
    }

    // Only owner or admin can update roles
    if (group.createdBy !== user.id) {
      const [callerAdmin] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, user.id),
            eq(groupMembers.isAdmin, true)
          )
        )
        .limit(1);

      if (!callerAdmin) {
        throw new AuthorizationError("You must be an admin or owner to update member roles");
      }
    }

    const [updated] = await db
      .update(groupMembers)
      .set({ isAdmin })
      .where(and(eq(groupMembers.id, memberId), eq(groupMembers.groupId, group.id)))
      .returning();

    if (!updated) {
      throw new NotFoundError("Group member");
    }

    try {
      revalidatePath(`/dashboard/groups/${group.publicId}`);
      revalidatePath(`/dashboard/groups/${group.id}`);
    } catch (_) {}
    return { success: true, member: updated };
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to update member role", { originalError: error });
  }
}

export async function updateMemberNickname(memberId: number, groupIdOrPublicId: number | string, nickname: string) {
  try {
    const user = await requireAuth();

    const [group] = await db
      .select()
      .from(groups)
      .where(
        and(
          buildGroupCondition(groupIdOrPublicId),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!group) {
      throw new NotFoundError("Group");
    }

    const [updated] = await db
      .update(groupMembers)
      .set({ nickname: nickname.trim() || null })
      .where(and(eq(groupMembers.id, memberId), eq(groupMembers.groupId, group.id)))
      .returning();

    if (!updated) {
      throw new NotFoundError("Group member");
    }

    try {
      revalidatePath(`/dashboard/groups/${group.publicId}`);
    } catch (_) {}
    return { success: true, member: updated };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to update member nickname", { originalError: error });
  }
}

export async function getGroupMembers(groupIdOrPublicId: number | string) {
  try {
    const user = await requireAuth();

    const [group] = await db
      .select()
      .from(groups)
      .where(
        and(
          buildGroupCondition(groupIdOrPublicId),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!group) {
      throw new NotFoundError("Group");
    }

    const members = await db
      .select({
        id: groupMembers.id,
        isAdmin: groupMembers.isAdmin,
        isGuest: groupMembers.isGuest,
        nickname: groupMembers.nickname,
        joinedAt: groupMembers.joinedAt,
        userId: groupMembers.userId,
        contactId: groupMembers.contactId,
        userName: users.name,
        userAvatar: users.avatar,
        userEmail: users.email,
        contactName: contacts.name,
        contactAvatar: contacts.avatar,
        contactEmail: contacts.email,
        contactPhone: contacts.phone,
      })
      .from(groupMembers)
      .leftJoin(users, eq(groupMembers.userId, users.id))
      .leftJoin(contacts, eq(groupMembers.contactId, contacts.id))
      .where(eq(groupMembers.groupId, group.id));

    return members;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to fetch group members", { originalError: error });
  }
}

/**
 * Toggle a group member's participation in historical expenses.
 * Allows Group Owners and Admins to switch "Include in Previous Expenses" (ON / OFF)
 * at any time after the member has joined.
 * Rebuilds the group ledger chronologically from the oldest transaction to the latest.
 */
export async function toggleMemberExpenseParticipationAction(params: {
  groupIdOrPublicId: string | number;
  memberId: number;
  includePreviousExpenses: boolean;
  reason?: string;
}) {
  try {
    const user = await requireAuth();

    // 1. Fetch group
    const [group] = await db
      .select()
      .from(groups)
      .where(
        and(
          buildGroupCondition(params.groupIdOrPublicId),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!group) {
      throw new NotFoundError("Group");
    }

    // 2. Permission check: Only Group Owner or Group Admin can toggle participation
    const isOwner = group.createdBy === user.id;
    if (!isOwner) {
      const [callerAdmin] = await db
        .select({ isAdmin: groupMembers.isAdmin })
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, user.id),
            eq(groupMembers.isAdmin, true)
          )
        )
        .limit(1);

      if (!callerAdmin) {
        throw new AuthorizationError("Only group owners and admins can change expense participation settings.");
      }
    }

    // 3. Fetch target member
    const [targetMember] = await db
      .select({
        id: groupMembers.id,
        userId: groupMembers.userId,
        contactId: groupMembers.contactId,
        isAdmin: groupMembers.isAdmin,
        isGuest: groupMembers.isGuest,
        nickname: groupMembers.nickname,
        membershipStatus: groupMembers.membershipStatus,
        historicalInclusionDecision: groupMembers.historicalInclusionDecision,
        userName: users.name,
        contactName: contacts.name,
      })
      .from(groupMembers)
      .leftJoin(users, eq(groupMembers.userId, users.id))
      .leftJoin(contacts, eq(groupMembers.contactId, contacts.id))
      .where(and(eq(groupMembers.id, params.memberId), eq(groupMembers.groupId, group.id)))
      .limit(1);

    if (!targetMember) {
      throw new NotFoundError("Group member");
    }

    // Cannot toggle the group owner's participation
    if (group.createdBy === targetMember.userId) {
      throw new ValidationError("Group Owner participation cannot be excluded from historical expenses.");
    }

    const newMode = params.includePreviousExpenses ? "included" : "excluded";
    const previousMode = targetMember.historicalInclusionDecision === "excluded" ? "excluded" : "included";

    const memberDisplayName = targetMember.nickname || targetMember.userName || targetMember.contactName || "Member";

    // 4. Update group_members record
    await db
      .update(groupMembers)
      .set({
        historicalInclusionDecision: newMode,
      })
      .where(eq(groupMembers.id, targetMember.id));

    // 5. Append immutable timeline entry for this member
    await recordTimelineEvent({
      groupId: group.id,
      groupMemberId: targetMember.id,
      userId: targetMember.userId,
      contactId: targetMember.contactId,
      participationMode: newMode,
      reason: "mode_change",
      approvedBy: user.id,
    });

    // 6. Chronological Full Ledger Rebuild (Feature 5 & 6)
    const recalcResult = await executeAtomicGroupRecalculation({
      groupId: group.id,
      triggerOperation: "mode_change",
      initiatedByUserId: user.id,
    });

    // 7. Record immutable Audit Log (Feature 7)
    await db.insert(auditLogs).values({
      publicId: generatePublicId("aud"),
      userId: user.id,
      action: "member_participation_changed",
      entityType: "group_member",
      entityId: targetMember.id,
      entityPublicId: group.publicId,
      beforeData: {
        memberId: targetMember.id,
        name: memberDisplayName,
        historicalInclusionDecision: previousMode,
        includePreviousExpenses: previousMode === "included",
      },
      afterData: {
        memberId: targetMember.id,
        name: memberDisplayName,
        historicalInclusionDecision: newMode,
        includePreviousExpenses: params.includePreviousExpenses,
      },
      changes: {
        participationMode: { old: previousMode, new: newMode },
        includePreviousExpenses: { old: previousMode === "included", new: params.includePreviousExpenses },
        affectedExpenseCount: recalcResult.affectedExpenseCount,
        settlementVersion: recalcResult.settlementVersion,
        totalExpensesPaise: recalcResult.totalExpensesPaise,
        totalSharesPaise: recalcResult.totalSharesPaise,
      },
      reason: params.reason || `Admin changed expense participation for ${memberDisplayName} from ${previousMode.toUpperCase()} to ${newMode.toUpperCase()}`,
      status: "success",
    });

    // 8. Revalidate all group, dashboard, ledger, reports, and analytics paths (Feature 11 & 12)
    try {
      revalidatePath(`/dashboard/groups/${group.publicId}`);
      if (group.legacyPublicId) {
        revalidatePath(`/dashboard/groups/${group.legacyPublicId}`);
      }
      revalidatePath(`/dashboard/groups/${group.id}`);
      revalidatePath(`/dashboard/groups/${group.id}/settlements`);
      revalidatePath(`/dashboard/groups/${group.id}/expenses`);
      revalidatePath("/dashboard/groups");
      revalidatePath("/dashboard/settlements");
      revalidatePath("/dashboard/reports");
      revalidatePath("/dashboard/analytics");
      revalidatePath("/dashboard");
    } catch (_) {}

    return {
      success: true,
      memberId: targetMember.id,
      memberName: memberDisplayName,
      previousMode,
      newMode,
      affectedExpenseCount: recalcResult.affectedExpenseCount,
      settlementVersion: recalcResult.settlementVersion,
      totalExpensesPaise: recalcResult.totalExpensesPaise,
      totalSharesPaise: recalcResult.totalSharesPaise,
    };
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError("Failed to update member expense participation", { originalError: error });
  }
}

