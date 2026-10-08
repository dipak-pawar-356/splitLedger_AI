"use server";

import { db } from "@/lib/db";
import { groups, groupMembers, users, auditLogs } from "@/lib/db/schema/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ValidationError, NotFoundError, AuthorizationError, DatabaseError } from "@/lib/errors";
import { generateAuditId } from "@/lib/utils";
import { 
  type DelegatedGroupPermission, 
  hasDelegatedGroupPermission,
  DELEGATED_PERMISSIONS_LIST 
} from "@/lib/security/rbac";

/**
 * Fetch delegated permissions for a specific group member
 */
export async function getMemberDelegatedPermissionsAction(groupId: number, targetUserId: number) {
  try {
    const user = await requireAuth();

    const [group] = await db
      .select({ id: groups.id, createdBy: groups.createdBy })
      .from(groups)
      .where(and(eq(groups.id, groupId), eq(groups.isDeleted, false)))
      .limit(1);

    if (!group) throw new NotFoundError("Group not found");

    // Fetch caller membership
    const [callerMember] = await db
      .select({
        membershipStatus: groupMembers.membershipStatus,
        delegatedPermissions: groupMembers.delegatedPermissions,
      })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)))
      .limit(1);

    const isOwner = group.createdBy === user.id;
    const canManage = isOwner || hasDelegatedGroupPermission(
      group.createdBy,
      user.id,
      callerMember,
      "group:manage_permissions"
    );

    // Caller can also view if target is themselves
    if (!canManage && user.id !== targetUserId) {
      throw new AuthorizationError("You do not have permission to view member permissions");
    }

    const [targetMember] = await db
      .select({
        id: groupMembers.id,
        userId: groupMembers.userId,
        membershipStatus: groupMembers.membershipStatus,
        delegatedPermissions: groupMembers.delegatedPermissions,
      })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetUserId)))
      .limit(1);

    if (!targetMember) throw new NotFoundError("Member not found in group");

    return {
      userId: targetUserId,
      membershipStatus: targetMember.membershipStatus,
      delegatedPermissions: (targetMember.delegatedPermissions as Record<string, boolean>) || {},
      canEdit: canManage,
    };
  } catch (error: any) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) throw error;
    throw new DatabaseError("Failed to fetch member permissions", { originalError: error });
  }
}

/**
 * Update delegated permissions for a group member (Group Owner or delegated manager only)
 */
export async function updateMemberDelegatedPermissionsAction(data: {
  groupId: number;
  targetUserId: number;
  permissions: Record<DelegatedGroupPermission, boolean>;
}) {
  try {
    const user = await requireAuth();

    const [group] = await db
      .select({ id: groups.id, publicId: groups.publicId, createdBy: groups.createdBy })
      .from(groups)
      .where(and(eq(groups.id, data.groupId), eq(groups.isDeleted, false)))
      .limit(1);

    if (!group) throw new NotFoundError("Group not found");

    // Fetch caller member details
    const [callerMember] = await db
      .select({
        membershipStatus: groupMembers.membershipStatus,
        delegatedPermissions: groupMembers.delegatedPermissions,
      })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, user.id)))
      .limit(1);

    const isOwner = group.createdBy === user.id;
    const hasPermissionToManage = hasDelegatedGroupPermission(
      group.createdBy,
      user.id,
      callerMember,
      "group:manage_permissions"
    );

    if (!isOwner && !hasPermissionToManage) {
      throw new AuthorizationError("Only the group owner or authorized administrators can configure permissions");
    }

    // Owner cannot have permissions removed from themselves
    if (data.targetUserId === group.createdBy) {
      throw new ValidationError("Group Owner already possesses full permissions by default");
    }

    // Target must exist in group
    const [targetMember] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, data.targetUserId)))
      .limit(1);

    if (!targetMember) throw new NotFoundError("Target member not found");

    if (targetMember.membershipStatus !== "active") {
      throw new ValidationError("Permissions can only be delegated to approved active members");
    }

    // Sanitize permissions to ensure only known keys are saved
    const sanitizedPermissions: Record<string, boolean> = {};
    for (const item of DELEGATED_PERMISSIONS_LIST) {
      sanitizedPermissions[item.key] = Boolean(data.permissions[item.key]);
    }

    await db
      .update(groupMembers)
      .set({
        delegatedPermissions: sanitizedPermissions,
      })
      .where(eq(groupMembers.id, targetMember.id));

    // Audit log
    await db.insert(auditLogs).values({
      publicId: generateAuditId(),
      userId: user.id,
      action: "update",
      entityType: "group",
      entityId: group.id,
      changes: {
        action: "update_delegated_permissions",
        targetUserId: data.targetUserId,
        permissions: sanitizedPermissions,
      },
      reason: "Delegated administrative permissions updated",
      status: "success",
    });

    revalidatePath(`/dashboard/groups/${group.publicId}`);
    revalidatePath(`/dashboard/groups/${group.id}`);

    return {
      success: true,
      targetUserId: data.targetUserId,
      permissions: sanitizedPermissions,
    };
  } catch (error: any) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError("Failed to update delegated permissions", { originalError: error });
  }
}
